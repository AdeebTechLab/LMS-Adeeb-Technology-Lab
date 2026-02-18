import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar, GraduationCap, Loader2, CheckCircle, Clock, BookOpen, Edit2, Save, Download,
    FileText, Users, Search, User, Mail, Phone, MapPin, UserCheck, UserX, Trash2, Receipt, Camera, Upload, Plus, Shield
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { userAPI, settingsAPI, enrollmentAPI, assignmentAPI, feeAPI } from '../../services/api';
import { generateComprehensiveReport } from '../../utils/reportGenerator';

const InternsManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [interns, setInterns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, user: null });
    const [viewFeeModal, setViewFeeModal] = useState({ open: false, url: null });
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editForm, setEditForm] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    useEffect(() => {
        fetchInterns();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.getAll();
            setAllowBioEditing(res.data.data.allowBioEditing_intern ?? false);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const [allowBioEditing, setAllowBioEditing] = useState(false);

    const toggleBioEditing = async () => {
        try {
            const newValue = !allowBioEditing;
            await settingsAPI.update('allowBioEditing_intern', newValue);
            setAllowBioEditing(newValue);
        } catch (error) {
            console.error('Error updating setting:', error);
        }
    };

    const fetchInterns = async () => {
        setIsLoading(true);
        try {
            const res = await userAPI.getByRole('intern');
            setInterns(res.data.data || []);
        } catch (error) {
            console.error('Error fetching interns:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.verify(confirmModal.user._id);
            setInterns(prev => prev.map(i =>
                i._id === confirmModal.user._id ? { ...i, isVerified: true } : i
            ));
        } catch (error) {
            console.error('Error verifying intern:', error);
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
            setInterns(prev => prev.map(i =>
                i._id === confirmModal.user._id ? { ...i, isVerified: false } : i
            ));
        } catch (error) {
            console.error('Error unverifying intern:', error);
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
            setInterns(prev => prev.filter(i => i._id !== confirmModal.user._id));
        } catch (error) {
            console.error('Error deleting intern:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const handleEditClick = (intern) => {
        let degree = intern.degree || '';
        let university = intern.university || '';

        // If degree/university are empty but education exists, try to parse it
        if (!degree && !university && intern.education) {
            const parts = intern.education.split(' - ');
            if (parts.length >= 2) {
                degree = parts[0];
                university = parts.slice(1).join(' - ');
            } else if (intern.education.toLowerCase().includes(' at ')) {
                const partsAt = intern.education.split(/ at /i);
                degree = partsAt[0];
                university = partsAt.slice(1).join(' at ');
            } else {
                degree = intern.education;
            }
        }

        setEditModal({ open: true, user: intern });
        setSelectedFile(null);
        setPhotoPreview(intern.photo || null);
        let normalizedAttendType = intern.attendType || '';
        if (normalizedAttendType === 'Physical') normalizedAttendType = 'OnSite';
        if (normalizedAttendType === 'Online') normalizedAttendType = 'Remote';
        if (normalizedAttendType === 'On-Site') normalizedAttendType = 'OnSite';

        setEditForm({
            name: intern.name || '',
            email: intern.email || '',
            phone: intern.phone || '',
            cnic: intern.cnic || '',
            dob: intern.dob ? new Date(intern.dob).toISOString().split('T')[0] : '',
            fatherName: intern.fatherName || intern.guardianName || '',
            gender: intern.gender || '',
            education: intern.education || '',
            location: intern.location || '',
            city: intern.city || '',
            address: intern.address || '',
            guardianName: intern.guardianName || intern.fatherName || '',
            guardianPhone: intern.guardianPhone || '',
            guardianOccupation: intern.guardianOccupation || '',
            degree: degree,
            university: university,
            department: intern.department || '',
            semester: intern.semester || '',
            rollNo: intern.rollNo || '',
            rollNumber: intern.rollNumber || '',
            cgpa: intern.cgpa || '',
            majorSubjects: intern.majorSubjects || '',
            attendType: normalizedAttendType,
            heardAbout: intern.heardAbout || ''
        });
    };

    const downloadPDF = (type = 'full') => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const title = type === 'phone' ? 'AdeebTechLab - Interns Phone Directory' :
            type === 'email' ? 'AdeebTechLab - Interns Email List' :
                type === 'academic' ? 'AdeebTechLab - Interns Academic Profile' :
                    type === 'address' ? 'AdeebTechLab - Interns Address List' :
                        'AdeebTechLab - Interns Complete Report';

        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Records: ${filteredInterns.length}`, 14, 37);

        let headers, body;

        if (type === 'phone') {
            headers = [['Name', 'Phone', 'Identity']];
            body = filteredInterns.map(i => [i.name || 'N/A', i.phone || 'N/A', 'Intern']);
        } else if (type === 'email') {
            headers = [['Name', 'Email', 'Identity']];
            body = filteredInterns.map(i => [i.name || 'N/A', i.email || 'N/A', 'Intern']);
        } else if (type === 'academic') {
            headers = [['Roll No', 'Name', 'Degree', 'University', 'CGPA', 'Semester']];
            body = filteredInterns.map(i => [
                i.rollNumber || 'N/A',
                i.name || 'N/A',
                i.degree || 'N/A',
                i.university || 'N/A',
                i.cgpa || 'N/A',
                i.semester || 'N/A'
            ]);
        } else if (type === 'address') {
            headers = [['Roll No', 'Name', 'Address', 'City']];
            body = filteredInterns.map(i => [
                i.rollNumber || 'N/A',
                i.name || 'N/A',
                i.homeAddress || 'N/A',
                i.city || 'N/A'
            ]);
        } else {
            headers = [['Roll No', 'Name', 'Email', 'Phone', 'CNIC', 'DOB', 'Degree', 'University', 'CGPA', 'Location', 'Mode', 'Status']];
            body = filteredInterns.map(i => [
                i.rollNumber || 'N/A',
                i.name || 'N/A',
                i.email || 'N/A',
                i.phone || 'N/A',
                i.cnic || 'N/A',
                i.dob ? new Date(i.dob).toLocaleDateString() : 'N/A',
                i.degree || 'N/A',
                i.university || 'N/A',
                i.cgpa || 'N/A',
                i.location ? (i.location.charAt(0).toUpperCase() + i.location.slice(1)) : 'N/A',
                (i.attendType === 'Physical' || i.attendType === 'On-Site') ? 'Onsite' : (i.attendType === 'Online' ? 'Remote' : (i.attendType || 'N/A')),
                i.isVerified ? 'Verified' : 'Pending'
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

        const fileName = `Interns_${type.charAt(0).toUpperCase() + type.slice(1)}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        setShowExportOptions(false);
    };

    const downloadInternPDF = (i) => {
        const doc = new jsPDF();

        doc.setFillColor(13, 40, 24);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('INTERN PROFILE', 14, 25);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Status: ${i.isVerified ? 'VERIFIED' : 'PENDING'}`, 140, 26);

        let y = 50;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Personal Information', 14, y);
        doc.line(14, y + 2, 200, y + 2);

        y += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const fields = [
            ['Name', i.name],
            ['Email', i.email],
            ['Phone', i.phone],
            ['CNIC', i.cnic],
            ['Gender', i.gender],
            ['Education', i.education],
            ['Location', i.location],
            ['City', i.city],
            ['Country', i.country],
            ['Address', i.address],
            ['Guardian Name', i.guardianName],
            ['Guardian Phone', i.guardianPhone],
            ['Guardian Job', i.guardianOccupation],
            ['Attendance Type', i.attendType],
            ['Heard About', i.heardAbout],
            ['Admission Date', i.createdAt ? new Date(i.createdAt).toLocaleDateString() : 'N/A']
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

        doc.save(`Intern_${i.name?.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadCompleteReport = async (intern) => {
        try {
            const [enrollmentsRes, assignmentsRes, feesRes] = await Promise.all([
                enrollmentAPI.getUserEnrollments(intern._id),
                assignmentAPI.getUserAssignments(intern._id),
                feeAPI.getUserFees(intern._id)
            ]);
            await generateComprehensiveReport(intern, enrollmentsRes.data.data, assignmentsRes.data.assignments, feesRes.data.data);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const formData = new FormData();
            Object.keys(editForm).forEach(key => {
                if (editForm[key] !== null && editForm[key] !== undefined) {
                    formData.append(key, editForm[key]);
                }
            });

            if (selectedFile) {
                formData.append('photo', selectedFile);
            }

            const res = await userAPI.update(editModal.user._id, formData);
            setInterns(prev => prev.map(i => i._id === editModal.user._id ? res.data.data : i));
            setEditModal({ open: false, user: null });
            setSelectedFile(null);
            setPhotoPreview(null);
        } catch (error) {
            console.error('Error updating intern:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredInterns = interns.filter(i => {
        const matchesSearch = i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.cnic?.includes(searchQuery);

        if (!matchesSearch) return false;

        // "Registered" = No enrollments (totalEnrollments === 0)
        if (filterStatus === 'registered') return (i.totalEnrollments || 0) === 0;

        // "Enrolled" (Active) = Has enrollments AND not all completed
        if (filterStatus === 'enrolled') {
            const total = i.totalEnrollments || 0;
            const completed = i.completedEnrollments || 0;
            return total > 0 && completed < total;
        }

        // "Completed" = All enrollments are completed
        if (filterStatus === 'completed') {
            const total = i.totalEnrollments || 0;
            const completed = i.completedEnrollments || 0;
            return total > 0 && total === completed;
        }

        if (filterStatus === 'verified') return i.isVerified;
        if (filterStatus === 'pending') return !i.isVerified;
        return true;
    });

    const verifiedCount = interns.filter(i => i.isVerified).length;
    const pendingCount = interns.filter(i => !i.isVerified).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading interns...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Interns Management</h1>
                    <p className="text-gray-500">View and manage registered interns</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={toggleBioEditing}
                        className={`p-2.5 border rounded-xl transition-colors flex items-center gap-2 text-sm font-bold shadow-sm ${allowBioEditing
                            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                            : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                            }`}
                        title={allowBioEditing ? "Bio Editing is Enabled for Users" : "Bio Editing is Disabled for Users"}
                    >
                        {allowBioEditing ? <Edit2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                        {allowBioEditing ? 'EDITS ON' : 'EDITS OFF'}
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowExportOptions(!showExportOptions)}
                            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold text-gray-700 shadow-sm"
                        >
                            <Download className="w-5 h-5 text-blue-600" />
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
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Complete Report
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('phone')}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors"
                                    >
                                        <Phone className="w-4 h-4" />
                                        Phone Directory
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('email')}
                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Email List
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('academic')}
                                        className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors"
                                    >
                                        <GraduationCap className="w-4 h-4" />
                                        Academic Info
                                    </button>
                                    <button
                                        onClick={() => downloadPDF('address')}
                                        className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        Address List
                                    </button>
                                </div>
                            </>
                        )}
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
                    {[
                        { id: 'all', label: 'All', count: interns.length },
                        {
                            id: 'registered',
                            label: 'Registered (New)',
                            count: interns.filter(i => (i.totalEnrollments || 0) === 0).length
                        },
                        {
                            id: 'enrolled',
                            label: 'Enrolled (Active)',
                            count: interns.filter(i => {
                                const total = i.totalEnrollments || 0;
                                const completed = i.completedEnrollments || 0;
                                return total > 0 && completed < total;
                            }).length
                        },
                        {
                            id: 'completed',
                            label: 'Completed',
                            count: interns.filter(i => {
                                const total = i.totalEnrollments || 0;
                                const completed = i.completedEnrollments || 0;
                                return total > 0 && total === completed;
                            }).length
                        },
                        { id: 'verified', label: 'Verified', count: verifiedCount },
                        { id: 'pending', label: 'Pending', count: pendingCount }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id)}
                            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tab.label}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${filterStatus === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-white text-gray-500'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Interns List */}
            {filteredInterns.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No interns found in this category.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="px-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                        Showing {filteredInterns.length} Interns
                    </div>
                    <div className="grid gap-4">
                        {filteredInterns.map((intern, index) => (
                            <motion.div
                                key={intern._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white rounded-2xl p-6 border border-gray-100"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    {/* Photo & Basic Info */}
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden">
                                            {intern.photo ? (
                                                <img src={intern.photo} alt={intern.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white text-xl font-bold">{intern.name?.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-900">{intern.name}</h3>
                                                {intern.isVerified ? (
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
                                                <Mail className="w-4 h-4" /> {intern.email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm flex-1">
                                        <div>
                                            <p className="text-gray-400">Phone</p>
                                            <p className="font-medium text-gray-700">{intern.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">CNIC</p>
                                            <p className="font-medium text-gray-700 font-mono">{intern.cnic || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Education</p>
                                            <p className="font-medium text-gray-700">{intern.education || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Location</p>
                                            <p className="font-medium text-gray-700 capitalize">{intern.location || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setViewFeeModal({ open: true, url: intern.feeScreenshot })}
                                            className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl"
                                            title="View Registration Fee"
                                        >
                                            <Receipt className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => downloadInternPDF(intern)}
                                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl"
                                            title="Download Profile"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDownloadCompleteReport(intern)}
                                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl"
                                            title="Download Complete Report (Academic)"
                                        >
                                            <FileText className="w-5 h-5" />
                                        </button>
                                        {!intern.isVerified ? (
                                            <button
                                                onClick={() => setConfirmModal({ open: true, action: 'verify', user: intern })}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-2"
                                            >
                                                <UserCheck className="w-4 h-4" />
                                                Verify
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmModal({ open: true, action: 'unverify', user: intern })}
                                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium flex items-center gap-2"
                                            >
                                                <UserX className="w-4 h-4" />
                                                Revoke
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEditClick(intern)}
                                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl"
                                            title="Edit Bio"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'delete', user: intern })}
                                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, action: null, user: null })}
                title={
                    confirmModal.action === 'verify' ? 'Verify Intern' :
                        confirmModal.action === 'unverify' ? 'Revoke Verification' : 'Delete Intern'
                }
                size="md"
            >
                {confirmModal.user && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl text-center ${confirmModal.action === 'delete' ? 'bg-red-50' :
                            confirmModal.action === 'verify' ? 'bg-blue-50' : 'bg-amber-50'
                            }`}>
                            {confirmModal.action === 'verify' && <UserCheck className="w-12 h-12 text-blue-600 mx-auto mb-2" />}
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
                                This action cannot be undone. All data associated with this intern will be removed.
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
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
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
                isOpen={viewFeeModal.open}
                onClose={() => setViewFeeModal({ open: false, url: null })}
                title="Registration Fee Screenshot"
                size="lg"
            >
                <div className="flex items-center justify-center bg-gray-50 rounded-xl p-4">
                    {viewFeeModal.url ? (
                        <img
                            src={viewFeeModal.url}
                            alt="Fee Screenshot"
                            className="max-w-full max-h-[70vh] rounded-lg shadow-sm"
                        />
                    ) : (
                        <div className="text-center py-8">
                            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No Fee Screenshot Uploaded</p>
                            <p className="text-sm text-gray-400">This user has not provided a registration fee screenshot.</p>
                        </div>
                    )}
                </div>
                <div className="mt-4 flex justify-end">
                    <button
                        onClick={() => setViewFeeModal({ open: false, url: null })}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                    >
                        Close
                    </button>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, user: null })}
                title="Edit Intern Bio"
                size="lg"
            >
                <form onSubmit={handleUpdate} className="space-y-4">
                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center justify-center pb-6 border-b border-gray-100 mb-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 group-hover:border-emerald-500 transition-all">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-8 h-8 text-gray-400" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setSelectedFile(file);
                                            setPhotoPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-lg shadow-lg">
                                <Plus className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3">Click to update profile photo</p>
                    </div>

                    {/* Personal Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name *</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Father Name</label>
                            <input
                                type="text"
                                value={editForm.fatherName}
                                onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email Address *</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">CNIC Number</label>
                            <input
                                type="text"
                                value={editForm.cnic}
                                onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                            <input
                                type="date"
                                value={editForm.dob}
                                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Gender</label>
                            <select
                                value={editForm.gender}
                                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Roll No <span className="text-xs text-gray-400">(System / Directory)</span></label>
                            <input
                                type="text"
                                value={editForm.rollNo}
                                onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Roll Number <span className="text-xs text-gray-400">(University)</span></label>
                            <input
                                type="text"
                                value={editForm.rollNumber}
                                onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Academic Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Academic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Degree</label>
                            <input
                                type="text"
                                value={editForm.degree}
                                onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">University</label>
                            <input
                                type="text"
                                value={editForm.university}
                                onChange={(e) => setEditForm({ ...editForm, university: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Department</label>
                            <input
                                type="text"
                                value={editForm.department}
                                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Semester</label>
                            <input
                                type="text"
                                value={editForm.semester}
                                onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">CGPA</label>
                            <input
                                type="text"
                                value={editForm.cgpa}
                                onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Major Subjects</label>
                            <input
                                type="text"
                                value={editForm.majorSubjects}
                                onChange={(e) => setEditForm({ ...editForm, majorSubjects: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Education</label>
                            <input
                                type="text"
                                value={editForm.education}
                                onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Guardian Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Guardian Name</label>
                            <input
                                type="text"
                                value={editForm.guardianName}
                                onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Guardian Phone</label>
                            <input
                                type="text"
                                value={editForm.guardianPhone}
                                onChange={(e) => setEditForm({ ...editForm, guardianPhone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Guardian Occupation</label>
                            <input
                                type="text"
                                value={editForm.guardianOccupation}
                                onChange={(e) => setEditForm({ ...editForm, guardianOccupation: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Address Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">City</label>
                            <input
                                type="text"
                                value={editForm.city}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Location</label>
                            <select
                                value={editForm.location}
                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            >
                                <option value="">Select Location</option>
                                <option value="islamabad">Islamabad</option>
                                <option value="bahawalpur">Bahawalpur</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Attendance Type</label>
                            <select
                                value={editForm.attendType}
                                onChange={(e) => setEditForm({ ...editForm, attendType: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                            >
                                <option value="">Select Type</option>
                                <option value="OnSite">Onsite</option>
                                <option value="Remote">Remote</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Heard About Us</label>
                            <input
                                type="text"
                                value={editForm.heardAbout}
                                onChange={(e) => setEditForm({ ...editForm, heardAbout: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Address</label>
                        <textarea
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Update Bio
                        </button>
                    </div>
                </form >
            </Modal >
        </div >
    );
};

export default InternsManagement;
