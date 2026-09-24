const express = require('express');
const router = express.Router();
const {
    getAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    createTrade,
    getMyTrades,
    updateTrade,
    deleteTrade
} = require('../controllers/journal.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Todas requieren estar logueado (admin o alumno) — cada uno ve/crea/edita/borra solo lo suyo

// Cuentas del Journal (Fondeo/Real) — Free: máx 1, PRO: ilimitadas
router.get('/accounts', verifyToken, getAccounts);
router.post('/accounts', verifyToken, createAccount);
router.put('/accounts/:id', verifyToken, updateAccount);
router.delete('/accounts/:id', verifyToken, deleteAccount);

// Trades
router.post('/', verifyToken, createTrade);
router.get('/my', verifyToken, getMyTrades);
router.put('/:id', verifyToken, updateTrade);
router.delete('/:id', verifyToken, deleteTrade);

module.exports = router;
