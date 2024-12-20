import express from 'express';
import bcrypt from 'bcryptjs';

import { createAccessToken, createRefreshToken, verifyToken, authenticateToken, cookieSettings } from '../utils/tokenUtils';
import { getMailer } from '../utils/getMailer';
import { addUser, updateUser, getUserFromEmail, getUserFromId, deleteUser } from '../database';

///////////////////////////////////////////////////////////////////////////////////////////
// Constants.
const EMAIL_CODE_TIMEOUT_MINUTES: number = 10;
const MAX_EMAIL_CODE_ATTEMPTS: number = 5;

///////////////////////////////////////////////////////////////////////////////////////////
// Initialize server app.
const usersRouter = express.Router();

///////////////////////////////////////////////////////////////////////////////////////////
// Util function to hash and salt passwords (in case of data leaks).
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

// Util function to validate password requirements.
function isValidPassword(password: string): boolean {
  // Regular expressions to check each condition
  const lengthCheck = /^.{8,50}$/;        // Between 8 and 50 characters
  const hasCapital = /[A-Z]/;             // At least one uppercase letter
  const hasNumber = /\d/;                 // At least one digit
  const hasSpecialChar = /[!@#$%^&*]/;    // At least one special character

  // Check all conditions
  return (
    lengthCheck.test(password) &&
    hasCapital.test(password) &&
    hasNumber.test(password) &&
    hasSpecialChar.test(password)
  );
}

// Util function to conditionally send response status and message.
function respondIf(condition: boolean, response: any, statusCode: number, message: string, error: string|null = "") {
  if (condition) {
    response.status(statusCode).json({ message: message, error: error });
    return true;
  }
  return false;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Register endpoint.
usersRouter.post('/register', async (req: any, res: any) => {
  const { firstName, lastName, email, password } = req.body;

  // Validate account with email does not already exist.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = Boolean(getUserErr) || getUserResult;
  if (respondIf(accountExists, res, 400, 'Account already exists with that email. Please try logging in.', getUserErr)) return;
  // Validate password requirements.
  if (respondIf(!isValidPassword(password), res, 400, 'Password does not meet requirements')) return;
  // Validate email is in valid format.
  const emailRegex = /^(?=.{1,50}$)[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(email);
  if (respondIf(!isValidEmail, res, 400, 'Email does not meet requirements')) return;
  // Validate names are in valid format.
  const nameRegex = /^.{1,50}$/;
  const isValidFirstName: boolean = nameRegex.test(firstName);
  const isValidLastName: boolean = nameRegex.test(lastName);
  if (respondIf(!isValidFirstName || !isValidLastName, res, 400, 'Names do not meet requirements')) return;

  // Capitalize names and hash password.
  const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const formattedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
  const hashedPassword = await hashPassword(password);
  // Defaults for newly registered, unverified account.
  const emailVerified = false;
  const emailCode = "";
  const emailCodeTimeout = 0;
  const emailCodeAttempts = MAX_EMAIL_CODE_ATTEMPTS;

  // Save user to the database.
  const [ err, _result ] = await addUser(formattedFirstName, formattedLastName, email, hashedPassword, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts);
  if (respondIf(Boolean(err), res, 500, 'Server error, try again later...', 'Failed addUser: ' + err)) return;

  res.status(201).json({ message: 'User registered successfully.' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Send verification code endpoint.
usersRouter.post('/send-verification-code', async (req: any, res: any) => {
  const { email, forceResend } = req.body;
  
  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && getUserResult;
  if (respondIf(!accountExists, res, 400, 'Server error, try again later...', 'Failed getUserFromEmail: ' + getUserErr)) return;
  // Validate email is not verified.
  const emailVerified: boolean = getUserResult.emailVerified;
  if (respondIf(emailVerified, res, 204, 'Account already verified', 'ACCOUNT_ALREADY_VERIFIED')) return;
  // Validate there is not an existing code, do not create new code on a redirect, do on resend button.
  const isExistingCodeValid: boolean = (Date.now() / 1000) < getUserResult.emailCodeTimeout;
  if (respondIf(isExistingCodeValid && !forceResend, res, 200, 'Existing email code still valid, did not force resend')) return;

  // Generate random email verification code and calculate timeout in unix time.
  const emailCode: string = Math.floor(100000 + Math.random() * 900000).toString();
  const emailCodeTimeout: number = (Math.floor(Date.now() / 1000)) + 60 * EMAIL_CODE_TIMEOUT_MINUTES;
  // Save emailCode to the database.
  const [ err, _result ] = await updateUser({ emailCode: emailCode, emailCodeTimeout: emailCodeTimeout, emailCodeAttempts: 0 }, getUserResult.userId);
  if (respondIf(Boolean(err), res, 500, 'Server error, try again later...', 'Failed updateUser: ' + err)) return;

  // Send verification email.
  const mailOptions: object = {
    from: 'your_email@example.com',
    to: email,
    subject: 'Email Verification',
    text: `Your verification code is: ${emailCode}`
  };
  getMailer().sendMail(mailOptions, (err: any, _info: any) => {
    if (err) {
      return res.status(500).json({ message: 'Error sending verification email', error: err.message });
    }
    res.status(201).json({ message: 'Please check your email for verification' });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Check verification code endpoint.
usersRouter.post('/check-verification-code', async (req: any, res: any) => {
  const { email, emailCode } = req.body;
  
  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && getUserResult;
  if (respondIf(!accountExists, res, 400, 'Server error, try again later...', 'Failed getUserFromEmail: ' + getUserErr)) return;
  // Validate email is not verified.
  const emailVerified: boolean = getUserResult.emailVerified;
  if (respondIf(emailVerified, res, 204, 'Account already verified', 'ACCOUNT_ALREADY_VERIFIED')) return;
  // Validate code is not timed out, else frontend will prompt user to press resend code.
  const isCodeTimedOut: boolean = getUserResult.emailCodeTimeout < (Date.now() / 1000);
  if (respondIf(isCodeTimedOut, res, 401, 'Email verification code timed out', 'EMAIL_CODE_TIMEOUT')) return;
  // Validate there are attempts remaining, else frontend will prompt user to press resend code.
  const isAttemptsRemaining: boolean = getUserResult.emailCodeAttempts < MAX_EMAIL_CODE_ATTEMPTS;
  if (respondIf(!isAttemptsRemaining, res, 401, `Email code rejected, all ${MAX_EMAIL_CODE_ATTEMPTS} attempts used`, 'EMAIL_CODE_MAX_ATTEMPTS')) return;

  // Update number of attempts before validating code.
  const numAttempts: number = getUserResult.emailCodeAttempts + 1;
  const [ updateAttemptErr, _updateAttemptResult ] = await updateUser({ emailCodeAttempts: numAttempts }, getUserResult.userId);
  if (respondIf(Boolean(updateAttemptErr), res, 500, 'Server error, try again later...', 'Failed updateUser: ' + updateAttemptErr)) return;
  // Validate submitted code.
  const isValidCode: boolean = (emailCode == getUserResult.emailCode);
  if (respondIf(!isValidCode, res, 401, 'Incorrect email verification code. Please try again.')) return;

  // Update emailVerified in the database.
  const [ err, _result ] = await updateUser({ emailVerified: true, emailCode: "", emailCodeTimeout: 0, emailCodeAttempts: MAX_EMAIL_CODE_ATTEMPTS }, getUserResult.userId);
  if (respondIf(Boolean(err), res, 500, 'Server error, try again later...', 'Failed updateUser: ' + err)) return;

  // Generate JWT.
  const accessToken = createAccessToken(getUserResult.userId);
  const refreshToken = createRefreshToken(getUserResult.userId);
  res.cookie('refreshToken', refreshToken, cookieSettings);
  res.status(200).json({ message: 'Verified email successfully', accessToken: accessToken });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Login endpoint.
usersRouter.post('/login', async (req: any, res: any) => {
  const { email, password } = req.body;

  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && getUserResult;
  if (respondIf(!accountExists, res, 401, 'Invalid email or password', getUserErr)) return;
  // Validate email is verified, else redirect to verify page.
  const emailVerified: boolean = getUserResult.emailVerified;
  if (respondIf(!emailVerified, res, 401, 'Email not verified', 'ACCOUNT_NOT_VERIFIED')) return;
  // Validate password matches.
  const isPasswordCorrect = await bcrypt.compare(password, getUserResult.password);
  if (respondIf(!isPasswordCorrect, res, 401, 'Invalid email or password')) return;

  // Generate JWT.
  const accessToken = createAccessToken(getUserResult.userId);
  const refreshToken = createRefreshToken(getUserResult.userId);
  res.cookie('refreshToken', refreshToken, cookieSettings);
  res.status(200).json({ message: 'Login successful', accessToken: accessToken });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Send password reset code endpoint.
usersRouter.post('/send-password-reset-code', async (req: any, res: any) => {
  const { email } = req.body;

  // NOTE: Since we redirect users immediately if not email verified, we can use emailCode database
  // fields because it is guaranteed the users aren't using those for email verification anymore.

  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && getUserResult;
  if (respondIf(!accountExists, res, 400, 'Email not associated with an account. Please register.', 'Failed getUserFromEmail: ' + getUserErr)) return;
  // Validate email is verified, else redirect to verify page.
  const emailVerified: boolean = getUserResult.emailVerified;
  if (respondIf(!emailVerified, res, 401, 'Email not yet verified', 'ACCOUNT_NOT_VERIFIED')) return;

  // NOTE: If there is an existing code just overwrite it, since the frontend does not automatically 
  // ask for a code on refresh. We know that all requests for codes come straight from user.

  // Generate random email verification code and calculate timeout in unix time.
  const emailCode: string = Math.floor(100000 + Math.random() * 900000).toString();
  const emailCodeTimeout: number = (Math.floor(Date.now() / 1000)) + 60 * EMAIL_CODE_TIMEOUT_MINUTES;
  // Save emailCode to the database.
  const [ err, _result ] = await updateUser({ emailCode: emailCode, emailCodeTimeout: emailCodeTimeout, emailCodeAttempts: 0 }, getUserResult.userId);
  if (respondIf(Boolean(err), res, 500, 'Server error, try again later...', 'Failed updateUser: ' + err)) return;
  
  // Send reset code email.
  const mailOptions = {
    from: 'your_email@example.com',
    to: email,
    subject: 'Password Reset Request',
    text: `Your password reset code is: ${emailCode}\nNot you? Just ignore this email.`
  };
  getMailer().sendMail(mailOptions, (err, _info) => {
    if (err) {
      return res.status(500).json({ message: 'Error sending reset code', error: err.message });
    }
    res.status(200).json({ message: 'Password reset code sent to email valid until ${emailCodeTimeout}' });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Check password reset code endpoint.
usersRouter.post('/check-password-reset-code', async (req: any, res: any) => {
  const { email, emailCode, newPassword } = req.body;
  
  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && getUserResult;
  if (respondIf(!accountExists, res, 400, 'Server error, try again later...', 'Failed getUserFromEmail' + getUserErr)) return;
  // Validate email is verified, else redirect to verify page.
  const emailVerified: boolean = getUserResult.emailVerified;
  if (respondIf(!emailVerified, res, 401, 'Email not yet verified', 'ACCOUNT_NOT_VERIFIED')) return;
  // Validate code is not timed out, else frontend will prompt user to press resend code.
  const isCodeTimedOut: boolean = getUserResult.emailCodeTimeout < (Date.now() / 1000);
  if (respondIf(isCodeTimedOut, res, 401, 'Email verification code timed out', 'EMAIL_CODE_TIMEOUT')) return;
  // Validate there are attempts remaining, else frontend will prompt user to press resend code.
  const isAttemptsRemaining: boolean = getUserResult.emailCodeAttempts < MAX_EMAIL_CODE_ATTEMPTS;
  if (respondIf(!isAttemptsRemaining, res, 401, `Email code rejected, all ${MAX_EMAIL_CODE_ATTEMPTS} attempts used`, 'EMAIL_CODE_MAX_ATTEMPTS')) return;

  // Update number of attempts before validating code.
  const numAttempts: number = getUserResult.emailCodeAttempts + 1;
  const [ updateAttemptErr, _updateAttemptResult ] = await updateUser({ emailCodeAttempts: numAttempts }, getUserResult.userId);
  if (respondIf(Boolean(updateAttemptErr), res, 500, 'Server error, try again later...', 'Failed updateUser: ' + updateAttemptErr)) return;
  // Validate submitted code.
  const isValidCode: boolean = (emailCode == getUserResult.emailCode);
  if (respondIf(!isValidCode, res, 401, 'Incorrect password reset code. Please try again.')) return;
  // Validate password requirements.
  if (respondIf(!isValidPassword(newPassword), res, 400, 'Password does not meet requirements')) return;

  // Update password in the database.
  const hashedPassword: string = await hashPassword(newPassword);
  const [ err, _results ] = await updateUser({ password: hashedPassword, emailCode: "", emailCodeTimeout: 0, emailCodeAttempts: MAX_EMAIL_CODE_ATTEMPTS }, getUserResult.userId);
  if (err) {
    return res.status(500).json({ message: 'Server error, try again later...', error: 'Failed updateUser: ' + err });
  }

  res.status(200).json({ message: 'Password reset successfully' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Logout user endpoint.
usersRouter.post('/logout', (_req: any, res: any) => {
  // Clear the refresh token cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Same settings as when you set the cookie
    sameSite: 'strict',
    expires: new Date(0), // Expire the cookie immediately
  });

  res.status(200).json({ message: 'Logged out user successfully' });
});
///////////////////////////////////////////////////////////////////////////////////////////
// Delete user endpoint.
usersRouter.post('/delete-user', authenticateToken, async (req: any, res: any) => {
  const userId: number = req.token.userId; 

  // Delete user from the database.
  const [ err, _results ] = await deleteUser(userId);
  if (respondIf(Boolean(err), res, 500, 'Failed to delete user', err)) return;

  // Clear the refresh token cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0), // Expire the cookie immediately
  });

  res.status(204).json({ message: 'Deleted user successfully' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Get user profile data endpoint.
usersRouter.post('/get-user-profile-data', authenticateToken, async (req: any, res: any) => {
  const userId: number = req.token.userId; 

  // Get user from the database.
  const [ getUserErr, getUserResult ] = await getUserFromId(userId);
  const accountExists: boolean = !getUserErr && getUserResult;
  if (respondIf(!accountExists, res, 500, 'Server error, try again later...', 'Failed getUserFromId ' + getUserErr)) return;

  res.status(200).json({
    firstName: getUserResult.firstName,
    lastName: getUserResult.lastName,
    email: getUserResult.email,
  });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Refresh token endpoint.
usersRouter.post('/refresh-token', (req: any, res: any) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) return res.status(401).json({ message: 'Refresh token not found', error: 'NO_REFRESH_TOKEN' });

  verifyToken(refreshToken, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ message: err, error: 'INVALID_REFRESH_TOKEN' });

    const newAccessToken = createAccessToken(decoded.userId);
    res.json({ accessToken: newAccessToken });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Export for 'usersRoutes.ts'.
export default usersRouter;
