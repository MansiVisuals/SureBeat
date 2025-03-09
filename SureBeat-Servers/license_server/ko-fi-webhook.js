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
async function sendLicenseEmail(email, licenseKey, orderUrl) {
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
        
        <p>Your order details: <a href="${orderUrl}">${orderUrl}</a></p>
        
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
    // Get all purchased products
    let purchasedItems = [];
    let containsLicense = false;
    let recommendLatestVersion = false;
    
    if (orderData.shop_items && orderData.shop_items.length > 0) {
        // Process all items in the order
        orderData.shop_items.forEach(item => {
            const productDetails = getProductDetails(item.direct_link_code);
            purchasedItems.push({
                ...productDetails,
                quantity: item.quantity || 1,
                code: item.direct_link_code
            });
            
            // Check if any item is a license
            if (productDetails.isLicense) {
                containsLicense = true;
            }
            
            // Check if we should recommend an upgrade (any older version purchased)
            if (item.direct_link_code !== '14a81d5424' && !productDetails.isLicense) {
                recommendLatestVersion = true;
            }
        });
    }
    
    const orderUrl = orderData.url || '#';
    
    // Generate HTML for products list
    const productsHtml = purchasedItems.map(item => 
        `<div class="product-item">
            <strong>${item.name}</strong> (Qty: ${item.quantity})
        </div>`
    ).join('');
    
    const mailOptions = {
        from: EMAIL_SENDER,
        to: email,
        subject: `Thank you for your SureBeat purchase!`,
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
            border-radius: 8px;
            margin: 20px 0;
            color: #2c3e50;
        }
        .product-item {
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .product-item:last-child {
            border-bottom: none;
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
        <p>Thank you for your purchase. We hope our products help enhance your creative workflow!</p>
        
        <div class="info-box">
            <h3>Your Purchase:</h3>
            ${productsHtml}
            <div style="margin-top: 10px; border-top: 1px solid #ccc; padding-top: 10px;">
                <strong>Total Amount:</strong> ${orderData.amount} ${orderData.currency}
            </div>
        </div>
        
        <p>Your order details: <a href="${orderUrl}">${orderUrl}</a></p>
        
        ${recommendLatestVersion ? `
        <div class="upgrade-box">
            <strong>Looking for the latest version?</strong><br>
            You've purchased an older version of SureBeat. Our newest version is v3.0.0 with improved features and compatibility.<br><br>
            <a href="https://ko-fi.com/s/14a81d5424">Click here to get SureBeat v3.0.0 for DaVinci Resolve Studio (macOS & Windows)</a>
        </div>` : ''}
        
        ${containsLicense ? `<p><strong>Note:</strong> License key(s) will be sent in a separate email.</p>` : ''}
        
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

// Function to send license generation confirmation to admin
async function sendLicenseGenerationNotification(email, amount, currency, licenseKey) {
    const emailSubject = `✅ SureBeat License Generated`;
    
    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SureBeat License Generated</title>
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
        .license-box {
            background-color: #f3f4f6;
            border: 1px solid #ccc;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #2c3e50;
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
            SureBeat License Generated Successfully
        </div>
        
        <div class="license-box">
            <div class="detail-row">
                <div class="detail-label">Amount:</div>
                <div>${amount} ${currency}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div>${email}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">License:</div>
                <div>${licenseKey}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Date:</div>
                <div>${new Date().toLocaleString()}</div>
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
        console.log("✅ License generation notification sent to admin");
    } catch (error) {
        console.error('❌ Error sending license notification email:', error);
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
        console.log('Webhook received:', req.body);
        
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

        console.log('Parsed Data:', parsedData);

        // Verify Ko-fi token
        if (parsedData.verification_token !== KO_FI_SECRET) {
            console.log('Invalid Ko-fi verification token.');
            return res.status(403).send('Forbidden');
        }

        const email = parsedData.email;
        const productId = parsedData.message_id;
        const customerName = parsedData.from_name || 'Customer';
        const orderUrl = parsedData.url || '';
        
        // Check for missing required fields
        if (!email || !productId) {
            console.log('Invalid payload: Missing email or product ID');
            return res.status(400).send('Missing email or product ID');
        }

        // Send notification email with order details to admin
        await sendOrderNotificationEmail(parsedData);

        // First send general purchase confirmation for all items
        await sendPurchaseConfirmationEmail(email, customerName, parsedData);
        
        // Then check if any of the purchased items is a license and process it
        let licensePurchased = false;
        
        if (parsedData.shop_items && parsedData.shop_items.length > 0) {
            for (const item of parsedData.shop_items) {
                // Check if this item is a license product
                if (item.direct_link_code === '2455c69d4d') {
                    licensePurchased = true;
                    
                    // Process license for each license quantity
                    const quantity = item.quantity || 1;
                    for (let i = 0; i < quantity; i++) {
                        // Generate and store the license
                        const licenseKey = generateLicenseKey();
                        const encryptedEmail = encrypt(email);
                        const encryptedLicenseKey = encrypt(licenseKey);
                        const issueDate = new Date().toISOString();

                        // Using promises for better async handling
                        await new Promise((resolve, reject) => {
                            db.run(
                                'INSERT INTO Licenses (email, license_key, issue_date) VALUES (?, ?, ?)',
                                [encryptedEmail, encryptedLicenseKey, issueDate],
                                async (err) => {
                                    if (err) {
                                        console.error('Error adding license:', err.message);
                                        reject(err);
                                        return;
                                    }

                                    console.log(`License generated for ${email}: ${licenseKey}`);
                                    
                                    // Send license email to customer with order link
                                    await sendLicenseEmail(email, licenseKey, orderUrl);
                                    
                                    // Send admin notification about successful license generation
                                    await sendLicenseGenerationNotification(
                                        email, 
                                        parsedData.amount, 
                                        parsedData.currency, 
                                        licenseKey
                                    );
                                    
                                    resolve();
                                }
                            );
                        });
                    }
                }
            }
        }

        res.status(200).send('Order processed successfully');

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
