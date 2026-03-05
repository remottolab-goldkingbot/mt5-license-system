const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// ==========================
// VERIFY TOKEN
// ==========================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: "Access denied. Invalid token format."
        });
    }

    try {
        const verified = jwt.verify(
            token,
            process.env.JWT_SECRET || "supersecretkey"
        );

        req.user = verified;
        next();

    } catch (error) {
        return res.status(400).json({
            message: "Invalid token"
        });
    }
};

// ==========================
// VERIFY ADMIN
// ==========================
const verifyAdmin = async (req, res, next) => {
    try {
        const result = await pool.query(
            "SELECT role FROM users WHERE id = $1",
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (result.rows[0].role !== 'admin') {
            return res.status(403).json({
                message: "Access denied. Admins only."
            });
        }

        next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    verifyToken,
    verifyAdmin
};
