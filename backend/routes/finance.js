const express = require('express');
const router = express.Router();
const FinanceEntry = require('../models/FinanceEntry');
const FinanceProject = require('../models/FinanceProject');
const Fee = require('../models/Fee');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

const projectData = project => {
    const plain = project.toObject ? project.toObject() : project;
    const developers = plain.developers || [];
    const developerTotal = developers.reduce((sum, developer) => sum + Number(developer.totalPayable || 0), 0);
    const developerPaid = developers.reduce((sum, developer) => sum + Number(developer.paidAmount || 0), 0);
    const clientTotal = Number(plain.clientTotal || 0);
    const clientReceived = Number(plain.clientReceived || 0);
    const clientDue = Math.max(0, clientTotal - clientReceived);
    const developerDue = Math.max(0, developerTotal - developerPaid);

    return {
        ...plain,
        metrics: {
            developerTotal,
            developerPaid,
            clientDue,
            developerDue,
            expectedProfit: clientTotal - developerTotal,
            currentCash: clientReceived - developerPaid,
            financialStatus: clientDue === 0 && developerDue === 0 ? 'cleared' : 'outstanding'
        }
    };
};

const normalizeProjectPayload = body => ({
    name: body.name,
    clientName: body.clientName,
    clientTotal: Number(body.clientTotal || 0),
    clientReceived: Number(body.clientReceived || 0),
    developers: (body.developers || []).map(developer => ({
        name: developer.name,
        designation: developer.designation || '',
        totalPayable: Number(developer.totalPayable || 0),
        paidAmount: Number(developer.paidAmount || 0)
    })),
    status: body.status || 'processing',
    startDate: body.startDate || new Date(),
    completionDate: body.status === 'completed' ? (body.completionDate || new Date()) : null,
    description: body.description || ''
});

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(`${startDate}T00:00:00.000Z`);
        if (endDate) dateFilter.$lte = new Date(`${endDate}T23:59:59.999Z`);
        const entryQuery = Object.keys(dateFilter).length ? { transactionDate: dateFilter } : {};
        const entries = await FinanceEntry.find(entryQuery)
            .populate('createdBy', 'name')
            .populate('project', 'name')
            .sort({ transactionDate: -1, createdAt: -1 });
        const fees = await Fee.find().select('installments');
        const projectQuery = Object.keys(dateFilter).length ? { startDate: dateFilter } : {};
        const projects = await FinanceProject.find(projectQuery);
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
        const projectIncome = projects.reduce((sum, project) => sum + Number(project.clientReceived || 0), 0);
        const projectExpenses = projects.reduce((sum, project) => sum + (project.developers || [])
            .reduce((developerSum, developer) => developerSum + Number(developer.paidAmount || 0), 0), 0);
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
                projectIncome,
                projectExpenses,
                totalIncome: feeIncome + manualIncome + projectIncome,
                totalExpenses: totalExpenses + projectExpenses,
                balance: feeIncome + manualIncome + projectIncome - totalExpenses - projectExpenses,
                categoryTotals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/projects', async (req, res) => {
    try {
        const projects = await FinanceProject.find()
            .populate('createdBy', 'name')
            .sort({ startDate: -1, createdAt: -1 });
        res.json({ success: true, data: projects.map(projectData) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/projects', async (req, res) => {
    try {
        const project = await FinanceProject.create({
            ...normalizeProjectPayload(req.body),
            createdBy: req.user.id
        });
        res.status(201).json({ success: true, data: projectData(project) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/projects/:id', async (req, res) => {
    try {
        const project = await FinanceProject.findByIdAndUpdate(
            req.params.id,
            normalizeProjectPayload(req.body),
            { new: true, runValidators: true }
        );
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true, data: projectData(project) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/projects/:id', async (req, res) => {
    try {
        const project = await FinanceProject.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true });
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
