const express = require('express');
const router = express.Router();

const {
    createLicense,
    updateLicenseStatus,
    validateLicense,
    getAllLicenses,
    getLicensesByUser,
    resetLicenseAccount,
    deleteLicense,
    updateLicenseInfo,
    getMyLicenses
} = require('../controllers/license.controller');

const {
    verifyToken,
    verifyAdmin
} = require('../middleware/auth.middleware');


// ==========================
// PUBLIC ROUTES (🔥 PRIMERO)
// ==========================

// 🔥 GET ALL LICENSES (SIN TOKEN PARA PANEL)
router.get('/public/licenses', getAllLicenses);

// VALIDATE LICENSE (MT5 EA)
router.post('/validate', validateLicense);

// MIS LICENCIAS (usuario logueado, no admin) — NUEVO
router.get('/my', verifyToken, getMyLicenses);


// ==========================
// ADMIN ROUTES (PANEL)
// ==========================

// CREATE LICENSE
router.post('/', verifyToken, verifyAdmin, createLicense);

// GET ALL LICENSES (PROTEGIDO)
router.get('/', verifyToken, verifyAdmin, getAllLicenses);

// UPDATE LICENSE STATUS
router.put('/:id/status', verifyToken, verifyAdmin, updateLicenseStatus);

// UPDATE LICENSE INFO (nombre, correo, telefono, plan) — NUEVO
router.put('/:id', verifyToken, verifyAdmin, updateLicenseInfo);

// RESET LICENSE ACCOUNT
router.put('/:id/reset', verifyToken, verifyAdmin, resetLicenseAccount);

// GET LICENSES BY USER
router.get('/user/:user_id', verifyToken, verifyAdmin, getLicensesByUser);

// DELETE LICENSE
router.delete('/:id', verifyToken, verifyAdmin, deleteLicense);


module.exports = router;
