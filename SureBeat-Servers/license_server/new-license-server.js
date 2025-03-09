const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
const port = 4000;

// Middleware for parsing JSON payloads
app.use(bodyParser.json());

// Secure API key
const API_KEY = "9boChvISunRQvGG63Kz7jVfpwTT24X+7MMf5KovHFnE=";

// LICENSE_KEY for encryption/decryption
const LICENSE_KEY = process.env.LICENSE_KEY;
if (!LICENSE_KEY || LICENSE_KEY.length !== 32) {
  console.error(
    "LICENSE_KEY must be set as a 32-character environment variable."
  );
  process.exit(1);
}

// Initialize SQLite database
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Database connected successfully.");
    initializeDatabase();
  }
});

// Constants
const TRIAL_DURATION_DAYS = 7;

// Helper Functions
function encrypt(data) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    LICENSE_KEY,
    LICENSE_KEY.slice(0, 16)
  );
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decrypt(data) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    LICENSE_KEY,
    LICENSE_KEY.slice(0, 16)
  );
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function getRemainingTrialDays(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.max(TRIAL_DURATION_DAYS - elapsed, 0);
}

function isValidLicenseKey(key) {
  return /^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/.test(key) || key === "trial";
}

function isValidMacUid(mac) {
  // Accept both ":" and "-" as separators for MAC addresses
  return /^[a-fA-F0-9:-]+$/.test(mac);
}

// Initialize the database with required tables
function initializeDatabase() {
  db.run(
    `CREATE TABLE IF NOT EXISTS Licenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            license_key TEXT NOT NULL,
            mac_uid TEXT,
            issue_date TEXT NOT NULL,
            active INTEGER DEFAULT 1
        )`,
    (err) => {
      if (err) {
        console.error("Error creating Licenses table:", err.message);
      } else {
        console.log("Licenses table initialized.");
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS Trials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mac_uid TEXT NOT NULL,
            start_date TEXT NOT NULL,
            active INTEGER DEFAULT 1
        )`,
    (err) => {
      if (err) {
        console.error("Error creating Trials table:", err.message);
      } else {
        console.log("Trials table initialized.");
      }
    }
  );
}

// Middleware to validate API key
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(403).json({ status: "error", message: "Invalid API key." });
  }
  next();
});

// Endpoint: Activate Trial or License
app.post("/activate-license", (req, res) => {
  const { licenseKey, macUid } = req.body;

  if (!licenseKey || !macUid) {
    return res
      .status(400)
      .json({ status: "error", message: "License key and UUID are required." });
  }

  if (!isValidLicenseKey(licenseKey) || !isValidMacUid(macUid)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid license key or UUID format.",
    });
  }

  const encryptedMacUid = encrypt(macUid);

  if (licenseKey === "trial") {
    // Trial activation logic
    db.get("SELECT * FROM Trials WHERE mac_uid = ?", [encryptedMacUid], (err, row) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ status: "error", message: "Database error." });
      }

      if (row) {
        const remainingDays = getRemainingTrialDays(row.start_date);
        if (remainingDays > 0) {
          return res.json({
            status: "success",
            message: `Trial is active. ${remainingDays} days remaining.`,
          });
        } else {
          return res.status(400).json({
            status: "error",
            message: "Trial expired. Please purchase a license.",
          });
        }
      }

      const startDate = new Date().toISOString();
      db.run(
        "INSERT INTO Trials (mac_uid, start_date, active) VALUES (?, ?, 1)",
        [encryptedMacUid, startDate],
        function (err) {
          if (err) {
            console.error("Database error:", err.message);
            return res
              .status(500)
              .json({ status: "error", message: "Database error." });
          }

          return res.json({
            status: "success",
            message: `Trial activated successfully. ${TRIAL_DURATION_DAYS} days remaining.`,
          });
        }
      );
    });
  } else {
    // License activation logic
    db.get("SELECT * FROM Licenses WHERE license_key = ?", [encrypt(licenseKey)], (err, row) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ status: "error", message: "Database error." });
      }

      if (!row) {
        return res.status(404).json({ status: "error", message: "License not found." });
      }

      if (row.mac_uid) {
        if (row.mac_uid === encryptedMacUid) {
          return res.json({
            status: "success",
            message: "License already activated on this device.",
          });
        } else {
          return res.status(400).json({
            status: "error",
            message: "License limit exceeded. Contact support.",
          });
        }
      }

      db.run(
        "UPDATE Licenses SET mac_uid = ? WHERE license_key = ?",
        [encryptedMacUid, encrypt(licenseKey)],
        function (err) {
          if (err) {
            console.error("Database error:", err.message);
            return res
              .status(500)
              .json({ status: "error", message: "Database error." });
          }

          return res.json({
            status: "success",
            message: "License activated successfully.",
          });
        }
      );
    });
  }
});

// Endpoint: Validate License
app.post("/validate", (req, res) => {
  const { licenseKey, macUid } = req.body;

  if (!licenseKey || !macUid) {
    return res
      .status(400)
      .json({ status: "error", message: "License key and UUID are required." });
  }

  if (!isValidLicenseKey(licenseKey) || !isValidMacUid(macUid)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid license key or UUID format.",
    });
  }

  const encryptedMacUid = encrypt(macUid);

  if (licenseKey === "trial") {
    db.get("SELECT * FROM Trials WHERE mac_uid = ?", [encryptedMacUid], (err, row) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ status: "error", message: "Database error." });
      }

      if (!row) {
        return res.status(404).json({ status: "error", message: "Trial not found." });
      }

      const remainingDays = getRemainingTrialDays(row.start_date);
      if (remainingDays > 0) {
        return res.json({
          status: "success",
          message: `Trial is active. ${remainingDays} days remaining.`,
        });
      } else {
        return res.status(400).json({
          status: "error",
          message: "Trial expired. Please purchase a license.",
        });
      }
    });
  } else {
    db.get("SELECT * FROM Licenses WHERE license_key = ?", [encrypt(licenseKey)], (err, row) => {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).json({ status: "error", message: "Database error." });
      }

      if (!row) {
        return res.status(404).json({ status: "error", message: "License not found." });
      }

      if (row.mac_uid && row.mac_uid !== encryptedMacUid) {
        return res.status(400).json({
          status: "error",
          message: "License is activated on another device. Contact support.",
        });
      }
      
      // Add this code to update MAC address if license was reset (mac_uid is empty)
      if (!row.mac_uid) {
        db.run(
          "UPDATE Licenses SET mac_uid = ? WHERE license_key = ?",
          [encryptedMacUid, encrypt(licenseKey)],
          function (err) {
            if (err) {
              console.error("Database error when updating MAC:", err.message);
              // Continue processing despite the error to avoid blocking the user
            } else {
              console.log(`Re-associated license ${licenseKey} with new MAC address after reset`);
            }
          }
        );
      }

      return res.json({
        status: "success",
        message: "License is valid.",
      });
    });
  }
});

// Endpoint: Deactivate License
app.post("/deactivate-license", (req, res) => {
  const { licenseKey, macUid } = req.body;

  if (!licenseKey || !macUid) {
    return res
      .status(400)
      .json({ status: "error", message: "License key and UUID are required." });
  }

  if (!isValidLicenseKey(licenseKey) || !isValidMacUid(macUid)) {
    return res.status(400).json({
      status: "error",
      message: "Invalid license key or UUID format.",
    });
  }

  // Trial licenses cannot be deactivated
  if (licenseKey === "trial") {
    return res.status(400).json({
      status: "error",
      message: "Trial licenses cannot be deactivated.",
    });
  }

  const encryptedLicenseKey = encrypt(licenseKey);
  const encryptedMacUid = encrypt(macUid);

  // Check if license exists and is activated on the provided MAC UID
  db.get("SELECT * FROM Licenses WHERE license_key = ?", [encryptedLicenseKey], (err, row) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ status: "error", message: "Database error." });
    }

    if (!row) {
      return res.status(404).json({ status: "error", message: "License not found." });
    }

    if (!row.mac_uid) {
      return res.status(400).json({
        status: "error", 
        message: "License is not activated on any device."
      });
    }

    if (row.mac_uid !== encryptedMacUid) {
      return res.status(400).json({
        status: "error",
        message: "License is activated on a different device. Contact Support..",
      });
    }

    // Deactivate the license by clearing the MAC UID
    db.run(
      "UPDATE Licenses SET mac_uid = NULL WHERE license_key = ? AND mac_uid = ?",
      [encryptedLicenseKey, encryptedMacUid],
      function(err) {
        if (err) {
          console.error("Database error:", err.message);
          return res.status(500).json({ status: "error", message: "Database error." });
        }

        if (this.changes === 0) {
          return res.status(400).json({
            status: "error", 
            message: "Deactivation failed. License not found or already deactivated."
          });
        }

        console.log(`License ${licenseKey} deactivated from device with UUID ${macUid}`);
        return res.json({
          status: "success",
          message: "License successfully deactivated.",
        });
      }
    );
  });
});

// Error-handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({
      status: "error",
      message: "Invalid JSON payload.",
    });
  }

  console.error(err);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error.",
  });
});

// Start the server
app.listen(port, "127.0.0.1", () => {
  console.log(`License server running on port ${port}`);
});

