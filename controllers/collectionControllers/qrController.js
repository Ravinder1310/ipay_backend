const axios = require('axios');
const jwt = require('jsonwebtoken');

// Generate QR Code
exports.generateQRCode = async (req, res) => {
    const { username, pwd, email_id, customer_name, mobile_no, purpose, client_id, token } = req.body;

    try {
        const response = await axios.post('https://upi.apiscript.in/generate_qr_code_api', {
            username, pwd, email_id, customer_name, mobile_no, purpose, client_id, token
        });
        
        return res.json(response.data);
    } catch (error) {
        return res.status(500).json({ message: 'Error generating QR code', error: error.message });
    }
};
