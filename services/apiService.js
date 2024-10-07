// Import necessary libraries and configure environment variables
const axios = require('axios');
const jwt = require('jsonwebtoken');
const qs = require('qs'); // Import the qs library
require('dotenv').config();

const apiBaseURL = process.env.API_BASE_URL;
const username = process.env.API_USERNAME;
const password = process.env.API_PASSWORD;
const secretKey = "7475-66ff8307776ce-124445"; // Ensure this is the correct secret key

// Function to generate the JWT token
const getToken = () => {
  const payload = {
    TimeStamp: Math.floor(Date.now() / 1000).toString(),
    EmailID: "divyasolutions53@gmail.com", // Update this email if necessary
  };
  const token = jwt.sign(payload, secretKey);
  
  console.log("Generated Token:", token);
  
  return token;
};

// Generic function for making API calls with logging
const apiCall = async (url, data) => {
  try {
    const token = getToken();
    
    // Prepare data to be sent as application/x-www-form-urlencoded
    const requestData = qs.stringify({
      ...data,
      username,
      pwd: password,
      gateway: 'GW6', // Include the gateway key
      token,
    });

    // Logging the request
    console.log(`Making API call to: ${apiBaseURL + url}`);
    console.log("Request Data:", requestData);
    
    // Making the API request with the correct headers
    const response = await axios.post(apiBaseURL + url, requestData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // Set content type
      },
    });
    
    // Logging the response data
    console.log("Response Data:", response.data);
    
    return response.data;
  } catch (error) {
    // Logging the error details
    console.error("Error Occurred:", error.response ? error.response.data : error.message);
    throw new Error(error.response ? error.response.data.message : error.message);
  }
};

// Exporting the APIs
module.exports = {
  getCustomer: (mobile_no) => apiCall("get_customer", { mobile_no }),
  registerSender: (mobile_no, fname, lname, pin) => 
    apiCall("sender_registration", { mobile_no, fname, lname, pin }),
  verifySenderOtp: (mobile_no, otp) => apiCall("sender_otp", { mobile_no, otp }),
  registerBeneficiary: (mobile_no, sender_profile_id, fname, lname, account_no, ifsc_code) =>
    apiCall("beneficiary_registration", { 
      mobile_no, 
      sender_profile_id, 
      fname, 
      lname, 
      account_no, 
      ifsc_code 
    }),
  deleteBeneficiary: (mobile_no, sender_profile_id, beneficiary_id) =>
    apiCall("beneficiary_delete", { mobile_no, sender_profile_id, beneficiary_id }),
  fundTransfer: (mobile_no, sender_profile_id, beneficiary_id, amount, transfer_mode, account_no) =>
    apiCall("fund_transfer", { 
      mobile_no, 
      sender_profile_id:378672, 
      beneficiary_id, 
      amount, 
      transfer_mode, 
      account_no 
    }),
  getBalance: () => apiCall("account/balance", {}),
};
