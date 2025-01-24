import fs from 'fs';
import path from 'path';
const mysql = require('mysql2');


function setupTable(connection: any, createTableQuery: string) {
  // Extract table name from the query
  const match = createTableQuery.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
  const tableName = match ? match[1] : null;
  if (!tableName) {
    console.error('Error: Unable to extract table name from query.');
    return;
  }

  // Check if the table exists
  const showTablesQuery = `SHOW TABLES LIKE '${tableName}'`;
  connection.query(showTablesQuery, (err: any, results: any) => {
    if (err) {
      console.error(`Error checking ${tableName} existence:`, err.stack);
      return;
    }

    if (results.length > 0) {
      console.log(`${tableName} already exists.`);
    } else {
      console.log(`${tableName} does not exist. Creating...`);
      createTableAndLoadData(connection, tableName, createTableQuery);
    }

    // Log existing records on startup (for debugging)
    connection.query(`SELECT * FROM ${tableName}`, (err: any, results: any) => {
      if (err) {
        console.error(`Error querying ${tableName}:`, err.stack);
        return;
      }
      console.log(`${tableName} records:`, results);
    });
  });
}

function createTableAndLoadData(connection: any, tableName: string, createTableQuery: string) {
  connection.query(createTableQuery, (err: any) => {
    if (err) {
      console.error(`Error creating ${tableName} table:`, err.stack);
      return;
    }
    console.log(`${tableName} table created successfully.`);

    // Try to load initial data from JSON
    const filePath = path.join(__dirname, '../initialDbData', `${tableName}.json`);
    if (fs.existsSync(filePath)) {
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (jsonData && Array.isArray(jsonData.data)) {
        insertInitialData(connection, tableName, jsonData.data);
      } else {
        console.warn(`Warning: No valid array found in ${tableName}.json.`);
      }
    } else {
      console.log(`No initial data file found for ${tableName} in ${filePath}.`);
    }
  });
}

function insertInitialData(connection: any, tableName: string, records: any[]) {
  if (records.length === 0) return;

  const columns = Object.keys(records[0]);
  const placeholders = columns.map(() => '?').join(',');
  const query = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

  records.forEach((record) => {
    const values = columns.map((col) => record[col]);
    connection.query(query, values, (err: any) => {
      if (err) {
        console.error(`Error inserting into ${tableName}:`, err.stack);
      }
    });
  });

  console.log(`Inserted ${records.length} records into ${tableName}.`);
}

///////////////////////////////////////////////////////////////////////////////////////////
// Exports for 'setupTable.ts'.
export {
  setupTable,
};
