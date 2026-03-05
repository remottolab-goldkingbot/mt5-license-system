const pool = require('../config/database');
const crypto = require('crypto');

// ==========================
// GENERATE LICENSE KEY
// ==========================
const generateLicenseKey = () => {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
};

// ==========================
// CREATE LICENSE (AUTO CREATE USER)
// ==========================
const createLicense = async (req, res) => {

    const { name, email, phone, plan } = req.body;

    try {

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required"
            });
        }

        // ==========================
        // CALCULATE EXPIRATION
        // ==========================

        let expiresAt = null;

        if (plan === "monthly") {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        if (plan === "yearly") {
            expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // ==========================
        // CHECK USER
        // ==========================

        let user = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        let userId;

        if (user.rows.length === 0) {

            const newUser = await pool.query(
                `INSERT INTO users (name, email, phone)
                 VALUES ($1,$2,$3)
                 RETURNING *`,
                [name, email, phone]
            );

            userId = newUser.rows[0].id;

        } else {

            userId = user.rows[0].id;

        }

        // ==========================
        // CREATE LICENSE
        // ==========================

        const licenseKey = generateLicenseKey();

        const newLicense = await pool.query(
            `INSERT INTO licenses (user_id, license_key, expires_at)
             VALUES ($1,$2,$3)
             RETURNING *`,
            [userId, licenseKey, expiresAt]
        );

        res.status(201).json({
            message: "License created successfully",
            license: newLicense.rows[0]
        });

    } catch (error) {

        console.error("CREATE LICENSE ERROR:", error);
        res.status(500).json({ message: "Server error" });

    }
};


// ==========================
// UPDATE LICENSE STATUS
// ==========================
const updateLicenseStatus = async (req, res) => {

    const { id } = req.params;
    const { status } = req.body;

    try {

        if (!['active','inactive'].includes(status)) {

            return res.status(400).json({
                message: "Invalid status"
            });

        }

        const updatedLicense = await pool.query(
            `UPDATE licenses
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );

        if (updatedLicense.rows.length === 0) {

            return res.status(404).json({
                message: "License not found"
            });

        }

        res.json({
            message: "License updated successfully",
            license: updatedLicense.rows[0]
        });

    } catch (error) {

        console.error("UPDATE LICENSE ERROR:", error);
        res.status(500).json({ message: "Server error" });

    }
};


// ==========================
// VALIDATE LICENSE + UPDATE LAST_SEEN
// ==========================
const validateLicense = async (req, res) => {

    const { license_key, account_number } = req.body;

    if (!license_key || !account_number) {

        return res.status(400).json({
            valid:false,
            message:"License key and account number required"
        });

    }

    try {

        const result = await pool.query(
            "SELECT * FROM licenses WHERE license_key = $1",
            [license_key]
        );

        if (result.rows.length === 0) {
            return res.json({ valid:false });
        }

        const license = result.rows[0];

        if (license.status !== 'active') {
            return res.json({ valid:false });
        }

        // ==========================
        // LICENSE EXPIRATION CHECK
        // ==========================

        if (license.expires_at && new Date() > new Date(license.expires_at)) {

            return res.json({
                valid:false,
                message:"License expired"
            });

        }

        // ==========================
        // FIRST ACTIVATION
        // ==========================

        if (!license.account_number) {

            await pool.query(
                `UPDATE licenses
                 SET account_number=$1,
                 last_seen=NOW()
                 WHERE id=$2`,
                [account_number, license.id]
            );

            return res.json({ valid:true });

        }

        // ==========================
        // ACCOUNT VALIDATION
        // ==========================

        if (license.account_number != account_number) {
            return res.json({ valid:false });
        }

        // ==========================
        // UPDATE HEARTBEAT
        // ==========================

        await pool.query(
            `UPDATE licenses
             SET last_seen = NOW()
             WHERE id = $1`,
            [license.id]
        );

        return res.json({ valid:true });

    } catch (error) {

        console.error("VALIDATE LICENSE ERROR:", error);
        return res.status(500).json({ valid:false });

    }

};


// ==========================
// LIST ALL LICENSES (ADMIN)
// ==========================
const getAllLicenses = async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT 
                l.id,
                l.license_key,
                l.status,
                l.account_number,
                l.created_at,
                l.last_seen,
                l.expires_at,
                u.name,
                u.email,
                u.phone
             FROM licenses l
             JOIN users u ON l.user_id = u.id
             ORDER BY l.created_at DESC`
        );

        res.json(result.rows);

    } catch (error) {

        console.error("GET ALL LICENSES ERROR:", error);
        res.status(500).json({ message:"Server error" });

    }

};


// ==========================
// GET LICENSES BY USER
// ==========================
const getLicensesByUser = async (req, res) => {

    const { user_id } = req.params;

    try {

        const result = await pool.query(
            `SELECT 
                id,
                license_key,
                status,
                account_number,
                created_at,
                last_seen,
                expires_at
             FROM licenses
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [user_id]
        );

        res.json(result.rows);

    } catch (error) {

        console.error("GET LICENSES BY USER ERROR:", error);
        res.status(500).json({ message:"Server error" });

    }

};


// ==========================
// RESET LICENSE ACCOUNT
// ==========================
const resetLicenseAccount = async (req, res) => {

    const { id } = req.params;

    try {

        await pool.query(
            `UPDATE licenses
             SET account_number = NULL,
                 last_seen = NULL
             WHERE id = $1`,
            [id]
        );

        res.json({
            message: "License account reset successfully"
        });

    } catch (error) {

        console.error("RESET LICENSE ERROR:", error);
        res.status(500).json({ message: "Server error" });

    }

};


// ==========================
// DELETE LICENSE
// ==========================
const deleteLicense = async (req, res) => {

    const { id } = req.params;

    try {

        const result = await pool.query(
            "DELETE FROM licenses WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message:"License not found"
            });

        }

        res.json({
            message:"License deleted successfully"
        });

    } catch (error) {

        console.error("DELETE LICENSE ERROR:", error);
        res.status(500).json({ message:"Server error" });

    }

};

module.exports = {
    createLicense,
    updateLicenseStatus,
    validateLicense,
    getAllLicenses,
    getLicensesByUser,
    resetLicenseAccount,
    deleteLicense
};