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
// Create user_data table if it does not exist already.
function setupDatabase() {
  // Log available databases (Optional: for debugging)
  connection.query('SHOW DATABASES', (err: any, results: any) => {
    if (err) {
      console.error('Error showing databases:', err.stack);
      return;
    }
    console.log('Available Databases:', results);
  });

  // Create user_data table if it does not exist
  const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS user_data (
      user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(${maxStringLength}) NOT NULL,
      last_name VARCHAR(${maxStringLength}) NOT NULL,
      email VARCHAR(${maxStringLength}) NOT NULL,
      password VARCHAR(${maxStringLength}) NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_code VARCHAR(${maxStringLength}) NOT NULL,
      email_code_timeout INT UNSIGNED NOT NULL,
      email_code_attempts INT UNSIGNED NOT NULL
    )`;

  connection.query(createUserTableQuery, (err: any) => {
    if (err) {
      console.error('Error creating user_data table:', err.stack);
      return;
    }
    console.log('user_data table is set up and ready.');
  });

  // Optional: Log existing user_data records (for debugging)
  connection.query('SELECT * FROM user_data', (err: any, results: any) => {
    if (err) {
      console.error('Error querying user_data:', err.stack);
      return;
    }
    console.log('Existing user_data records:', results);
  });
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
    if (value.length > maxStringLength) {
      return `stringLengthError: <${fieldName}> must be ${maxStringLength} characters or fewer.`;
    }
  }
  return null;
}


///////////////////////////////////////////////////////////////////////////////////////////
// Database query functions for express server.

// Add user to user_data.
async function addUser(firstName: string, lastName: string, email: string, password: string, emailVerified: boolean, emailCode: string, emailCodeTimeout: number, emailCodeAttempts: number): Promise<[string|null, any]> {
  const addUserQuery = `INSERT INTO user_data (first_name, last_name, email, password, email_verified, email_code, email_code_timeout, email_code_attempts)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  // Validate string fileds to be correct length.
  const validationError = validateStringFieldLengths({firstName, lastName, email, password, emailCode});
  if (validationError) {
    return [ validationError, null ];
  }
  // Query database, pass in false for email_verified since it starts un-verified.
  try {
    const results = await query(addUserQuery, [firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts]);
    return [ null, results ];
  } catch (err: any) {
    return [ err, null ]
  }
}

// Edit user in user_data (camelCase is converted to snake_case for database).
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
async function updateUser(updateParams: UpdateUserParams, userID: string): Promise<[string|null, any]> {
  // Dynamically handle each key-value pair in the updateParams.
  const fieldsToUpdate: string[] = [];
  const valuesToUpdate: any[] = [];
  for (const [key, value] of Object.entries(updateParams)) {
    if (value !== undefined) {
      const snakeCaseKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      fieldsToUpdate.push(`${snakeCaseKey} = ?`);
      valuesToUpdate.push(value);
    }
  }
  // Construct the dynamic query.
  const updateUserQuery = `UPDATE user_data 
                             SET ${fieldsToUpdate.join(", ")} 
                             WHERE user_id = ?`;
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
    const results = await query(updateUserQuery, [...valuesToUpdate, userID]);
    return [ null, results ];
  } catch (err: any) {
    return [ err, null ]
  }
}

// Get user based on email and return their info.
async function getUserFromEmail(email: string): Promise<[string|null, any]> {
  const getUserQuery = `SELECT user_id, first_name, last_name, password, email_verified, email_code, email_code_timeout, email_code_attempts
                          FROM user_data 
                          WHERE email = ?`;
  // Validate string fileds to be correct length.
  const validationError = validateStringFieldLengths({ email });
  if (validationError) {
    return [ validationError, null ];
  }
  // Query database.
  try {
    const results = await query(getUserQuery, [email]);
    return [ null, results ];
  } catch (err: any) {
    return [ err, null ]
  }
}

// Get user based on email and return their info.
async function deleteUser(userId: string): Promise<[string|null, any]> {
  const deleteUserQuery = `DELETE FROM user_data 
                             WHERE user_id = ?`;
  // Validate string fileds to be correct length.
  const validationError = validateStringFieldLengths({ userId });
  if (validationError) {
    return [ validationError, null ];
  }
  // Query database.
  try {
    const results = await query(deleteUserQuery, [userId]);
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
  deleteUser,
};
