const mongoose = require('mongoose');

const RechargeTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  number: { type: String},
  profit: {type: Number},
  rechargeOf: { type: String},
  type: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('RechargeTransaction', RechargeTransactionSchema);