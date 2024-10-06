const express = require('express');
const router = express.Router();
const rechargeController = require('../controllers/rechargeController');
const { addBeneficiary, fundTransfer, refundOtp, refundTransaction, getTransactionStatus, getIfscDetails, getAccountBalance } = require('../controllers/fundTransferController');

// Recharge route
router.post('/recharge', rechargeController.recharge);

// Get plans route
router.post('/get-plans', rechargeController.getPlans);
// router.post('/fund-transfer', transferFunds);
router.get('/operators', rechargeController.getOperators);
router.post('/add-beneficiary', addBeneficiary);
router.post('/fund-transfer', fundTransfer);
router.post('/refund-otp', refundOtp);
router.post('/refund', refundTransaction);
router.post('/transaction-status', getTransactionStatus);
router.post('/ifsc-details', getIfscDetails);
router.post('/account-balance', getAccountBalance);

module.exports = router;
