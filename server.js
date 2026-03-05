// ==========================
// LOAD ENVIRONMENT VARIABLES
// ==========================
require('dotenv').config({
    path: process.env.NODE_ENV === 'production'
        ? '.env.despliegue'
        : '.env'
});

// ==========================
// IMPORTS
// ==========================
const express = require('express');
const cors = require('cors');
const pool = require('./src/config/database');

const authRoutes = require('./src/routes/auth.routes');
const licenseRoutes = require('./src/routes/license.routes');

// ==========================
// CREATE APP
// ==========================
const app = express();

console.log("🚀 MT5 License Server Starting...");

// ==========================
// VERIFY DATABASE
// ==========================
pool.query('SELECT current_database()', (err, result) => {

    if (err) {
        console.error("❌ DB VERIFY ERROR:", err);
    } else {
        console.log("🗄 USING DATABASE:", result.rows[0].current_database);
    }

});

// ==========================
// MIDDLEWARE
// ==========================

const allowedOrigin = process.env.FRONTEND_URL || "*";

app.use(cors({
    origin: allowedOrigin,
    credentials: true
}));

app.use(express.json());

// ==========================
// ROUTES
// ==========================

app.use('/auth', authRoutes);
app.use('/licenses', licenseRoutes);

// Root test
app.get('/', (req, res) => {
    res.json({
        status: "ok",
        message: "MT5 License System Running"
    });
});

// Health check (Railway)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: "healthy"
    });
});

// ==========================
// DATABASE CONNECTION
// ==========================

console.log("🔌 Connecting to database...");

pool.connect()
    .then(client => {
        console.log("✅ Database connected successfully");
        client.release();
    })
    .catch(err => {
        console.error("❌ Database connection error", err);
    });

// ==========================
// START SERVER
// ==========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌍 Server running on port ${PORT}`);
});