///////////////////////////////////////////////////////////////////////////////////////////
// Function exports for 'database.ts'.
// Constants set in docker, "compose.yaml".

const dbConnectionConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 3306,
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'pass',
  database: process.env.DATABASE_DB || 'example',
};
const serverPort = 5000;
const devServerPort = 5173;

export {
  dbConnectionConfig,
  serverPort,
  devServerPort,
};
