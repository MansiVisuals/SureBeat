const config = {
    database: {
        filename: './database.db',
        driver: 'sqlite3',
    },
    server: {
        port: process.env.PORT || 3000,
        host: 'localhost',
    },
    encryption: {
        algorithm: 'aes-256-cbc',
        key: process.env.LICENSE_KEY,
    },
};

module.exports = config;