const express = require('express');
const router = express.Router();
const trialService = require('../services/trialService');

// Route to add a trial
router.post('/trials', async (req, res) => {
    try {
        const { macUid } = req.body;
        const result = await trialService.addTrial(macUid);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error adding trial', error: error.message });
    }
});

// Route to remove a trial
router.delete('/trials/:macUid', async (req, res) => {
    try {
        const { macUid } = req.params;
        const result = await trialService.removeTrial(macUid);
        if (result) {
            res.status(200).json({ message: 'Trial removed successfully' });
        } else {
            res.status(404).json({ message: 'Trial not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error removing trial', error: error.message });
    }
});

// Route to list all trials
router.get('/trials', async (req, res) => {
    try {
        const trials = await trialService.listTrials();
        res.status(200).json(trials);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving trials', error: error.message });
    }
});

module.exports = router;