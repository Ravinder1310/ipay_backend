// controllers/fundTransferController.js

const axios = require('axios');
const jwt = require('jsonwebtoken');
const qs = require('qs');

exports.transferFunds = async (req, res) => {
    try {
      // Destructure the request body
      const {
        transfer_mode,
        account_no,
        amount,
        beneficiary_id,
        client_id,
      } = req.body;
  
      // Log incoming request data
      console.log('Received fund transfer request with data:', {
        transfer_mode,
        account_no,
        amount,
        beneficiary_id,
        client_id,
      });
  
      // Generate token
      const token = generateToken("divyasolutions53@gmail.com");
      console.log('Token generated:', token);
  
      // Prepare the POST data
      const postData = qs.stringify({
        username: 'APIRA6478033',
        pwd: '766269',
        gateway: 'GW5',
        token: token,
        transfer_mode,
        account_no,
        amount,
        beneficiary_id,
        client_id,
      });
  
      // Log the POST data before making the request
      console.log('Prepared POST data:', postData);
  
      // Make the POST request to the external API
      const response = await axios.post('https://payout.apiscript.in/fund_transfer', postData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
  
      // Log the API response
      console.log('API response:', response.data);
  
      // Send the external API response back to the frontend
      res.json(response.data);
    } catch (error) {
      // Log the error and the response from the failed request (if available)
      if (error.response) {
        console.error('Error response from API:', error.response.data);
        res.status(500).json({
          message: 'Error from external API',
          error: error.response.data,
        });
      } else {
        console.error('Error transferring funds:', error.message);
        res.status(500).json({
          message: 'Internal Server Error',
          error: error.message,
        });
      }
    }
  };


function generateToken(email) {
    const secret_key = '7475-66ff8307776ce-124445';  // Replace with your actual secret key
    const timeStamp = Math.floor(Date.now() / 1000).toString();  // Ensure TimeStamp is a string
    const tokenPayload = { "TimeStamp": timeStamp, "EmailID": email };

    return jwt.sign(tokenPayload, secret_key, { algorithm: 'HS256' });
}