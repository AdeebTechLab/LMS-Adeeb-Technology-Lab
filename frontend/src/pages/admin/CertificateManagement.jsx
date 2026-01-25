import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Award, BookOpen, Users, CheckCircle, ChevronDown, ChevronRight, User, Loader2, RefreshCw, XCircle, FileText, ClipboardList
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { courseAPI, enrollmentAPI, certificateAPI } from '../../services/api';

const CertificateManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('requests'); // requests | courses
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, student: null, course: null, request: null });
    const [courses, setCourses] = useState([]);
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);

    // Modal Edit State
    const [editData, setEditData] = useState({
        rollNo: '',
        skills: '',
        duration: ''
    });

    useEffect(() => {
        if (activeTab === 'courses') {
            fetchCoursesWithEnrollments();
        } else {
            fetchRequests();
        }
    }, [activeTab]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const response = await certificateAPI.getRequests();
            setRequests(response.data.requests || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCoursesWithEnrollments = async () => {
        setIsLoading(true);
        try {
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];
            const enrollmentsRes = await enrollmentAPI.getAll();
            const allEnrollments = enrollmentsRes.data.data || [];

            const coursesWithStudents = allCourses.map(course => {
                const courseEnrollments = allEnrollments.filter(e => e.course?._id === course._id);
                return {
                    id: course._id,
                    name: course.title,
                    location: course.location || 'Unknown',
                    duration: course.duration || '12 weeks',
                    students: courseEnrollments.map((e, idx) => ({
                        id: e.user?._id || e._id,
                        _id: e.user?._id || e._id,
                        rollNo: e.user?.rollNo || String(idx + 1).padStart(4, '0'),
                        name: e.user?.name || 'Unknown',
                        email: e.user?.email || '',
                        photo: e.user?.photo || '',
                        type: e.user?.role === 'intern' ? 'intern' : 'student',
                        skills: course.title,
                        startDate: e.enrolledAt || course.startDate || new Date().toISOString(),
                        endDate: course.endDate || new Date().toISOString(),
                        certificateIssued: e.status === 'completed',
                        status: e.status
                    }))
                };
            }).filter(c => c.students.length > 0);

            setCourses(coursesWithStudents);
        } catch (error) {
            console.error('Error fetching courses:', error);
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
            duration: request.duration || request.course?.duration || ''
        });
    };

    const handleIssueCertificate = async () => {
        if (!confirmModal.student || !confirmModal.course) return;

        setIsIssuing(true);
        try {
            if (confirmModal.request) {
                // Approving a request
                await certificateAPI.approveRequest(confirmModal.request._id, editData);
                fetchRequests();
            } else {
                // Direct issuance
                await certificateAPI.issue({
                    userId: confirmModal.student._id || confirmModal.student.id,
                    courseId: confirmModal.course._id || confirmModal.course.id,
                    rollNo: editData.rollNo,
                    skills: editData.skills
                });
                fetchCoursesWithEnrollments();
            }
            alert('Certificate issued successfully!');
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
            fetchRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.students.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNo.includes(searchQuery))
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
                    <button onClick={activeTab === 'courses' ? fetchCoursesWithEnrollments : fetchRequests} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                        <RefreshCw className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="px-4 py-2 bg-emerald-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-emerald-600">{requests.length}</p>
                        <p className="text-xs text-gray-500">Pending Requests</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'requests'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <ClipboardList className="w-4 h-4 inline mr-2" />
                    Pending Requests
                </button>
                <button
                    onClick={() => setActiveTab('courses')}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'courses'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Manage Courses
                </button>
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

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : activeTab === 'requests' ? (
                /* Requests List */
                <div className="space-y-4">
                    {requests.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                            <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-4" />
                            <p className="text-gray-500">No pending certificate requests</p>
                        </div>
                    ) : (
                        requests.map((request) => (
                            <motion.div
                                key={request._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6"
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
                        ))
                    )}
                </div>
            ) : (
                /* Courses List (Old View) */
                <div className="space-y-4">
                    {courses.map((course) => (
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
                                        <p className="text-xs text-gray-500">{course.students.length} students enrolled</p>
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
                                                    <td className="px-6 py-4">
                                                        {!student.certificateIssued && (
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmModal({ open: true, student, course });
                                                                    setEditData({
                                                                        rollNo: student.rollNo || '',
                                                                        skills: course.name || '',
                                                                        duration: course.duration || ''
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
            )}

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
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Assign Roll Number</label>
                                <input
                                    type="text"
                                    value={editData.rollNo}
                                    onChange={(e) => setEditData({ ...editData, rollNo: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono font-bold"
                                    placeholder="Enter Roll Number"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Final Skills/Title</label>
                                <input
                                    type="text"
                                    value={editData.skills}
                                    onChange={(e) => setEditData({ ...editData, skills: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Duration Display</label>
                                <input
                                    type="text"
                                    value={editData.duration}
                                    onChange={(e) => setEditData({ ...editData, duration: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
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
        </div>
    );
};

export default CertificateManagement;
