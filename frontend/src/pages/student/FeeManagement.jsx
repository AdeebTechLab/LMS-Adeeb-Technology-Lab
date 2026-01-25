import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard, Upload, Clock, CheckCircle, AlertCircle, FileText, Loader2, RefreshCw, FileImage
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { feeAPI } from '../../services/api';

const FeeManagement = () => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [slipId, setSlipId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [fees, setFees] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchFees();
    }, []);

    const fetchFees = async () => {
        setIsFetching(true);
        setError('');
        try {
            const response = await feeAPI.getMy();
            setFees(response.data.data || []);
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
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
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
            alert('Please enter the Slip ID');
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

    // Calculate totals from installments
    const getTotals = () => {
        let pending = 0;
        let underReview = 0;
        let verified = 0;

        fees.forEach(fee => {
            (fee.installments || []).forEach(inst => {
                if (inst.status === 'pending' || inst.status === 'rejected') {
                    pending += inst.amount || 0;
                } else if (inst.status === 'submitted') {
                    underReview++;
                } else if (inst.status === 'verified') {
                    verified++;
                }
            });
        });

        return { pending, underReview, verified };
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
                    <p className="text-gray-500">View and manage your course fees</p>
                </div>
                <button onClick={fetchFees} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <p className="text-2xl font-bold text-blue-600">{totals.underReview}</p>
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
                            <p className="text-2xl font-bold text-emerald-600">{totals.verified}</p>
                        </div>
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Payment Methods Instruction */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-emerald-900 to-[#0D2818] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                            <AlertCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Important Instructions</h2>
                            <p className="text-emerald-300/80 text-sm">Please follow these steps to pay your fee</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Step-by-Step */}
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 border border-emerald-500/30 flex-shrink-0">1</div>
                                <p className="text-emerald-100/90 text-sm leading-relaxed">
                                    Send your fee amount to one of the official payment accounts displayed on the right.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 border border-emerald-500/30 flex-shrink-0">2</div>
                                <p className="text-emerald-100/90 text-sm leading-relaxed">
                                    Take a clear **Screenshot** of the successful transaction and note down the **Slip ID** (Transaction ID).
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 border border-emerald-500/30 flex-shrink-0">3</div>
                                <p className="text-emerald-100/90 text-sm leading-relaxed">
                                    Click the **"Pay Now"** button below for your respective installment, upload the screenshot, and enter the Slip ID.
                                </p>
                            </div>
                        </div>

                        {/* Account Details */}
                        <div className="space-y-4">
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Option 1: Bank Transfer</span>
                                    <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none">Fastest</Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-emerald-300/60 font-medium">Bank Name</span>
                                        <span className="font-bold">HBL</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-emerald-300/60 font-medium">Account Name</span>
                                        <span className="font-bold">Salman</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-emerald-300/60 font-medium">Account No.</span>
                                        <span className="font-bold tracking-wider select-all">14737991982703</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Option 2: Mobile Wallet</span>
                                    <Badge variant="info" className="bg-blue-500/20 text-blue-400 border-none text-[8px]">JazzCash</Badge>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-emerald-300/60 font-medium">Account Name</span>
                                        <span className="font-bold">Salman Yasin</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-emerald-300/60 font-medium">Account No.</span>
                                        <span className="font-bold tracking-wider select-all">03092333121</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CreditCard className="w-32 h-32 -mr-8 -mt-8 rotate-12" />
                </div>
            </motion.div>

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
                                    <h3 className="font-semibold text-gray-900 text-lg">{fee.course?.title || 'Course'}</h3>
                                    <p className="text-sm text-gray-500">Total Fee: Rs {(fee.totalFee ?? fee.course?.fee ?? 0).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Installments */}
                            <div className="space-y-3">
                                {(!fee.installments || fee.installments.length === 0) ? (
                                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600 font-medium">No payment plan active</p>
                                        <p className="text-sm text-gray-400 mt-1">Please contact the administration to set up your payment installments.</p>
                                    </div>
                                ) : (
                                    fee.installments.map((inst, index) => {
                                        const isPayable = inst.status === 'pending' || inst.status === 'rejected';
                                        return (
                                            <div key={inst._id || index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-4 border border-gray-100 hover:border-emerald-100 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-gray-900">Installment {index + 1}</span>
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
                                <p className="font-medium text-gray-900">{selectedFee.course?.title}</p>
                                <p className="text-xl font-bold text-emerald-600">Rs {(selectedInstallment.amount || 0).toLocaleString()}</p>
                            </div>
                            <p className="text-sm text-gray-500">Installment Payment</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Slip ID (Transaction ID)</label>
                            <input
                                type="text"
                                value={slipId}
                                onChange={(e) => setSlipId(e.target.value)}
                                placeholder="Enter the unique ID from your slip"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                            />
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
                                    <p className="text-sm text-gray-400">PNG, JPG up to 5MB</p>
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
        </div>
    );
};

export default FeeManagement;
