const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadReceipt, cloudinary } = require('../config/cloudinary');
const Fee = require('../models/Fee');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Counter = require('../models/Counter');



// @route   GET /api/fees/my
// @desc    Get current user's fees
// @access  Private
router.get('/my', protect, async (req, res) => {
    try {
        let fees = await Fee.find({ user: req.user.id })
            .populate('course', 'title fee duration city location targetAudience')
            .sort('-createdAt');

        // Auto-repair: If any fee has no installments, create default one
        let updated = false;
        for (let fee of fees) {
            if (!fee.installments || fee.installments.length === 0) {
                const amount = fee.totalFee > 0 ? fee.totalFee : (fee.course?.fee || 0);
                if (amount > 0) {
                    fee.installments = [{
                        amount: amount,
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                        status: 'pending'
                    }];
                    await fee.save();
                    updated = true;
                }
            }
        }

        // Refetch if we made changes to ensure consistency
        if (updated) {
            fees = await Fee.find({ user: req.user.id })
                .populate('course', 'title fee duration city location targetAudience')
                .sort('-createdAt');
        }

        res.json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



// @route   POST /api/fees/:id/pay
// @desc    Upload payment receipt for an installment
// @access  Private
router.post('/:id/pay', protect, uploadReceipt.single('receipt'), async (req, res) => {
    try {
        const { installmentId, slipId } = req.body;
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ success: false, message: 'Fee record not found' });
        }

        // Check if user owns this fee
        if (fee.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Find the installment
        const installment = fee.installments.id(installmentId);
        if (!installment) {
            return res.status(404).json({ success: false, message: 'Installment not found' });
        }

        if (installment.status !== 'pending' && installment.status !== 'rejected') {
            return res.status(400).json({ success: false, message: 'Installment is not pending' });
        }

        console.log(`!!! FORCE ATOMIC UPDATE !!! Processing payment for fee ${fee._id} installment ${installmentId}`);

        // Update using atomic operator to ensure persistence
        const updatedFee = await Fee.findOneAndUpdate(
            { _id: req.params.id, 'installments._id': installmentId },
            {
                $set: {
                    'installments.$.slipId': slipId,
                    'installments.$.receiptUrl': req.file ? req.file.path : installment.receiptUrl,
                    'installments.$.status': 'submitted',
                    'installments.$.paidAt': new Date()
                }
            },
            { new: true }
        );

        if (!updatedFee) {
            console.error(`!!! UPDATE FAILED !!! Fee ${req.params.id} Installment ${installmentId} not found or match failed`);
            throw new Error('Failed to update payment status - Record not found or match failed');
        }

        console.log(`!!! SUCCESS !!! Payment saved via atomic update. Fee ID: ${updatedFee._id}`);

        res.json({ success: true, fee: updatedFee });
    } catch (error) {
        console.error('Payment upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/fees/:feeId/installments/:installmentId/verify
// @desc    Verify a fee installment & assign roll number if first payment
// @access  Private (Admin)
router.put('/:feeId/installments/:installmentId/verify', protect, authorize('admin'), async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.feeId);
        if (!fee) {
            return res.status(404).json({ success: false, message: 'Fee not found' });
        }

        // Find installment
        const installment = fee.installments.id(req.params.installmentId);
        if (!installment) {
            return res.status(404).json({ success: false, message: 'Installment not found' });
        }

        // Verify installment
        installment.status = 'verified';
        installment.verifiedBy = req.user.id;
        installment.verifiedAt = new Date();

        // ---------------------------------------------------------
        // CLEANUP: Delete receipt from Cloudinary to save space
        // ---------------------------------------------------------
        if (installment.receiptUrl) {
            try {
                const matches = installment.receiptUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
                if (matches && matches[1]) {
                    console.log(`Verification cleanup: Deleting image ${matches[1]}`);
                    await cloudinary.uploader.destroy(matches[1]);
                }
            } catch (cleanupError) {
                console.error('Failed to cleanup verified image:', cleanupError);
                // Non-blocking error
            }
        }

        // Update fee status
        fee.updateStatus();

        // Assign roll number fallback if missing (for older accounts) and activate enrollment
        if (!fee.rollNoAssigned) {
            const user = await User.findById(fee.user);
            if (!user.rollNo) {
                const Counter = require('../models/Counter');
                user.rollNo = await Counter.getNextRollNo();
                await user.save();
                console.log(`Fallback: Assigned roll number ${user.rollNo} to user ${user.email} during fee verification`);
            }

            // Update enrollment to 'enrolled' and activate it
            await Enrollment.findOneAndUpdate(
                { user: fee.user, course: fee.course },
                {
                    status: 'enrolled',
                    isActive: true,
                    enrollmentDate: new Date()
                }
            );

            fee.rollNoAssigned = true;
        }

        // Also sync this specific installment verification with Enrollment
        await Enrollment.findOneAndUpdate(
            { user: fee.user, course: fee.course, "installments.installmentNumber": installment.installmentNumber || 1 },
            {
                $set: {
                    "installments.$.status": "verified",
                    "installments.$.paidDate": new Date(),
                    "installments.$.verifiedBy": req.user.id,
                    "installments.$.verifiedAt": new Date()
                }
            }
        );

        await fee.save();

        res.json({ success: true, fee, message: 'Payment verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/fees/:feeId/installments/:installmentId/reject
// @desc    Reject a payment proof (admin)
// @access  Private (Admin)
router.put('/:feeId/installments/:installmentId/reject', protect, authorize('admin'), async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.feeId);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });

        const installment = fee.installments.id(req.params.installmentId);
        if (!installment) return res.status(404).json({ success: false, message: 'Installment not found' });

        // Update status
        installment.status = 'rejected';

        // Note: We do NOT delete the image here immediately if we want to keep evidence,
        // OR we delete it to force clean re-upload. 
        // Given user focus on SPACE, deleting it is better, but student needs to see what was rejected?
        // Actually, if status is rejected, student MUST upload new one.
        // Let's delete it to be consistent with "Space Saving".
        if (installment.receiptUrl) {
            try {
                const matches = installment.receiptUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
                if (matches && matches[1]) {
                    await cloudinary.uploader.destroy(matches[1]);
                }
            } catch (e) { console.error(e); }
        }

        // Reset receipt fields so student can upload fresh
        installment.receiptUrl = null;
        installment.slipId = null;

        await fee.save();

        // Sync with Enrollment model
        await Enrollment.findOneAndUpdate(
            { user: fee.user, course: fee.course, "installments.installmentNumber": installment.installmentNumber || 1 },
            {
                $set: {
                    "installments.$.status": "pending",
                    "installments.$.paymentProof": null,
                    "installments.$.paidDate": null
                }
            }
        );

        res.json({ success: true, fee, message: 'Payment rejected. Student can now re-upload.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/fees/:id/installments
// @desc    Set up installment plan for a student (admin)
// @access  Private (Admin)
router.post('/:id/installments', protect, authorize('admin'), async (req, res) => {
    try {
        const { installments } = req.body; // Array of { amount, dueDate }
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({ success: false, message: 'Fee not found' });
        }

        // Create new installments array ensuring we don't reset verified/submitted ones
        const newInstallments = [];

        // First, check if we are trying to remove any paid installments (not allowed)
        const paidInstallmentsCount = fee.installments.filter(
            i => i.status === 'verified' || i.status === 'submitted'
        ).length;

        if (installments.length < paidInstallmentsCount) {
            return res.status(400).json({
                success: false,
                message: `Cannot remove installments that are already paid/submitted. You have ${paidInstallmentsCount} active payments.`
            });
        }

        // Map logic
        for (let i = 0; i < installments.length; i++) {
            const newInst = installments[i];
            const existing = fee.installments[i];

            if (existing && (existing.status === 'verified' || existing.status === 'submitted')) {
                // Preserve existing paid installment exactly as is
                newInstallments.push(existing);
            } else {
                // Create/Update installment - allow setting status to 'verified' (e.g. for cash payments)
                newInstallments.push({
                    amount: newInst.amount,
                    dueDate: newInst.dueDate,
                    status: newInst.status === 'verified' ? 'verified' : 'pending',
                    verifiedBy: newInst.status === 'verified' ? req.user.id : undefined,
                    verifiedAt: newInst.status === 'verified' ? new Date() : undefined
                });
            }
        }

        fee.installments = newInstallments;
        await fee.save();

        // Sync with Enrollment model if it exists
        await Enrollment.findOneAndUpdate(
            { user: fee.user, course: fee.course },
            {
                installments: newInstallments.map((inst, index) => ({
                    installmentNumber: index + 1,
                    amount: inst.amount,
                    dueDate: inst.dueDate,
                    status: inst.status === 'verified' ? 'verified' : 'pending',
                    paymentProof: inst.receiptUrl
                }))
            }
        );

        res.json({ success: true, fee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/fees/pending
// @desc    Get fees with pending verification (admin)
// @access  Private (Admin)
router.get('/pending', protect, authorize('admin'), async (req, res) => {
    try {
        // Fetch all fees first
        const allFees = await Fee.find()
            .populate('user', 'name email rollNo photo')
            .populate('course', 'title fee city location targetAudience')
            .sort('-updatedAt');

        // Return ALL fees and let frontend filter 'submitted' installments
        // This eliminates any server-side filtering or reference match issues
        const fees = allFees;

        console.log(`GET /pending: Returning ${fees.length} total fees for frontend filtering`);

        res.json({ success: true, data: fees });
    } catch (error) {
        console.error('GET /pending error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/fees/all
// @desc    Get all fees (admin)
// @access  Private (Admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
    try {
        const fees = await Fee.find()
            .populate('user', 'name email rollNo photo')
            .populate('course', 'title fee city location targetAudience')
            .sort('-createdAt');

        res.json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/fees/:id/installments/:installmentId
// @desc    Delete a specific installment (admin)
// @access  Private (Admin)
router.delete('/:id/installments/:installmentId', protect, authorize('admin'), async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });

        // Filter out the installment
        const initialCount = fee.installments.length;
        fee.installments = fee.installments.filter(inst => inst._id.toString() !== req.params.installmentId);

        if (fee.installments.length === initialCount) {
            return res.status(404).json({ success: false, message: 'Installment not found' });
        }

        // Update fee status
        fee.updateStatus();
        await fee.save();

        // Sync with Enrollment model
        await Enrollment.findOneAndUpdate(
            { user: fee.user, course: fee.course },
            {
                installments: fee.installments.map((inst, index) => ({
                    installmentNumber: index + 1,
                    amount: inst.amount,
                    dueDate: inst.dueDate,
                    status: inst.status === 'verified' ? 'verified' : 'pending',
                    paymentProof: inst.receiptUrl
                }))
            }
        );

        res.json({ success: true, message: 'Installment deleted successfully', fee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/fees/:id
// @desc    Delete fee and cleanup associated Cloudinary images (admin)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee not found' });

        if (fee.installments && fee.installments.length > 0) {
            console.log(`Deleting fee ${fee._id}. Checking ${fee.installments.length} installments for images...`);

            for (const inst of fee.installments) {
                if (inst.receiptUrl) {
                    try {
                        const matches = inst.receiptUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
                        if (matches && matches[1]) {
                            const publicId = matches[1];
                            console.log(`Deleting Cloudinary Image: ${publicId}`);
                            await cloudinary.uploader.destroy(publicId);
                        }
                    } catch (imgError) {
                        console.error(`Failed to delete image for installment ${inst._id}:`, imgError);
                    }
                }
            }
        }

        // Delete associated enrollment
        console.log(`[FEE DELETE] Deleting associated enrollment for User ${fee.user} and Course ${fee.course}`);
        await Enrollment.findOneAndDelete({ user: fee.user, course: fee.course });

        await fee.deleteOne();
        res.json({ success: true, message: 'Fee Record and Enrollment removed. Student can now re-register.' });
    } catch (error) {
        console.error('Delete fee error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
