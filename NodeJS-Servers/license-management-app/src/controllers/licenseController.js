const sqlite3 = require('sqlite3').verbose();
const config = require('../config');

const db = new sqlite3.Database(config.databasePath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to database');
    }
});

class LicenseController {
    constructor(db) {
        this.db = db;
    }

    async listLicenses(req, res) {
        try {
            const licenses = await this.db.all('SELECT * FROM Licenses');
            res.json(licenses);
        } catch (error) {
            res.status(500).json({ error: 'Error retrieving licenses' });
        }
    }

    async addLicense(req, res) {
        const { email, licenseKey } = req.body;
        if (!email || !licenseKey) {
            return res.status(400).json({ error: 'Email and license key are required' });
        }

        const encryptedEmail = encrypt(email);
        const encryptedLicenseKey = encrypt(licenseKey);
        const issueDate = new Date().toISOString();

        try {
            await this.db.run('INSERT INTO Licenses (email, license_key, issue_date) VALUES (?, ?, ?)', [encryptedEmail, encryptedLicenseKey, issueDate]);
            res.status(201).json({ message: 'License added successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Error adding license' });
        }
    }

    async expireLicense(req, res) {
        const { identifier } = req.body;
        const query = isValidLicenseKeyFormat(identifier)
            ? 'UPDATE Licenses SET active = 0 WHERE license_key = ?'
            : 'UPDATE Licenses SET active = 0 WHERE email = ?';

        const value = isValidLicenseKeyFormat(identifier) ? encrypt(identifier) : encrypt(identifier);

        try {
            const result = await this.db.run(query, [value]);
            if (result.changes === 0) {
                return res.status(404).json({ error: 'No license found for the given identifier' });
            }
            res.json({ message: 'License expired successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Error expiring license' });
        }
    }

    async resetLicense(req, res) {
        const { identifier } = req.body;
        const query = isValidLicenseKeyFormat(identifier)
            ? 'UPDATE Licenses SET mac_uid = NULL WHERE license_key = ?'
            : 'UPDATE Licenses SET mac_uid = NULL WHERE email = ?';

        const value = isValidLicenseKeyFormat(identifier) ? encrypt(identifier) : encrypt(identifier);

        try {
            const result = await this.db.run(query, [value]);
            if (result.changes === 0) {
                return res.status(404).json({ error: 'No license found for the given identifier' });
            }
            res.json({ message: 'License reset successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Error resetting license' });
        }
    }

    async filterLicenses(req, res) {
        const { active } = req.query;
        const query = active === 'true' ? 'SELECT * FROM Licenses WHERE active = 1' : 'SELECT * FROM Licenses WHERE active = 0';

        try {
            const licenses = await this.db.all(query);
            res.json(licenses);
        } catch (error) {
            res.status(500).json({ error: 'Error retrieving licenses' });
        }
    }

    listActivatedLicenses(req, res) {
        const query = 'SELECT * FROM licenses WHERE macaddress IS NOT NULL';
        this.db.all(query, [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ data: rows });
        });
    }
}

module.exports = LicenseController;