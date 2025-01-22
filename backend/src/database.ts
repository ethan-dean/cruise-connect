const mysql = require('mysql2');

import { dbConnectionConfig } from './config';
import { setupTable } from './utils/setupTable';


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
// If table does not exist create it, fill it with initialDbData from folder.
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
      emailVerified BOOLEAN NOT NULL,
      emailCode VARCHAR(${maxStringLength}) NOT NULL,
      emailCodeTimeout INT UNSIGNED NOT NULL,
      emailCodeAttempts INT UNSIGNED NOT NULL,
      profileFinished BOOLEAN NOT NULL,
      birthDate DATE DEFAULT NULL,
      bio VARCHAR(${maxStringLength}) DEFAULT NULL,
      instagram VARCHAR(${maxStringLength}) DEFAULT NULL,
      snapchat VARCHAR(${maxStringLength}) DEFAULT NULL,
      tiktok VARCHAR(${maxStringLength}) DEFAULT NULL,
      twitter VARCHAR(${maxStringLength}) DEFAULT NULL,
      facebook VARCHAR(${maxStringLength}) DEFAULT NULL
    )`;
  setupTable(connection, createUserDataTableQuery);

  // Create shipData table if it does not exist
  const createShipDataTableQuery = `
    CREATE TABLE IF NOT EXISTS shipData (
      shipId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      shipName VARCHAR(${maxStringLength}) NOT NULL
    )`;
  setupTable(connection, createShipDataTableQuery);

  // Create cruiseData table if it does not exist
  const createCruiseDataTableQuery = `
    CREATE TABLE IF NOT EXISTS cruiseData (
      cruiseId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cruiseDeparatureDate DATE NOT NULL,
      shipId INT UNSIGNED NOT NULL, 
      FOREIGN KEY (shipId) REFERENCES shipData(shipId)
    )`;
  setupTable(connection, createCruiseDataTableQuery);

  // Create joinedCruises table if it does not exist
  const createJoinedCruisesTableQuery = `
    CREATE TABLE IF NOT EXISTS joinedCruises (
      userId INT UNSIGNED NOT NULL,
      cruiseId INT UNSIGNED NOT NULL,
      FOREIGN KEY (userId) REFERENCES userData(userId),
      FOREIGN KEY (cruiseId) REFERENCES cruiseData(cruiseId)
    );
  `;
  setupTable(connection, createJoinedCruisesTableQuery);
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
async function addUser(firstName: string, lastName: string, email: string, password: string, emailVerified: boolean, emailCode: string, emailCodeTimeout: number, emailCodeAttempts: number, profileFinished: boolean): Promise<[string|null, any]> {
  const addUserQuery = `INSERT INTO userData (firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts, profileFinished)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  // Validate string fileds to be correct length.
  const validationError = validateStringFieldLengths({firstName, lastName, email, password, emailCode});
  if (validationError) {
    return [ validationError, null ];
  }
  // Query database, pass in false for email_verified since it starts un-verified.
  try {
    const results = await query(addUserQuery, [firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts, profileFinished]);
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
  profileFinished?: boolean;
  birthDate?: Date;
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
  const getUserQuery = `SELECT userId, firstName, lastName, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts, profileFinished
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
  const getUserQuery = `SELECT firstName, lastName, email, password, emailVerified, emailCode, emailCodeTimeout, emailCodeAttempts, profileFinished
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
  const getUsersQuery = `SELECT firstName, lastName, birthDate, bio, instagram, snapchat, tiktok, twitter, facebook
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

// Get all ships' names and IDs.
async function getShipsData(): Promise<[string | null, any]> {
  const getShipsQuery = `SELECT shipId, shipName FROM shipData`;

  try {
    const results = await query(getShipsQuery, []);
    return [null, results];
  } catch (err: any) {
    return [err, null];
  }
}

// Get a ship's name based on its ID.
async function getShipDataById(shipId: number): Promise<[string | null, any]> {
  const getShipQuery = `SELECT shipName FROM shipData WHERE shipId = ?`;

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
  const addCruiseQuery = `INSERT INTO cruiseData (cruiseDeparatureDate, shipId) VALUES (?, ?)`;

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
  const getCruiseQuery = `SELECT cruiseId FROM cruiseData WHERE cruiseDeparatureDate = ? AND shipId = ?`;

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
  const getCruiseDataQuery = `SELECT cruiseId, cruiseDeparatureDate, shipId FROM cruiseData WHERE cruiseId = ?`;

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
  getShipsData,
  getShipDataById,
  addCruise,
  getCruiseByDateAndShip,
  getCruiseById,
  addJoinedCruise,
  deleteJoinedCruise,
  getJoinedCruisesByUser,
  getJoinedCruisesByCruise,
};
