const { isValidLicenseKeyFormat } = require('./validation');

// Function to validate input for adding a license
function validateAddLicenseInput(email, licenseKey) {
    if (!email || !licenseKey) {
        return { valid: false, message: 'Email and license key are required.' };
    }
    if (!isValidLicenseKeyFormat(licenseKey)) {
        return { valid: false, message: 'Invalid license key format. It must follow the format XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.' };
    }
    return { valid: true };
}

// Function to validate input for removing a license
function validateRemoveLicenseInput(identifier) {
    if (!identifier) {
        return { valid: false, message: 'Identifier (email or license key) is required.' };
    }
    return { valid: true };
}

// Function to validate input for expiring a license
function validateExpireLicenseInput(identifier) {
    if (!identifier) {
        return { valid: false, message: 'Identifier (email or license key) is required.' };
    }
    return { valid: true };
}

module.exports = {
    validateAddLicenseInput,
    validateRemoveLicenseInput,
    validateExpireLicenseInput,
};