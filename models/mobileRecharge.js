const mongoose = require('mongoose');

const mobileRechargeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  number: { type: String},
  profit: {type: Number},
  rechargeOf: { type: String},
  type: { type: String },
  level: { type: Number}
}, { timestamps: true });

module.exports = mongoose.model('MobileRecharge', mobileRechargeSchema);