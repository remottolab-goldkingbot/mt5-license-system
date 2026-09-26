const express = require('express');
const router = express.Router();
const { login, register, getAllUsers, deleteUser, updateMembership, updateUserRole, updateTradingViewUsername, updateMyProfile, changeMyPassword, adminResetPassword } = require('../controllers/auth.controller');
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
// GET ALL USERS (admin) — NUEVO
// ==========================
router.get('/users', verifyToken, verifyAdmin, getAllUsers);

// ==========================
// DELETE USER (admin) — NUEVO
// ==========================
router.delete('/users/:id', verifyToken, verifyAdmin, deleteUser);

// ==========================
// UPDATE MEMBERSHIP (admin) — NUEVO
// ==========================
router.put('/users/:id/membership', verifyToken, verifyAdmin, updateMembership);

// ==========================
// QUITAR ROL ADMIN (admin) — NUEVO, para limpiar cuentas de prueba
// ==========================
router.put('/users/:id/role', verifyToken, verifyAdmin, updateUserRole);

// ==========================
// MI USUARIO DE TRADINGVIEW (cualquier usuario logueado) — NUEVO
// ==========================
router.put('/tradingview', verifyToken, updateTradingViewUsername);

// ==========================
// MI PERFIL (nombre, correo, telefono) — cualquier usuario logueado — NUEVO
// ==========================
router.put('/me', verifyToken, updateMyProfile);

// ==========================
// CAMBIAR MI CONTRASEÑA (logueado) — NUEVO
// ==========================
router.put('/me/password', verifyToken, changeMyPassword);

// ==========================
// ADMIN: RESETEAR CONTRASEÑA DE UN ALUMNO — NUEVO
// ==========================
router.put('/users/:id/reset-password', verifyToken, verifyAdmin, adminResetPassword);

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