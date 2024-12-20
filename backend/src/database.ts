const mysql = require('mysql2');

import { dbConnectionConfig } from './config';


// The length of a string in the database (60 chars since bcrypt's hash function outputs 60 chars).
const maxStringLength = 60;

///////////////////////////////////////////////////////////////////////////////////////////
// Create a connection to the database.
const connection = mysql.createConnection(dbConnectionConfig);

function connectToDatabase() {
  connection.connect((err: any) => {
    if (err) {
      console.error('Error connecting to DB:', err.stack);
      return;
    }
    console.log('Connected to DB as id ' + connection.threadId);
  });
}
connectToDatabase();

///////////////////////////////////////////////////////////////////////////////////////////
// Create tables if they do not exist already.

// Function to create a table dynamically and log records
function setupTable(createTableQuery: string) {
  // Extract table name from the query
  const match = createTableQuery.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
  const tableName = match ? match[1] : null;
  if (!tableName) {
    console.error('Error: Unable to extract table name from query.');
    return;
  }

  // Create the table
  connection.query(createTableQuery, (err: any) => {
    if (err) {
      console.error(`Error creating ${tableName} table:`, err.stack);
      return;
    }
    console.log(`${tableName} table is set up and ready.`);
  });

  // Log existing records on startup (for debugging)
  connection.query(`SELECT * FROM ${tableName}`, (err: any, results: any) => {
    if (err) {
      console.error(`Error querying ${tableName}:`, err.stack);
      return;
    }
    console.log(`${tableName} records:`, results);
  });
}

function setupDatabase() {
  // Log available databases (for debugging)
  connection.query('SHOW DATABASES', (err: any, results: any) => {
    if (err) {
      console.error('Error showing databases:', err.stack);
      return;
    }
    console.log('Available Databases:', results);
  });

  // Create userData table if it does not exist
  const createUserDataTableQuery = `
    CREATE TABLE IF NOT EXISTS userData (
      userId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      firstName VARCHAR(${maxStringLength}) NOT NULL,
      lastName VARCHAR(${maxStringLength}) NOT NULL,
      email VARCHAR(${maxStringLength}) NOT NULL,
      password VARCHAR(${maxStringLength}) NOT NULL,
      emailVerified BOOLEAN NOT NULL DEFAULT FALSE,
      emailCode VARCHAR(${maxStringLength}) NOT NULL,
      emailCodeTimeout INT UNSIGNED NOT NULL,
      emailCodeAttempts INT UNSIGNED NOT NULL
    )`;
  setupTable(createUserDataTableQuery);

  // Create shipData table if it does not exist
  const createShipDataTableQuery = `
    CREATE TABLE IF NOT EXISTS shipData (
      shipId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      shipName VARCHAR(${maxStringLength}) NOT NULL
    )`;
  setupTable(createShipDataTableQuery);

  // Create cruiseData table if it does not exist
  const createCruiseDataTableQuery = `
    CREATE TABLE IF NOT EXISTS cruiseData (
      cruiseId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cruiseDeparatureDate DATE NOT NULL,
      shipId INT UNSIGNED NOT NULL, 
      FOREIGN KEY (shipId) REFERENCES shipData(shipId)
    )`;
  setupTable(createCruiseDataTableQuery);

  // Create joinedCruises table if it does not exist
  const createJoinedCruisesTableQuery = `
    CREATE TABLE IF NOT EXISTS joinedCruises (
      userId INT UNSIGNED NOT NULL,
      cruiseId INT UNSIGNED NOT NULL,
      FOREIGN KEY (userId) REFERENCES userData(userId),
      FOREIGN KEY (cruiseId) REFERENCES cruiseData(cruiseId)
    );
  `;
  setupTable(createJoinedCruisesTableQuery);
}
setupDatabase();

///////////////////////////////////////////////////////////////////////////////////////////
// Utility functions
function query(sql: string, params: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err: any, results: any) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function validateStringFieldLengths(stringFields: Object) {
  for (const [fieldName, value] of Object.entries(stringFields)) {
    if (typeof value === 'string' && value.length > maxStringLength) {
      return `stringLengthError: <${fieldName}> must be ${maxStringLength} characters or fewer.`;
    }
  }
  return null;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Database query functions for express server.

// Add user to userData.
async function addUser(firstName: string, lastName: string, email: string, password: string, emailVerified: boolean, emailCode: string, emailCodeTimeout: number, emailCodeAttempts: number): Promise<[string|null, any]> {
  const addUserQuery = `INSERT INTO userData (firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  // Validate string fileds to be correct length.
  const validationError = validateStringFieldLengths({firstName, lastName, email, password, emailCode});
  if (validationError) {
    return [ validationError, null ];
  }
  // Query database, pass in false for email_verified since it starts un-verified.
  try {
    const results = await query(addUserQuery, [firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts]);
    if (results.affectedRows === 0) return [ 'DATABASE_QUERY_ERROR', null ];
    return [ null, results ];
  } catch (err: any) {
    return [ err, null ]
  }
}

// Edit user in userData (must use UpdateUserParms object since field names are used to select columns).
type UpdateUserParams = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  emailVerified?: boolean;
  emailCode?: string;
  emailCodeTimeout?: number;
  emailCodeAttempts?: number;
};
async function updateUser(updateParams: UpdateUserParams, userId: number): Promise<[string|null, any]> {
  // Dynamically handle each key-value pair in the updateParams.
  const fieldsToUpdate: string[] = [];
  const valuesToUpdate: any[] = [];
  for (const [key, value] of Object.entries(updateParams)) {
    if (value !== undefined) {
      fieldsToUpdate.push(`${key} = ?`);
      valuesToUpdate.push(value);
    }
  }
  // Construct the dynamic query.
  const updateUserQuery = `UPDATE userData 
                             SET ${fieldsToUpdate.join(", ")} 
                             WHERE userId = ?`;
  // Validate string fields to be correct length.
  const fieldsToValidate = Object.fromEntries(
    Object.entries(updateParams).filter(([_, value]) => (typeof value === 'string' && value !== undefined))
  );
  const validationError = validateStringFieldLengths(fieldsToValidate);
  if (validationError) {
    return [ validationError, null ];
  }
  // Query database.
  try {
    const results = await query(updateUserQuery, [...valuesToUpdate, userId]);
    if (results.affectedRows === 0) return [ 'DATABASE_QUERY_ERROR', null ];
    return [ null, results ];
  } catch (err: any) {
    return [ err, null ];
  }
}

// Get user based on email and return their info.
async function getUserFromEmail(email: string): Promise<[string|null, any]> {
  const getUserQuery = `SELECT userId, firstName, lastName, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts
                          FROM userData 
                          WHERE email = ?`;
  // Validate string fileds to be correct length.
  const validationError = validateStringFieldLengths({ email });
  if (validationError) {
    return [ validationError, null ];
  }
  // Query database.
  try {
    const results = await query(getUserQuery, [email]);
    // There can only be one user with each email
    if (results.length > 1) return ['DATABASE_QUERY_ERROR', null];
    return [ null, results?.[0] ];
  } catch (err: any) {
    return [ err, null ]
  }
}

// Get user based on email and return their info.
async function getUserFromId(userId: number): Promise<[string|null, any]> {
  const getUserQuery = `SELECT firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts
                          FROM userData 
                          WHERE userId = ?`;
  // Query database.
  try {
    const results = await query(getUserQuery, [userId]);
    // There can only be one user with each userId, just extra sanity check
    if (results.length > 1) return ['DATABASE_QUERY_ERROR', null];
    return [ null, results?.[0] ];
  } catch (err: any) {
    return [ err, null ]
  }
}

// Get user based on email and return their info.
async function deleteUser(userId: number): Promise<[string|null, any]> {
  const deleteUserQuery = `DELETE FROM userData 
                             WHERE userId = ?`;
  // Query database.
  try {
    const results = await query(deleteUserQuery, [userId]);
    if (results.affectedRows === 0) return [ 'DATABASE_QUERY_ERROR', null ];
    return [ null, results ];
  } catch (err: any) {
    return [ err, null ]
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
// Function exports for 'database.ts'.
export {
  addUser,
  updateUser,
  getUserFromEmail,
  getUserFromId,
  deleteUser,
};
