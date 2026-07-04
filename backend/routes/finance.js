const express = require('express');
const router = express.Router();
const FinanceEntry = require('../models/FinanceEntry');
const Fee = require('../models/Fee');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(`${startDate}T00:00:00.000Z`);
        if (endDate) dateFilter.$lte = new Date(`${endDate}T23:59:59.999Z`);
        const entryQuery = Object.keys(dateFilter).length ? { transactionDate: dateFilter } : {};
        const entries = await FinanceEntry.find(entryQuery).populate('createdBy', 'name').sort({ transactionDate: -1, createdAt: -1 });
        const fees = await Fee.find().select('installments');
        const feeIncome = fees.reduce((sum, fee) => sum + (fee.installments || [])
            .filter(item => {
                if (item.status !== 'verified') return false;
                if (!Object.keys(dateFilter).length) return true;
                const incomeDate = new Date(item.verifiedAt || item.paidAt || item.dueDate);
                return (!dateFilter.$gte || incomeDate >= dateFilter.$gte) && (!dateFilter.$lte || incomeDate <= dateFilter.$lte);
            })
            .reduce((total, item) => total + Number(item.amount || 0), 0), 0);
        const manualIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
        const totalExpenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
        const categoryTotals = entries.filter(e => e.type === 'expense').reduce((acc, entry) => {
            acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
            return acc;
        }, {});

        res.json({
            success: true,
            data: entries,
            summary: {
                feeIncome,
                manualIncome,
                totalIncome: feeIncome + manualIncome,
                totalExpenses,
                balance: feeIncome + manualIncome - totalExpenses,
                categoryTotals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const entry = await FinanceEntry.create({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ success: true, data: entry });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const entry = await FinanceEntry.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!entry) return res.status(404).json({ success: false, message: 'Record not found' });
        res.json({ success: true, data: entry });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const entry = await FinanceEntry.findByIdAndDelete(req.params.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Record not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
