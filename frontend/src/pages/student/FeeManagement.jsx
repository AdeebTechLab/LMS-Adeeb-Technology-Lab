import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CreditCard, Upload, Clock, CheckCircle, AlertCircle, FileText, Loader2, FileImage, Trash2
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

    const navigate = useNavigate();

    useEffect(() => {
        fetchFees();
    }, []);

    // Periodically refresh fees so admin changes propagate to student view
    useEffect(() => {
        const iv = setInterval(() => {
            fetchFees();
        }, 15000); // every 15 seconds
        return () => clearInterval(iv);
    }, []);

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
                return { ...fee, enrollmentId: enrollment?._id, enrollmentIsActive: enrollment?.isActive || false, courseId: fee.course?._id || fee.course };
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
                                        navigate(`/student/course/${newFee.courseId}`);
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
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading fees...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                    className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3"
                >
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">{successMsg}</span>
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
                            <p className="text-2xl font-bold text-emerald-600">{totals.verifiedCount}</p>
                        </div>
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
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

            {/* Payment Methods Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* HBL Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-600"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <CreditCard className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Bank Transfer</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Bank Name</p>
                                <p className="font-bold text-gray-900">HBL</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Account Name</p>
                                <p className="font-bold text-gray-900 text-lg">Salman</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Account Number</p>
                                <div
                                    onClick={() => {
                                        navigator.clipboard.writeText('14737991982703');
                                        alert('Account number copied!');
                                    }}
                                    className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-black text-gray-900 text-lg tracking-widest cursor-pointer hover:bg-emerald-50 hover:border-emerald-100 transition-all select-all flex justify-between items-center"
                                >
                                    14737991982703
                                    <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-1 rounded shadow-sm">COPY</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* JazzCash Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-500"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <CreditCard className="w-5 h-5 text-orange-600" />
                            </div>
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded-md">Mobile Wallet</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Provider</p>
                                <p className="font-bold text-orange-600 text-lg">JAZZCASH</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Account Name</p>
                                <p className="font-bold text-gray-900 text-lg">Salman Yasin</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Phone Number</p>
                                <div
                                    onClick={() => {
                                        navigator.clipboard.writeText('03092333121');
                                        alert('Number copied!');
                                    }}
                                    className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-black text-orange-600 text-2xl tracking-widest cursor-pointer hover:bg-orange-50 hover:border-orange-100 transition-all select-all flex justify-between items-center"
                                >
                                    03092333121
                                    <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-1 rounded shadow-sm">COPY</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Easypaisa Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-400"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <CreditCard className="w-5 h-5 text-emerald-500" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Mobile Wallet</span>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Provider</p>
                                <p className="font-bold text-emerald-500 text-lg">EASYPAISA</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Account Name</p>
                                <p className="font-bold text-gray-900 text-lg">Salman Yasin</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Phone Number</p>
                                <div
                                    onClick={() => {
                                        navigator.clipboard.writeText('03441713141');
                                        alert('Number copied!');
                                    }}
                                    className="bg-gray-50 p-3 rounded-xl border border-gray-100 font-black text-emerald-600 text-2xl tracking-widest cursor-pointer hover:bg-emerald-50 hover:border-emerald-100 transition-all select-all flex justify-between items-center"
                                >
                                    03441713141
                                    <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-1 rounded shadow-sm">COPY</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Clear Step Banner */}
                <div className="bg-[#0D2818] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Transfer the amount, take a screenshot, and click "Pay Now" below.</p>
                            <p className="text-emerald-300/60 text-[10px] uppercase font-bold">Please ensure the Slip ID is correct for verification.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold border border-white/10">1. TRANSFER</div>
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold border border-white/10">2. SCREENSHOT</div>
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold border border-white/10">3. UPLOAD</div>
                    </div>
                </div>
            </div>

            {/* Fees List */}
            {fees.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No fees found</p>
                    <p className="text-sm text-gray-400">Enroll in a course to see fees here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {fees.map((fee, feeIndex) => (
                        <motion.div key={fee._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: feeIndex * 0.1 }} className="bg-white rounded-2xl p-6 border border-gray-100">
                            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
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
                                            <div key={inst._id || index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-4 border border-gray-100 hover:border-emerald-100 transition-colors">
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
                                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                                                        >
                                                            <Upload className="w-4 h-4" />
                                                            Pay Now
                                                        </button>
                                                    )}
                                                    {inst.status === 'submitted' && (
                                                        <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-lg">Processing</span>
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

            {/* Upload Modal */}
            <Modal isOpen={isUploadModalOpen} onClose={() => { setIsUploadModalOpen(false); setUploadedFile(null); setSlipId(''); }} title="Upload Payment Receipt" size="md">
                {selectedFee && selectedInstallment && (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-gray-900">
                                    {selectedFee.course?.title}
                                    {selectedFee.course?.city && <span className="text-gray-500 font-normal ml-1">({selectedFee.course?.city})</span>}
                                </p>
                                <p className="text-xl font-bold text-emerald-600">Rs {(selectedInstallment.amount || 0).toLocaleString()}</p>
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
                                className={`w-full px-4 py-2 border ${showSlipError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all`}
                            />
                            {showSlipError && (
                                <p className="text-xs text-red-500 mt-1 font-bold italic">
                                    enter id number to submit
                                </p>
                            )}
                        </div>

                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors group cursor-pointer relative">
                            {uploadedFile ? (
                                <div className="space-y-3">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                        <FileImage className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                                        <p className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }} className="text-sm text-red-500 hover:text-red-700 font-medium underline">
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block w-full h-full">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors mb-3">
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
                            <button onClick={() => { setIsUploadModalOpen(false); setUploadedFile(null); setSlipId(''); }} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitPayment}
                                disabled={!uploadedFile || !slipId || isSubmitting}
                                className="flex-1 py-3 bg-[#0D2818] hover:bg-[#1A5D3A] text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/10"
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
