// controllers/fundTransferController.js
const axios = require('axios');
const jwt = require('jsonwebtoken');
const qs = require('qs');


exports.addBeneficiary = async (req, res) => {
  try {
    const { fname, lname, account_no, ifsc_code, mobile_no, email, address1, pincode } = req.body;

    // Log the incoming request data
    console.log('Received request body:', req.body);

    const postData = qs.stringify({
      username: "APIRA6478033",
      pwd: "766269",
      gateway: 'GW5',
      token: generateToken("divyasolutions53@gmail.com"),
      fname,
      lname,
      account_no,
      ifsc_code,
      mobile_no,
      email,
      address1,
      pincode,
    });

    // Log the data that will be sent in the POST request
    console.log('Data to be sent to API:', postData);

    const response = await axios.post('https://payout.apiscript.in/add_beneficiary', postData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // Log the response from the external API
    console.log('API Response:', response.data);

    res.json(response.data);
  } catch (error) {
    // Log the error details
    console.error('Error adding beneficiary:', error.message);
    if (error.response) {
      // Log response details if available (useful for debugging API errors)
      console.error('Error Response Data:', error.response.data);
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Headers:', error.response.headers);
    }
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};


// controllers/payoutController.js

// Fund Transfer
exports.fundTransfer = async (req, res) => {
  try {
    const { transfer_mode, account_no, amount, beneficiary_id, client_id } = req.body;

    const postData = qs.stringify({
      username: "APIRA6478033",
      pwd: "766269",
      gateway: 'GW5',
      token: generateToken("divyasolutions53@gmail.com"), // Update with your registered email
      transfer_mode,
      account_no,
      amount,
      beneficiary_id,
      client_id,
    });

    const response = await axios.post('https://payout.apiscript.in/fund_transfer', postData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error during fund transfer:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};



// Refund OTP
exports.refundOtp = async (req, res) => {
  try {
    const { transaction_id } = req.body;

    const postData = qs.stringify({
      username: "APIRA6478033",
      pwd: "766269",
      gateway: 'GW5',
      token: generateToken("divyasolutions53@gmail.com"), // Update with your registered email
      transaction_id,
    });

    const response = await axios.post('https://payout.apiscript.in/refund_otp', postData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error requesting refund OTP:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};



// Refund Transaction
exports.refundTransaction = async (req, res) => {
  try {
    const { transaction_id, otp } = req.body;

    const postData = qs.stringify({
      username: "APIRA6478033",
      pwd: "766269",
      gateway: 'GW5',
      token: generateToken("divyasolutions53@gmail.com"),
      transaction_id,
      otp,
    });

    const response = await axios.post('https://payout.apiscript.in/refund', postData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error processing refund:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};



// Get Transaction Status
exports.getTransactionStatus = async (req, res) => {
  try {
    const { transaction_id, client_id } = req.body;

    const postData = qs.stringify({
      username: "APIRA6478033",
      pwd: "766269",
      gateway: 'GW5',
      token: generateToken("divyasolutions53@gmail.com"),
      transaction_id,
      client_id,
    });

    const response = await axios.post('https://payout.apiscript.in/get_transaction_status', postData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching transaction status:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};



// Get IFSC Details
exports.getIfscDetails = async (req, res) => {
  try {
    const { ifsc_code } = req.body;

    const postData = qs.stringify({
      username: "APIRA6478033",
      pwd: "766269",
      gateway: 'GW5',
      token: generateToken("divyasolutions53@gmail.com"),
      ifsc_code,
    });

    const response = await axios.post('https://payout.apiscript.in/get_ifsc_details', postData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching IFSC details:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};



// Account Balance
exports.getAccountBalance = async (req, res) => {
  try {
    const postData = qs.stringify({
      username: "APIRA6478033",
      pwd: "766269",
      gateway: 'GW5',
      token: generateToken("divyasolutions53@gmail.com"),
    });

    const response = await axios.post('https://payout.apiscript.in/account/balance', postData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching account balance:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};




function generateToken(email) {
    const secret_key = '7475-66ff8307776ce-124445';  // Replace with your actual secret key
    const timeStamp = Math.floor(Date.now() / 1000).toString();  // Ensure TimeStamp is a string
    const tokenPayload = { "TimeStamp": timeStamp, "EmailID": email };

    return jwt.sign(tokenPayload, secret_key, { algorithm: 'HS256' });
}