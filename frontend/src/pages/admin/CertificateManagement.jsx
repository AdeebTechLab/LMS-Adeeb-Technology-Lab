import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Award, BookOpen, Users, CheckCircle, ChevronDown, ChevronRight, User, Loader2, XCircle, FileText, ClipboardList, Calendar, Edit2
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { courseAPI, enrollmentAPI, certificateAPI } from '../../services/api';

const CertificateManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, student: null, course: null, request: null });
    const [editCertModal, setEditCertModal] = useState({ open: false, certificate: null, student: null });
    const [courses, setCourses] = useState([]);
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);

    // Modal Edit State
    const [editData, setEditData] = useState({
        rollNo: '',
        skills: '',
        duration: '',
        passoutDate: new Date().toISOString().split('T')[0],
        certificateLink: ''
    });

    // Edit Certificate State
    const [editCertData, setEditCertData] = useState({
        passoutDate: ''
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [requestsRes, coursesRes] = await Promise.all([
                certificateAPI.getRequests(),
                certificateAPI.getCourses()
            ]);

            setRequests(requestsRes.data.requests || []);

            const formattedCourses = (coursesRes.data.courses || []).map(course => ({
                id: course._id,
                name: course.title,
                location: course.location || 'Unknown',
                duration: course.duration || '12 weeks',
                students: (course.students || []).map(s => ({
                    ...s,
                    id: s._id,
                    type: s.role === 'intern' ? 'intern' : 'student',
                }))
            }));
            setCourses(formattedCourses);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenApproveModal = (request) => {
        setConfirmModal({
            open: true,
            student: request.user,
            course: request.course,
            request: request
        });
        setEditData({
            rollNo: request.user?.rollNo || '',
            skills: request.skills || request.course?.title || '',
            duration: request.duration || request.course?.duration || '',
            passoutDate: new Date().toISOString().split('T')[0],
            certificateLink: ''
        });
    };

    const handleIssueCertificate = async () => {
        if (!confirmModal.student || !confirmModal.course) return;

        // Add confirmation to prevent accidental issuance
        const isApprove = !!confirmModal.request;
        const confirmMessage = isApprove
            ? `Are you sure you want to APPROVE this request and issue a certificate? This will mark the course as COMPLETED for ${confirmModal.student?.name}.`
            : `Are you sure you want to ISSUE a certificate to ${confirmModal.student?.name}? This will mark their enrollment as COMPLETED.`;

        if (!window.confirm(confirmMessage)) return;

        setIsIssuing(true);
        try {
            if (confirmModal.request) {
                await certificateAPI.approveRequest(confirmModal.request._id, {
                    rollNo: editData.rollNo,
                    skills: confirmModal.course?.name || confirmModal.request.course?.title,
                    duration: confirmModal.course?.duration || '',
                    passoutDate: editData.passoutDate,
                    certificateLink: editData.certificateLink
                });
            } else {
                await certificateAPI.issue({
                    userId: confirmModal.student._id || confirmModal.student.id,
                    courseId: confirmModal.course._id || confirmModal.course.id,
                    rollNo: editData.rollNo,
                    skills: confirmModal.course.name,
                    passoutDate: editData.passoutDate,
                    certificateLink: editData.certificateLink
                });
            }
            alert('Certificate issued successfully!');
            fetchAllData();
        } catch (error) {
            console.error('Error issuing certificate:', error);
            alert(error.response?.data?.message || 'Failed to issue certificate');
        } finally {
            setIsIssuing(false);
            setConfirmModal({ open: false, student: null, course: null, request: null });
        }
    };

    const handleRejectRequest = async (id) => {
        if (!window.confirm('Are you sure you want to reject this request?')) return;
        try {
            await certificateAPI.rejectRequest(id);
            fetchAllData();
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const handleOpenEditCertModal = (student, course) => {
        setEditCertModal({ open: true, certificate: student.certificate, student });
        setEditCertData({
            passoutDate: student.certificate?.passoutDate || new Date().toISOString().split('T')[0]
        });
    };

    const handleUpdateCertificate = async () => {
        if (!editCertModal.certificate?._id) return;

        setIsIssuing(true);
        try {
            await certificateAPI.update(editCertModal.certificate._id, { passoutDate: editCertData.passoutDate });
            alert('Passout date updated successfully!');
            fetchAllData();
            setEditCertModal({ open: false, certificate: null, student: null });
        } catch (error) {
            console.error('Error updating certificate:', error);
            alert(error.response?.data?.message || 'Failed to update certificate');
        } finally {
            setIsIssuing(false);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.students.some(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNo?.includes(searchQuery))
    );

    const filteredRequests = requests.filter(r =>
        r.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.course?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalStudents = courses.reduce((acc, c) => acc + c.students.length, 0);
    const totalCertified = courses.reduce((acc, c) => acc + c.students.filter(s => s.certificateIssued).length, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading certificates data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Certificate Management</h1>
                    <p className="text-gray-500">Issue and manage student certificates</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-amber-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-amber-600">{requests.length}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-emerald-600">{totalCertified}</p>
                        <p className="text-xs text-gray-500">Certified</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search by course, student name, or roll number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-gray-700"
                    />
                </div>
            </div>

            {/* Pending Requests Section */}
            {filteredRequests.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-amber-600" />
                        Pending Requests ({filteredRequests.length})
                    </h2>
                    {filteredRequests.map((request) => (
                        <motion.div
                            key={request._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                                    {request.user?.photo ? (
                                        <img src={request.user.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-8 h-8 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900">{request.user?.name}</h3>
                                        <Badge variant={request.user?.role === 'intern' ? 'warning' : 'info'}>
                                            {request.user?.role}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-emerald-600 font-medium">{request.course?.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">Recommended by: {request.teacher?.name}</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 text-right">
                                <div className="text-xs text-gray-500 italic mb-2">
                                    "{request.notes || 'No teacher notes provided'}"
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRejectRequest(request._id)}
                                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all flex items-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleOpenApproveModal(request)}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/10 flex items-center gap-2"
                                    >
                                        <Award className="w-4 h-4" />
                                        Approve & Issue
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Courses with Students */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    Courses & Certificates
                </h2>
                {filteredCourses.map((course) => (
                    <motion.div
                        key={course.id}
                        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                    >
                        <div
                            onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{course.name}</h3>
                                    <p className="text-xs text-gray-500">
                                        {course.students.length} students • {course.students.filter(s => s.certificateIssued).length} certified
                                    </p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedCourse === course.id ? 'rotate-180' : ''}`} />
                        </div>

                        {expandedCourse === course.id && (
                            <div className="border-t border-gray-100 overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Roll No</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Passout Date</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {course.students.map((student) => (
                                            <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-100 overflow-hidden shrink-0">
                                                            {student.photo ? (
                                                                <img src={student.photo} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <User className="w-5 h-5 text-gray-300" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                                                            <Badge variant={student.type === 'intern' ? 'warning' : 'info'} className="text-[10px] py-0">
                                                                {student.type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500">{student.rollNo}</td>
                                                <td className="px-6 py-4 text-xs font-medium">
                                                    {student.certificateIssued ? (
                                                        <div className="flex items-center gap-1 text-emerald-600">
                                                            <CheckCircle className="w-4 h-4" />
                                                            Certified
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-400">Not Issued</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-600">
                                                    {student.certificate?.passoutDate || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {student.certificateIssued ? (
                                                        <button
                                                            onClick={() => handleOpenEditCertModal(student, course)}
                                                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                                                            title="Edit Certificate"
                                                        >
                                                            <Edit2 className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setConfirmModal({ open: true, student, course });
                                                                setEditData({
                                                                    rollNo: student.rollNo || '',
                                                                    skills: course.name || '',
                                                                    duration: course.duration || '',
                                                                    passoutDate: new Date().toISOString().split('T')[0],
                                                                    certificateLink: ''
                                                                });
                                                            }}
                                                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all"
                                                            title="Issue Certificate"
                                                        >
                                                            <Award className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Approve/Issue Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, student: null, course: null, request: null })}
                title={confirmModal.request ? "Approve Certificate Request" : "Issue Certificate"}
                size="md"
            >
                {confirmModal.student && (
                    <div className="space-y-6">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-12 h-12 rounded-full bg-white border border-emerald-100 flex items-center justify-center overflow-hidden">
                                    {confirmModal.student.photo ? (
                                        <img src={confirmModal.student.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-emerald-300" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-900">{confirmModal.student.name}</p>
                                    <p className="text-xs text-emerald-600">{confirmModal.course?.name}</p>
                                </div>
                            </div>
                            {confirmModal.request?.notes && (
                                <div className="text-xs text-emerald-700 italic bg-white/50 p-2 rounded-lg">
                                    Teacher note: "{confirmModal.request.notes}"
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Roll Number / ID</label>
                                <input
                                    type="text"
                                    value={editData.rollNo}
                                    onChange={(e) => setEditData({ ...editData, rollNo: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono font-bold"
                                    placeholder="Enter Roll Number"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Passout Date</label>
                                <input
                                    type="date"
                                    value={editData.passoutDate}
                                    onChange={(e) => setEditData({ ...editData, passoutDate: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Certificate Link (Cloudinary/Drive)</label>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    value={editData.certificateLink}
                                    onChange={(e) => setEditData({ ...editData, certificateLink: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setConfirmModal({ open: false, student: null, course: null, request: null })}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleIssueCertificate}
                                disabled={isIssuing || !editData.rollNo}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isIssuing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                                Issue Certificate
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Certificate Modal */}
            <Modal
                isOpen={editCertModal.open}
                onClose={() => setEditCertModal({ open: false, certificate: null, student: null })}
                title="Edit Certificate"
                size="md"
            >
                {editCertModal.student && (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white border border-blue-100 flex items-center justify-center overflow-hidden">
                                    {editCertModal.student.photo ? (
                                        <img src={editCertModal.student.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-blue-300" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-blue-900">{editCertModal.student.name}</p>
                                    <p className="text-xs text-blue-600">Roll No: {editCertModal.student.rollNo}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Passout Date</label>
                                <input
                                    type="date"
                                    value={editCertData.passoutDate}
                                    onChange={(e) => setEditCertData({ ...editCertData, passoutDate: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setEditCertModal({ open: false, certificate: null, student: null })}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateCertificate}
                                disabled={isIssuing}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isIssuing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                                Update Certificate
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CertificateManagement;
