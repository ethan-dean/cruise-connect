import path from 'path';
import morgan from 'morgan';
import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import { addUser, updateUser, getUserFromEmail } from './database';
import { devServerPort } from './config';


///////////////////////////////////////////////////////////////////////////////////////////
// Provides JWT_SECRET, EMAIL_PASSWORD_SECRET
dotenv.config()

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
  const authHeader = req.headers['authorization'];
  if (!authHeader) // No token at all.
  {
    return res.sendStatus(401);
  }
  const token = authHeader.split(' ')[1];
  if (!token) // Doesn't have correct format.
  {
    return res.sendStatus(401);
  }
  jwt.verify(token, process.env.JWT_SECRET!, (err: any, token: any) => {
    if (err)  // Invalid token.
    {
      return res.sendStatus(403);
    }
    // Any endpoints using this middleware have access to token information.
    // req.token, for example req.token._id or req.token.name.
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
// Fill in API routes here.

// Register endpoint
expressServer.post('/api/v1/user/register', async (req: any, res: any) => {
  const { firstName, lastName, email, password } = req.body;

  const [ getErr, _getResult ] = await getUserFromEmail(email);
  if (getErr) {
    return res.status(500).json({ message: 'Account already exists with email', error: getErr });
  }

  // Hash and salt the password
  const hashedPassword = await hashPassword(password);

  // Generate email verification code (simple example using a random number)
  const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save user to the database
  const [ err, _result ] = await addUser(firstName, lastName, email, hashedPassword, emailCode);
  if (err) {
    return res.status(500).json({ message: 'Registration failed', error: err });
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
    res.status(200).json({ message: 'Verification emaill code sent' });
  });

  // Respond to client
  res.status(201).json({ message: 'User registered successfully. Please check your email for verification.' });
});

// Verify email endpoint 
expressServer.post('/api/v1/user/verify-email', async (req: any, res: any) => {
  const { email, emailCode } = req.body;
  
  const [ getErr, getResult ] = await getUserFromEmail(email);
  if (getErr) {
    return res.status(500).json({ message: 'Failed to find associated account', error: getErr });
  }

  const isValidCode: boolean = emailCode === getResult.emailCode;
  if (!isValidCode) {
    return res.status(500).json({ message: 'Failed to validate verification code', error: 'Codes do not match'});
  }

  // Update email_verified in the database
  const [ err, _results ] = await updateUser({ emailVerified: true, emailCode: "" }, getResult.userID);
  if (err) {
    return res.status(500).json({ message: 'Failed to reset password', error: err });
  }

  res.status(200).json({ message: 'Password reset successfully' });
});

// Login endpoint
expressServer.post('/api/v1/user/login', async (req: any, res: any) => {
  const { email, password } = req.body;

  // Retrieve user from database
  const [ err, result ] = await getUserFromEmail(email); 
  if (err || result.length === 0) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // TODO: Did I need this?
  // const user = result[0];

  // Validate password
  const isPasswordCorrect = await bcrypt.compare(password, result.password);
  if (!isPasswordCorrect) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  // Validate email_verified
  if (!result.emailVerified) {
    return res.status(401).json({ message: 'Email not verified yet'});
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: result.user_id, email: result.email, firstName: result.first_name, lastName: result.last_name },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  // Respond to client
  res.status(200).json({ message: 'Login successful', token });
});

// Forgot password endpoint
expressServer.post('/api/v1/user/forgot-password', async (req: any, res: any) => {
  const { email } = req.body;

  // Get user to update their email code
  const [ getErr, getResult ] = await getUserFromEmail(email); 
  if (getErr || getResult.length === 0) {
    return res.status(401).json({ message: 'Invalid email' });
  }

  // Generate a reset code (simple example using a random number)
  const emailCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Update email_code in the database
  const [ err, _results ] = await updateUser({ emailCode: emailCode }, getResult.userID);
  if (err) {
    return res.status(500).json({ message: 'Failed to reset password', error: err });
  }
  
  // Send reset code to user's email
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

// Password reset endpoint
expressServer.post('/api/v1/user/reset-password', async (req: any, res: any) => {
  const { email, emailCode, newPassword } = req.body;
  
  const [ getErr, getResult ] = await getUserFromEmail(email);
  if (getErr) {
    return res.status(500).json({ message: 'Failed to find associated account', error: getErr });
  }

  const isValidCode: boolean = emailCode === getResult.emailCode;
  if (!isValidCode) {
    return res.status(500).json({ message: 'Failed to validate verification code', error: 'Codes do not match'});
  }

  // Hash the new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password in the database
  const [ err, _results ] = await updateUser({ password: hashedPassword, emailCode: "" }, getResult.userID);
  if (err) {
    return res.status(500).json({ message: 'Failed to reset password', error: err });
  }

  res.status(200).json({ message: 'Password reset successfully' });
});


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
