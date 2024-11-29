import dotenv from 'dotenv';


///////////////////////////////////////////////////////////////////////////////////////////
// Provides DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
dotenv.config()

///////////////////////////////////////////////////////////////////////////////////////////
// Function exports for 'database.ts'.

const dbConnectionConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, 
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
};
const serverPort = 5000;
const devServerPort = 5173;

export {
  dbConnectionConfig,
  serverPort,
  devServerPort,
};
