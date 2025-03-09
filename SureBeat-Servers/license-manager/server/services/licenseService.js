const db = require('../database/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { isValidLicenseKeyFormat } = require('../utils/validation');

// Function to add a license
async function addLicense(email, licenseKey) {
    if (!isValidLicenseKeyFormat(licenseKey)) {
        throw new Error('Invalid license key format.');
    }
    const encryptedEmail = encrypt(email);
    const encryptedLicenseKey = encrypt(licenseKey);
    const issueDate = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO Licenses (email, license_key, issue_date) VALUES (?, ?, ?)',
            [encryptedEmail, encryptedLicenseKey, issueDate],
            function (err) {
                if (err) {
                    return reject(err);
                }
                resolve({ id: this.lastID, email, licenseKey });
            }
        );
    });
}

// Function to remove a license
async function removeLicense(identifier) {
    const query = isValidLicenseKeyFormat(identifier)
        ? 'DELETE FROM Licenses WHERE license_key = ?'
        : 'DELETE FROM Licenses WHERE email = ?';

    const value = encrypt(identifier);

    return new Promise((resolve, reject) => {
        db.run(query, [value], function (err) {
            if (err) {
                return reject(err);
            }
            resolve(this.changes);
        });
    });
}

// Function to reset a license
async function resetLicense(identifier) {
    const query = isValidLicenseKeyFormat(identifier)
        ? 'UPDATE Licenses SET mac_uid = NULL WHERE license_key = ?'
        : 'UPDATE Licenses SET mac_uid = NULL WHERE email = ?';

    const value = encrypt(identifier);

    return new Promise((resolve, reject) => {
        db.run(query, [value], function (err) {
            if (err) {
                return reject(err);
            }
            resolve(this.changes);
        });
    });
}

// Exporting the functions
module.exports = {
    addLicense,
    removeLicense,
    resetLicense,
};