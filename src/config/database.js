const { Pool } = require('pg');
require('dotenv').config();

// ==========================
// DATABASE CONFIG
// ==========================

let pool;

if (process.env.DATABASE_URL) {

    // 🚀 PRODUCCIÓN (Railway / cloud)
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    console.log("🌐 Using DATABASE_URL connection");

} else {

    // 💻 DESARROLLO LOCAL
    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT
    });

    console.log("💻 Using local database connection");

}

module.exports = pool;