const jwt = require('jsonwebtoken');

// Generate JWT Token
exports.generateJWT = (req, res) => {
    const { secret_key, email_id } = req.body;
    const timeStamp = Math.floor(Date.now() / 1000);

    const token = jwt.sign({ TimeStamp: timeStamp, EmailID: email_id }, secret_key);
    res.json({ encode_token: token, error_code: "0" });
};
