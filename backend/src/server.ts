const path = require('path');
const cors = require('cors')
const express = require('express');
const morgan = require('morgan');
const jwt = require('jsonwebtoken')
require('dotenv');
// TODO: Convert to import syntax

import { } from './database';
import { devServerPort } from './config';


///////////////////////////////////////////////////////////////////////////////////////////
// Initialize server app
const expressServer = express();

// Trust the nginx proxy.
expressServer.set('trust proxy', 1);
// Morgan provides express, docker logging that default logs to stdout.
expressServer.use(morgan('common'));
expressServer.use(cors({
    origin: ['https://typecode.app', `http://localhost:${devServerPort}`],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));


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
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err: any, token: any) => {
    if (err)  // Invalid token.
    {
      return res.sendStatus(403);
    }
    // Any endpoints using this middleware have access to token information 
    // req.token, for example req.token._id or req.token.name.
    req.token = token;
    next();
  });
}

///////////////////////////////////////////////////////////////////////////////////////////
// Fill in API routes here.

// // Middleware to parse JSON bodies, applied only to the /api routes.
// app.use('/api/v1', express.json());
// TODO: Add in login and register endpoints with JWT.sign


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
