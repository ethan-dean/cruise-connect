import fs from 'fs';
import path from 'path';
import { Connection } from 'mysql2/promise';

async function setupTable(connection: Connection, createTableQuery: string) {
  const match = createTableQuery.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
  const tableName = match ? match[1] : null;
  if (!tableName) {
    console.error('Error: Unable to extract table name from query.');
    return;
  }

  try {
    const [results] = await connection.query(`SHOW TABLES LIKE ?`, [tableName]);
    if (Array.isArray(results) && results.length > 0) {
      console.log(`${tableName} already exists.`);
    } else {
      console.log(`${tableName} does not exist. Creating...`);
      await createTableAndLoadData(connection, tableName, createTableQuery);
    }

    const [records] = await connection.query(`SELECT * FROM ${tableName}`);
    console.log(`${tableName} records:`, records);
  } catch (err) {
    console.error(`Error processing ${tableName}:`, err);
  }
}

async function createTableAndLoadData(connection: Connection, tableName: string, createTableQuery: string) {
  try {
    await connection.query(createTableQuery);
    console.log(`${tableName} table created successfully.`);

    const filePath = path.join(process.cwd(), 'src/initialDbData', `${tableName}.json`);
    if (fs.existsSync(filePath)) {
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (jsonData && Array.isArray(jsonData.data)) {
        await insertInitialData(connection, tableName, jsonData.data);
      } else {
        console.warn(`Warning: No valid array found in ${tableName}.json.`);
      }
    } else {
      console.log(`No initial data file found for ${tableName} in ${filePath}.`);
    }
  } catch (err) {
    console.error(`Error creating ${tableName} table:`, err);
  }
}

async function insertInitialData(connection: Connection, tableName: string, records: any[]) {
  if (records.length === 0) return;

  const columns = Object.keys(records[0]);
  const placeholders = columns.map(() => '?').join(',');
  const query = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

  try {
    for (const record of records) {
      const values = columns.map((col) => record[col]);
      await connection.query(query, values);
    }
    console.log(`Inserted ${records.length} records into ${tableName}.`);
  } catch (err) {
    console.error(`Error inserting into ${tableName}:`, err);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
// Exports for 'setupTable.ts'.
export { 
  setupTable,
};
