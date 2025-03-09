const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const config = require('../config'); // Updated path

const app = express();
const PORT = process.env.PORT || 6000;

const db = new sqlite3.Database(config.databasePath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to database');
    }
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../public')));

// Routes
const licenseRoutes = require('./routes/licenseRoutes')(db);
app.use('/api/licenses', licenseRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});