TODO: Write this...

# Initial DB Data Folder
Each DB table that is used by this application is able, but not required to, have a matching [TABLE_NAME].json file to give it initial data.

- The json file must have an identical name matching the name of the table
- The json file must have a top level member "data", that is an array where all of the row data is stored
- Each object in the json array must have all fields necessary to create a row in the table
