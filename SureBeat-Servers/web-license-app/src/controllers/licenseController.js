const sqlite3 = require('sqlite3').verbose();
const config = require('../../config'); // Ensure this path is correct

const db = new sqlite3.Database(config.databasePath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to database');
    }
});

const listActivatedLicenses = (req, res) => {
    const query = 'SELECT * FROM licenses WHERE macaddress IS NOT NULL';
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
};

const listNonActivatedLicenses = (req, res) => {
    const query = 'SELECT * FROM licenses WHERE macaddress IS NULL';
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
};

// Add other controller functions here...

module.exports = {
    listActivatedLicenses,
    listNonActivatedLicenses,
    // Export other functions here...
};