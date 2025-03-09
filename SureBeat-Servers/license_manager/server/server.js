const express = require('express');
const bodyParser = require('body-parser');
const licenseRoutes = require('./api/licenseRoutes');
const trialRoutes = require('./api/trialRoutes');
const authRoutes = require('./api/authRoutes');
const db = require('./database/db');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/licenses', licenseRoutes);
app.use('/api/trials', trialRoutes);
app.use('/api/auth', authRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle database connection errors
db.on('error', (err) => {
    console.error('Database connection error:', err.message);
});