const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');

// Import routes
const licenseRoutes = require('./api/licenseRoutes');
const trialRoutes = require('./api/trialRoutes');
const authRoutes = require('./api/authRoutes');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev')); // For logging HTTP requests

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/licenses', licenseRoutes);
app.use('/api/trials', trialRoutes);
app.use('/api/auth', authRoutes);

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Set port and start server
const PORT = process.env.PORT || 6000; // Changed default from 3000 to 6000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});