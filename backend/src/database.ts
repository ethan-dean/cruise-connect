const mysql = require('mysql2');

const { dbConnectionConfig } = require('./config');

///////////////////////////////////////////////////////////////////////////////////////////
// Create a connection to the database.
const connection = mysql.createConnection(dbConnectionConfig);

// Connect to the database.
connection.connect((err: any) => {
    if (err) {
        console.error('Error connecting to MariaDB:', err.stack);
        return;
    }
    console.error('Connected to MariaDB as id ' + connection.threadId);
});
connection.query('SHOW DATABASES',(err: any, results: any) => {
  if (err) {
    console.error('Error showing databases');
    return;
  }
  console.error(results);
});

///////////////////////////////////////////////////////////////////////////////////////////
// Create user_data table if it does not exist already.
const createUserTableQuery = `
  CREATE TABLE IF NOT EXISTS user_data (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30) NOT NULL
  )`;
connection.query(createUserTableQuery, (err: any, results: any, fields: any) => {
  if (err) {
    console.error('Error creating table:', err.stack);
    return;
  }
  console.log(results);
});

// Check data on startup.
connection.query('SELECT * FROM user_data',(err: any, results: any) => {
  if (err) {
    console.error('Error secting table user_data');
    return;
  }
  console.log(results);
});


///////////////////////////////////////////////////////////////////////////////////////////
// Functions for https server to use to query database.
function handleError(err: any, results: any) {
  if (err) {
    return [err, null];
  }
  return [null, results];
}

// Add user to user_data.
async function addUser(firstName: any, lastName: any) {
  const insertUserQuery = `INSERT INTO user_data (first_name, last_name) 
                             VALUES (?, ?)`;
  connection.query(insertUserQuery, [firstName, lastName], handleError);
}

// Edit user data in user_data.
async function editUser(firstName: any, lastName: any, userID: any) {
  const updateUserQuery = `UPDATE user_data 
                             SET first_name = ?, last_name = ? 
                             WHERE user_id = ?`;
  connection.query(updateUserQuery, [firstName, lastName, userID], handleError);
}


///////////////////////////////////////////////////////////////////////////////////////////
// Function exports for 'database.ts'.
export {
  addUser,
  editUser,
};
