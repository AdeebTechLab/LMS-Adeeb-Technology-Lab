import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar, GraduationCap, Loader2, CheckCircle, Clock, BookOpen, Edit2, Save, Download,
    FileText, Users, Search, User, Mail, Phone, MapPin, UserCheck, UserX, Trash2, Receipt, Camera, Upload, Plus, Shield,
    PauseCircle, PlayCircle, AlertCircle
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
    const [viewFeeModal, setViewFeeModal] = useState({ open: false, userId: null, internName: '' });
    const [feeRecords, setFeeRecords] = useState([]);
    const [feeLoading, setFeeLoading] = useState(false);
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editForm, setEditForm] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [enrollModal, setEnrollModal] = useState({ open: false, user: null });
    const [userEnrollments, setUserEnrollments] = useState([]);
    const [enrollFetching, setEnrollFetching] = useState(false);
    const [enrollLoadingId, setEnrollLoadingId] = useState(null);
    const [enrollToast, setEnrollToast] = useState(null);

    // Installment/Fee Plan States (Integrated from FeeVerification)
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState(null);
    const [installmentPlan, setInstallmentPlan] = useState([{ amount: '', dueDate: '' }]);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState(null);

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

    const handleMoveToOld = async (intern) => {
        try {
            const newVal = !intern.registeredOld;
            await userAPI.update(intern._id, { registeredOld: newVal });
            setInterns(prev => prev.map(i => i._id === intern._id ? { ...i, registeredOld: newVal } : i));
        } catch (error) {
            console.error('Error updating registeredOld:', error);
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
            heardAbout: intern.heardAbout || '',
            password: intern.password || ''
        });
    };

    const getInternStatus = (i) => {
        const total = i.totalEnrollments || 0;
        const completed = i.completedEnrollments || 0;
        const paused = i.pausedEnrollments || 0;

        if (total > 0 && total === completed) return 'Completed';
        if (total > 0 && completed < total && (total - completed) === paused) return 'Enrolled (Inactive)';
        if (total > 0 && completed < total && (total - completed - paused) > 0) return 'Enrolled (Active)';
        if ((total === 0 || !total) && i.registeredOld) return 'Registered (Old)';
        if ((total === 0 || !total) && !i.registeredOld) return 'Registered (New)';

        return i.isVerified ? 'Verified' : 'Pending';
    };

    const downloadPDF = async (type = 'full') => {
        // Fetch enrollments to build userId -> courses map
        let userCoursesMap = {};
        try {
            const enrollRes = await enrollmentAPI.getAll();
            const enrollments = enrollRes.data.data || [];
            enrollments.forEach(e => {
                const userId = e.user?._id;
                const courseName = e.course?.title;
                if (userId && courseName) {
                    if (!userCoursesMap[userId]) userCoursesMap[userId] = [];
                    if (!userCoursesMap[userId].includes(courseName)) {
                        userCoursesMap[userId].push(courseName);
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching enrollments for export:', error);
        }

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
            headers = [['Roll No', 'Name', 'Degree', 'University', 'CGPA', 'Semester', 'Registered Courses']];
            body = filteredInterns.map(i => [
                i.rollNumber || 'N/A',
                i.name || 'N/A',
                i.degree || 'N/A',
                i.university || 'N/A',
                i.cgpa || 'N/A',
                i.semester || 'N/A',
                (userCoursesMap[i._id] && userCoursesMap[i._id].length > 0) ? userCoursesMap[i._id].join(', ') : 'N/A'
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
            headers = [['Roll No', 'Name', 'Email', 'Phone', 'CNIC', 'DOB', 'Degree', 'University', 'CGPA', 'Location', 'Mode', 'Registered Courses', 'Status']];
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
                (userCoursesMap[i._id] && userCoursesMap[i._id].length > 0) ? userCoursesMap[i._id].join(', ') : 'N/A',
                getInternStatus(i)
            ]);
        }

        autoTable(doc, {
            startY: 45,
            head: headers,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [13, 40, 24] },
            styles: { fontSize: 6, overflow: 'linebreak', cellPadding: 2 },
            columnStyles: {
                11: { cellWidth: 30 }  // Registered Courses column in full report
            }
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
        doc.text(`Status: ${getInternStatus(i).toUpperCase()}`, 140, 26);

        let y = 50;

        const addFieldsAndSave = () => {
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

        if (i.photo) {
            // Load image as base64 to avoid CORS issues in PDF rendering
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg');

                // Draw profile picture at top right below header
                doc.addImage(dataURL, 'JPEG', 160, 45, 35, 35);
                y = Math.max(y, 85); // Adjust Y to ensure fields don't overlap image
                addFieldsAndSave();
            };
            img.onerror = function () {
                // If image fails to load, just render text
                addFieldsAndSave();
            };
            img.src = i.photo;
        } else {
            addFieldsAndSave();
        }
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

    // --- Installment Management Logic (from FeeVerification) ---
    const handleManageInstallments = (fee) => {
        setSelectedFee(fee);
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

    const handleInstallmentChange = (index, field, value) => {
        const newPlan = [...installmentPlan];
        newPlan[index][field] = value;
        setInstallmentPlan(newPlan);
    };

    const handleAddInstallmentRow = () => {
        setInstallmentPlan([...installmentPlan, { amount: '', dueDate: '', status: 'pending' }]);
    };

    const handleRemoveInstallmentRow = (index) => {
        setInstallmentPlan(installmentPlan.filter((_, i) => i !== index));
    };

    const handleSaveInstallments = async () => {
        setIsProcessing(true);
        try {
            const payloadInstallments = installmentPlan.map(inst => ({
                amount: inst.amount === '' || inst.amount === null ? 0 : Number(inst.amount),
                dueDate: inst.dueDate || null,
                status: inst.status || 'pending'
            }));

            const res = await feeAPI.setInstallments(selectedFee._id, payloadInstallments);
            const updatedFee = res.data.fee;

            // Update in records if viewFeeModal is open
            setFeeRecords(prev => prev.map(f => f._id === updatedFee._id ? updatedFee : f));
            setIsInstallmentModalOpen(false);
            alert('Fee plan updated successfully');
        } catch (err) {
            console.error('Error saving installments:', err);
            alert(err.response?.data?.message || 'Failed to save installments');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleViewScreenshot = (installment) => {
        setSelectedInstallment(installment);
        setIsImageModalOpen(true);
    };

    const handleVerifyInstallment = async (feeId, installmentId) => {
        setIsProcessing(true);
        try {
            await feeAPI.verify(feeId, installmentId);
            // Refresh fee records
            const res = await feeAPI.getUserFees(viewFeeModal.userId);
            setFeeRecords(res.data.data || []);
            setIsImageModalOpen(false);
        } catch (err) {
            console.error('Error verifying:', err);
            alert('Failed to verify payment');
        } finally {
            setIsProcessing(false);
        }
    };
    // ----------------------------------------------------------

    const showEnrollToast = (message, type = 'success') => {
        setEnrollToast({ message, type });
        setTimeout(() => setEnrollToast(null), 3000);
    };

    const handleOpenEnrollModal = async (intern) => {
        setEnrollModal({ open: true, user: intern });
        setUserEnrollments([]);
        setEnrollFetching(true);
        try {
            const res = await enrollmentAPI.getUserEnrollments(intern._id);
            const all = res.data.data || [];
            const active = all.filter(e => e.status === 'enrolled' || e.isPaused);
            setUserEnrollments(active);
        } catch (err) {
            showEnrollToast('Failed to load enrollments.', 'error');
        } finally {
            setEnrollFetching(false);
        }
    };

    const handleToggleInternPause = async (enrollment) => {
        setEnrollLoadingId(enrollment._id);
        try {
            if (enrollment.isPaused) {
                await enrollmentAPI.resume(enrollment._id);
                showEnrollToast(`${enrollModal.user?.name} has been resumed in ${enrollment.course?.title}.`, 'success');
            } else {
                await enrollmentAPI.pause(enrollment._id);
                showEnrollToast(`${enrollModal.user?.name} has been paused in ${enrollment.course?.title}.`, 'warning');
            }
            const res = await enrollmentAPI.getUserEnrollments(enrollModal.user._id);
            const all = res.data.data || [];
            setUserEnrollments(all.filter(e => e.status === 'enrolled' || e.isPaused));
        } catch (err) {
            showEnrollToast(err.response?.data?.message || 'Action failed.', 'error');
        } finally {
            setEnrollLoadingId(null);
        }
    };

    const filteredInterns = interns.filter(i => {
        const matchesSearch = i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.cnic?.includes(searchQuery);

        if (!matchesSearch) return false;

        // "Registered New" = No enrollments AND not marked as old
        if (filterStatus === 'registered') return (i.totalEnrollments || 0) === 0 && !i.registeredOld;

        // "Registered Old" = No enrollments AND marked as old by admin
        if (filterStatus === 'registeredOld') return (i.totalEnrollments || 0) === 0 && i.registeredOld;

        // "Enrolled" (Active) = Has enrollments, not all completed, AND at least one is NOT paused
        if (filterStatus === 'enrolled') {
            const total = i.totalEnrollments || 0;
            const completed = i.completedEnrollments || 0;
            const paused = i.pausedEnrollments || 0;
            return total > 0 && completed < total && (total - completed - paused) > 0;
        }

        // "Enrolled" (Inactive) = Has enrollments, not all completed, AND ALL non-completed are paused
        if (filterStatus === 'enrolledInactive') {
            const total = i.totalEnrollments || 0;
            const completed = i.completedEnrollments || 0;
            const paused = i.pausedEnrollments || 0;
            return total > 0 && completed < total && (total - completed) === paused;
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

    if (isLoading && interns.length === 0) {
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Interns Management</h1>
                    <p className="text-gray-500 text-sm">View and manage registered interns</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={toggleBioEditing}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${allowBioEditing
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                            }`}
                    >
                        <Shield className={`w-4 h-4 ${allowBioEditing ? 'animate-pulse' : ''}`} />
                        {allowBioEditing ? 'EDITS ON' : 'EDITS OFF'}
                    </button>

                    <div className="relative flex-1 md:flex-none">
                        <button
                            onClick={() => setShowExportOptions(!showExportOptions)}
                            className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-blue-700 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Download className="w-4 h-4 text-blue-600" />
                            EXPORT DATA
                        </button>

                        {showExportOptions && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowExportOptions(false)}></div>
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Format</p>
                                    </div>
                                    {[
                                        { id: 'full', label: 'Complete Report', icon: FileText },
                                        { id: 'phone', label: 'Phone Directory', icon: Phone },
                                        { id: 'email', label: 'Email List', icon: Mail },
                                        { id: 'academic', label: 'Academic Info', icon: GraduationCap },
                                        { id: 'address', label: 'Address List', icon: MapPin }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => downloadPDF(opt.id)}
                                            className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors"
                                        >
                                            <opt.icon className="w-4 h-4" />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or CNIC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white rounded-2xl transition-all outline-none text-sm font-medium"
                    />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                    {[
                        { id: 'all', label: 'All', count: interns.length },
                        {
                            id: 'registered',
                            label: 'Registered (New)',
                            count: interns.filter(i => (i.totalEnrollments || 0) === 0 && !i.registeredOld).length
                        },
                        {
                            id: 'registeredOld',
                            label: 'Registered (Old)',
                            count: interns.filter(i => (i.totalEnrollments || 0) === 0 && i.registeredOld).length
                        },
                        {
                            id: 'enrolled',
                            label: 'Enrolled (Active)',
                            count: interns.filter(i => {
                                const total = i.totalEnrollments || 0;
                                const completed = i.completedEnrollments || 0;
                                const paused = i.pausedEnrollments || 0;
                                return total > 0 && completed < total && (total - completed - paused) > 0;
                            }).length
                        },
                        {
                            id: 'enrolledInactive',
                            label: 'Enrolled (Inactive)',
                            count: interns.filter(i => {
                                const total = i.totalEnrollments || 0;
                                const completed = i.completedEnrollments || 0;
                                const paused = i.pausedEnrollments || 0;
                                return total > 0 && completed < total && (total - completed) === paused;
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
                            className={`px-3 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-between gap-2 border ${filterStatus === tab.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/10'
                                : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                                }`}
                        >
                            <span className="truncate">{tab.label}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black shrink-0 ${filterStatus === tab.id
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-200 text-gray-500'
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
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    {/* Photo & Basic Info */}
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-blue-900/10">
                                            {intern.photo ? (
                                                <img src={intern.photo} alt={intern.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white text-2xl font-black">{intern.name?.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tighter truncate">{intern.name}</h3>
                                                {(intern.rollNumber || intern.rollNo) && (
                                                    <Badge variant="primary" size="xxs">#{intern.rollNumber || intern.rollNo}</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 truncate">
                                                <Mail className="w-3.5 h-3.5 text-gray-400" /> {intern.email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 flex-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                                            <p className="text-xs font-bold text-gray-700">{intern.phone || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CNIC</p>
                                            <p className="text-xs font-bold text-gray-700 font-mono tracking-tighter">{intern.cnic || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Education</p>
                                            <p className="text-xs font-bold text-gray-700 truncate">{intern.education || 'N/A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                                            <p className="text-xs font-bold text-gray-700 capitalize">{intern.location || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0">
                                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
                                            {(intern.totalEnrollments || 0) === 0 && (
                                                <button
                                                    onClick={() => handleMoveToOld(intern)}
                                                    className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${intern.registeredOld
                                                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-purple-700'
                                                        }`}
                                                    title={intern.registeredOld ? 'Move to New' : 'Move to Old'}
                                                >
                                                    {intern.registeredOld ? 'New' : 'Old'}
                                                </button>
                                            )}
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await feeAPI.getUserFees(intern._id);
                                                        const fees = res.data.data || [];
                                                        if (fees.length === 0) {
                                                            alert('No fee record found. Enroll in a course first.');
                                                            return;
                                                        }
                                                        if (fees.length === 1) {
                                                            handleManageInstallments(fees[0]);
                                                        } else {
                                                            setViewFeeModal({ open: true, userId: intern._id, internName: intern.name });
                                                            setFeeRecords(fees);
                                                        }
                                                    } catch (e) {
                                                        console.error('Error opening fee plan:', e);
                                                    }
                                                }}
                                                className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl border border-purple-100 transition-all"
                                                title="Fee Plan"
                                            >
                                                <Receipt className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => downloadInternPDF(intern)}
                                                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-100 transition-all"
                                                title="PDF Profile"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadCompleteReport(intern)}
                                                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-100 transition-all"
                                                title="Academic Report"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenEnrollModal(intern)}
                                                className="p-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl border border-orange-100 transition-all"
                                                title="Pause/Enroll"
                                            >
                                                <BookOpen className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleEditClick(intern)}
                                                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-100 transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setConfirmModal({ open: true, action: 'delete', user: intern })}
                                                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="h-8 w-px bg-gray-100 hidden lg:block mx-1" />

                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: intern.isVerified ? 'unverify' : 'verify', user: intern })}
                                            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${intern.isVerified
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/10'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/10'
                                                } flex items-center justify-center gap-2 min-w-[120px] active:scale-95`}
                                        >
                                            {intern.isVerified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                            {intern.isVerified ? 'Revoke' : 'Verify'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enrollment Pause/Resume Modal */}
            <Modal
                isOpen={enrollModal.open}
                onClose={() => setEnrollModal({ open: false, user: null })}
                title={`Manage Enrollments — ${enrollModal.user?.name || ''}`}
                size="md"
            >
                <div className="space-y-4">
                    {enrollToast && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${enrollToast.type === 'success' ? 'bg-emerald-500 text-white' :
                            enrollToast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {enrollToast.message}
                        </div>
                    )}

                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">
                        Pausing an intern blocks their assignments, daily task submissions, and fee installment generation for that course.
                    </div>

                    {enrollFetching ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            <span className="ml-2 text-gray-500">Loading enrollments...</span>
                        </div>
                    ) : userEnrollments.length === 0 ? (
                        <div className="text-center py-10">
                            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-400 font-medium">No active enrollments found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {userEnrollments.map((enrollment) => {
                                const isPaused = enrollment.isPaused;
                                const isBusy = enrollLoadingId === enrollment._id;
                                return (
                                    <div
                                        key={enrollment._id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isPaused ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`font-bold text-sm truncate ${isPaused ? 'text-amber-800' : 'text-gray-900'
                                                    }`}>
                                                    {enrollment.course?.title || 'Unknown Course'}
                                                </p>
                                                {isPaused && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-black uppercase rounded-full tracking-wider">
                                                        <PauseCircle className="w-2.5 h-2.5" />
                                                        Paused
                                                    </span>
                                                )}
                                            </div>
                                            {isPaused && enrollment.pausedAt && (
                                                <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                                                    Paused on {new Date(enrollment.pausedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleToggleInternPause(enrollment)}
                                            disabled={isBusy}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all disabled:opacity-50 ${isPaused
                                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                                }`}
                                        >
                                            {isBusy ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : isPaused ? (
                                                <PlayCircle className="w-3.5 h-3.5" />
                                            ) : (
                                                <PauseCircle className="w-3.5 h-3.5" />
                                            )}
                                            {isBusy ? '...' : isPaused ? 'Resume' : 'Pause'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => setEnrollModal({ open: false, user: null })}
                            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

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
                onClose={() => setViewFeeModal({ open: false, userId: null, internName: '' })}
                title={`Fee Challans — ${viewFeeModal.internName}`}
                size="lg"
            >
                <div className="space-y-4">
                    {feeLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                            <span className="ml-2 text-gray-500">Loading fee records...</span>
                        </div>
                    ) : (
                        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                            <div className="grid gap-4">
                                {feeRecords.map((fee, fIdx) => (
                                    <div key={fee._id || fIdx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        {/* Course Summary Header */}
                                        <div className="p-4 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{fee.course?.title || 'Unknown Course'}</h4>
                                                    {fee.course?.city && (
                                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-black uppercase tracking-widest border border-gray-200">
                                                            {fee.course.city}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                                    Total Course Fee: <span className="text-gray-900 font-bold">Rs {(fee.totalFee || 0).toLocaleString()}</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleManageInstallments(fee)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                                            >
                                                <Calendar className="w-3.5 h-3.5" />
                                                Manage Plan
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => setViewFeeModal({ open: false, userId: null, internName: '' })}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                        >
                            Close
                        </button>
                    </div>
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
                            <label className="text-sm font-medium text-gray-700">Password *</label>
                            <input
                                type="text"
                                value={editForm.password}
                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono"
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
                </form>
            </Modal>

            {/* Monthly Fee Management Modal */}
            <Modal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} title="Manage Months" size="lg">
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                        <p>Set up the monthly fee plan for <strong>{selectedFee?.user?.name || viewFeeModal.internName}</strong>.</p>
                        <p className="mt-1">Course Fee: <strong>Rs {(selectedFee?.totalFee || 0).toLocaleString()}</strong></p>
                    </div>

                    <div className="bg-red-50 p-4 rounded-xl text-sm text-red-700 border border-red-200">
                        <p className="font-bold flex items-center gap-2 text-xs">
                            <AlertCircle className="w-4 h-4" />
                            Next month's installment will be automatically created by the system.
                        </p>
                        <p className="mt-1 text-[10px] text-red-600">After the first installment is verified, new installments will be auto-generated monthly using the course fee.</p>
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
                                            onClick={() => handleViewScreenshot(inst)}
                                            className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-100"
                                            title="View Uploaded Slip"
                                        >
                                            <Receipt className="w-4 h-4" />
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

            {/* Receipt Modal */}
            <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title="Payment Receipt" size="md">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900">{selectedInstallment?.student || viewFeeModal.internName}</h3>
                            <p className="text-xs text-gray-500">Slip ID: {selectedInstallment?.slipId || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-gray-900">Rs {(selectedInstallment?.amount || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border-2 border-gray-100 overflow-hidden bg-gray-50">
                        <img
                            src={selectedInstallment?.receiptUrl}
                            alt="Payment Slip"
                            className="w-full h-auto max-h-[60vh] object-contain"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Close</button>
                        {selectedInstallment?.status === 'submitted' && (
                            <>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to reject this payment receipt?')) {
                                            setIsProcessing(true);
                                            try {
                                                await feeAPI.reject(selectedFee?._id || selectedInstallment?.feeId, selectedInstallment?._id);
                                                const res = await feeAPI.getUserFees(viewFeeModal.userId);
                                                setFeeRecords(res.data.data || []);
                                                setIsImageModalOpen(false);
                                            } catch (err) {
                                                console.error('Error rejecting:', err);
                                                alert('Failed to reject payment');
                                            } finally {
                                                setIsProcessing(false);
                                            }
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg flex items-center gap-2 font-medium transition-colors"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                                <button
                                    onClick={() => handleVerifyInstallment(selectedFee?._id || selectedInstallment?.feeId, selectedInstallment?._id)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 font-medium"
                                >
                                    <CheckCircle className="w-4 h-4" /> Verify Payment
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default InternsManagement;
