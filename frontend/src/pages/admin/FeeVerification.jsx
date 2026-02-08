import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Eye, CheckCircle, XCircle, Clock, AlertCircle, Loader2,
    Plus, Trash2, Calendar, DollarSign, FileText, ArrowLeft, MapPin, Users
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
                // Optionally show success toast/alert
            }
            fetchAllFees();
        } catch (error) {
            console.error('Error rejecting fee:', error);
            alert('Failed to reject fee');
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
        } catch (err) {
            console.error('Error deleting fee:', err);
            alert('Failed to delete fee record');
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

            {/* Filters and Search */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-emerald-500/20 focus-within:bg-white transition-all">
                        <Search className="w-5 h-5 text-gray-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Search students or courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400 font-medium"
                        />
                    </div>

                    {/* Clear Button */}
                    {(selectedRoles.length > 0 || selectedCities.length > 0 || searchQuery) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-black uppercase tracking-widest"
                        >
                            <XCircle className="w-4 h-4" />
                            Clear
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                    {/* Role Filters */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Audience:</span>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => toggleFilter('role', 'students')}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${selectedRoles.includes('students')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Students
                            </button>
                            <button
                                onClick={() => toggleFilter('role', 'interns')}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${selectedRoles.includes('interns')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Interns
                            </button>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-gray-200 hidden sm:block" />

                    {/* City Filters */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Location:</span>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => toggleFilter('city', 'Islamabad')}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${selectedCities.includes('Islamabad')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Islamabad
                            </button>
                            <button
                                onClick={() => toggleFilter('city', 'Bahawalpur')}
                                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${selectedCities.includes('Bahawalpur')
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
                                        <motion.div key={`${fee._id}-${inst._id}`} layout className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold">
                                                    {fee.user?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{fee.user?.name || 'Unknown Student'}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        {fee.course?.title || 'Unknown Course'} ({fee.course?.city || 'N/A'})
                                                        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${fee.course?.targetAudience === 'students' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                            {fee.course?.targetAudience}
                                                        </span>
                                                    </p>
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
                                                    <button onClick={() => handleViewScreenshot({ ...inst, feeId: fee._id, student: fee.user?.name, course: fee.course?.title })} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium">
                                                        <Eye className="w-4 h-4" />
                                                        View Receipt
                                                    </button>
                                                )}
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

                        {getFilteredFees(fees).reduce((acc, f) => acc + (f.installments?.filter(i => i.status === 'pending').length || 0), 0) === 0 ? (
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center text-gray-400 text-sm">
                                No pending payments matching your filters
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {getFilteredFees(fees).map(fee => (
                                    (fee.installments || []).filter(i => i.status === 'pending').map(inst => (
                                        <div key={`${fee._id}-${inst._id}`} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                                    {fee.user?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-700">{fee.user?.name || 'Unknown Student'}</h3>
                                                    <p className="text-xs text-gray-500">
                                                        {fee.course?.title} ({fee.course?.city}) • Due: {formatDate(inst.dueDate)}
                                                        <span className={`ml-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${fee.course?.targetAudience === 'students' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                            {fee.course?.targetAudience}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-left md:text-right">
                                                    <span className="font-bold text-gray-700">Rs {(inst.amount || 0).toLocaleString()}</span>
                                                    <span className="ml-3 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Pending</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteClick(fee._id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Un-enroll student & delete fee"
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
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{fee.user?.name || 'Unknown Student'}</h3>
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
