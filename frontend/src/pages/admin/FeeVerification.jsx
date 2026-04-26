import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Eye, CheckCircle, XCircle, Clock, AlertCircle, Loader2,
    Plus, Trash2, Calendar, DollarSign, FileText, ArrowLeft, MapPin, Users, CheckCircle2
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { feeAPI } from '../../services/api';
import { showToast } from '../../utils/customToast';
import Loader from '../../components/ui/Loader';

const FeeVerification = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFee, setSelectedFee] = useState(null);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null); // For Course Grouping

    // Filters State
    const [selectedRoles, setSelectedRoles] = useState([]); // 'students', 'interns'
    const [selectedCities, setSelectedCities] = useState([]); // 'Bahawalpur', 'Islamabad'

    // Data states
    const [fees, setFees] = useState([]); // Pending fees
    const [allFees, setAllFees] = useState([]); // All fees

    const [isFetching, setIsFetching] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    // Delete Confirmation Modal
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ open: false, feeId: null });

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
            _id: i._id,
            amount: i.amount,
            dueDate: i.dueDate ? new Date(i.dueDate).toISOString().split('T')[0] : '',
            status: i.status,
            receiptUrl: i.receiptUrl,
            slipId: i.slipId
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
            // Ensure amounts are numbers and statuses are set when sending
            const payloadInstallments = installmentPlan.map(inst => ({
                amount: inst.amount === '' || inst.amount === null ? 0 : Number(inst.amount),
                dueDate: inst.dueDate || null,
                status: inst.status || 'pending'
            }));

            const res = await feeAPI.setInstallments(selectedFee._id, payloadInstallments);
            const updatedFee = res.data.fee;

            // Update local state immediately so reopened modal shows saved values
            setFees(prev => prev.map(f => (f._id === updatedFee._id ? updatedFee : f)));
            setAllFees(prev => prev.map(f => (f._id === updatedFee._id ? updatedFee : f)));
            setSelectedFee(updatedFee);

            setIsInstallmentModalOpen(false);

            // Still refresh lists in background for consistency
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
                showToast.success('Receipt Rejected', 'The student has been notified to re-upload their receipt.');
            }
            fetchAllFees();
        } catch (error) {
            console.error('Error rejecting fee:', error);
            showToast.error('Action Failed', 'Failed to reject the fee receipt. Please try again.');
        }
    };

    const handleDeleteClick = (feeId) => {
        setConfirmDeleteModal({ open: true, feeId });
    };

    const confirmDelete = async () => {
        if (!confirmDeleteModal.feeId) return;
        setIsProcessing(true);
        try {
            await feeAPI.delete(confirmDeleteModal.feeId);
            setAllFees(prev => prev.filter(f => f._id !== confirmDeleteModal.feeId));
            setFees(prev => prev.filter(f => f._id !== confirmDeleteModal.feeId));
            setConfirmDeleteModal({ open: false, feeId: null });
            showToast.success('Record Deleted', 'The fee and enrollment record has been permanently removed.', Trash2);
        } catch (err) {
            console.error('Error deleting fee:', err);
            showToast.error('Delete Failed', 'Failed to delete fee record. Please check your connection.');
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
            showToast.success('Payment Verified', 'The installment has been marked as paid successfully.', CheckCircle2);
        } catch (err) {
            console.error('Error verifying:', err);
            showToast.error('Verification Error', err.response?.data?.message || 'Failed to verify payment');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteInstallment = async (feeId, installmentId) => {
        if (!window.confirm('Are you sure you want to delete this fee challan?')) return;

        setIsProcessing(true);
        setError('');
        try {
            const res = await feeAPI.deleteInstallment(feeId, installmentId);

            if (res.data.fullyDeleted) {
                // Entire fee record was deleted (student never paid) — remove from local state
                setFees(prev => prev.filter(f => f._id !== feeId));
                setAllFees(prev => prev.filter(f => f._id !== feeId));
            } else {
                // Only the installment was removed — refresh list
                if (activeTab === 'pending') fetchPendingFees();
                else fetchAllFees();
            }
        } catch (err) {
            console.error('Error deleting installment:', err);
            setError(err.response?.data?.message || 'Failed to delete installment');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleFilter = (type, value) => {
        if (type === 'role') {
            setSelectedRoles(prev =>
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            );
        } else {
            setSelectedCities(prev =>
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            );
        }
    };

    const clearFilters = () => {
        setSelectedRoles([]);
        setSelectedCities([]);
        setSearchQuery('');
    };

    const getFilteredFees = (data) => {
        return data.filter(fee => {
            const matchesSearch =
                fee.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                fee.course?.title?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(fee.course?.targetAudience);
            const matchesCity = selectedCities.length === 0 || selectedCities.includes(fee.course?.city);

            return matchesSearch && matchesRole && matchesCity;
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        try {
            const cleanUrl = String(url).trim();
            if (cleanUrl.toLowerCase().startsWith('http') || cleanUrl.toLowerCase().startsWith('data:')) {
                return cleanUrl;
            }
            const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
            return `${baseUrl}/${cleanUrl.replace(/\\/g, '/').replace(/^\//, '')}`;
        } catch (e) {
            return url;
        }
    };

    if (isFetching && !isProcessing && fees.length === 0 && allFees.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader message="Loading Fees & Verification Data..." size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fee Management</h1>
                    <p className="text-sm text-gray-500">Verify payments and manage monthly fee plans</p>
                </div>
                <div className="grid grid-cols-2 sm:flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Pending Verification
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        All Fees & Months
                    </button>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 space-y-6">
                <div className="flex flex-col gap-4">
                    {/* Search */}
                    <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-emerald-500/20 focus-within:bg-white transition-all">
                        <Search className="w-5 h-5 text-gray-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Search students or courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400 font-medium text-sm"
                        />
                    </div>

                    {/* Clear Button */}
                    {(selectedRoles.length > 0 || selectedCities.length > 0 || searchQuery) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            <XCircle className="w-4 h-4" />
                            Clear Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    {/* Role Filters */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Audience:</span>
                        <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => toggleFilter('role', 'students')}
                                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedRoles.includes('students')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Students
                            </button>
                            <button
                                onClick={() => toggleFilter('role', 'interns')}
                                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedRoles.includes('interns')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Interns
                            </button>
                        </div>
                    </div>

                    {/* City Filters */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Location:</span>
                        <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => toggleFilter('city', 'Islamabad')}
                                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCities.includes('Islamabad')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Islamabad
                            </button>
                            <button
                                onClick={() => toggleFilter('city', 'Bahawalpur')}
                                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCities.includes('Bahawalpur')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Bahawalpur
                            </button>
                        </div>
                    </div>
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

                        {getFilteredFees(fees).reduce((acc, f) => acc + (f.installments?.filter(i => i.status === 'submitted').length || 0), 0) === 0 ? (
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-gray-500">
                                <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                No receipts to verify matching your filters
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {getFilteredFees(fees).map(fee => (
                                    (fee.installments || []).filter(i => i.status === 'submitted').map(inst => (
                                        <motion.div key={`${fee._id}-${inst._id}`} layout className="bg-white p-4 sm:p-6 rounded-2xl border border-amber-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                            <div className="flex items-start sm:items-center gap-4">
                                                {fee.user?.photo ? (
                                                    <img
                                                        src={fee.user.photo}
                                                        alt={fee.user.name}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-amber-100 shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-black text-lg shrink-0">
                                                        {fee.user?.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-gray-900 truncate flex flex-wrap items-center gap-2">
                                                        <span className="text-sm sm:text-base">{fee.user?.name || 'Unknown Student'}</span>
                                                        {fee.user?.phone && (
                                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                📞 {fee.user.phone}
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                        {fee.course?.title || 'Unknown Course'} ({fee.course?.city || 'N/A'})
                                                        <span className={`ml-2 px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${fee.course?.targetAudience === 'students' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                            {fee.course?.targetAudience}
                                                        </span>
                                                    </p>
                                                    <div className="grid grid-cols-2 sm:flex gap-x-4 gap-y-1 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                        <span className="truncate">Slip: {inst.slipId || 'N/A'}</span>
                                                        <span className="truncate">Sent: {formatDate(inst.paidAt)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t border-dashed border-gray-100 pt-4 lg:pt-0 lg:border-none">
                                                <div className="text-left lg:text-right">
                                                    <p className="text-lg sm:text-xl font-black text-gray-900">Rs {(inst.amount || 0).toLocaleString()}</p>
                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{inst.status}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleViewScreenshot({ ...inst, feeId: fee._id, student: fee.user?.name, course: fee.course?.title })} className="w-10 h-10 sm:w-auto sm:px-4 sm:py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20" title="View Receipt">
                                                        <Eye className="w-4 h-4" />
                                                        <span className="hidden sm:inline">View Receipt</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(fee._id, inst._id)}
                                                        disabled={isProcessing}
                                                        className="w-10 h-10 sm:w-auto sm:px-4 sm:py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                        title="Reject Receipt"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Reject</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteInstallment(fee._id, inst._id)}
                                                        className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                        title="Delete Month"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
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

                        {getFilteredFees(fees).reduce((acc, f) => acc + (f.installments?.filter(i => i.status === 'pending').length || 0), 0) === 0 ? (
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center text-gray-400 text-sm">
                                No pending payments matching your filters
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {getFilteredFees(fees).map(fee => (
                                    (fee.installments || []).filter(i => i.status === 'pending').map(inst => (
                                        <div key={`${fee._id}-${inst._id}`} className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center gap-3">
                                                {fee.user?.photo ? (
                                                    <img
                                                        src={fee.user.photo}
                                                        alt={fee.user.name}
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
                                                        {fee.user?.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${fee.course?.targetAudience === 'students' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                                                            {fee.course?.targetAudience}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-gray-700 dark:text-gray-100 truncate flex items-center gap-2">
                                                        <span className="text-sm">{fee.user?.name || 'Unknown Student'}</span>
                                                        {fee.user?.phone && (
                                                            <span className="text-[9px] font-bold text-gray-500 bg-white/50 px-1.5 py-0.5 rounded-full">
                                                                📞 {fee.user.phone}
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                        {fee.course?.title} ({fee.course?.city}) • Due: {formatDate(inst.dueDate)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-dashed border-gray-100 pt-3 sm:pt-0 sm:border-none">
                                                <div className="text-left sm:text-right">
                                                    <span className="font-black text-gray-900 dark:text-gray-100">Rs {(inst.amount || 0).toLocaleString()}</span>
                                                    <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">Pending</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteInstallment(fee._id, inst._id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete this fee challan only"
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
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Group fees by course */}
                                {Object.values(getFilteredFees(allFees).reduce((acc, fee) => {
                                    if (fee.course) {
                                        if (!acc[fee.course._id]) {
                                            acc[fee.course._id] = {
                                                id: fee.course._id,
                                                title: fee.course.title,
                                                fee: fee.course.fee,
                                                location: fee.course.city || fee.course.location,
                                                targetAudience: fee.course.targetAudience,
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
                                            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                Rs {course.fee?.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${course.targetAudience === 'students' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                {course.targetAudience}
                                            </span>
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

                                {Object.keys(getFilteredFees(allFees).reduce((acc, f) => (f.course && (acc[f.course._id] = 1), acc), {})).length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        No courses found matching your filters.
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
                                <span className="bg-white text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold capitalize border border-indigo-100 flex items-center gap-1.5 shadow-sm">
                                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                                    {allFees.find(f => String(f.course?._id) === String(selectedCourse))?.course?.targetAudience || 'N/A'}
                                </span>
                                <span className="bg-white text-indigo-600 px-2 py-0.5 rounded text-xs border border-indigo-100">
                                    {getFilteredFees(allFees).filter(f => String(f.course?._id) === String(selectedCourse)).length} Students
                                </span>
                            </div>

                            <div className="grid gap-4">
                                {getFilteredFees(allFees)
                                    .filter(fee => String(fee.course?._id) === String(selectedCourse))
                                    .map(fee => (
                                        <div key={fee._id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                {fee.user?.photo ? (
                                                    <img
                                                        src={fee.user.photo}
                                                        alt={fee.user.name}
                                                        className="w-12 h-12 rounded-full object-cover border border-gray-100"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                                                        {fee.user?.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {fee.user?.name || 'Unknown Student'}
                                                        {fee.user?.phone && (
                                                            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                                📞 {fee.user.phone}
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        {fee.course?.title || 'Unknown Course'}
                                                        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${fee.course?.targetAudience === 'students' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                            {fee.course?.targetAudience}
                                                        </span>
                                                    </p>
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
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDeleteClick(fee._id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                                                    title="Permanently remove fee & enrollment"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleManageInstallments(fee)}
                                                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Manage Months
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* Screenshot Modal */}
            <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title="Payment Receipt" zIndex={150}>
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
                                src={getImageUrl(selectedInstallment.receiptUrl)}
                                alt="Receipt"
                                className="w-full h-auto"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
                            <button
                                onClick={() => {
                                    handleReject(selectedInstallment.feeId, selectedInstallment._id);
                                    setIsImageModalOpen(false);
                                }}
                                className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg flex items-center gap-2 font-medium"
                            >
                                <XCircle className="w-4 h-4" /> Reject
                            </button>
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
            <Modal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} title="Manage Months" size="lg">
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                        <p>Set up the monthly fee plan for <strong>{selectedFee?.user?.name}</strong>.</p>
                        <p className="mt-1">Course Fee: <strong>Rs {(selectedFee?.totalFee || 0).toLocaleString()}</strong></p>
                    </div>

                    {/* Auto-generation notice */}
                    <div className="bg-red-50 p-4 rounded-xl text-sm text-red-700 border border-red-200">
                        <p className="font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Next month's installment will be automatically created by the system.
                        </p>
                        <p className="mt-1 text-xs text-red-600">After the first installment is verified, new installments will be auto-generated monthly using the course fee. You can edit the amount after creation.</p>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {installmentPlan.map((inst, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                <div className="w-24 shrink-0">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Amount</label>
                                    <input
                                        type="number"
                                        value={inst.amount}
                                        onChange={(e) => handleInstallmentChange(idx, 'amount', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="w-32 shrink-0">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Due Date</label>
                                    <input
                                        type="date"
                                        value={inst.dueDate}
                                        onChange={(e) => handleInstallmentChange(idx, 'dueDate', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Status</label>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={inst.status === 'verified' ? 'success' : inst.status === 'submitted' ? 'info' : inst.status === 'rejected' ? 'error' : 'warning'}>
                                            {inst.status === 'verified' ? 'PAID ✓' : (inst.status?.toUpperCase() || 'PENDING')}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {inst.receiptUrl && (
                                        <button
                                            type="button"
                                            onClick={() => handleViewScreenshot({ ...inst, feeId: selectedFee?._id, student: selectedFee?.user?.name, course: selectedFee?.course?.title })}
                                            className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-100"
                                            title="View Uploaded Slip"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveInstallmentRow(idx)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete Row"
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

            {/* Confirm Delete Modal */}
            <Modal
                isOpen={confirmDeleteModal.open}
                onClose={() => setConfirmDeleteModal({ open: false, feeId: null })}
                title="⚠ Risk Warning: Permanently Delete Fee"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">Are you absolutely sure?</h4>
                            <p className="text-sm text-red-600 mt-1 leading-relaxed">
                                This action will <strong>permanently delete</strong> the fee record AND the student's enrollment for this course.
                            </p>
                            <p className="text-xs text-red-500 mt-2 font-medium">
                                The student will lose their "Waiting for Verification" status and will need to <strong>re-register (apply again)</strong> from scratch.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setConfirmDeleteModal({ open: false, feeId: null })}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Confirm Delete
                        </button>
                    </div>
                </div>
            </Modal >
        </div >
    );
};

export default FeeVerification;
