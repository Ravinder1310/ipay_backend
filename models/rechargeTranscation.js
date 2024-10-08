const mongoose = require('mongoose');

const RechargeTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referralCode : {type: String, required : true},
  amount: { type: Number, required: true },
  number: { type: String},
  profit: {type: Number},
  type: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('RechargeTransaction', RechargeTransactionSchema);