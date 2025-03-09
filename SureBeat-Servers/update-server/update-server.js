const express = require("express");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { check, validationResult } = require("express-validator");

const app = express();
const PORT = process.env.PORT || 3000;
const VERSIONS_DIR = path.join(__dirname, "versions");
const API_KEY = "9boChvISunRQvGG63Kz7jVfpwTT24X+7MMf5KovHFnE=";
const FILE_NAME = "SureBeat_main.luac";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later."
});

app.use(helmet());
app.use(cors());
app.use(limiter);

// Middleware to check API key
app.use((req, res, next) => {
    const key = req.headers["x-api-key"];
    if (key !== API_KEY) {
        return res.status(403).json({ error: "Forbidden" });
    }
    next();
});

// List available versions for a platform
app.get("/:platform/versions", [
    check('platform').isIn(['macos', 'windows', 'linux'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { platform } = req.params;
    const platformDir = path.join(VERSIONS_DIR, platform);

    if (!fs.existsSync(platformDir)) {
        return res.status(404).json({ error: "Platform not found" });
    }

    fs.readdir(platformDir, (err, files) => {
        if (err) return res.status(500).json({ error: "Server error" });

        const versions = files.filter(file => 
            fs.statSync(path.join(platformDir, file)).isDirectory()
        );

        res.json({ platform, versions });
    });
});

// Download a specific version for a platform
app.get("/:platform/download/:version", (req, res) => {
    const { platform, version } = req.params;

    if (!["macos", "windows", "linux"].includes(platform)) {
        return res.status(400).json({ error: "Invalid platform" });
    }

    const filePath = path.join(VERSIONS_DIR, platform, version, FILE_NAME);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Version not found" });
    }

    res.download(filePath, FILE_NAME);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Update server running on port ${PORT}`);
});