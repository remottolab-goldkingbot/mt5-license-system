const express = require('express');
const router = express.Router();
const { createTrade, getMyTrades, updateTrade, deleteTrade } = require('../controllers/journal.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Todas requieren estar logueado (admin o alumno) — cada uno ve/crea/edita/borra solo lo suyo

router.post('/', verifyToken, createTrade);
router.get('/my', verifyToken, getMyTrades);
router.put('/:id', verifyToken, updateTrade);
router.delete('/:id', verifyToken, deleteTrade);

module.exports = router;
