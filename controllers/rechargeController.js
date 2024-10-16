const axios = require('axios');
const jwt = require('jsonwebtoken');
const qs = require('querystring');
const User = require('../models/User')
const RechargeTransaction = require("../models/rechargeTranscation")
// Recharge request
// exports.recharge = async (req, res) => {
//     const { operatorcode, number, amount, client_id, userId } = req.body;

//     // Step 1: Generate Token
//     const token = generateToken("divyasolutions53@gmail.com"); // Call your token generator function
//     console.log(`Generated Token: ${token}`);

//     // Prepare data for API request
//     const postData = {
//         username: 'APIRA6478033', // Use hardcoded username
//         pwd: '766269',             // Use hardcoded password
//         operatorcode,
//         number,
//         amount,
//         client_id,
//         token
//     };
//     console.log('Preparing to send API request with data:', postData);

//     try {
//         // Step 3: Convert postData to URL-encoded format
//         const encodedData = qs.stringify(postData);
        
//         // Step 4: Make API request to recharge with correct headers
//         const response = await axios.post('https://recharge.apiscript.in/mobile', encodedData, {
//             headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
//         });

//         // Step 5: Log the response from the API
//         console.log('API Response:', response.data);

//         const recharge = new RechargeTransaction({
//             userId,
//             amount,
//             number,
//             profit:,
//             type: "Mobile"
//           });
//           await recharge.save();



//         // Step 6: Send the response back to the client
//         res.json(response.data);
//     } catch (error) {
//         // Step 7: Log detailed error for debugging
//         if (error.response) {
//             console.error('API responded with an error:', error.response.data);
//             res.status(error.response.status).json({
//                 message: 'Error processing recharge from the API',
//                 error: error.response.data,
//             });
//         } else if (error.request) {
//             console.error('No response received from API:', error.request);
//             res.status(500).json({ message: 'No response from API', error: error.request });
//         } else {
//             console.error('Error occurred while making the request:', error.message);
//             res.status(500).json({ message: 'Error making API request', error: error.message });
//         }
//     }
// };





exports.recharge = async (req, res) => {
    const { operatorcode, number, amount, client_id, userId } = req.body;

    // Step 1: Generate Token
    const token = generateToken("divyasolutions53@gmail.com"); // Call your token generator function
    console.log(`Generated Token: ${token}`);

    const tempUser =await  User.findById(userId)
    console.log("temmmmmpppp user",tempUser);
    
    // Prepare data for API request
    const postData = {
        username: 'APIRA6478033', // Use hardcoded username
        pwd: '766269',             // Use hardcoded password
        operatorcode,
        number,
        amount,
        client_id,
        token
    };
    console.log('Preparing to send API request with data:', postData);

    try {
        // Step 3: Convert postData to URL-encoded format
        const encodedData = qs.stringify(postData);
        
        // Step 4: Make API request to recharge with correct headers
        const response = await axios.post('https://recharge.apiscript.in/mobile', encodedData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Step 5: Log the response from the API
        console.log('API Response:', response.data);
        

        // Step 6: Create the main recharge transaction for the user
        
       if(response.data.error_code===0){
        const userProfit = 2; // User will get a fixed Rs 2

        
        
        const recharge = new RechargeTransaction({
            userId,
            amount,
            number,
            profitFrom:tempUser.referralCode,
            profit: userProfit,
            type: "Mobile"
        });
        await recharge.save();
        // Step 8: Distribute profit to upline users (up to level 25)
        const user = await User.findById(userId).populate('referredBy');
        let parentUser = user.referredBy;
        let parent = await User.findOne({referralCode:parentUser});
        let level = 1;
        
        
        const profitDistribution = [
            { level: 1, percentage: 0.4 }, // Parent (level 1)
            { level: 2, percentage: 0.3 }, // Level 2
            { level: 3, percentage: 0.2 }, // Level 3
            { level: 4, percentage: 0.1 }, // Level 4
        ];
        
        // Distribute profit for first 4 levels with different percentages
        for (const { level, percentage } of profitDistribution) {
            if (parent && level <= 4) {
                const profit = (percentage / 100) * amount;
                console.log("helllllllllllllllllllll",parent);

                const transaction = new RechargeTransaction({
                    userId: parent._id || "",
                    amount,
                    number,
                    profit,
                    profitFrom:tempUser.referralCode,
                    type: "Referral Recharge",
                    level,
                });
                await transaction.save();
                
                nextParent = parent.referredBy;
                parent = await User.findOne({referredBy:nextParent}); // Move to next parent in the hierarchy
            }
        }

        

        // Distribute 0.4% profit to users from level 5 to 25
        
        
        while (parent && level <= 25) {
            const profit = (0.4 / 100) * amount;

            const transaction = new RechargeTransaction({
                userId: parent._id || "",
                amount,
                number,
                profit,
                profitFrom:tempUser.referralCode,
                type: "Referral Recharge",
                level,
            });
            await transaction.save();

                nextParent = parent.referredBy;
                parent = await User.findOne({referredBy:nextParent}); // Move to next parent in the hierarchy
            level++;
        }

       }
        // Step 9: Send the response back to the client
        res.json(response.data);
    } catch (error) {
        // Step 10: Log detailed error for debugging
        if (error.response) {
            console.error('API responded with an error:', error.response.data);
            res.status(error.response.status).json({
                message: 'Error processing recharge from the API',
                error: error.response.data,
            });
        } else if (error.request) {
            console.error('No response received from API:', error.request);
            res.status(500).json({ message: 'No response from API', error: error.request });
        } else {
            console.error('Error occurred while making the request:', error.message);
            res.status(500).json({ message: 'Error making API request', error: error.message });
        }
    }
};





exports.UserRechargeIncome = async (req, res) => {
    console.log("helo================================")
    const userId = req.params.userId;
  console.log("bolt level -id =>",userId)
    try {
      const result = await RechargeTransaction.find({userId });
  
      if (!result || result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No trading income found for the specified user."
        });
      }
  
      return res.status(200).json({
        success: true,
        data: result
      });
  
    } catch (error) {
      console.error("Error during retrieving trading income:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching bot level income. Please try again later."
      });
    }
  };
  








// Fetch available plans
// Fetch available plans
exports.getPlans = async (req, res) => {
    const { username, pwd, operatorcode } = req.body;

    // Step 1: Generate Token
    const token = generateToken("divyasolutions53@gmail.com"); 
    console.log(`Generated Token: ${token}`);

    try {
        // Step 2: Prepare data for API request
        const postData = { username, pwd, operatorcode, token };
        console.log('Sending API request with data:', postData);

        // Step 3: Convert postData to URL-encoded format
        const encodedData = qs.stringify(postData);

        // Step 4: Make API request to get plans with correct headers
        const response = await axios.post('https://recharge.apiscript.in/mobile/plan', encodedData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Step 5: Log the response from the API
        console.log('API Response:', response.data);

        // Step 6: Send the response back to the client
        res.json(response.data);
    } catch (error) {
        // Step 7: Log detailed error for debugging
        if (error.response) {
            console.error('API responded with an error:', error.response.data);
            res.status(error.response.status).json({
                message: 'Error fetching plans from the API',
                error: error.response.data,
            });
        } else if (error.request) {
            console.error('No response received from API:', error.request);
            res.status(500).json({ message: 'No response from API', error: error.request });
        } else {
            console.error('Error occurred while making the request:', error.message);
            res.status(500).json({ message: 'Error making API request', error: error.message });
        }
    }
};


exports.getOperators = async (req, res) => {
    try {
        const username = 'APIRA6478033'; // Your actual username
        const password = '766269'; // Your actual password

        // Encrypt token if required
        const encryptedToken = generateToken('divyasolutions53@gmail.com');
        console.log('Encrypted Token:', encryptedToken); // Log encrypted token

        // Prepare data to send in POST request
        const postData = new URLSearchParams({
            username: username,
            pwd: password,
            token: encryptedToken
        });

        console.log('Post Data:', postData.toString()); // Log the post data

        // Send POST request to the external API
        const response = await axios.post('https://recharge.apiscript.in/operator', postData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Log the full API response
        console.log('API Response:', response.data);
        console.log('API Response:', response.data.company.length);


        // Handle the response from the external API
        if (response.data.error_code === '0') {
            console.log('Success:', response.data.message);
            res.status(200).json({
                message: response.data.message,
                companies: response.data.company
            });
        } else {
            console.log('Error:', response.data.message, 'Error Code:', response.data.error_code);
            res.status(400).json({
                message: response.data.message,
                error_code: response.data.error_code
            });
        }
    } catch (error) {
        // Log any errors (network errors, unexpected issues, etc.)
        console.error('Error:', error.message);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Token generation logic
function generateToken(email) {
    const secret_key = '7475-66ff8307776ce-124445';  // Replace with your actual secret key
    const timeStamp = Math.floor(Date.now() / 1000).toString();  // Ensure TimeStamp is a string
    const tokenPayload = { "TimeStamp": timeStamp, "EmailID": email };

    return jwt.sign(tokenPayload, secret_key, { algorithm: 'HS256' });
}
