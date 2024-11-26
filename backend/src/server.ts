import path from 'path';
import morgan from 'morgan';
import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import { addUser, updateUser, getUserFromEmail, deleteUser } from './database';
import { devServerPort } from './config';


///////////////////////////////////////////////////////////////////////////////////////////
// Secrets and constants
dotenv.config()   // Provides JWT_SECRET, EMAIL_PASSWORD_SECRET
const EMAIL_CODE_TIMEOUT_MINUTES: number = 10;
const MAX_EMAIL_CODE_ATTEMPTS: number = 5;

///////////////////////////////////////////////////////////////////////////////////////////
// Initialize server app.
const expressServer = express();

// Trust the nginx proxy.
expressServer.set('trust proxy', 1);
// Morgan provides express easier docker HTTP logging that default logs to stdout.
expressServer.use(morgan('dev'));
// Allow requests from the following addresses, production and development.
// www.your_domain.com is re-routed to your_domain.com by nginx setup.
expressServer.use(cors({
    origin: ['https://your_domain.com', `http://localhost:${devServerPort}`],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
// Parse any messages with header 'application/json' with json parser.
expressServer.use(express.json())

///////////////////////////////////////////////////////////////////////////////////////////
// Initialize mailer.
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'email@example.com',
    pass: process.env.EMAIL_PASSWORD_SECRET!
  }
})

///////////////////////////////////////////////////////////////////////////////////////////
// Middleware function to call in API endpoints for JWT authentication.
function authenticateToken(req: any, res: any, next: any) {
  const authHeader: string | undefined = req.headers['authorization'];
  if (!authHeader) // No token at all.
  {
    return res.status(400).json({ message: 'Did not find token Authorization header' });
  }
  const token: string | undefined = authHeader.split(' ')[1];
  if (!token) // Doesn't have correct format.
  {
    return res.status(400).json({ message: 'Incorrect format of token Authorization header' });
  }
  jwt.verify(token, process.env.JWT_SECRET!, (err: any, token: any) => {
    if (err)  // Invalid token.
    {
      return res.status(401).json({ message: 'Invalid token', error: err });
    }
    // Any endpoints using this middleware have access to token information.
    // For example 'req.token.userId' or 'req.token.firstName'.
    req.token = token;
    next();
  });
}

///////////////////////////////////////////////////////////////////////////////////////////
// Function to hash and salt passwords (in case of data leaks).
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Function to validate password requirements.
function isValidPassword(password: string): boolean {
  // Regular expressions to check each condition
  const lengthCheck = /^.{8,50}$/;         // Between 8 and 50 characters
  const hasCapital = /[A-Z]/;             // At least one uppercase letter
  const hasNumber = /\d/;                 // At least one digit
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/; // At least one special character

  // Check all conditions
  return (
    lengthCheck.test(password) &&
    hasCapital.test(password) &&
    hasNumber.test(password) &&
    hasSpecialChar.test(password)
  );
}

///////////////////////////////////////////////////////////////////////////////////////////
// Function to conditionally send response status and message.
function respondIf(condition: boolean, response: any, statusCode: number, message: string, error: string|null = "") {
  if (condition) {
    response.status(statusCode).json({ message: message, error: error });
    return true;
  }
  return false;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Register endpoint.
expressServer.post('/api/v1/user/register', async (req: any, res: any) => {
  const { firstName, lastName, email, password } = req.body;

  // Validate account with email does not already exist.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = Boolean(getUserErr) || getUserResult.length > 0;
  if (respondIf(accountExists, res, 400, 'Account already exists with email', getUserErr)) return;
  // Validate password requirements.
  if (respondIf(!isValidPassword(password), res, 400, 'Password does not meet requirements')) return;
  // Validate email is in valid format.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(email);
  if (respondIf(!isValidEmail, res, 400, 'Email does not meet requirements')) return;
  // Validate names are in valid format (alphabetic characters with spaces and dashes).
  const nameRegex = /^[a-zA-Z]+([ '-][a-zA-Z]+)*$/;
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
  if (respondIf(Boolean(err), res, 500, 'Registration failed', err)) return;

  res.status(201).json({ message: 'User registered successfully.' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Send verification code endpoint.
expressServer.post('/api/v1/user/send-verification-code', async (req: any, res: any) => {
  const { email, forceResend } = req.body;
  
  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && !(getUserResult.length === 0);
  if (respondIf(!accountExists, res, 400, 'Failed to find associated account', getUserErr)) return;
  // Validate email is not verified.
  const emailVerified: boolean = getUserResult[0].email_verified;
  if (respondIf(emailVerified, res, 204, 'Account already verified')) return;
  // Validate there is not an existing code, do not create new code on a redirect, do on resend button.
  const isExistingCodeValid: boolean = !forceResend && !(getUserResult[0].email_code_timeout < (Date.now() / 1000));
  if (respondIf(isExistingCodeValid, res, 200, 'Existing email code still valid, did not force resend')) return;

  // Generate random email verification code and calculate timeout in unix time.
  const emailCode: string = Math.floor(100000 + Math.random() * 900000).toString();
  const emailCodeTimeout: number = (Math.floor(Date.now() / 1000)) + 60 * EMAIL_CODE_TIMEOUT_MINUTES;
  // Save emailCode to the database.
  const [ err, _result ] = await updateUser({ emailCode: emailCode, emailCodeTimeout: emailCodeTimeout, emailCodeAttempts: 0 }, getUserResult[0].user_id);
  if (respondIf(Boolean(err), res, 500, 'Saving email code failed', err)) return;

  // Send verification email.
  const mailOptions: object = {
    from: 'your_email@example.com',
    to: email,
    subject: 'Email Verification',
    text: `Your verification code is: ${emailCode}`
  };
  transporter.sendMail(mailOptions, (err: any, _info: any) => {
    if (err) {
      return res.status(500).json({ message: 'Error sending verification email', error: err.message });
    }
    res.status(201).json({ message: 'Please check your email for verification' });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Check verification code endpoint.
expressServer.post('/api/v1/user/check-verification-code', async (req: any, res: any) => {
  const { email, emailCode } = req.body;
  
  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && !(getUserResult.length === 0);
  if (respondIf(!accountExists, res, 400, 'Failed to find associated account', getUserErr)) return;
  // Validate email is not verified.
  const emailVerified: boolean = getUserResult[0].email_verified;
  if (respondIf(emailVerified, res, 204, 'Account already verified')) return;
  // Validate code is not timed out, else frontend will prompt user to press resend code.
  const isCodeTimedOut: boolean = getUserResult[0].email_code_timeout < (Date.now() / 1000);
  if (respondIf(isCodeTimedOut, res, 401, 'Email verification code timed out')) return;
  // Validate there are attempts remaining, else frontend will prompt user to press resend code.
  const isAttemptsRemaining: boolean = getUserResult[0].email_code_attempts < MAX_EMAIL_CODE_ATTEMPTS;
  if (respondIf(!isAttemptsRemaining, res, 401, `Email code rejected, all ${MAX_EMAIL_CODE_ATTEMPTS} attempts used`)) return;

  // Update number of attempts before validating code.
  const numAttempts: number = getUserResult[0].email_code_attempts + 1;
  const [ updateAttemptErr, _updateAttemptResult ] = await updateUser({ emailCodeAttempts: numAttempts }, getUserResult[0].user_id);
  if (respondIf(Boolean(updateAttemptErr), res, 500, 'Failed to update attempt count', updateAttemptErr)) return;
  // Validate submitted code.
  const isValidCode: boolean = (emailCode == getUserResult[0].email_code);
  if (respondIf(!isValidCode, res, 401, 'Incorrect email verification code')) return;

  // Update email_verified in the database.
  const [ err, _result ] = await updateUser({ emailVerified: true, emailCode: "", emailCodeTimeout: 0, emailCodeAttempts: MAX_EMAIL_CODE_ATTEMPTS }, getUserResult[0].user_id);
  if (respondIf(Boolean(err), res, 500, 'Failed to verify email', err)) return;

  res.status(200).json({ message: 'Verified email successfully' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Login endpoint.
expressServer.post('/api/v1/user/login', async (req: any, res: any) => {
  const { email, password } = req.body;

  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && !(getUserResult.length === 0);
  if (respondIf(!accountExists, res, 401, 'Invalid email or password', getUserErr)) return;
  // Validate email is verified, else redirect to verify page.
  const emailVerified: boolean = getUserResult[0].email_verified;
  if (respondIf(!emailVerified, res, 401, 'Email not yet verified')) return;
  // Validate password matches.
  const isPasswordCorrect = await bcrypt.compare(password, getUserResult[0].password);
  if (respondIf(!isPasswordCorrect, res, 401, 'Invalid email or password')) return;

  // Generate JWT.
  const token = jwt.sign(
    { userId: getUserResult[0].user_id, email: getUserResult[0].email, firstName: getUserResult[0].first_name, lastName: getUserResult[0].last_name },
    process.env.JWT_SECRET!,
    { expiresIn: "24h" }
  );

  res.status(200).json({ message: 'Login successful', token });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Send password reset code endpoint.
expressServer.post('/api/v1/user/send-password-reset-code', async (req: any, res: any) => {
  const { email, forceResend } = req.body;

  // NOTE: Since we redirect users immediately if not email verified, we can use emailCode database
  // fields because it is guaranteed the users aren't using those for email verification anymore.

  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && !(getUserResult.length === 0);
  if (respondIf(!accountExists, res, 400, 'Failed to find associated account', getUserErr)) return;
  // Validate email is verified, else redirect to verify page.
  const emailVerified: boolean = getUserResult[0].email_verified;
  if (respondIf(!emailVerified, res, 401, 'Email not yet verified')) return;
  // Validate there is not an existing code, do not create new code on a redirect, do on resend button.
  const isExistingCodeValid: boolean = !forceResend && !(getUserResult[0].email_code_timeout < (Date.now() / 1000));
  if (respondIf(isExistingCodeValid, res, 200, 'Existing email code still valid, did not force resend')) return;

  // Generate random email verification code and calculate timeout in unix time.
  const emailCode: string = Math.floor(100000 + Math.random() * 900000).toString();
  const emailCodeTimeout: number = (Math.floor(Date.now() / 1000)) + 60 * EMAIL_CODE_TIMEOUT_MINUTES;
  // Save emailCode to the database.
  const [ err, _result ] = await updateUser({ emailCode: emailCode, emailCodeTimeout: emailCodeTimeout, emailCodeAttempts: 0 }, getUserResult[0].user_id);
  if (respondIf(Boolean(err), res, 500, 'Saving email code failed', err)) return;
  
  // Send reset code email.
  const mailOptions = {
    from: 'your_email@example.com',
    to: email,
    subject: 'Password Reset Request',
    text: `Your password reset code is: ${emailCode}\nNot you? Just ignore this email.`
  };
  transporter.sendMail(mailOptions, (err, _info) => {
    if (err) {
      return res.status(500).json({ message: 'Error sending reset code', error: err.message });
    }
    res.status(200).json({ message: 'Password reset code sent to email' });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Check password reset code endpoint.
expressServer.post('/api/v1/user/check-password-reset-code', async (req: any, res: any) => {
  const { email, emailCode, newPassword } = req.body;
  
  // Validate account exists, get user data.
  const [ getUserErr, getUserResult ] = await getUserFromEmail(email);
  const accountExists: boolean = !getUserErr && !(getUserResult.length === 0);
  if (respondIf(!accountExists, res, 400, 'Failed to find associated account', getUserErr)) return;
  // Validate email is verified, else redirect to verify page.
  const emailVerified: boolean = getUserResult[0].email_verified;
  if (respondIf(!emailVerified, res, 401, 'Email not yet verified')) return;
  // Validate code is not timed out, else frontend will prompt user to press resend code.
  const isCodeTimedOut: boolean = getUserResult[0].email_code_timeout < (Date.now() / 1000);
  if (respondIf(isCodeTimedOut, res, 401, 'Email verification code timed out')) return;
  // Validate there are attempts remaining, else frontend will prompt user to press resend code.
  const isAttemptsRemaining: boolean = getUserResult[0].email_code_attempts < MAX_EMAIL_CODE_ATTEMPTS;
  if (respondIf(!isAttemptsRemaining, res, 401, `Email code rejected, all ${MAX_EMAIL_CODE_ATTEMPTS} attempts used`)) return;

  // Update number of attempts before validating code.
  const numAttempts: number = getUserResult[0].email_code_attempts + 1;
  const [ updateAttemptErr, _updateAttemptResult ] = await updateUser({ emailCodeAttempts: numAttempts }, getUserResult[0].user_id);
  if (respondIf(Boolean(updateAttemptErr), res, 500, 'Failed to update attempt count', updateAttemptErr)) return;
  // Validate submitted code.
  const isValidCode: boolean = (emailCode == getUserResult[0].email_code);
  if (respondIf(!isValidCode, res, 401, 'Incorrect email verification code')) return;
  // Validate password requirements.
  if (respondIf(!isValidPassword(newPassword), res, 400, 'Password does not meet requirements')) return;

  // Update password in the database.
  const hashedPassword: string = await hashPassword(newPassword);
  const [ err, _results ] = await updateUser({ password: hashedPassword, emailCode: "", emailCodeTimeout: 0, emailCodeAttempts: MAX_EMAIL_CODE_ATTEMPTS }, getUserResult[0].user_id);
  if (err) {
    return res.status(500).json({ message: 'Failed to reset password', error: err });
  }

  res.status(200).json({ message: 'Password reset successfully' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Delete user endpoint.
expressServer.post('/api/v1/user/delete-user', authenticateToken, async (req: any, res: any) => {
  const userId: string = req.token.userId; 

  // Delete user from the database.
  const [ err, _results ] = await deleteUser(userId);
  if (respondIf(Boolean(err), res, 500, 'Failed to delete user', err)) return;

  res.status(204).json({ message: 'Deleted user successfully' });
});

// TODO: Refreshing tokens...?


///////////////////////////////////////////////////////////////////////////////////////////
// Make sure that any request that does not matches a static file
// in the build folder, will just serve index.html. Client side routing is
// going to make sure that the correct content will be loaded.
expressServer.use((req: any, res: any, next: any) => {
  if (/(.ico|.js|.css|.jpg|.png|.map|.svg)$/i.test(req.path)) {
    next();
  } else {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.sendFile(path.resolve('./dist/index.html'));
  }
});

expressServer.use(express.static(path.resolve('./dist')));

expressServer.use((_: any, res: any) => {
    res.status(200).send('We are under construction... check back soon!');
});


///////////////////////////////////////////////////////////////////////////////////////////
// Function exports for 'server.ts'.
export { expressServer };
