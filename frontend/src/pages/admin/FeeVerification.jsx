import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Eye, CheckCircle, XCircle, Clock, AlertCircle, Loader2, RefreshCw,
    Plus, Trash2, Calendar, DollarSign, FileText, ArrowLeft, MapPin
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { feeAPI } from '../../services/api';

const FeeVerification = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFee, setSelectedFee] = useState(null);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null); // For Course Grouping

    // Data states
    const [fees, setFees] = useState([]); // Pending fees
    const [allFees, setAllFees] = useState([]); // All fees

    const [isFetching, setIsFetching] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    // Installment Form State
    const [installmentPlan, setInstallmentPlan] = useState([{ amount: '', dueDate: '' }]);

    useEffect(() => {
        setError('');
        if (activeTab === 'pending') {
            fetchPendingFees();
        } else {
            fetchAllFees();
        }
    }, [activeTab]);

    const fetchPendingFees = async () => {
        setIsFetching(true);
        try {
            const response = await feeAPI.getPending();
            setFees(response.data.data || []);
        } catch (err) {
            console.error('Error fetching pending fees:', err);
            setError('Failed to load pending fees. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const fetchAllFees = async () => {
        setIsFetching(true);
        try {
            const response = await feeAPI.getAll();
            setAllFees(response.data.data || []);
        } catch (err) {
            console.error('Error fetching all fees:', err);
            setError('Failed to load all fees. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const handleManageInstallments = (fee) => {
        setSelectedFee(fee);
        // Pre-fill existing installments or start with one empty
        const existing = fee.installments?.map(i => ({
            amount: i.amount,
            dueDate: i.dueDate ? new Date(i.dueDate).toISOString().split('T')[0] : '',
            status: i.status
        })) || [];

        setInstallmentPlan(existing.length > 0 ? existing : [{ amount: '', dueDate: '', status: 'pending' }]);
        setIsInstallmentModalOpen(true);
    };

    const handleAddInstallmentRow = () => {
        setInstallmentPlan([...installmentPlan, { amount: '', dueDate: '', status: 'pending' }]);
    };

    const handleRemoveInstallmentRow = (index) => {
        const newPlan = installmentPlan.filter((_, i) => i !== index);
        setInstallmentPlan(newPlan);
    };

    const handleInstallmentChange = (index, field, value) => {
        const newPlan = [...installmentPlan];
        newPlan[index][field] = value;
        setInstallmentPlan(newPlan);
    };

    const handleSaveInstallments = async () => {
        setIsProcessing(true);
        setError('');
        try {
            await feeAPI.setInstallments(selectedFee._id, installmentPlan);
            setIsInstallmentModalOpen(false);
            if (activeTab === 'all') fetchAllFees();
            else fetchPendingFees();
        } catch (err) {
            console.error('Error saving installments:', err);
            setError(err.response?.data?.message || 'Failed to save installments');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewScreenshot = (installment) => {
        setSelectedInstallment(installment);
        setIsImageModalOpen(true);
    };

    const handleReject = async (feeId, installmentId) => {
        if (!window.confirm('Are you sure you want to reject this receipt? The student will be asked to re-upload.')) return;

        setIsProcessing(true);
        try {
            const res = await feeAPI.reject(feeId, installmentId);

            if (res.data.success) {
                // Update local state to remove the rejected item from the view
                setFees(prev => prev.map(fee => {
                    if (fee._id === feeId) {
                        return {
                            ...fee,
                            installments: fee.installments.map(inst =>
                                inst._id === installmentId ? { ...inst, status: 'rejected' } : inst
                            )
                        };
                    }
                    return fee;
                }));
                // Optionally show success toast/alert
            }
        } catch (error) {
            console.error('Reject error:', error);
            setError(error.response?.data?.message || 'Failed to reject payment');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerify = async (feeId, installmentId) => {
        setIsProcessing(true);
        setError('');
        try {
            await feeAPI.verify(feeId, installmentId);
            setIsImageModalOpen(false);
            setSelectedInstallment(null);
            if (activeTab === 'pending') fetchPendingFees();
            else fetchAllFees();
        } catch (err) {
            console.error('Error verifying:', err);
            setError(err.response?.data?.message || 'Failed to verify payment');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteInstallment = async (feeId, installmentId) => {
        if (!window.confirm('Are you sure you want to delete this installment? This will remove it from the student\'s plan.')) return;

        setIsProcessing(true);
        setError('');
        try {
            await feeAPI.deleteInstallment(feeId, installmentId);
            // Refresh counts/list
            if (activeTab === 'pending') fetchPendingFees();
            else fetchAllFees();
        } catch (err) {
            console.error('Error deleting installment:', err);
            setError(err.response?.data?.message || 'Failed to delete installment');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    if (isFetching && !isProcessing && fees.length === 0 && allFees.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading fees...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
                    <p className="text-gray-500">Verify payments and manage monthly fee plans</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Pending Verification
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        All Fees & Months
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Content based on Active Tab */}
            {activeTab === 'pending' ? (
                <div className="space-y-8">
                    {/* Section 1: Submitted for Review (Priority) */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            Submitted for Review
                        </h2>

                        {fees.reduce((acc, f) => acc + (f.installments?.filter(i => i.status === 'submitted').length || 0), 0) === 0 ? (
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-gray-500">
                                <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                No receipts to verify
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {fees.map(fee => (
                                    (fee.installments || []).filter(i => i.status === 'submitted').map(inst => (
                                        <motion.div key={`${fee._id}-${inst._id}`} layout className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold">
                                                    {fee.user?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{fee.user?.name || 'Unknown Student'}</h3>
                                                    <p className="text-sm text-gray-500">{fee.course?.title || 'Unknown Course'} ({fee.course?.city || 'N/A'})</p>
                                                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                                        <span>Slip ID: {inst.slipId || 'N/A'}</span>
                                                        <span>•</span>
                                                        <span>Submitted: {formatDate(inst.paidAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-left lg:text-right">
                                                <p className="text-xl font-bold text-gray-900">Rs {(inst.amount || 0).toLocaleString()}</p>
                                                <p className="text-sm text-amber-600 font-medium">{inst.status}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {inst.receiptUrl && (
                                                    <button onClick={() => handleViewScreenshot({ ...inst, feeId: fee._id, student: fee.user?.name, course: fee.course?.title })} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">
                                                        <Eye className="w-4 h-4" />
                                                        Receipt
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleVerify(fee._id, inst._id)}
                                                    disabled={isProcessing}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50"
                                                >
                                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                    Verify
                                                </button>
                                                <button
                                                    onClick={() => handleReject(fee._id, inst._id)}
                                                    disabled={isProcessing}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-medium disabled:opacity-50"
                                                    title="Reject Receipt"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteInstallment(fee._id, inst._id)}
                                                    className="p-2.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl transition-all"
                                                    title="Delete Month"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Awaiting Payment (Info) */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" />
                            Awaiting Payment
                        </h2>

                        {fees.reduce((acc, f) => acc + (f.installments?.filter(i => i.status === 'pending').length || 0), 0) === 0 ? (
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center text-gray-400 text-sm">
                                No pending payments
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {fees.map(fee => (
                                    (fee.installments || []).filter(i => i.status === 'pending').map(inst => (
                                        <div key={`${fee._id}-${inst._id}`} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                                    {fee.user?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-700">{fee.user?.name || 'Unknown Student'}</h3>
                                                    <p className="text-xs text-gray-500">{fee.course?.title} ({fee.course?.city}) • Due: {formatDate(inst.dueDate)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-left md:text-right">
                                                    <span className="font-bold text-gray-700">Rs {(inst.amount || 0).toLocaleString()}</span>
                                                    <span className="ml-3 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Pending</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteInstallment(fee._id, inst._id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Month"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* All Fees List with Course Grouping */
                <div className="space-y-6">
                    {!selectedCourse ? (
                        /* Level 1: Course List */
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900">All Courses</h2>
                                <button onClick={fetchAllFees} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl">
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Group fees by course */}
                                {Object.values(allFees.reduce((acc, fee) => {
                                    if (fee.course) {
                                        if (!acc[fee.course._id]) {
                                            acc[fee.course._id] = {
                                                id: fee.course._id,
                                                title: fee.course.title,
                                                fee: fee.course.fee,
                                                location: fee.course.city || fee.course.location,
                                                students: 0
                                            };
                                        }
                                        acc[fee.course._id].students++;
                                    }
                                    return acc;
                                }, {})).map(course => (
                                    <motion.div
                                        key={course.id}
                                        whileHover={{ y: -2 }}
                                        onClick={() => setSelectedCourse(course.id)}
                                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                                Rs {course.fee?.toLocaleString()}
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-2 truncate" title={course.title}>
                                            {course.title}
                                        </h3>
                                        <div className="flex items-center justify-between text-gray-500 text-sm">
                                            <span>{course.students} Students Enrolled</span>
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-xs capitalize border border-emerald-100">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {course.location}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}

                                {Object.keys(allFees.reduce((acc, f) => (f.course && (acc[f.course._id] = 1), acc), {})).length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        No courses found with registered students.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Level 2: Student List for Selected Course */
                        <div className="space-y-4">
                            <button
                                onClick={() => setSelectedCourse(null)}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to All Courses
                            </button>

                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3 mb-6">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                <span className="font-semibold text-indigo-900">
                                    {allFees.find(f => String(f.course?._id) === String(selectedCourse))?.course?.title || 'Selected Course'}
                                </span>
                                <span className="bg-white text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold capitalize border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                    {allFees.find(f => String(f.course?._id) === String(selectedCourse))?.course?.city || 'N/A'}
                                </span>
                                <span className="bg-white text-indigo-600 px-2 py-0.5 rounded text-xs border border-indigo-100">
                                    {allFees.filter(f => String(f.course?._id) === String(selectedCourse)).length} Students
                                </span>
                            </div>

                            <div className="grid gap-4">
                                {allFees
                                    .filter(fee => String(fee.course?._id) === String(selectedCourse))
                                    .map(fee => (
                                        <div key={fee._id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{fee.user?.name || 'Unknown Student'}</h3>
                                                <p className="text-sm text-gray-500">{fee.course?.title || 'Unknown Course'}</p>
                                                <div className="flex flex-wrap gap-3 mt-2">
                                                    <Badge variant={fee.status === 'verified' ? 'success' : 'warning'}>{fee.status}</Badge>
                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" /> Total: Rs {(fee.totalFee || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Paid: Rs {(fee.paidAmount || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleManageInstallments(fee)}
                                                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Manage Months
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* Screenshot Modal */}
            <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title="Payment Receipt">
                {selectedInstallment && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-900">{selectedInstallment.student}</p>
                                <p className="text-xs text-gray-500">Slip ID: {selectedInstallment.slipId || 'N/A'}</p>
                            </div>
                            <span className="text-sm font-bold text-emerald-600">Rs {selectedInstallment.amount?.toLocaleString()}</span>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-gray-200">
                            <img
                                src={selectedInstallment.receiptUrl}
                                alt="Receipt"
                                className="w-full h-auto"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
                            <button
                                onClick={() => handleVerify(selectedInstallment.feeId, selectedInstallment._id)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" /> Verify Payment
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Monthly Fee Management Modal */}
            <Modal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} title="Manage Months">
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                        <p>Set up the monthly fee plan for <strong>{selectedFee?.user?.name}</strong>.</p>
                        <p className="mt-1">Course Fee: <strong>Rs {(selectedFee?.totalFee || 0).toLocaleString()}</strong></p>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {installmentPlan.map((inst, idx) => (
                            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                <div className="flex-1 min-w-[120px]">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Amount (Rs)</label>
                                    <input
                                        type="number"
                                        value={inst.amount}
                                        onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Due Date</label>
                                    <input
                                        type="date"
                                        value={inst.dueDate}
                                        onChange={(e) => handleInstallmentChange(idx, 'dueDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pb-1">
                                    <button
                                        type="button"
                                        onClick={() => handleInstallmentChange(idx, 'status', inst.status === 'verified' ? 'pending' : 'verified')}
                                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all ${inst.status === 'verified'
                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-500'
                                            }`}
                                    >
                                        {inst.status === 'verified' ? 'PAID ✓' : 'UNPAID'}
                                    </button>
                                    <button
                                        onClick={() => handleRemoveInstallmentRow(idx)}
                                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove month"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={handleAddInstallmentRow} className="flex items-center gap-2 text-sm text-emerald-600 font-medium hover:underline">
                        <Plus className="w-4 h-4" /> Add Month Fee
                    </button>

                    <div className="border-t pt-4 flex justify-end gap-3">
                        <button onClick={() => setIsInstallmentModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                        <button
                            onClick={handleSaveInstallments}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Plan'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div >
    );
};

export default FeeVerification;
