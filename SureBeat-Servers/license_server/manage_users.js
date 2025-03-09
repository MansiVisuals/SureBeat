const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');
const crypto = require('crypto');

// Retrieve the LICENSE_KEY from the environment variable
const LICENSE_KEY = process.env.LICENSE_KEY;
if (!LICENSE_KEY || LICENSE_KEY.length !== 32) {
    console.error('LICENSE_KEY must be set as a 32-character environment variable.');
    process.exit(1);
}

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Database connected successfully.');
    }
});

// Readline interface for CLI
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Encryption and Decryption Functions
function encrypt(data) {
    const cipher = crypto.createCipheriv('aes-256-cbc', LICENSE_KEY, LICENSE_KEY.slice(0, 16));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(data) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', LICENSE_KEY, LICENSE_KEY.slice(0, 16));
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Function to validate license key format
function isValidLicenseKeyFormat(licenseKey) {
    const licenseKeyRegex = /^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/; // Matches XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
    return licenseKeyRegex.test(licenseKey);
}

// Display the menu
function displayMenu() {
    console.log(`
License Manager:
1. List all licenses
2. Add a license manually (requires license key)
3. Generate a license and add it
4. Reset a license by email or license key (removes MAC UID)
5. Remove a license by email or license key
6. List all trials
7. Remove a trial
8. Delete all trials
9. Exit
`);
    rl.question('Choose an option: ', handleMenu);
}

// Handle user input
function handleMenu(option) {
    switch (option.trim()) {
        case '1':
            listLicenses();
            break;
        case '2':
            addLicenseManually();
            break;
        case '3':
            generateAndAddLicense();
            break;
        case '4':
            resetLicense();
            break;
        case '5':
            removeLicense();
            break;
        case '6':
            listTrials();
            break;
        case '7':
            removeTrial();
            break;
        case '8':
            deleteAllTrials();
            break;
        case '9':
            console.log('Exiting License Manager.');
            db.close();
            rl.close();
            break;
        default:
            console.log('Invalid option. Please try again.');
            displayMenu();
            break;
    }
}

// List all licenses
function listLicenses() {
    console.log('Listing all licenses:');
    db.all('SELECT * FROM Licenses', [], (err, rows) => {
        if (err) {
            console.error('Error retrieving licenses:', err.message);
        } else if (rows.length === 0) {
            console.log('No licenses found.');
        } else {
            rows.forEach((row) => {
                try {
                    const email = decrypt(row.email);
                    const licenseKey = decrypt(row.license_key);
                    const macUid = row.mac_uid ? decrypt(row.mac_uid) : 'None';
                    console.log(`ID: ${row.id}, Email: ${email}, License Key: ${licenseKey}, MAC UID: ${macUid}, Active: ${row.active}`);
                } catch (error) {
                    console.error('Error decrypting data:', error.message);
                }
            });
        }
        displayMenu();
    });
}

// Add a license manually
function addLicenseManually() {
    rl.question('Enter email: ', (email) => {
        rl.question('Enter license key: ', (licenseKey) => {
            if (!isValidLicenseKeyFormat(licenseKey)) {
                console.log('Invalid license key format. It must follow the format XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.');
                return displayMenu();
            }
            const encryptedEmail = encrypt(email);
            const encryptedLicenseKey = encrypt(licenseKey);
            const issueDate = new Date().toISOString();
            db.run(
                'INSERT INTO Licenses (email, license_key, issue_date) VALUES (?, ?, ?)',
                [encryptedEmail, encryptedLicenseKey, issueDate],
                (err) => {
                    if (err) {
                        console.error('Error adding license:', err.message);
                    } else {
                        console.log('License added successfully.');
                    }
                    displayMenu();
                }
            );
        });
    });
}

// Generate a license key
function generateLicenseKey() {
    const parts = [];
    for (let i = 0; i < 5; i++) {
        parts.push(crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 5));
    }
    return parts.join('-');
}

// Generate and add a license with duplicate prevention
function generateAndAddLicense() {
    rl.question('Enter email: ', (email) => {
        // Generate a unique license key
        generateUniqueLicenseKey((licenseKey) => {
            const encryptedEmail = encrypt(email);
            const encryptedLicenseKey = encrypt(licenseKey);
            const issueDate = new Date().toISOString();
            db.run(
                'INSERT INTO Licenses (email, license_key, issue_date) VALUES (?, ?, ?)',
                [encryptedEmail, encryptedLicenseKey, issueDate],
                (err) => {
                    if (err) {
                        console.error('Error adding license:', err.message);
                    } else {
                        console.log(`License generated and added successfully. License Key: ${licenseKey}`);
                    }
                    displayMenu();
                }
            );
        });
    });
}

// Helper function to generate a unique license key
function generateUniqueLicenseKey(callback) {
    const licenseKey = generateLicenseKey();
    const encryptedLicenseKey = encrypt(licenseKey);
    
    // Check if this key already exists in the database
    db.get('SELECT COUNT(*) as count FROM Licenses WHERE license_key = ?', [encryptedLicenseKey], (err, row) => {
        if (err) {
            console.error('Error checking license key:', err.message);
            callback(licenseKey); // Proceed anyway in case of database error
        } else if (row.count > 0) {
            console.log('Generated duplicate key, trying again...');
            generateUniqueLicenseKey(callback); // Try again with a new key
        } else {
            callback(licenseKey); // This key is unique, proceed
        }
    });
}

// Reset a license by email or license key
function resetLicense() {
    rl.question('Enter email or license key to reset the license: ', (identifier) => {
        const query = isValidLicenseKeyFormat(identifier)
            ? 'UPDATE Licenses SET mac_uid = NULL WHERE license_key = ?'
            : 'UPDATE Licenses SET mac_uid = NULL WHERE email = ?';

        const value = isValidLicenseKeyFormat(identifier) ? encrypt(identifier) : encrypt(identifier);

        db.run(query, [value], function (err) {
            if (err) {
                console.error('Error resetting license:', err.message);
            } else if (this.changes === 0) {
                console.log('No license found for the given identifier.');
            } else {
                console.log('License reset successfully.');
            }
            displayMenu();
        });
    });
}

// Remove a license by email or license key
function removeLicense() {
    rl.question('Enter email or license key to remove the license: ', (identifier) => {
        const query = isValidLicenseKeyFormat(identifier)
            ? 'DELETE FROM Licenses WHERE license_key = ?'
            : 'DELETE FROM Licenses WHERE email = ?';

        const value = isValidLicenseKeyFormat(identifier) ? encrypt(identifier) : encrypt(identifier);

        db.run(query, [value], function (err) {
            if (err) {
                console.error('Error removing license:', err.message);
            } else if (this.changes === 0) {
                console.log('No license found for the given identifier.');
            } else {
                console.log('License removed successfully.');
            }
            displayMenu();
        });
    });
}

// List all trials
function listTrials() {
    console.log('Listing all trials:');
    db.all('SELECT * FROM Trials', [], (err, rows) => {
        if (err) {
            console.error('Error retrieving trials:', err.message);
        } else if (rows.length === 0) {
            console.log('No trials found.');
        } else {
            rows.forEach((row) => {
                try {
                    const macUid = decrypt(row.mac_uid);
                    const remainingDays = getRemainingTrialDays(row.start_date);
                    console.log(`ID: ${row.id}, MAC UID: ${macUid}, Start Date: ${row.start_date}, Remaining Days: ${remainingDays}`);
                } catch (error) {
                    console.error('Error decrypting data:', error.message);
                }
            });
        }
        displayMenu();
    });
}

// Remove a trial
function removeTrial() {
    rl.question('Enter MAC UID to remove trial: ', (macUid) => {
        const encryptedMacUid = encrypt(macUid);
        db.run('DELETE FROM Trials WHERE mac_uid = ?', [encryptedMacUid], function (err) {
            if (err) {
                console.error('Error removing trial:', err.message);
            } else if (this.changes === 0) {
                console.log('No trial found with the given MAC UID.');
            } else {
                console.log('Trial removed successfully.');
            }
            displayMenu();
        });
    });
}

// Delete all trials
function deleteAllTrials() {
    rl.question('Are you sure you want to delete all trials? (yes/no): ', (confirmation) => {
        if (confirmation.toLowerCase() === 'yes') {
            db.run('DELETE FROM Trials', function (err) {
                if (err) {
                    console.error('Error deleting all trials:', err.message);
                } else {
                    console.log('All trials deleted successfully.');
                }
                displayMenu();
            });
        } else {
            console.log('Operation canceled.');
            displayMenu();
        }
    });
}

// Helper to calculate remaining trial days
function getRemainingTrialDays(startDate) {
    const trialDuration = 7; // Trial duration in days
    const start = new Date(startDate);
    const now = new Date();
    const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.max(trialDuration - elapsed, 0);
}

// Start the menu
displayMenu();

