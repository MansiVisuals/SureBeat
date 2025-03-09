const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');

// Route to list all licenses
router.get('/licenses', licenseController.listLicenses.bind(licenseController));

// Route to add a license
router.post('/licenses', licenseController.addLicense.bind(licenseController));

// Route to expire a license
router.put('/licenses/expire', licenseController.expireLicense.bind(licenseController));

// Route to reset a license
router.put('/licenses/reset', licenseController.resetLicense.bind(licenseController));

// Route to filter activated licenses
router.get('/licenses/activated', licenseController.listActivatedLicenses);

// Route to filter non-activated licenses
router.get('/licenses/non-activated', licenseController.listNonActivatedLicenses.bind(licenseController));

module.exports = router;