const db = require('../database/db');

// Function to add a trial
function addTrial(macUid) {
    return new Promise((resolve, reject) => {
        const startDate = new Date().toISOString();
        db.run('INSERT INTO Trials (mac_uid, start_date) VALUES (?, ?)', [macUid, startDate], function(err) {
            if (err) {
                return reject(err);
            }
            resolve(this.lastID);
        });
    });
}

// Function to remove a trial
function removeTrial(macUid) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM Trials WHERE mac_uid = ?', [macUid], function(err) {
            if (err) {
                return reject(err);
            }
            resolve(this.changes);
        });
    });
}

// Exporting the functions
module.exports = {
    addTrial,
    removeTrial
};