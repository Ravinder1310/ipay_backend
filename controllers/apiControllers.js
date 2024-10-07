const apiService = require('../services/apiService');

// Fetch customer details
const getCustomer = async (req, res) => {
  try {
    const data = await apiService.getCustomer(req.body.mobile_no);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register a new sender
const registerSender = async (req, res) => {
  try {
    const data = await apiService.registerSender(req.body.mobile_no, req.body.fname, req.body.lname, req.body.pin);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// OTP verification for sender
const verifySenderOtp = async (req, res) => {
  try {
    const data = await apiService.verifySenderOtp(req.body.mobile_no, req.body.otp);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register a new beneficiary
const registerBeneficiary = async (req, res) => {
  try {
    const data = await apiService.registerBeneficiary(
      req.body.mobile_no,
      req.body.sender_profile_id,
      req.body.fname,
      req.body.lname,
      req.body.account_no,
      req.body.ifsc_code
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fund transfer
const fundTransfer = async (req, res) => {
  try {
    const data = await apiService.fundTransfer(
      req.body.mobile_no,
      req.body.sender_profile_id,
      req.body.beneficiary_id,
      req.body.amount,
      req.body.transfer_mode,
      req.body.account_no
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCustomer,
  registerSender,
  verifySenderOtp,
  registerBeneficiary,
  fundTransfer,
};
