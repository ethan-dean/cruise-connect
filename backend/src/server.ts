import path from 'path';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';

import { devServerPort } from './config.js';
import usersRouter from './apiRoutes/usersRoutes.js'
import cruisesRouter from './apiRoutes/cruisesRoutes.js'


///////////////////////////////////////////////////////////////////////////////////////////
// Set secret environment variables.
dotenv.config();

///////////////////////////////////////////////////////////////////////////////////////////
// Initialize server app.
const expressServer = express();

// Trust the nginx proxy.
expressServer.set('trust proxy', 1);
// Morgan provides express easier docker HTTP logging that default logs to stdout.
expressServer.use(morgan('dev'));
// Allow requests from the following addresses, production and development.
// www.thecruiseconnect.ethandean.dev is not accepted as a valid subdomain.
expressServer.use(cors({
  origin: ['https://thecruiseconnect.ethandean.dev', `http://localhost:${devServerPort}`],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,      // Allow cookies to be sent/received
}));
// Parse cookies into req.cookies
expressServer.use(cookieParser());
// Parse any messages with header 'application/json' with json parser.
expressServer.use(express.json());

///////////////////////////////////////////////////////////////////////////////////////////
// Mount api routes.
expressServer.use('/api/v1/users', usersRouter);
expressServer.use('/api/v1/cruises', cruisesRouter);

///////////////////////////////////////////////////////////////////////////////////////////
// Make sure that any request that does not matches a static file
// in the build folder, will just serve index.html. Client side routing is
// going to make sure that the correct content will be loaded.
expressServer.use((req: any, res: any, next: any) => {
  if (/(.ico|.js|.css|.jpg|.png|.webp|.map|.ttf|.svg)$/i.test(req.path)) {
    next();
  } else {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.sendFile(path.resolve('./dist/client/index.html'));
  }
});

// Serve up backend files uploaded from users(images).
expressServer.use("/profilePictureDb", 
  express.static(path.resolve('./profilePictureDb/'), {
        maxAge: "1h", // Cache images for 1 hour
        etag: false, // Disable ETag headers
    })
);

// Serve up frontend static files (images, etc.).
expressServer.use(
  express.static(path.resolve('./dist/client'))
);

expressServer.use((_: any, res: any) => {
    res.status(200).send('We are under construction... check back soon!');
});

///////////////////////////////////////////////////////////////////////////////////////////
// Function exports for 'server.ts'.
export { expressServer };
