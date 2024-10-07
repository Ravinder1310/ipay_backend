const express = require('express');
const { generateQRCode } = require('../controllers/collectionControllers/qrController');
const { checkTransactionStatus } = require('../controllers/collectionControllers/statusController');
const { checkBalance } = require('../controllers/collectionControllers/balanceController');
const { generateJWT } = require('../controllers/collectionControllers/jwtController');
const router = express.Router();

// Routes
router.post('/qr', generateQRCode);
router.post('/status', checkTransactionStatus);
router.post('/balance', checkBalance);
router.post('/jwt', generateJWT);

module.exports = router;
