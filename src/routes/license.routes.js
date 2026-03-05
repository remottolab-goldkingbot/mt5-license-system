const express = require('express');
const router = express.Router();

const {
    createLicense,
    updateLicenseStatus,
    validateLicense,
    getAllLicenses,
    getLicensesByUser,
    resetLicenseAccount,
    deleteLicense
} = require('../controllers/license.controller');

const {
    verifyToken,
    verifyAdmin
} = require('../middleware/auth.middleware');

// ==========================
// ADMIN ROUTES
// ==========================

// CREATE LICENSE
router.post('/', verifyToken, verifyAdmin, createLicense);

// UPDATE LICENSE STATUS
router.put('/:id/status', verifyToken, verifyAdmin, updateLicenseStatus);

// RESET LICENSE ACCOUNT
router.put('/:id/reset', verifyToken, verifyAdmin, resetLicenseAccount);

// LIST ALL LICENSES
router.get('/', verifyToken, verifyAdmin, getAllLicenses);

// GET LICENSES BY USER
router.get('/user/:user_id', verifyToken, verifyAdmin, getLicensesByUser);

// DELETE LICENSE
router.delete('/:id', verifyToken, verifyAdmin, deleteLicense);

// ==========================
// PUBLIC ROUTE (MT5)
// ==========================

// VALIDATE LICENSE (NO TOKEN REQUIRED)
router.post('/validate', validateLicense);

module.exports = router;