const axios = require('axios');

// Check Transaction Status
exports.checkTransactionStatus = async (req, res) => {
    const { username, pwd, transaction_id, token } = req.body;

    try {
        const response = await axios.post('https://upi.apiscript.in/status', { username, pwd, transaction_id, token });
        return res.json(response.data);
    } catch (error) {
        return res.status(500).json({ message: 'Error checking transaction status', error: error.message });
    }
};
