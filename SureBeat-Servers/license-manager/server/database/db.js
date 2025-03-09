const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize SQLite database connection
const dbPath = path.resolve(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Database connected successfully.');
    }
});

// Export the database instance for use in other modules
module.exports = db;