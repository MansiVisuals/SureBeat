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
    // Get product details if available
    let productDetails = { name: 'Unknown Product', isLicense: false };
    if (orderData.shop_items && orderData.shop_items.length > 0) {
        productDetails = getProductDetails(orderData.shop_items[0].direct_link_code);
    }
    
    const emailSubject = `🛒 New SureBeat Order: ${productDetails.name} from ${orderData.from_name}`;
    
    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New SureBeat Order</title>
    <style>
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
        .order-box {
            background-color: #f3f4f6;
            border: 1px solid #ccc;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #2c3e50;
        }
        .order-details {
            margin-top: 15px;
        }
        .detail-row {
            display: flex;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
        }
        .detail-label {
            font-weight: bold;
            width: 130px;
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
            New SureBeat Order Received
        </div>
        
        <div class="order-box">
            <div class="detail-row">
                <div class="detail-label">Product:</div>
                <div>${productDetails.name}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Amount:</div>
                <div>${orderData.amount} ${orderData.currency}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Customer:</div>
                <div>${orderData.from_name}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div>${orderData.email}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Date:</div>
                <div>${new Date(orderData.timestamp).toLocaleString()}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Order ID:</div>
                <div>${orderData.kofi_transaction_id}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Order Link:</div>
                <div><a href="${orderData.url}">${orderData.url}</a></div>
            </div>
        </div>
        
        <div class="footer">
            This is an automated notification from the SureBeat Ko-fi webhook.
        </div>
    </div>
</body>
</html>`;

    const mailOptions = {
        from: EMAIL_SENDER,
        to: NOTIFICATION_EMAIL,
        subject: emailSubject,
        html: emailHtml,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Order notification email sent successfully!");
    } catch (error) {
        console.error('❌ Error sending notification email:', error);
    }
}

// Function to send purchase confirmation email for non-license products
async function sendPurchaseConfirmationEmail(email, customerName, orderData) {
    // Get product details
    let productDetails = { name: 'Unknown Product', isLicense: false, version: 'unknown' };
    let productCode = '';
    
    if (orderData.shop_items && orderData.shop_items.length > 0) {
        productCode = orderData.shop_items[0].direct_link_code;
        productDetails = getProductDetails(productCode);
    }
    
    // Determine if we should recommend the latest version
    const shouldRecommendUpgrade = productCode !== '14a81d5424' && !productDetails.isLicense;
    
    const mailOptions = {
        from: EMAIL_SENDER,
        to: email,
        subject: `Thank you for purchasing ${productDetails.name}!`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SureBeat Purchase Confirmation</title>
    <style>
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
        .info-box {
            background-color: #f3f4f6;
            border: 1px solid #ccc;
            padding: 15px;
            font-size: 18px;
            text-align: center;
            border-radius: 8px;
            margin: 20px 0;
            color: #2c3e50;
        }
        .upgrade-box {
            background-color: #edf7ed;
            border: 1px solid #c3e6cb;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #155724;
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
        <p>Hello ${customerName},</p>
        <p>Thank you for your purchase of ${productDetails.name}. We hope it helps enhance your creative workflow!</p>
        
        <div class="info-box">
            Your Purchase:<br>
            ${productDetails.name}<br>
            Amount: ${orderData.amount} ${orderData.currency}
        </div>
        
        ${shouldRecommendUpgrade ? `
        <div class="upgrade-box">
            <strong>Looking for the latest version?</strong><br>
            You've purchased SureBeat v${productDetails.version}. Our newest version is v3.0.0 with improved features and compatibility.<br><br>
            <a href="https://ko-fi.com/s/14a81d5424">Click here to get SureBeat v3.0.0 for DaVinci Resolve Studio (macOS & Windows)</a>
        </div>` : ''}
        
        <p>If you have any questions, need assistance, or require support, feel free to reach out to us at surebeat@mansivisuals.com.</p>
        
        <p>Thank you again for choosing SureBeat!</p>

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
        console.log(`✅ Purchase confirmation email sent to ${email}`);
    } catch (error) {
        console.error('❌ Error sending purchase confirmation email:', error);
    }
}

// Product mapping function
function getProductDetails(directLinkCode) {
    const products = {
        '2455c69d4d': {
            name: 'SureBeat - License Lifetime for macOS and Windows',
            isLicense: true,
            version: '3.0.0'
        },
        '14a81d5424': {
            name: 'SureBeat v3.0.0 - DaVinci Resolve Studio - macOS & Windows',
            isLicense: false,
            version: '3.0.0'
        },
        '66c8c6416f': {
            name: 'SureBeat v2.1 - DaVinci Resolve Studio - macOS',
            isLicense: false,
            version: '2.1'
        },
        '28e900a30b': {
            name: 'SureBeat v2.1 - DaVinci Resolve Studio - Windows',
            isLicense: false,
            version: '2.1'
        },
        '88eb63a912': {
            name: 'SureBeat v0.0.2',
            isLicense: false,
            version: '0.0.2',
            redirected: true
        }
    };
    
    return products[directLinkCode] || {
        name: 'Unknown SureBeat Product',
        isLicense: false,
        version: 'unknown'
    };
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
        const customerName = parsedData.from_name || 'Customer';
        
        // Check for missing required fields
        if (!email || !productId) {
            console.log('Invalid payload: Missing email or product ID');
            return res.status(400).send('Missing email or product ID');
        }

        // Send order notification to admin
        await sendOrderNotificationEmail(parsedData);

        // Check if this is a SureBeat license purchase
        const isLicensePurchase = (productId === 'SureBeat-License-Lifetime' || 
            (parsedData.shop_items && parsedData.shop_items.some(item => 
                item.direct_link_code === '2455c69d4d')));
                
        if (isLicensePurchase) {
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
            // For non-license purchases, send a product purchase confirmation email
            await sendPurchaseConfirmationEmail(email, customerName, parsedData);
            res.status(200).send('Purchase processed successfully');
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
