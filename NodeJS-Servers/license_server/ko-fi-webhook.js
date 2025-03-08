require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const querystring = require('querystring');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Environment variables
const LICENSE_KEY = process.env.LICENSE_KEY;
const KO_FI_SECRET = process.env.KO_FI_SECRET;
const ICLOUD_EMAIL = process.env.ICLOUD_EMAIL;
const ICLOUD_APP_PASSWORD = process.env.ICLOUD_APP_PASSWORD;
const EMAIL_SENDER = 'surebeat@mansivisuals.com'; // Alias email for sending
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'maikel_mansi@hotmail.com'; // Email to receive order notifications

if (!LICENSE_KEY || LICENSE_KEY.length !== 32) {
    console.error('LICENSE_KEY must be set as a 32-character environment variable.');
    process.exit(1);
}

if (!KO_FI_SECRET) {
    console.error('KO_FI_SECRET is required.');
    process.exit(1);
}

if (!ICLOUD_EMAIL || !ICLOUD_APP_PASSWORD) {
    console.error('iCloud email credentials are required.');
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

// Express setup
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Keep this for JSON payloads as well

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

// Function to generate a license key
function generateLicenseKey() {
    return [...Array(5)]
        .map(() => crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 5))
        .join('-');
}

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    host: "smtp.mail.me.com",
    port: 587, // Use STARTTLS
    secure: false, // Use STARTTLS
    auth: {
        user: ICLOUD_EMAIL,
        pass: ICLOUD_APP_PASSWORD
    },
    tls: {
        rejectUnauthorized: true, // Enforce secure TLS
    }
});

// Debug SMTP connection
transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP Connection Error:", error);
    } else {
        console.log("✅ SMTP Server is ready to take messages");
    }
});

// Function to send license email via iCloud SMTP
async function sendLicenseEmail(email, licenseKey) {
    const mailOptions = {
        from: EMAIL_SENDER,
        to: email,
        subject: 'SureBeat License Key (Lifetime)',
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SureBeat License</title>
    <style>
        /* Importing Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400&family=Ubuntu:wght@700&display=swap');

        body {
            font-family: 'Josefin Sans', sans-serif;
            color: #333;
            background-color: #f9f9f9;
            margin: 0;
            padding: 20px;
        }
        .email-container {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            font-family: 'Ubuntu', sans-serif;
            font-size: 24px;
            font-weight: bold;
            color: #333;
            text-align: center;
            margin-bottom: 20px;
        }
        .license-box {
            background-color: #f3f4f6;
            border: 1px solid #ccc;
            padding: 15px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
            color: #2c3e50;
            letter-spacing: 1px;
        }
        .footer {
            font-size: 14px;
            color: #888;
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            Thank you for purchasing SureBeat!
        </div>
        <p>We’re excited for you to experience the full functionality of your new tool.</p>
        
        <div class="license-box">
            SureBeat License Key:<br>
            ${licenseKey}
        </div>

        <p>Please note: This license key is valid for macOS and Windows, but one device at a time.</p>
        
        <p>If you have any questions, need assistance, or require support, feel free to reach out to us at surebeat@mansivisuals.com.</p>
        
        <p>Thank you again for choosing SureBeat, and we hope it enhances your workflow!</p>

        <div class="footer">
            Best regards,<br>
            The SureBeat Team<br>
            Mansi Visuals
        </div>
    </div>
</body>
</html>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ License email sent to ${email}`);
    } catch (error) {
        console.error('❌ Error sending license email:', error);
    }
}

// Function to send order notification email
async function sendOrderNotificationEmail(orderData) {
    const emailSubject = `🛒 New SureBeat Order from ${orderData.from_name}`;
    const emailBody = `
    🔹 New Ko-fi Order Received
    --------------------------------
    💰 Amount: ${orderData.amount} ${orderData.currency}
    📧 Buyer Email: ${orderData.email}
    🛍️ Items: ${orderData.shop_items ? orderData.shop_items.map(item => `- ${item.quantity}x ${item.variation_name}`).join("\n") : "No items data"}
    📦 Shipping: ${orderData.shipping ? orderData.shipping.full_name : "No Shipping Info"}
    🔗 Order Link: ${orderData.url || "No URL provided"}
    --------------------------------
    `;

    const mailOptions = {
        from: EMAIL_SENDER,
        to: NOTIFICATION_EMAIL,
        subject: emailSubject,
        text: emailBody,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Order notification email sent successfully!");
    } catch (error) {
        console.error('❌ Error sending notification email:', error);
    }
}

// Ko-fi Webhook Endpoint
app.post('/ko-fi-webhook', async (req, res) => {
    try {
        console.log('Webhook received:', req.body);  // Use original logging format
        
        // Handle both JSON and form-encoded formats
        const { data } = req.body;
        if (!data) {
            console.log('Invalid payload received: Missing data field');
            return res.status(400).send('Invalid payload');
        }

        // Parse the data field depending on the format
        let parsedData;
        try {
            // First try to parse assuming it's URL-encoded
            const decodedData = querystring.unescape(data);
            parsedData = JSON.parse(decodedData);
        } catch (parseError) {
            // If that fails, try direct parsing (in case it's already JSON)
            try {
                parsedData = typeof data === 'string' 
                    ? JSON.parse(data) 
                    : data;
            } catch (directParseError) {
                console.error('Failed to parse data:', directParseError);
                return res.status(400).send('Invalid JSON format');
            }
        }

        console.log('Parsed Data:', parsedData);  // Match original logging style

        // Verify Ko-fi token
        if (parsedData.verification_token !== KO_FI_SECRET) {
            console.log('Invalid Ko-fi verification token.');
            return res.status(403).send('Forbidden');
        }

        const email = parsedData.email;
        const productId = parsedData.message_id;
        
        // Check for missing required fields
        if (!email || !productId) {
            console.log('Invalid payload: Missing email or product ID');
            return res.status(400).send('Missing email or product ID');
        }

        // Send order notification (this is an enhancement we keep)
        await sendOrderNotificationEmail(parsedData);

        // Check if this is a SureBeat license purchase - looking for BOTH original methods and new methods
        if (productId === 'SureBeat-License-Lifetime' || 
            (parsedData.shop_items && parsedData.shop_items.some(item => 
                item.direct_link_code === '2455c69d4d'))) {
            
            // Generate and store the license
            const licenseKey = generateLicenseKey();
            const encryptedEmail = encrypt(email);
            const encryptedLicenseKey = encrypt(licenseKey);
            const issueDate = new Date().toISOString();

            db.run(
                'INSERT INTO Licenses (email, license_key, issue_date) VALUES (?, ?, ?)',
                [encryptedEmail, encryptedLicenseKey, issueDate],
                (err) => {
                    if (err) {
                        console.error('Error adding license:', err.message);
                        return res.status(500).send('Database error');
                    }

                    console.log(`License generated for ${email}: ${licenseKey}`);
                    sendLicenseEmail(email, licenseKey);
                    res.status(200).send('License issued successfully');
                }
            );
        } else {
            console.log('Not a SureBeat license purchase or invalid product ID');
            return res.status(400).send('Invalid product ID');
        }

    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Internal server error');
    }
});

// Start Express server
const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
    console.log(`🚀 Ko-fi Webhook Server running on port ${PORT}`);
});
