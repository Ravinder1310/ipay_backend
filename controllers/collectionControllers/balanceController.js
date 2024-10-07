const axios = require('axios');

// Check Account Balance
exports.checkBalance = async (req, res) => {
    const { username, pwd, token } = req.body;

    try {
        const response = await axios.post('https://upi.apiscript.in/account/balance', { username, pwd, token });
        return res.json(response.data);
    } catch (error) {
        return res.status(500).json({ message: 'Error checking balance', error: error.message });
    }
};
