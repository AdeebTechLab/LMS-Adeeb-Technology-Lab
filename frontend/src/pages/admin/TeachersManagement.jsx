import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, UserCheck, UserX, Trash2, User, Mail, Phone, MapPin,
    Calendar, GraduationCap, Loader2, CheckCircle, XCircle, Clock, Shield, Edit2, Save, Download,
    FileText, Users
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { userAPI } from '../../services/api';

const TeachersManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [teachers, setTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // all, verified, pending
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, teacher: null });
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editForm, setEditForm] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        setIsLoading(true);
        try {
            const res = await userAPI.getByRole('teacher');
            setTeachers(res.data.data || []);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!confirmModal.teacher) return;
        setIsProcessing(true);
        try {
            await userAPI.verify(confirmModal.teacher._id);
            setTeachers(prev => prev.map(t =>
                t._id === confirmModal.teacher._id ? { ...t, isVerified: true } : t
            ));
        } catch (error) {
            console.error('Error verifying teacher:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, teacher: null });
        }
    };

    const handleUnverify = async () => {
        if (!confirmModal.teacher) return;
        setIsProcessing(true);
        try {
            await userAPI.unverify(confirmModal.teacher._id);
            setTeachers(prev => prev.map(t =>
                t._id === confirmModal.teacher._id ? { ...t, isVerified: false } : t
            ));
        } catch (error) {
            console.error('Error unverifying teacher:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, teacher: null });
        }
    };

    const handleDelete = async () => {
        if (!confirmModal.teacher) return;
        setIsProcessing(true);
        try {
            await userAPI.delete(confirmModal.teacher._id);
            setTeachers(prev => prev.filter(t => t._id !== confirmModal.teacher._id));
        } catch (error) {
            console.error('Error deleting teacher:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, teacher: null });
        }
    };

    const handleEditClick = (teacher) => {
        setEditModal({ open: true, user: teacher });
        setSelectedFile(null);
        setEditForm({
            name: teacher.name || '',
            email: teacher.email || '',
            phone: teacher.phone || '',
            cnic: teacher.cnic || '',
            dob: teacher.dob ? new Date(teacher.dob).toISOString().split('T')[0] : '',
            gender: teacher.gender || '',
            qualification: teacher.qualification || '',
            specialization: teacher.specialization || '',
            department: teacher.department || '',
            experience: teacher.experience || '',
            location: teacher.location || '',
            address: teacher.address || ''
        });
    };

    const downloadPDF = (type = 'full') => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const title = type === 'phone' ? 'AdeebTechLab - Teachers Phone Directory' :
            type === 'email' ? 'AdeebTechLab - Teachers Email List' :
                type === 'academic' ? 'AdeebTechLab - Teachers Academic Profile' :
                    type === 'address' ? 'AdeebTechLab - Teachers Address List' :
                        'AdeebTechLab - Teachers Complete Report';

        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Records: ${filteredTeachers.length}`, 14, 37);

        let headers, body;

        if (type === 'phone') {
            headers = [['Name', 'Phone', 'Identity']];
            body = filteredTeachers.map(t => [t.name || 'N/A', t.phone || 'N/A', 'Teacher']);
        } else if (type === 'email') {
            headers = [['Name', 'Email', 'Identity']];
            body = filteredTeachers.map(t => [t.name || 'N/A', t.email || 'N/A', 'Teacher']);
        } else if (type === 'academic') {
            headers = [['Name', 'Qualification', 'Specialization', 'Experience', 'Department']];
            body = filteredTeachers.map(t => [
                t.name || 'N/A',
                t.qualification || 'N/A',
                t.specialization || 'N/A',
                t.experience || 'N/A',
                t.department || 'N/A'
            ]);
        } else if (type === 'address') {
            headers = [['Name', 'Address', 'Location']];
            body = filteredTeachers.map(t => [
                t.name || 'N/A',
                t.address || 'N/A',
                t.location || 'N/A'
            ]);
        } else {
            headers = [['Name', 'Email', 'Phone', 'CNIC', 'Qualification', 'Specialization', 'Experience', 'Department', 'Location', 'Address', 'Status']];
            body = filteredTeachers.map(t => [
                t.name || 'N/A',
                t.email || 'N/A',
                t.phone || 'N/A',
                t.cnic || 'N/A',
                t.qualification || 'N/A',
                t.specialization || 'N/A',
                t.experience || 'N/A',
                t.department || 'N/A',
                t.location || 'N/A',
                t.address || 'N/A',
                t.isVerified ? 'Verified' : 'Pending'
            ]);
        }

        autoTable(doc, {
            startY: 45,
            head: headers,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [13, 40, 24] },
            styles: { fontSize: 8, overflow: 'linebreak' }
        });

        const fileName = `Teachers_${type.charAt(0).toUpperCase() + type.slice(1)}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        setShowExportOptions(false);
    };

    const downloadTeacherPDF = (t) => {
        const doc = new jsPDF();

        doc.setFillColor(13, 40, 24);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('TEACHER PROFILE', 14, 25);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Status: ${t.isVerified ? 'VERIFIED' : 'PENDING'}`, 140, 26);

        let y = 50;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Professional Information', 14, y);
        doc.line(14, y + 2, 200, y + 2);

        y += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const fields = [
            ['Name', t.name],
            ['Email', t.email],
            ['Phone', t.phone],
            ['CNIC', t.cnic],
            ['Qualification', t.qualification],
            ['Specialization', t.specialization],
            ['Department', t.department],
            ['Experience', t.experience],
            ['Location', t.location],
            ['Address', t.address],
            ['Joining Date', t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A']
        ];

        fields.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 14, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`${value || 'N/A'}`, 50, y);
            y += 7;
        });

        doc.save(`Teacher_${t.name?.replace(/\s+/g, '_')}.pdf`);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            let data = editForm;
            // If file selected, use FormData
            if (selectedFile) {
                const formData = new FormData();
                Object.keys(editForm).forEach(key => {
                    if (editForm[key] !== undefined && editForm[key] !== null) {
                        formData.append(key, editForm[key]);
                    }
                });
                formData.append('photo', selectedFile);
                data = formData;
            }

            const res = await userAPI.update(editModal.user._id, data);
            setTeachers(prev => prev.map(t => t._id === editModal.user._id ? res.data.data : t));
            setEditModal({ open: false, user: null });
        } catch (error) {
            console.error('Error updating teacher:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredTeachers = teachers.filter(t => {
        const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.cnic?.includes(searchQuery);

        if (filterStatus === 'verified') return matchesSearch && t.isVerified;
        if (filterStatus === 'pending') return matchesSearch && !t.isVerified;
        return matchesSearch;
    });

    const verifiedCount = teachers.filter(t => t.isVerified).length;
    const pendingCount = teachers.filter(t => !t.isVerified).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading teachers...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Teachers Management</h1>
                    <p className="text-gray-500">Verify and manage teacher accounts</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <div className="relative">
                        <button
                            onClick={() => setShowExportOptions(!showExportOptions)}
                            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold text-gray-700 shadow-sm"
                        >
                            <Download className="w-5 h-5 text-emerald-600" />
                            EXPORT DATA
                        </button>

                        {showExportOptions && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowExportOptions(false)}></div>
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Format</p>
                                    </div>
                                    <button
                                        onClick={() => downloadPDF('full')}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Complete Report
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('phone')}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                    >
                                        <Phone className="w-4 h-4" />
                                        Phone Directory
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('email')}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Email List
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('academic')}
                                        className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                    >
                                        <GraduationCap className="w-4 h-4" />
                                        Academic Info
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('address')}
                                        className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        Address List
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
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
                        placeholder="Search by name, email, or CNIC..."
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

            {/* Teachers List */}
            {filteredTeachers.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No teachers found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredTeachers.map((teacher, index) => (
                        <motion.div
                            key={teacher._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl p-6 border border-gray-100"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Photo & Basic Info */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center overflow-hidden">
                                        {teacher.photo ? (
                                            <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-xl font-bold">{teacher.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                                            {teacher.isVerified ? (
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
                                            <Mail className="w-4 h-4" /> {teacher.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm flex-[2]">
                                    <div>
                                        <p className="text-gray-400">Phone</p>
                                        <p className="font-medium text-gray-700">{teacher.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">CNIC</p>
                                        <p className="font-medium text-gray-700 font-mono">{teacher.cnic || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">DOB</p>
                                        <p className="font-medium text-gray-700">{teacher.dob ? new Date(teacher.dob).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Gender</p>
                                        <p className="font-medium text-gray-700">{teacher.gender || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Qualification</p>
                                        <p className="font-medium text-gray-700 truncate">{teacher.qualification || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Location</p>
                                        <p className="font-medium text-gray-700 capitalize">{teacher.location || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadTeacherPDF(teacher)}
                                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl"
                                        title="Download PDF"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                    {!teacher.isVerified ? (
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'verify', teacher })}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2"
                                        >
                                            <UserCheck className="w-4 h-4" />
                                            Verify
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'unverify', teacher })}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium flex items-center gap-2"
                                        >
                                            <UserX className="w-4 h-4" />
                                            Revoke
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEditClick(teacher)}
                                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl"
                                        title="Edit Bio"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal({ open: true, action: 'delete', teacher })}
                                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Extra Info */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-6 text-sm">
                                {teacher.specialization && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <GraduationCap className="w-4 h-4 text-gray-400" />
                                        <span>Skills: {teacher.specialization}</span>
                                    </div>
                                )}
                                {teacher.experience && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>Experience: {teacher.experience}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-gray-600">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span>Address: {teacher.address || 'N/A'}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Confirm Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, action: null, teacher: null })}
                title={
                    confirmModal.action === 'verify' ? 'Verify Teacher' :
                        confirmModal.action === 'unverify' ? 'Revoke Verification' : 'Delete Teacher'
                }
                size="md"
            >
                {confirmModal.teacher && (
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
                            <p className="text-xl font-bold text-gray-900 mt-2">{confirmModal.teacher.name}</p>
                            <p className="text-sm text-gray-500">{confirmModal.teacher.email}</p>
                        </div>

                        {confirmModal.action === 'verify' && (
                            <p className="text-sm text-gray-500 text-center">
                                Once verified, this teacher can be assigned to courses.
                            </p>
                        )}
                        {confirmModal.action === 'delete' && (
                            <p className="text-sm text-red-500 text-center">
                                This action cannot be undone. All data associated with this teacher will be removed.
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ open: false, action: null, teacher: null })}
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

            {/* Edit Modal */}
            <Modal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, user: null })}
                title="Edit Teacher Bio"
                size="lg"
            >
                <form onSubmit={handleUpdate} className="space-y-4">
                    {/* Personal Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b">Personal Information</h3>

                    {/* Profile Picture Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Profile Picture</label>
                        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            {/* Preview Current or Selected */}
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center">
                                {selectedFile ? (
                                    <img src={URL.createObjectURL(selectedFile)} alt="Selected" className="w-full h-full object-cover" />
                                ) : editModal.user?.photo ? (
                                    <img src={editModal.user.photo} alt="Current" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-6 h-6 text-gray-400" />
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-xl file:border-0
                                    file:text-xs file:font-semibold
                                    file:bg-emerald-600 file:text-white
                                    hover:file:bg-emerald-700
                                    cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name *</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email Address *</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">CNIC Number</label>
                            <input
                                type="text"
                                value={editForm.cnic}
                                onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                            <input
                                type="date"
                                value={editForm.dob}
                                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Gender</label>
                            <select
                                value={editForm.gender}
                                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    {/* Professional Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Professional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Qualification</label>
                            <input
                                type="text"
                                value={editForm.qualification}
                                onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Specialization</label>
                            <input
                                type="text"
                                value={editForm.specialization}
                                onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Department</label>
                            <input
                                type="text"
                                value={editForm.department}
                                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Experience</label>
                            <input
                                type="text"
                                value={editForm.experience}
                                onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Address Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Location</label>
                            <select
                                value={editForm.location}
                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            >
                                <option value="">Select Location</option>
                                <option value="islamabad">Islamabad</option>
                                <option value="bahawalpur">Bahawalpur</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Address</label>
                        <textarea
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setEditModal({ open: false, user: null })}
                            className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Update Bio
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TeachersManagement;
