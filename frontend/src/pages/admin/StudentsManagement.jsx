import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, UserCheck, UserX, Trash2, User, Mail, Phone, MapPin,
    Calendar, GraduationCap, Loader2, RefreshCw, CheckCircle, XCircle, Clock, Edit2, Save, Download,
    FileText, Users, BookOpen, Shield
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { userAPI } from '../../services/api';

const StudentsManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modal, setModal] = useState({ open: false, data: null });
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [exportType, setExportType] = useState('full'); // full | phone | email
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editForm, setEditForm] = useState({});
    const [filterStatus, setFilterStatus] = useState('all');
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, user: null });

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

    const handleEditClick = (student) => {
        setEditModal({ open: true, user: student });
        setEditForm({
            name: student.name || '',
            email: student.email || '',
            phone: student.phone || '',
            cnic: student.cnic || '',
            education: student.education || '',
            location: student.location || '',
            rollNo: student.rollNo || '',
            gender: student.gender || '',
            guardianName: student.guardianName || '',
            address: student.address || ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const res = await userAPI.update(editModal.user._id, editForm);
            setStudents(prev => prev.map(s => s._id === editModal.user._id ? res.data.data : s));
            setEditModal({ open: false, user: null });
        } catch (error) {
            console.error('Error updating student:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadPDF = (type = 'full') => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape for wide tables
        const title = type === 'phone' ? 'AdeebTechLab - Students Phone Directory' :
            type === 'email' ? 'AdeebTechLab - Students Email List' :
                type === 'guardian' ? 'AdeebTechLab - Students Guardian Information' :
                    type === 'academic' ? 'AdeebTechLab - Students Academic Records' :
                        type === 'address' ? 'AdeebTechLab - Students Address List' :
                            'AdeebTechLab - Students Complete Report';

        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Records: ${filteredStudents.length}`, 14, 37);

        let headers, body;

        if (type === 'phone') {
            headers = [['Roll No', 'Name', 'Phone', 'Identity']];
            body = filteredStudents.map(s => [s.rollNo || 'N/A', s.name || 'N/A', s.phone || 'N/A', 'Student']);
        } else if (type === 'email') {
            headers = [['Roll No', 'Name', 'Email', 'Identity']];
            body = filteredStudents.map(s => [s.rollNo || 'N/A', s.name || 'N/A', s.email || 'N/A', 'Student']);
        } else if (type === 'guardian') {
            headers = [['Roll No', 'Name', 'Guardian Name', 'Guardian Phone', 'Guardian Job']];
            body = filteredStudents.map(s => [
                s.rollNo || 'N/A',
                s.name || 'N/A',
                s.guardianName || 'N/A',
                s.guardianPhone || 'N/A',
                s.guardianOccupation || 'N/A'
            ]);
        } else if (type === 'academic') {
            headers = [['Roll No', 'Name', 'Course', 'Education', 'Status']];
            body = filteredStudents.map(s => [
                s.rollNo || 'N/A',
                s.name || 'N/A',
                s.course || 'N/A',
                s.education || 'N/A',
                s.isVerified ? 'Verified' : 'Pending'
            ]);
        } else if (type === 'address') {
            headers = [['Roll No', 'Name', 'Address', 'City', 'Country']];
            body = filteredStudents.map(s => [
                s.rollNo || 'N/A',
                s.name || 'N/A',
                s.address || 'N/A',
                s.city || 'N/A',
                s.country || 'N/A'
            ]);
        } else {
            // Full Report
            headers = [['Roll No', 'Name', 'Email', 'Phone', 'CNIC', 'DOB', 'Age', 'Gender', 'Course', 'Attendance', 'Guardian', 'Guardian Ph', 'Address', 'Status']];
            body = filteredStudents.map(s => [
                s.rollNo || 'N/A',
                s.name || 'N/A',
                s.email || 'N/A',
                s.phone || 'N/A',
                s.cnic || 'N/A',
                s.dob ? new Date(s.dob).toLocaleDateString() : 'N/A',
                s.age || 'N/A',
                s.gender || 'N/A',
                s.course || 'N/A',
                s.cityToAttend || 'N/A',
                s.guardianName || 'N/A',
                s.guardianPhone || 'N/A',
                s.address || 'N/A',
                s.isVerified ? 'Verified' : 'Pending'
            ]);
        }

        autoTable(doc, {
            startY: 45,
            head: headers,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [13, 40, 24] },
            styles: { fontSize: 7, overflow: 'linebreak' },
            columnStyles: {
                // Adjust styles for long text if needed
                12: { cellWidth: 30 } // Address column in full report
            }
        });

        const fileName = `Students_${type.charAt(0).toUpperCase() + type.slice(1)}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        setShowExportOptions(false);
    };

    const downloadStudentPDF = (s) => {
        const doc = new jsPDF();

        doc.setFillColor(13, 40, 24);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('STUDENT PROFILE', 14, 25);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Roll Number: ${s.rollNo || 'N/A'}`, 140, 20);
        doc.text(`Status: ${s.isVerified ? 'VERIFIED' : 'PENDING'}`, 140, 26);

        let y = 50;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Personal Information', 14, y);
        doc.line(14, y + 2, 200, y + 2);

        y += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const fields = [
            ['Roll Number', s.rollNo],
            ['Name', s.name],
            ['Email', s.email],
            ['Phone', s.phone],
            ['CNIC', s.cnic],
            ['Gender', s.gender],
            ['Date of Birth', s.dob ? new Date(s.dob).toLocaleDateString() : 'N/A'],
            ['Age', s.age],
            ['Education', s.education],
            ['Location', s.location],
            ['City', s.city],
            ['Country', s.country],
            ['Address', s.address],
            ['Guardian Name', s.guardianName],
            ['Guardian Phone', s.guardianPhone],
            ['Guardian Job', s.guardianOccupation],
            ['Attendance Type', s.attendType],
            ['Heard About', s.heardAbout],
            ['Admission Date', s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A']
        ];

        fields.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 14, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`${value || 'N/A'}`, 60, y);
            y += 7;

            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });

        doc.save(`Student_${s.name?.replace(/\s+/g, '_')}_${s.rollNo || ''}.pdf`);
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
                    <p className="text-gray-500">View and manage registered students</p>
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
                                        onClick={() => downloadPDF('guardian')}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                    >
                                        <Users className="w-4 h-4" />
                                        Guardian Info
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('academic')}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                    >
                                        <GraduationCap className="w-4 h-4" />
                                        Academic Info
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('address')}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        Address List
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
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

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadStudentPDF(student)}
                                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl"
                                        title="Download PDF"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
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
                                        onClick={() => handleEditClick(student)}
                                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl"
                                        title="Edit Bio"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
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

            <Modal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, user: null })}
                title="Edit Student Bio"
                size="lg"
            >
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email Address</label>
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
                            <label className="text-sm font-medium text-gray-700">Education</label>
                            <input
                                type="text"
                                value={editForm.education}
                                onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Roll Number</label>
                            <input
                                type="text"
                                value={editForm.rollNo}
                                onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Guardian Name</label>
                        <input
                            type="text"
                            value={editForm.guardianName}
                            onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
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

export default StudentsManagement;
