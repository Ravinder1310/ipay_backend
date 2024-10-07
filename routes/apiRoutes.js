const express = require('express');
const { 
  getCustomer, 
  registerSender, 
  verifySenderOtp, 
  registerBeneficiary, 
  fundTransfer 
} = require('../controllers/apiControllers');
const router = express.Router();

// Routes
router.post('/customer', getCustomer);
router.post('/sender/register', registerSender);
router.post('/sender/verify-otp', verifySenderOtp);
router.post('/beneficiary/register', registerBeneficiary);
router.post('/fund-transfer', fundTransfer);

module.exports = router;
