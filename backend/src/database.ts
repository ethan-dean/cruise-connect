import mysql from 'mysql2/promise';

import { dbConnectionConfig } from './config.js';
import { setupTable } from './utils/setupTable.js';


// The length of a string in the database (60 chars since bcrypt's hash function outputs 60 chars).
const maxStringLength: number = 60;

///////////////////////////////////////////////////////////////////////////////////////////
// Create a connection to the database.
let pool = mysql.createPool(dbConnectionConfig);

///////////////////////////////////////////////////////////////////////////////////////////
// If table does not exist create it, fill it with initialDbData from folder.
async function setupDatabase() {
  const connection = await pool.getConnection();

  try {
    // Log available databases (for debugging)
    const [results] = await connection.query('SHOW DATABASES');
    console.log('Available Databases:', results);
  } catch (err: any) {
    console.error('Error showing databases:', err.stack);
  }

  // Create userData table if it does not exist
  const createUserDataTableQuery = `
    CREATE TABLE IF NOT EXISTS userData (
      userId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      firstName VARCHAR(${maxStringLength}) NOT NULL,
      lastName VARCHAR(${maxStringLength}) NOT NULL,
      email VARCHAR(${maxStringLength}) NOT NULL,
      password VARCHAR(${maxStringLength}) NOT NULL,
      emailVerified BOOLEAN NOT NULL,
      emailCode VARCHAR(${maxStringLength}) NOT NULL,
      emailCodeTimeout INT UNSIGNED NOT NULL,
      emailCodeAttempts INT UNSIGNED NOT NULL,
      profileDone BOOLEAN NOT NULL,
      birthDate DATE DEFAULT NULL,
      imageId VARCHAR(${maxStringLength}) DEFAULT NULL,
      bio VARCHAR(${maxStringLength}) DEFAULT NULL,
      instagram VARCHAR(${maxStringLength}) DEFAULT NULL,
      snapchat VARCHAR(${maxStringLength}) DEFAULT NULL,
      tiktok VARCHAR(${maxStringLength}) DEFAULT NULL,
      twitter VARCHAR(${maxStringLength}) DEFAULT NULL,
      facebook VARCHAR(${maxStringLength}) DEFAULT NULL
    )`;
  setupTable(connection, createUserDataTableQuery);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Finished userData setup.')

  // Create companyData table if it does not exist
  const createCompanyDataTableQuery = `
    CREATE TABLE IF NOT EXISTS companyData (
      companyId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      companyName VARCHAR(${maxStringLength}) NOT NULL
    )`;
  setupTable(connection, createCompanyDataTableQuery);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Finished companyData setup.')

  // Create shipData table if it does not exist
  const createShipDataTableQuery = `
    CREATE TABLE IF NOT EXISTS shipData (
      shipId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      shipName VARCHAR(${maxStringLength}) NOT NULL,
      companyId INT UNSIGNED NOT NULL,
      FOREIGN KEY (companyId) REFERENCES companyData(companyId)
    )`;
  setupTable(connection, createShipDataTableQuery);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Finished shipData setup.')

  // Create cruiseData table if it does not exist
  const createCruiseDataTableQuery = `
    CREATE TABLE IF NOT EXISTS cruiseData (
      cruiseId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cruiseDepartureDate DATE NOT NULL,
      shipId INT UNSIGNED NOT NULL, 
      FOREIGN KEY (shipId) REFERENCES shipData(shipId)
    )`;
  setupTable(connection, createCruiseDataTableQuery);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Finished cruiseData setup.')

  // Create joinedCruises table if it does not exist
  const createJoinedCruisesTableQuery = `
    CREATE TABLE IF NOT EXISTS joinedCruises (
      userId INT UNSIGNED NOT NULL,
      cruiseId INT UNSIGNED NOT NULL,
      FOREIGN KEY (userId) REFERENCES userData(userId),
      FOREIGN KEY (cruiseId) REFERENCES cruiseData(cruiseId)
    )`;
  setupTable(connection, createJoinedCruisesTableQuery);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Finished joinedCruises setup.')

  // Release the connection back to the pool
  connection.release();
  console.log('Temporary DB connection released!')
}
setupDatabase();

///////////////////////////////////////////////////////////////////////////////////////////
// Utility functions
function query(sql: string, params: any[]): Promise<any> {
  return new Promise(async (resolve, reject) => {
    // try {
    //     const [results] = await pool.query(sql, params);
    //     if (results === null) console.log('queryResults === null');
    //     console.log('query: queryResults=' + results + '<end>');
    //     return [results, null];
    // } catch (err: any) {
    //     console.log('query: caught an error in query')
    //     if (["PROTOCOL_CONNECTION_LOST", "ECONNRESET", "ETIMEDOUT"].includes(err.code)) {
    //         console.warn("Database connection lost. Creating a new pool...");
    //         // pool.end(); // Close the old pool
    //         pool = mysql.createPool(dbConnectionConfig); // Recreate pool
    //
    //         // Retry the query with the new pool
    //         try {
    //           const [retryResults] = await pool.query(sql, params);
    //           console.log('query: retryResults=' + retryResults + '<end>');
    //           return [retryResults, null];
    //         } catch (retryErr: any) {
    //           console.log('query: caught an error in query')
    //           return [null, retryErr];
    //         }
    //     }
    //     // Return other errors
    //     return [null, err];
    // }

    try {
      const [results] = await pool.query(sql, params);
      resolve(results);
    } catch (err: any) {
        // Handle specific errors
        if (["PROTOCOL_CONNECTION_LOST", "ECONNRESET", "ETIMEDOUT"].includes(err.code)) {
          // console.warn("Database connection lost. Reconnecting...");
          // pool.end(); // Close the old pool
          // pool = mysql.createPool(dbConnectionConfig); // Recreate pool
          console.warn("Database connection lost. Creating a new pool...");
          pool = mysql.createPool(dbConnectionConfig); // Recreate pool

          // Retry the query with the new pool
          try {
            const [retryResults] = await pool.query(sql, params);
            resolve(retryResults);
          } catch (retryErr: any) {
            reject(retryErr);
          }
        }
      return reject(err); // Reject other errors
    }

  });
}

// // TODO: Remove debug prints
// async function query(sql: string, params: any[]): Promise<any> {
//     try {
//         const [results] = await pool.query(sql, params);
//         if (results === null) console.log('queryResults === null');
//         console.log('query: queryResults=' + results + '<end>');
//         return [results, null];
//     } catch (err: any) {
//         console.log('query: caught an error in query')
//         if (["PROTOCOL_CONNECTION_LOST", "ECONNRESET", "ETIMEDOUT"].includes(err.code)) {
//             console.warn("Database connection lost. Creating a new pool...");
//             // pool.end(); // Close the old pool
//             pool = mysql.createPool(dbConnectionConfig); // Recreate pool
//
//             // Retry the query with the new pool
//             try {
//               const [retryResults] = await pool.query(sql, params);
//               console.log('query: retryResults=' + retryResults + '<end>');
//               return [retryResults, null];
//             } catch (retryErr: any) {
//               console.log('query: caught an error in query')
//               return [null, retryErr];
//             }
//         }
//         // Return other errors
//         return [null, err];
//     }
// }

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
async function addUser(firstName: string, lastName: string, email: string, password: string, emailVerified: boolean, emailCode: string, emailCodeTimeout: number, emailCodeAttempts: number, profileDone: boolean): Promise<[string|null, any]> {
  const addUserQuery = `INSERT INTO userData (firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts, profileDone)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  // Validate string fileds to be correct length.
  const validationError = validateStringFieldLengths({firstName, lastName, email, password, emailCode});
  if (validationError) {
    return [ validationError, null ];
  }
  // Query database, pass in false for email_verified since it starts un-verified.
  try {
    const results = await query(addUserQuery, [firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts, profileDone]);
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
  profileDone?: boolean;
  imageId?: string;
  birthDate?: string;
  bio?: string;
  instagram?: string;
  snapchat?: string;
  tiktok?: string;
  twitter?: string;
  facebook?: string;
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
  const getUserQuery = `SELECT userId, firstName, lastName, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts, profileDone
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

// Get user based on userId and return their info.
async function getUserFromId(userId: number): Promise<[string|null, any]> {
  const getUserQuery = `SELECT *
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

// Get multiple user profiles based on an array of userIds.
async function getUserProfilesFromIds(userIds: number[]): Promise<[string | null, any]> {
  if (userIds.length === 0) return ['EMPTY_INPUT', null];

  // Construct a dynamic SQL query with placeholders.
  const placeholders = userIds.map(() => '?').join(',');
  const getUsersQuery = `SELECT firstName, lastName, birthDate, imageId, bio, instagram, snapchat, tiktok, twitter, facebook
                         FROM userData
                         WHERE userId IN (${placeholders})`;

  try {
    const results = await query(getUsersQuery, userIds);
    return [null, results];
  } catch (err: any) {
    return [err, null];
  }
}

// Delete user based on userId.
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

// Get all companies' names and IDs.
async function getCompaniesData(): Promise<[string | null, any]> {
  const getCompaniesQuery = `SELECT companyId, companyName FROM companyData`;

  try {
    const results = await query(getCompaniesQuery, []);
    return [null, results];
  } catch (err: any) {
    return [err, null];
  }
}

// Get a company's name based on its ID.
async function getCompanyDataById(companyId: number): Promise<[string | null, any]> {
  const getCompanyQuery = `SELECT companyName FROM companyData WHERE companyId = ?`;

  try {
    const results = await query(getCompanyQuery, [companyId]);
    if (results.length > 1) return ['DATABASE_QUERY_ERROR', null];
    return [null, results?.[0] || null];
  } catch (err: any) {
    return [err, null];
  }
}

// Get all ships' names and IDs.
async function getShipsDataByCompany(companyId: number): Promise<[string | null, any]> {
  const getShipsQuery = `SELECT shipId, shipName FROM shipData WHERE companyId = ?`;

  try {
    const results = await query(getShipsQuery, [companyId]);
    return [null, results];
  } catch (err: any) {
    return [err, null];
  }
}

// Get a ship's name based on its ID.
async function getShipDataById(shipId: number): Promise<[string | null, any]> {
  const getShipQuery = `SELECT shipName, companyId FROM shipData WHERE shipId = ?`;

  try {
    const results = await query(getShipQuery, [shipId]);
    if (results.length > 1) return ['DATABASE_QUERY_ERROR', null];
    return [null, results?.[0] || null];
  } catch (err: any) {
    return [err, null];
  }
}

// Add a new cruise to the cruiseData table and return its cruiseId.
async function addCruise(cruiseDepartureDate: string, shipId: number): Promise<[string | null, any]> {
  const addCruiseQuery = `INSERT INTO cruiseData (cruiseDepartureDate, shipId) VALUES (?, ?)`;

  try {
    const results = await query(addCruiseQuery, [cruiseDepartureDate, shipId]);
    if (results.affectedRows === 0) return ['DATABASE_QUERY_ERROR', null];
    return [null, { cruiseId: results.insertId }];
  } catch (err: any) {
    return [err, null];
  }
}

// Get the cruiseId for a given cruiseDepartureDate and shipId.
async function getCruiseByDateAndShip(cruiseDepartureDate: string, shipId: number): Promise<[string | null, any]> {
  const getCruiseQuery = `SELECT cruiseId FROM cruiseData WHERE cruiseDepartureDate = ? AND shipId = ?`;

  try {
    const results = await query(getCruiseQuery, [cruiseDepartureDate, shipId]);
    if (results.length > 1) return ['DATABASE_QUERY_ERROR', null];
    return [null, results?.[0]?.cruiseId || null];
  } catch (err: any) {
    return [err, null];
  }
}

// Get cruise data based on cruiseId.
async function getCruiseById(cruiseId: number): Promise<[string | null, any]> {
  const getCruiseDataQuery = `SELECT cruiseId, cruiseDepartureDate, shipId FROM cruiseData WHERE cruiseId = ?`;

  try {
    const results = await query(getCruiseDataQuery, [cruiseId]);
    if (results.length > 1) return ['DATABASE_QUERY_ERROR', null];
    return [null, results?.[0] || null];
  } catch (err: any) {
    return [err, null];
  }
}

// Add a joined cruise to joinedCruises when a user joins a cruise.
async function addJoinedCruise(userId: number, cruiseId: number): Promise<[string | null, any]> {
  const addJoinedCruiseQuery = `INSERT INTO joinedCruises (userId, cruiseId) VALUES (?, ?)`;

  try {
    const results = await query(addJoinedCruiseQuery, [userId, cruiseId]);
    if (results.affectedRows === 0) return ['DATABASE_QUERY_ERROR', null];
    return [null, results];
  } catch (err: any) {
    return [err, null];
  }
}

// Delete a joined cruise from joinedCruises when a user leaves a cruise.
async function deleteJoinedCruise(userId: number, cruiseId: number): Promise<[string | null, any]> {
  const deleteJoinedCruiseQuery = `DELETE FROM joinedCruises WHERE userId = ? AND cruiseId = ?`;

  try {
    const results = await query(deleteJoinedCruiseQuery, [userId, cruiseId]);
    if (results.affectedRows === 0) return ['DATABASE_QUERY_ERROR', null];
    return [null, results];
  } catch (err: any) {
    return [err, null];
  }
}

// Delete joined cruises by user from joinedCruises when a user deletes all their cruises.
async function deleteJoinedCruisesByUser(userId: number): Promise<[string | null, any]> {
  const deleteJoinedCruiseQuery = `DELETE FROM joinedCruises WHERE userId = ?`;

  try {
    const results = await query(deleteJoinedCruiseQuery, [userId]);
    if (results.affectedRows === 0) return ['DATABASE_QUERY_ERROR', null];
    return [null, results];
  } catch (err: any) {
    return [err, null];
  }
}

// Get userIds of users who joined a specific cruise.
async function getJoinedCruisesByCruise(cruiseId: number): Promise<[string | null, number[]]> {
  const getJoinedCruisesQuery = `SELECT userId FROM joinedCruises WHERE cruiseId = ?`;

  try {
    const results = await query(getJoinedCruisesQuery, [cruiseId]);
    const userIds = results.map((row: any) => row.userId);
    return [null, userIds];
  } catch (err: any) {
    return [err, []];
  }
}

// Get cruiseIds of cruises who were joined by a specific user.
async function getJoinedCruisesByUser(userId: number): Promise<[string | null, number[]]> {
  const getJoinedCruisesQuery = `SELECT cruiseId FROM joinedCruises WHERE userId = ?`;

  try {
    const results = await query(getJoinedCruisesQuery, [userId]);
    const cruiseIds = results.map((row: any) => row.cruiseId);
    return [null, cruiseIds];
  } catch (err: any) {
    return [err, []];
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
// Function exports for 'database.ts'.
export {
  addUser,
  updateUser,
  getUserFromEmail,
  getUserFromId,
  getUserProfilesFromIds,
  deleteUser,
  getCompaniesData,
  getCompanyDataById,
  getShipsDataByCompany,
  getShipDataById,
  addCruise,
  getCruiseByDateAndShip,
  getCruiseById,
  addJoinedCruise,
  deleteJoinedCruise,
  deleteJoinedCruisesByUser,
  getJoinedCruisesByUser,
  getJoinedCruisesByCruise,
};
