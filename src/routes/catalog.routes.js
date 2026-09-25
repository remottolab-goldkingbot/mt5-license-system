const express = require('express');
const router = express.Router();
const { getEAs, createEA, deleteEA, getPlans, createPlan, deletePlan } = require('../controllers/catalog.controller');
const { verifyToken, verifyAdmin } = require('../middleware/auth.middleware');

// Catálogo de EAs
router.get('/eas', verifyToken, verifyAdmin, getEAs);
router.post('/eas', verifyToken, verifyAdmin, createEA);
router.delete('/eas/:id', verifyToken, verifyAdmin, deleteEA);

// Catálogo de Planes (duración)
router.get('/plans', verifyToken, verifyAdmin, getPlans);
router.post('/plans', verifyToken, verifyAdmin, createPlan);
router.delete('/plans/:id', verifyToken, verifyAdmin, deletePlan);

module.exports = router;
