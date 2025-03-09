const express = require('express');
const router = express.Router();
const licenseService = require('../services/licenseService');

// Route to add a new license
router.post('/licenses', async (req, res) => {
    try {
        const { email, licenseKey } = req.body;
        const result = await licenseService.addLicense(email, licenseKey);
        res.status(201).json({ message: 'License added successfully', result });
    } catch (error) {
        res.status(500).json({ message: 'Error adding license', error: error.message });
    }
});

// Route to remove a license
router.delete('/licenses', async (req, res) => {
    try {
        const { identifier } = req.body; // Can be email or license key
        const result = await licenseService.removeLicense(identifier);
        res.status(200).json({ message: 'License removed successfully', result });
    } catch (error) {
        res.status(500).json({ message: 'Error removing license', error: error.message });
    }
});

// Route to reset a license
router.put('/licenses/reset', async (req, res) => {
    try {
        const { identifier } = req.body; // Can be email or license key
        const result = await licenseService.resetLicense(identifier);
        res.status(200).json({ message: 'License reset successfully', result });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting license', error: error.message });
    }
});

module.exports = router;