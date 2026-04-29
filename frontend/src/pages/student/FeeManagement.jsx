import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CreditCard, Upload, Clock, CheckCircle, AlertCircle, FileText, Loader2, FileImage, Trash2, X
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { feeAPI, enrollmentAPI } from '../../services/api';

const FeeManagement = () => {
    const location = useLocation();
    const successMsg = location.state?.message;
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [withdrawModal, setWithdrawModal] = useState({ open: false, enrollmentId: null, courseTitle: '' });
    const [selectedFee, setSelectedFee] = useState(null);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [slipId, setSlipId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [fees, setFees] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSlipError, setShowSlipError] = useState(false);
    const [qrPreview, setQrPreview] = useState({ open: false, src: '', title: '' });
    const [previewUrl, setPreviewUrl] = useState(null);

    const navigate = useNavigate();
    const QR_LINKS = {
        hbl: 'https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1776804616/HBL_Bank_nbng72.png',
        jazzcash: 'https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1776804616/jazzcash_ztcw5s.png',
        easypaisa: 'https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1776804616/easypaisa_yr7gux.png'
    };

    useEffect(() => {
        fetchFees();
    }, []);

    // (No periodic polling — rely on existing refresh and submitted-payment polling)

    // Poll for updates while there are submitted payments awaiting verification
    useEffect(() => {
        let interval = null;
        const hasSubmitted = fees.some(fee => (fee.installments || []).some(i => i.status === 'submitted'));
        if (hasSubmitted) {
            interval = setInterval(() => {
                fetchFees();
            }, 8000);
        }
        return () => clearInterval(interval);
    }, [fees]);

    const fetchFees = async () => {
        setIsFetching(true);
        setError('');
        try {
            const [feeRes, enrollRes] = await Promise.all([
                feeAPI.getMy(),
                enrollmentAPI.getMy()
            ]);

            const fetchedFees = feeRes.data.data || [];
            const enrollments = enrollRes.data.data || [];

            // Merge enrollment ID into fees
            const feesWithEnrollmentId = fetchedFees.map(fee => {
                const enrollment = enrollments.find(e =>
                    (e.course?._id || e.course) === (fee.course?._id || fee.course)
                );
                return { ...fee, enrollmentId: enrollment?._id, enrollmentIsActive: enrollment?.isActive || false, enrollmentIsPaused: enrollment?.isPaused || false, courseId: fee.course?._id || fee.course };
            });

            // Detect newly verified installments compared to current state
            try {
                const prev = fees || [];
                feesWithEnrollmentId.forEach(newFee => {
                    const oldFee = prev.find(f => String(f._id) === String(newFee._id));
                    if (!oldFee) return;
                    (newFee.installments || []).forEach((inst, idx) => {
                        const oldInst = (oldFee.installments || [])[idx];
                        if (oldInst && oldInst.status !== 'verified' && inst.status === 'verified') {
                            // If enrollment is active, navigate student to course page automatically
                            try {
                                if (newFee.enrollmentIsActive && newFee.courseId) {
                                    // small delay to allow UI to settle
                                    setTimeout(() => {
                                    if (newFee.courseId) {
                                        navigate(`/student/assignments`, { state: { courseId: newFee.courseId } });
                                    } else {
                                        navigate('/student/dashboard');
                                    }
                                    }, 400);
                                } else {
                                    alert(`Payment verified for ${newFee.course?.title || 'your course'}. Course is now accessible.`);
                                }
                            } catch (e) { console.error(e); }
                        }
                    });
                });
            } catch (e) { console.error('Diff check error', e); }

            setFees(feesWithEnrollmentId);
        } catch (err) {
            console.error('Error fetching fees:', err);
            setError('Failed to load fees. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const handlePayClick = (fee, installment) => {
        setSelectedFee(fee);
        setSelectedInstallment(installment);
        setPaymentAmount(installment.amount);
        setSlipId('');
        setIsUploadModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) {
                alert('File size must be less than 1MB');
                return;
            }
            setUploadedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmitPayment = async () => {
        if (!uploadedFile || !selectedFee || !selectedInstallment) {
            alert('Please select a file to upload');
            return;
        }
        if (!slipId.trim()) {
            setShowSlipError(true);
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('receipt', uploadedFile);
            formData.append('installmentId', selectedInstallment._id);
            formData.append('slipId', slipId);

            await feeAPI.pay(selectedFee._id, formData);
            setIsUploadModalOpen(false);
            setUploadedFile(null);
            setPreviewUrl(null);
            setSlipId('');
            setSelectedFee(null);
            setSelectedInstallment(null);
            fetchFees();
        } catch (err) {
            console.error('Error submitting payment:', err);
            setError(err.response?.data?.message || 'Failed to submit payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmWithdraw = async () => {
        try {
            await enrollmentAPI.withdraw(withdrawModal.enrollmentId);
            setWithdrawModal({ open: false, enrollmentId: null, courseTitle: '' });
            fetchFees();
            alert('Course revoked successfully. Pending fees removed.');
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert(error.response?.data?.message || 'Failed to revoke course');
        }
    };

    // Calculate totals from installments
    const getTotals = () => {
        let pending = 0;
        let underReviewCount = 0;
        let verifiedCount = 0;
        let submittedAmount = 0; // total amount student has submitted/paid

        fees.forEach(fee => {
            (fee.installments || []).forEach(inst => {
                if (inst.status === 'pending' || inst.status === 'rejected') {
                    pending += inst.amount || 0;
                } else if (inst.status === 'submitted') {
                    underReviewCount++;
                    submittedAmount += inst.amount || 0;
                } else if (inst.status === 'verified') {
                    verifiedCount++;
                    submittedAmount += inst.amount || 0;
                }
            });
        });

        return { pending, underReviewCount, verifiedCount, submittedAmount };
    };

    const totals = getTotals();

    if (isFetching) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <img src="/loading.gif" alt="Loading" className="w-20 h-20 object-contain" />
                <span className="text-gray-600 font-medium">Loading fees...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
                    <p className="text-gray-500">View and manage your monthly course fees</p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Success Message */}
            {successMsg && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-primary/5 border border-primary rounded-xl p-4 flex items-center gap-3"
                >
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-primary font-medium">{successMsg}</span>
                </motion.div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Total Pending</p>
                            <p className="text-2xl font-bold text-red-600">Rs {totals.pending.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Under Review</p>
                            <p className="text-2xl font-bold text-blue-600">{totals.underReviewCount}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Verified</p>
                            <p className="text-2xl font-bold text-primary">{totals.verifiedCount}</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Submitted Total</p>
                            <p className="text-2xl font-bold text-indigo-600">Rs {totals.submittedAmount.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-xl">
                            <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Course Challan List */}
            <div className="space-y-4 order-1">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-900">Course Challan</h2>
                </div>

                {/* Paused Warning */}
                {fees.some(f => f.enrollmentIsPaused) && (
                    <div className="bg-amber-50 border-2 border-amber-300 px-5 py-4 rounded-2xl flex items-start gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-amber-800 uppercase tracking-wide">Account Temporarily Paused</p>
                            <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
                                Your access to this course has been paused by your teacher. Assignments, daily task submissions, and fee installments are blocked until your teacher resumes your access. Please contact your teacher for more information.
                            </p>
                        </div>
                    </div>
                )}

                {fees.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No challan found</p>
                        <p className="text-sm text-gray-400">Enroll in a course to see challan details</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {fees.map((fee, feeIndex) => (
                            <motion.div key={fee._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: feeIndex * 0.1 }} className="bg-white rounded-2xl p-6 border border-gray-100">
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center">
                                        <CreditCard className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 text-lg">
                                            {fee.course?.title || 'Course'}
                                            {fee.course?.city && <span className="text-sm font-normal text-gray-500 ml-2">({fee.course?.city})</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500">Total Fee: Rs {(fee.totalFee ?? fee.course?.fee ?? 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Installments */}
                                <div className="space-y-3">
                                    {(!fee.installments || fee.installments.length === 0) ? (
                                        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600 font-medium">No payment plan active</p>
                                            <p className="text-sm text-gray-400 mt-1">Please contact the administration to set up your monthly fee plan.</p>
                                        </div>
                                    ) : (
                                        fee.installments.map((inst, index) => {
                                            const isPayable = inst.status === 'pending' || inst.status === 'rejected';
                                            return (
                                                <div key={inst._id || index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-4 border border-gray-100 hover:border-primary/10 transition-colors">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-gray-900">Month {index + 1} Fee</span>
                                                            <Badge variant={
                                                                inst.status === 'verified' ? 'success' :
                                                                    inst.status === 'submitted' ? 'info' :
                                                                        inst.status === 'rejected' ? 'danger' : 'warning'
                                                            }>
                                                                {inst.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex gap-4 text-sm text-gray-500">
                                                            <span>Due: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : 'TBA'}</span>
                                                            {inst.slipId && <span>Slip ID: {inst.slipId}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <span className="font-bold text-gray-900 text-lg">Rs {(inst.amount || 0).toLocaleString()}</span>
                                                        {isPayable && (
                                                            <button
                                                                onClick={() => handlePayClick(fee, inst)}
                                                                disabled={fee.enrollmentIsPaused}
                                                                className={`px-4 py-2 ${fee.enrollmentIsPaused ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary'} text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm`}
                                                            >
                                                                <Upload className="w-4 h-4" />
                                                                {fee.enrollmentIsPaused ? 'LOCKED' : 'Pay Now'}
                                                            </button>
                                                        )}
                                                        {inst.status === 'submitted' && (
                                                            <span className="text-sm text-primary font-medium bg-primary/5 px-3 py-1 rounded-lg">Processing</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payment Methods Section */}
            <div className="space-y-4 order-2">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* HBL Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary/5 rounded-lg">
                                <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-md">Bank Transfer</span>
                        </div>
                        <div className="flex gap-4 items-center justify-between">
                            <div className="space-y-3 flex-1 min-w-0">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Provider</p>
                                    <p className="font-bold text-primary text-lg">HBL</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Account Name</p>
                                    <p className="font-bold text-gray-900 text-lg">Salman Yasin</p>
                                </div>
                                <div className="pt-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Transfer Number</p>
                                    <div
                                        onClick={() => {
                                            navigator.clipboard.writeText('14737991982703');
                                            alert('Account number copied!');
                                        }}
                                        className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-black text-primary text-2xl tracking-widest cursor-pointer hover:bg-primary/5 hover:border-primary/10 transition-all select-all flex justify-between items-center"
                                    >
                                        14737991982703
                                        <span className="text-[10px] font-bold text-primary bg-white px-2 py-1 rounded shadow-sm">COPY</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQrPreview({ open: true, src: QR_LINKS.hbl, title: 'HBL QR Code' })}
                                className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:scale-105 transition-transform shadow-sm flex-shrink-0"
                                title="Open HBL QR"
                            >
                                <img src={QR_LINKS.hbl} alt="HBL QR" className="w-full h-full object-cover" />
                            </button>
                        </div>
                    </motion.div>

                    {/* JazzCash Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary/5 rounded-lg">
                                <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-md">Mobile Wallet</span>
                        </div>
                        <div className="flex gap-4 items-center justify-between">
                            <div className="space-y-3 flex-1 min-w-0">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Provider</p>
                                    <p className="font-bold text-primary text-lg">JAZZCASH</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Account Name</p>
                                    <p className="font-bold text-gray-900 text-lg">Salman Yasin</p>
                                </div>
                                <div className="pt-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Transfer Number</p>
                                    <div
                                        onClick={() => {
                                            navigator.clipboard.writeText('03092333121');
                                            alert('Number copied!');
                                        }}
                                        className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-black text-primary text-2xl tracking-widest cursor-pointer hover:bg-primary/5 hover:border-primary/10 transition-all select-all flex justify-between items-center"
                                    >
                                        03092333121
                                        <span className="text-[10px] font-bold text-primary bg-white px-2 py-1 rounded shadow-sm">COPY</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQrPreview({ open: true, src: QR_LINKS.jazzcash, title: 'JazzCash QR Code' })}
                                className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:scale-105 transition-transform shadow-sm flex-shrink-0"
                                title="Open JazzCash QR"
                            >
                                <img src={QR_LINKS.jazzcash} alt="JazzCash QR" className="w-full h-full object-cover" />
                            </button>
                        </div>
                    </motion.div>

                    {/* Easypaisa Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary/5 rounded-lg">
                                <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-md">Mobile Wallet</span>
                        </div>
                        <div className="flex gap-4 items-center justify-between">
                            <div className="space-y-3 flex-1 min-w-0">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Provider</p>
                                    <p className="font-bold text-primary text-lg">EASYPAISA</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Account Name</p>
                                    <p className="font-bold text-gray-900 text-lg">Salman Yasin</p>
                                </div>
                                <div className="pt-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Transfer Number</p>
                                    <div
                                        onClick={() => {
                                            navigator.clipboard.writeText('03441713141');
                                            alert('Number copied!');
                                        }}
                                        className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-black text-primary text-2xl tracking-widest cursor-pointer hover:bg-primary/5 hover:border-primary/10 transition-all select-all flex justify-between items-center"
                                    >
                                        03441713141
                                        <span className="text-[10px] font-bold text-primary bg-white px-2 py-1 rounded shadow-sm">COPY</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQrPreview({ open: true, src: QR_LINKS.easypaisa, title: 'Easypaisa QR Code' })}
                                className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 hover:scale-105 transition-transform shadow-sm flex-shrink-0"
                                title="Open Easypaisa QR"
                            >
                                <img src={QR_LINKS.easypaisa} alt="Easypaisa QR" className="w-full h-full object-cover" />
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Clear Step Banner */}
                <div className="bg-[#0f2847] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Transfer the amount, take a screenshot, and click "Pay Now" below.</p>
                            <p className="text-primary/60 text-[10px] uppercase font-bold">Please ensure the Slip ID is correct for verification.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold border border-white/10">1. TRANSFER</div>
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold border border-white/10">2. SCREENSHOT</div>
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold border border-white/10">3. UPLOAD</div>
                    </div>
                </div>
            </div>

            {/* Fullscreen QR Preview */}
            {qrPreview.open && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <button
                        onClick={() => setQrPreview({ open: false, src: '', title: '' })}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                        aria-label="Close QR preview"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col items-center">
                        <h3 className="text-white font-bold text-lg mb-3">{qrPreview.title}</h3>
                        <img
                            src={qrPreview.src}
                            alt={qrPreview.title}
                            className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl bg-white p-2"
                        />
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            <Modal isOpen={isUploadModalOpen} onClose={() => { 
                setIsUploadModalOpen(false); 
                setUploadedFile(null); 
                setPreviewUrl(null);
                setSlipId(''); 
            }} title="Upload Payment Receipt" size="md" noScroll={true}>
                {selectedFee && selectedInstallment && (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-gray-900">
                                    {selectedFee.course?.title}
                                    {selectedFee.course?.city && <span className="text-gray-500 font-normal ml-1">({selectedFee.course?.city})</span>}
                                </p>
                                <p className="text-xl font-bold text-primary">Rs {(selectedInstallment.amount || 0).toLocaleString()}</p>
                            </div>
                            <p className="text-sm text-gray-500">Monthly Course Fee</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Slip ID (Transaction ID) <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={slipId}
                                onChange={(e) => {
                                    setSlipId(e.target.value);
                                    if (e.target.value.trim()) setShowSlipError(false);
                                }}
                                placeholder="Enter the unique ID from your slip"
                                className={`w-full px-4 py-2 border ${showSlipError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
                            />
                            {showSlipError && (
                                <p className="text-xs text-red-500 mt-1 font-bold italic">
                                    enter id number to submit
                                </p>
                            )}
                        </div>

                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary transition-colors group cursor-pointer relative">
                            {uploadedFile ? (
                                <div className="space-y-3">
                                    {previewUrl ? (
                                        <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-gray-100 mb-3 group/preview">
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain bg-gray-50" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setPreviewUrl(null); }}
                                                    className="bg-white p-2 rounded-full text-red-500 shadow-lg hover:scale-110 transition-transform"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                                            <FileImage className="w-6 h-6" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                                        <p className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setPreviewUrl(null); }} className="text-sm text-red-500 hover:text-red-700 font-medium underline">
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block w-full h-full">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors mb-3">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <p className="text-gray-900 font-medium mb-1">Click to upload receipt</p>
                                    <p className="text-xs text-red-500 font-medium mb-1">⚠️ Upload image less than 1MB</p>
                                    <p className="text-sm text-gray-400">PNG, JPG, HEIC, WebP</p>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => { setIsUploadModalOpen(false); setUploadedFile(null); setPreviewUrl(null); setSlipId(''); }} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitPayment}
                                disabled={!uploadedFile || isSubmitting}
                                className="flex-1 py-3 bg-[#0f2847] hover:bg-primary text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/10"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Payment'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Withdraw Modal */}
            <Modal
                isOpen={withdrawModal.open}
                onClose={() => setWithdrawModal({ ...withdrawModal, open: false })}
                title="Revoke Course Application"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">Are you sure?</h4>
                            <p className="text-xs text-red-600 mt-1">
                                You are about to withdraw from <strong>{withdrawModal.courseTitle}</strong>.
                                This will remove the course and any pending fee records permanently.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setWithdrawModal({ ...withdrawModal, open: false })}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmWithdraw}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                        >
                            Confirm Revoke
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FeeManagement;



