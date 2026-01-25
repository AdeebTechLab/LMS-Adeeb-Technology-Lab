import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, UserCheck, UserX, Trash2, User, Mail, Phone, MapPin,
    Calendar, GraduationCap, Loader2, RefreshCw, CheckCircle, XCircle, Clock
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { userAPI } from '../../services/api';

const StudentsManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, user: null });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const res = await userAPI.getByRole('student');
            setStudents(res.data.data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.verify(confirmModal.user._id);
            setStudents(prev => prev.map(s =>
                s._id === confirmModal.user._id ? { ...s, isVerified: true } : s
            ));
        } catch (error) {
            console.error('Error verifying student:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const handleUnverify = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.unverify(confirmModal.user._id);
            setStudents(prev => prev.map(s =>
                s._id === confirmModal.user._id ? { ...s, isVerified: false } : s
            ));
        } catch (error) {
            console.error('Error unverifying student:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const handleDelete = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.delete(confirmModal.user._id);
            setStudents(prev => prev.filter(s => s._id !== confirmModal.user._id));
        } catch (error) {
            console.error('Error deleting student:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.rollNo?.includes(searchQuery) ||
            s.cnic?.includes(searchQuery);

        if (filterStatus === 'verified') return matchesSearch && s.isVerified;
        if (filterStatus === 'pending') return matchesSearch && !s.isVerified;
        return matchesSearch;
    });

    const verifiedCount = students.filter(s => s.isVerified).length;
    const pendingCount = students.filter(s => !s.isVerified).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading students...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
                    <p className="text-gray-500">View and manage registered students</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={fetchStudents} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                        <RefreshCw className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="px-4 py-2 bg-emerald-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-emerald-600">{verifiedCount}</p>
                        <p className="text-xs text-gray-500">Verified</p>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search by name, email, roll no, or CNIC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-gray-700"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'verified', 'pending'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-xl font-medium capitalize transition-all ${filterStatus === status
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Students List */}
            {filteredStudents.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No students found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredStudents.map((student, index) => (
                        <motion.div
                            key={student._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl p-6 border border-gray-100"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Photo & Basic Info */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center overflow-hidden">
                                        {student.photo ? (
                                            <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-xl font-bold">{student.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">{student.name}</h3>
                                            {student.rollNo && (
                                                <Badge variant="primary">#{student.rollNo}</Badge>
                                            )}
                                            {student.isVerified ? (
                                                <Badge variant="success">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="warning">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Mail className="w-4 h-4" /> {student.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm flex-1">
                                    <div>
                                        <p className="text-gray-400">Phone</p>
                                        <p className="font-medium text-gray-700">{student.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">CNIC</p>
                                        <p className="font-medium text-gray-700 font-mono">{student.cnic || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Education</p>
                                        <p className="font-medium text-gray-700">{student.education || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Location</p>
                                        <p className="font-medium text-gray-700 capitalize">{student.location || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    {!student.isVerified ? (
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'verify', user: student })}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2"
                                        >
                                            <UserCheck className="w-4 h-4" />
                                            Verify
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'unverify', user: student })}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium flex items-center gap-2"
                                        >
                                            <UserX className="w-4 h-4" />
                                            Revoke
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setConfirmModal({ open: true, action: 'delete', user: student })}
                                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Confirm Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, action: null, user: null })}
                title={
                    confirmModal.action === 'verify' ? 'Verify Student' :
                        confirmModal.action === 'unverify' ? 'Revoke Verification' : 'Delete Student'
                }
                size="md"
            >
                {confirmModal.user && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl text-center ${confirmModal.action === 'delete' ? 'bg-red-50' :
                                confirmModal.action === 'verify' ? 'bg-emerald-50' : 'bg-amber-50'
                            }`}>
                            {confirmModal.action === 'verify' && <UserCheck className="w-12 h-12 text-emerald-600 mx-auto mb-2" />}
                            {confirmModal.action === 'unverify' && <UserX className="w-12 h-12 text-amber-600 mx-auto mb-2" />}
                            {confirmModal.action === 'delete' && <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-2" />}

                            <p className="text-gray-700">
                                {confirmModal.action === 'verify' && 'You are about to verify:'}
                                {confirmModal.action === 'unverify' && 'You are about to revoke verification for:'}
                                {confirmModal.action === 'delete' && 'You are about to permanently delete:'}
                            </p>
                            <p className="text-xl font-bold text-gray-900 mt-2">{confirmModal.user.name}</p>
                            <p className="text-sm text-gray-500">{confirmModal.user.email}</p>
                        </div>

                        {confirmModal.action === 'delete' && (
                            <p className="text-sm text-red-500 text-center">
                                This action cannot be undone. All data associated with this student will be removed.
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ open: false, action: null, user: null })}
                                className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={
                                    confirmModal.action === 'verify' ? handleVerify :
                                        confirmModal.action === 'unverify' ? handleUnverify : handleDelete
                                }
                                disabled={isProcessing}
                                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${confirmModal.action === 'delete'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : confirmModal.action === 'verify'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                                    }`}
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {confirmModal.action === 'verify' && <UserCheck className="w-5 h-5" />}
                                        {confirmModal.action === 'unverify' && <UserX className="w-5 h-5" />}
                                        {confirmModal.action === 'delete' && <Trash2 className="w-5 h-5" />}
                                    </>
                                )}
                                Confirm
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StudentsManagement;
