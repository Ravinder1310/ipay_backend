const express = require('express');
const router = express.Router();
const rechargeController = require('../controllers/rechargeController');
const { transferFunds } = require('../controllers/fundTransferController');

// Recharge route
router.post('/recharge', rechargeController.recharge);

// Get plans route
router.post('/get-plans', rechargeController.getPlans);
router.post('/fund-transfer', transferFunds);
router.get('/operators', rechargeController.getOperators);

module.exports = router;
