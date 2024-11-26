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
  const minLength = /.{8,}/;              // At least 8 characters
  const hasCapital = /[A-Z]/;             // At least one uppercase letter
  const hasNumber = /\d/;                 // At least one digit
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/; // At least one special character

  // Check all conditions
  return (
    minLength.test(password) &&
    hasCapital.test(password) &&
    hasNumber.test(password) &&
    hasSpecialChar.test(password)
  );
}

///////////////////////////////////////////////////////////////////////////////////////////
// Function to conditionally send response status and message.
function respondIf(condition: boolean, res: any, statusCode: any = 401, message: string = 'Unauthorized', error: string = "") {
  if (condition) {
    return res.status(statusCode).json({ message: message, error: error });
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
// Register endpoint
expressServer.post('/api/v1/user/register', async (req: any, res: any) => {
  const { firstName, lastName, email, password } = req.body;

  const [ getErr, dbResult ] = await getUserFromEmail(email);
  if (getErr || dbResult.length > 0) {
    return res.status(403).json({ message: 'Account already exists with email', error: getErr });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ message: 'Password does not meet requirements' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(email);
  if (!isValidEmail) {
    return res.status(400).json({ message: 'Email does not meet requirements' });
  }

  const nameRegex = /^[a-zA-Z]+([ '-][a-zA-Z]+)*$/;
  const isValidFirstName = nameRegex.test(firstName);
  const isValidLastName = nameRegex.test(lastName);
  if (!isValidFirstName || !isValidLastName) {
    return res.status(400).json({ message: 'Names must be non-empty, alphabetic fields with spaces and dashes' });
  }
  const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const formattedLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();

  // Hash and salt the password
  const hashedPassword = await hashPassword(password);

  // Save user to the database
  const emailVerified = false;
  const emailCode = "";
  const emailCodeTimeout = 0;
  const emailCodeAttempts = MAX_EMAIL_CODE_ATTEMPTS;
  const [ err, _result ] = await addUser(formattedFirstName, formattedLastName, email, hashedPassword, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts);
  if (err) {
    return res.status(500).json({ message: 'Registration failed', error: err });
  }

  res.status(201).json({ message: 'User registered successfully.' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Send verification code endpoint 
expressServer.post('/api/v1/user/send-verification-code', async (req: any, res: any) => {
  const { email, forceResendRegardlessTimeout } = req.body;
  
  const [ getErr, dbResult ] = await getUserFromEmail(email);
  if (getErr || dbResult.length === 0) {
    return res.status(400).json({ message: 'Failed to find associated account', error: getErr });
  }

  if (dbResult[0].email_verified) {
    return res.status(204).json({ message: 'Account already verified' });
  }

  // Only a new code on a redirect that has a timed out code, or a press of resend code button
  const isExistingCodeTimedOut: boolean = dbResult[0].email_code_timeout < (Date.now() / 1000);
  if (!isExistingCodeTimedOut && !forceResendRegardlessTimeout) {
    return res.status(200).json({ message: 'Existing email code still valid, did not force resend' });
  }

  // Generate email verification code (simple example using a random number)
  const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
  // Calculate timeout in unix time
  const emailCodeTimeout = (Math.floor(Date.now() / 1000)) + 60 * EMAIL_CODE_TIMEOUT_MINUTES;
  // Save emailCode to the database
  const [ err, _result ] = await updateUser({ emailCode: emailCode, emailCodeTimeout: emailCodeTimeout, emailCodeAttempts: 0 }, dbResult[0].user_id);
  if (err) {
    return res.status(500).json({ message: 'Saving email code failed', error: err });
  }

  // Send verification email
  const mailOptions = {
    from: 'your_email@example.com',
    to: email,
    subject: 'Email Verification',
    text: `Your verification code is: ${emailCode}`
  };
  transporter.sendMail(mailOptions, (err, _info) => {
    if (err) {
      return res.status(500).json({ message: 'Error sending verification email', error: err.message });
    }
    res.status(201).json({ message: 'Please check your email for verification' });
  });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Check verification code endpoint 
expressServer.post('/api/v1/user/check-verification-code', async (req: any, res: any) => {
  const { email, emailCode } = req.body;
  
  const [ getErr, dbResult ] = await getUserFromEmail(email);
  if (getErr || dbResult.length === 0) {
    return res.status(400).json({ message: 'Failed to find associated account', error: getErr });
  }

  if (dbResult[0].email_verified) {
    return res.status(204).json({ message: 'Account already verified' });
  }

  // If code is timed out, frontend will remove submit button and prompt user to press resend code
  const isCodeTimedOut: boolean = dbResult[0].email_code_timeout < (Date.now() / 1000);
  if (isCodeTimedOut) {
    return res.status(401).json({ message: 'Email verification code timed out'});
  }

  // If all attempts used, frontend will remove submit button and prompt user to press resend code
  const isAttemptsRemaining: boolean = dbResult[0].email_code_attempts < MAX_EMAIL_CODE_ATTEMPTS;
  if (!isAttemptsRemaining) {
    return res.status(401).json({ message: `Attempt rejected, all ${MAX_EMAIL_CODE_ATTEMPTS} email code attempts used` })
  }
  const numAttempts = dbResult[0].email_code_attempts + 1;
  const [ updateAttemptErr, _updateAttemptResult ] = await updateUser({ emailCodeAttempts: numAttempts }, dbResult[0].user_id);
  if (updateAttemptErr) {
    return res.status(500).json({ message: 'Failed to update attempt count', error: updateAttemptErr });
  }

  const isValidCode: boolean = (emailCode == dbResult[0].email_code);
  if (!isValidCode) {
    return res.status(401).json({ message: 'Incorrect email verification code', error: 'Codes do not match'});
  }

  // Update email_verified in the database
  const [ err, _result ] = await updateUser({ emailVerified: true, emailCode: "", emailCodeTimeout: 0, emailCodeAttempts: MAX_EMAIL_CODE_ATTEMPTS }, dbResult[0].user_id);
  if (err) {
    return res.status(500).json({ message: 'Failed to verify email', error: err });
  }

  res.status(200).json({ message: 'Verified email successfully' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Login endpoint
expressServer.post('/api/v1/user/login', async (req: any, res: any) => {
  const { email, password } = req.body;

  // Retrieve user from database
  const [ err, dbResult ] = await getUserFromEmail(email); 
  if (err || dbResult.length === 0) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // If email is not verified, will redirect user to verify page
  if (!dbResult[0].email_verified) {
    return res.status(403).json({ message: 'Email not verified yet'});
  }

  const isPasswordCorrect = await bcrypt.compare(password, dbResult[0].password);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: dbResult[0].user_id, email: dbResult[0].email, firstName: dbResult[0].first_name, lastName: dbResult[0].last_name },
    process.env.JWT_SECRET!,
    { expiresIn: "24h" }
  );

  // Respond to client
  res.status(200).json({ message: 'Login successful', token });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Send password reset code endpoint
expressServer.post('/api/v1/user/send-password-reset-code', async (req: any, res: any) => {
  const { email, forceResendRegardlessTimeout } = req.body;

  // Get user to update their email code
  const [ getErr, dbResult ] = await getUserFromEmail(email); 
  if (getErr || dbResult.length === 0) {
    return res.status(401).json({ message: 'Invalid email' });
  }

  // If email is not verified, will redirect user to verify page
  if (!dbResult[0].email_verified) {
    return res.status(403).json({ message: 'Email not verified yet'});
  }

  // NOTE: Since we redirect immediately if not verified, we can use emailCode fields
  // because it is guaranteed the user isn't using those for email verification

  // Only a new code on a redirect that has a timed out code, or a press of resend code button
  const isExistingCodeTimedOut: boolean = dbResult[0].email_code_timeout < (Date.now() / 1000)
  if (!isExistingCodeTimedOut && !forceResendRegardlessTimeout) {
    return res.status(200).json({ message: 'Existing email code still valid, did not force resend' });
  }

  // Generate email verification code (simple example using a random number)
  const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
  // Calculate timeout in unix time
  const emailCodeTimeout = (Math.floor(Date.now() / 1000)) + 60 * EMAIL_CODE_TIMEOUT_MINUTES;
  // Save emailCode to the database
  const [ err, _result ] = await updateUser({ emailCode: emailCode, emailCodeTimeout: emailCodeTimeout, emailCodeAttempts: 0 }, dbResult[0].user_id);
  if (err) {
    return res.status(500).json({ message: 'Saving reset code failed', error: err });
  }
  
  // Send reset code email
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
// Check password reset code endpoint
expressServer.post('/api/v1/user/check-password-reset-code', async (req: any, res: any) => {
  const { email, emailCode, newPassword } = req.body;
  
  const [ getErr, dbResult ] = await getUserFromEmail(email);
  if (getErr || dbResult.length === 0) {
    return res.status(400).json({ message: 'Failed to find associated account', error: getErr });
  }

  // If code is timed out, frontend will remove submit button and prompt user to press resend code
  const isCodeTimedOut: boolean = dbResult[0].email_code_timeout < (Date.now() / 1000)
  if (isCodeTimedOut) {
    return res.status(401).json({ message: 'Email verification code timed out'})
  }

  const isAttemptsRemaining: boolean = dbResult[0].email_code_attempts < MAX_EMAIL_CODE_ATTEMPTS;
  if (!isAttemptsRemaining) {
    return res.status(401).json({ message: `Attempt rejected, all ${MAX_EMAIL_CODE_ATTEMPTS} email code attempts used` })
  }
  const numAttempts = dbResult[0].email_code_attempts + 1;
  const [ updateAttemptErr, _updateAttemptResult ] = await updateUser({ emailCodeAttempts: numAttempts }, dbResult[0].user_id);
  if (updateAttemptErr) {
    return res.status(500).json({ message: 'Failed to update attempt count', error: updateAttemptErr });
  }

  const isValidCode: boolean = emailCode === dbResult[0].email_code;
  if (!isValidCode) {
    return res.status(401).json({ message: 'Failed to validate verification code' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(401).json({ message: 'Password does not meet requirements' });
  }
  const hashedPassword = await hashPassword(newPassword);

  // Update password in the database
  const [ err, _results ] = await updateUser({ password: hashedPassword, emailCode: "", emailCodeTimeout: 0, emailCodeAttempts: MAX_EMAIL_CODE_ATTEMPTS }, dbResult[0].user_id);
  if (err) {
    return res.status(500).json({ message: 'Failed to reset password', error: err });
  }

  res.status(200).json({ message: 'Password reset successfully' });
});

///////////////////////////////////////////////////////////////////////////////////////////
// Delete user endpoint
expressServer.post('/api/v1/user/delete-user', authenticateToken, async (req: any, res: any) => {
  const userId: string = req.token.userId; 

  const [ err, _results ] = await deleteUser(userId);
  if (err) {
    return res.status(500).json({ message: 'Failed to delete user', error: err });
  }
  res.status(200).json({ message: 'Deleted user successfully' });
});


// TODO: Make code consistent amount of typescript
// TODO: Refreshing tokens...?
// TODO: Try respondIf function to cleanup code

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
