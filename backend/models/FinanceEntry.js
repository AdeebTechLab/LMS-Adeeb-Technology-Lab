const mongoose = require('mongoose');

const financeEntrySchema = new mongoose.Schema({
    type: { type: String, enum: ['income', 'expense'], required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    transactionDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('FinanceEntry', financeEntrySchema);
