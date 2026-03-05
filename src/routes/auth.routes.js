const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/auth.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');

// ==========================
// REGISTER
// ==========================
router.post('/register', register);

// ==========================
// LOGIN
// ==========================
router.post('/login', login);

// ==========================
// PROTECTED ROUTE
// ==========================
router.get('/protected', verifyToken, (req, res) => {
    res.json({
        message: "Access granted",
        user: req.user
    });
});

// ==========================
// ADMIN ONLY ROUTE
// ==========================
router.get('/admin', verifyToken, verifyAdmin, (req, res) => {
    res.json({
        message: "Welcome Admin 👑"
    });
});

module.exports = router;