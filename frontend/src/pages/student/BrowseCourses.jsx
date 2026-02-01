import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
    Search, BookOpen, Users, Star, Clock, CheckCircle, Calendar, Award, Loader2, RefreshCw, AlertCircle, Upload, Trash2, Filter
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { courseAPI, enrollmentAPI, certificateAPI } from '../../services/api';
import { getCourseIcon, getCourseColor, getCourseStyle } from '../../utils/courseIcons';

const CITY_OPTIONS = [
    { value: 'Bahawalpur', label: 'Bahawalpur' },
    { value: 'Islamabad', label: 'Islamabad' }
];

const BrowseCourses = () => {
    const navigate = useNavigate();
    const { role, user } = useSelector((state) => state.auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCities, setSelectedCities] = useState([]);
    const [activeTab, setActiveTab] = useState('enrolled');
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [withdrawModal, setWithdrawModal] = useState({ open: false, enrollmentId: null, courseTitle: '' });
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [error, setError] = useState('');
    const [courses, setCourses] = useState([]);
    const [myEnrollments, setMyEnrollments] = useState([]);
    const [myCertificates, setMyCertificates] = useState([]);

    // Fetch data on component mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsFetching(true);
        setError('');
        try {
            const [coursesRes, enrollmentsRes] = await Promise.all([
                courseAPI.getAll({ targetAudience: role === 'intern' ? 'interns' : 'students' }),
                enrollmentAPI.getMy()
            ]);
            setCourses(coursesRes.data.data || []);
            setMyEnrollments(enrollmentsRes.data.data || []);

            // Fetch user's certificates
            try {
                const certRes = await certificateAPI.getMy();
                setMyCertificates(certRes.data.certificates || []);
            } catch (e) {
                // User might not have certificates yet
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load courses. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    // Get enrollment status for a course
    const getEnrollmentStatus = (courseId) => {
        const enrollment = myEnrollments.find(e => e.course?._id === courseId);
        if (!enrollment) return 'available';
        return enrollment.status; // 'pending', 'enrolled', 'completed', 'suspended'
    };

    // Separate courses by enrollment status
    // const availableCourses = courses.filter(c => getEnrollmentStatus(c._id) === 'available'); // Removed to show all
    const enrolledCourses = courses.filter(c => getEnrollmentStatus(c._id) === 'enrolled');
    const completedCourses = courses.filter(c => getEnrollmentStatus(c._id) === 'completed');

    const getCurrentCourses = () => {
        switch (activeTab) {
            case 'enrolled': return enrolledCourses;
            case 'completed': return completedCourses;
            default: return courses; // Show all courses
        }
    };

    const filteredCourses = getCurrentCourses().filter((course) => {
        const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.teachers?.some(t => t.name?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCity = selectedCities.length === 0 || selectedCities.includes(course.city || course.location);

        return matchesSearch && matchesCity;
    });

    const handleEnrollClick = (course) => {
        setSelectedCourse(course);
        setIsEnrollModalOpen(true);
    };

    const handleConfirmEnroll = async () => {
        if (!selectedCourse) return;
        setIsEnrolling(true);
        setError('');
        try {
            await enrollmentAPI.enroll(selectedCourse._id);
            setIsEnrollModalOpen(false);
            setSelectedCourse(null);
            // fetchData(); // No need to fetch here if we are navigating
            navigate(`/${role === 'intern' ? 'intern' : 'student'}/fees`, {
                state: {
                    message: 'Enrollment successful! Please upload your payment receipt here to get verified.'
                }
            });
        } catch (err) {
            console.error('Error enrolling:', err);
            setError(err.response?.data?.message || 'Failed to enroll. Please try again.');
        } finally {
            setIsEnrolling(false);
        }
    };



    const confirmWithdraw = async () => {
        try {
            await enrollmentAPI.withdraw(withdrawModal.enrollmentId);
            setWithdrawModal({ open: false, enrollmentId: null, courseTitle: '' });
            fetchData(); // Refresh list to update UI
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert(error.response?.data?.message || 'Failed to revoke course');
        }
    };

    const handleViewCourse = (course) => {
        const enrollment = myEnrollments.find(e => e.course?._id === course._id);
        if (!enrollment) return;

        // If status is enrolled, it means at least the first installment is verified.
        // The user wants to see assignments if verified, otherwise payment.
        if (enrollment.status === 'enrolled') {
            navigate(`/${role === 'intern' ? 'intern' : 'student'}/assignments`);
        } else {
            navigate(`/${role === 'intern' ? 'intern' : 'student'}/fees`);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading courses...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
                    <p className="text-gray-500">
                        {role === 'intern' ? 'Browse internship programs' : 'Discover and enroll in courses'}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('available')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'available'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    All Courses ({courses.length})
                </button>
                <button
                    onClick={() => setActiveTab('enrolled')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'enrolled'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Enrolled ({enrolledCourses.length})
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'completed'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Completed ({completedCourses.length})
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col md:flex-row gap-4 items-center z-50 relative">
                <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all w-full">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search courses or teachers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400"
                    />
                </div>
                <div className="flex gap-2">
                    {CITY_OPTIONS.map((city) => {
                        const isSelected = selectedCities.includes(city.value);
                        return (
                            <button
                                key={city.value}
                                onClick={() => {
                                    if (isSelected) {
                                        setSelectedCities(prev => prev.filter(c => c !== city.value));
                                    } else {
                                        setSelectedCities(prev => [...prev, city.value]);
                                    }
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isSelected
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {city.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => {
                    const status = getEnrollmentStatus(course._id);
                    const enrollment = myEnrollments.find(e => e.course?._id === course._id);
                    const certificate = myCertificates.find(c => c.course?._id === course._id || c.course === course._id);

                    return (
                        <motion.div
                            key={course._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300"
                        >
                            {/* Course Image */}
                            {(() => {
                                const style = getCourseStyle(course.category, course.title);
                                const Icon = style.icon;
                                return (
                                    <div className={`h-40 relative bg-gradient-to-br ${style.gradient}`}>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Icon className="w-16 h-16 text-white/30" />
                                        </div>
                                        {course.city && (
                                            <div className="absolute top-4 right-4">
                                                <Badge variant="primary" size="sm">{course.city}</Badge>
                                            </div>
                                        )}
                                        {status === 'enrolled' && (
                                            <div className="absolute top-4 left-4">
                                                <Badge variant="success" size="sm">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Enrolled
                                                </Badge>
                                            </div>
                                        )}
                                        {status === 'pending' && (
                                            <div className="absolute top-4 left-4">
                                                <Badge variant="warning" size="sm">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Waiting for Verification
                                                </Badge>
                                            </div>
                                        )}
                                        {status === 'completed' && (
                                            <div className="absolute top-4 left-4">
                                                <Badge variant="info" size="sm">
                                                    <Award className="w-3 h-3 mr-1" />
                                                    Completed
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Course Content */}
                            <div className="p-5">
                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{course.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>

                                {/* Teachers */}
                                <div className="mb-4">
                                    {course.teachers && course.teachers.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {course.teachers.slice(0, 2).map((teacher, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                                                        {teacher?.name?.charAt(0) || 'T'}
                                                    </div>
                                                    <span className="text-xs text-gray-600">{teacher?.name || 'Teacher'}</span>
                                                </div>
                                            ))}
                                            {course.teachers.length > 2 && (
                                                <span className="text-xs text-gray-500 px-2 py-1">+{course.teachers.length - 2} more</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">No teachers assigned</span>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" /> {course.durationMonths} {course.durationMonths === 1 ? 'month' : 'months'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-4 h-4" /> Unlimited
                                    </span>
                                </div>

                                {/* Completed - Show Grade */}
                                {status === 'completed' && enrollment && (
                                    <div className="mb-4 p-3 bg-purple-50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Final Grade</span>
                                            <span className="font-bold text-purple-600">{enrollment.grade} ({enrollment.percentage}%)</span>
                                        </div>
                                    </div>
                                )}

                                {/* Price and Action */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div className="flex flex-col">
                                        {course.originalPrice && !isNaN(parseFloat(course.originalPrice)) && !isNaN(parseFloat(course.fee)) && parseFloat(course.originalPrice) > parseFloat(course.fee) && (
                                            <span className="text-xs text-red-500 line-through font-medium">
                                                Rs {Number(course.originalPrice).toLocaleString()}
                                            </span>
                                        )}
                                        <div className={`flex items-center gap-1 font-bold text-lg ${course.originalPrice && !isNaN(parseFloat(course.originalPrice)) && parseFloat(course.originalPrice) > parseFloat(course.fee) ? 'text-emerald-600' : 'text-gray-900'}`}>
                                            {isNaN(Number(course.fee)) ? course.fee : `Rs ${Number(course.fee).toLocaleString()}`}
                                        </div>
                                    </div>

                                    {status === 'available' && (
                                        <button
                                            onClick={() => handleEnrollClick(course)}
                                            className="px-4 py-2 bg-[#0D2818] hover:bg-[#1A5D3A] text-white rounded-lg font-medium transition-all"
                                        >
                                            Enroll Now
                                        </button>
                                    )}
                                    {status === 'pending' && (
                                        <div className="flex gap-2 w-full">
                                            {enrollment && (
                                                <button
                                                    onClick={() => setWithdrawModal({ open: true, enrollmentId: enrollment._id, courseTitle: course.title })}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                                                    title="Revoke Application"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => navigate(`/${role === 'intern' ? 'intern' : 'student'}/fees`)}
                                                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                            >
                                                <Upload className="w-4 h-4" />
                                                Upload Receipt
                                            </button>
                                        </div>
                                    )}
                                    {status === 'enrolled' && (
                                        <button
                                            onClick={() => handleViewCourse(course)}
                                            className="px-4 py-2 bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white rounded-xl font-bold transition-all duration-300 shadow-sm"
                                        >
                                            View Course
                                        </button>
                                    )}
                                    {status === 'completed' && (
                                        <div className="flex gap-2">
                                            {certificate?.certificateLink ? (
                                                <>
                                                    <a
                                                        href={certificate.certificateLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-2 bg-purple-100 text-purple-600 rounded-lg font-medium text-sm hover:bg-purple-200 transition-all"
                                                    >
                                                        View
                                                    </a>
                                                    <a
                                                        href={certificate.certificateLink}
                                                        download
                                                        className="px-3 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-all"
                                                    >
                                                        Download
                                                    </a>
                                                </>
                                            ) : (
                                                <span className="px-3 py-2 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm">
                                                    Certificate Pending
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {filteredCourses.length === 0 && (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No courses found</p>
                </div>
            )}

            {/* Enrollment Modal */}
            <Modal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                title="Enroll in Course"
                size="md"
            >
                {selectedCourse && (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900 mb-2">{selectedCourse.title}</h3>
                            <p className="text-sm text-gray-500">{selectedCourse.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {selectedCourse.startDate && new Date(selectedCourse.startDate).toLocaleDateString()} -
                                    {selectedCourse.endDate && new Date(selectedCourse.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-600">Course Fee</span>
                                <div className="flex flex-col items-end">
                                    {selectedCourse.originalPrice && !isNaN(parseFloat(selectedCourse.originalPrice)) && !isNaN(parseFloat(selectedCourse.fee)) && parseFloat(selectedCourse.originalPrice) > parseFloat(selectedCourse.fee) && (
                                        <span className="text-sm text-red-500 line-through font-medium">
                                            Rs {Number(selectedCourse.originalPrice).toLocaleString()}
                                        </span>
                                    )}
                                    <span className="text-2xl font-bold text-emerald-600">
                                        {isNaN(Number(selectedCourse.fee)) ? selectedCourse.fee : `Rs ${Number(selectedCourse.fee).toLocaleString()}`}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                By enrolling, you agree to pay the course fee. You can upload your payment receipt in Fee Management.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEnrollModalOpen(false)}
                                className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmEnroll}
                                disabled={isEnrolling}
                                className="flex-1 py-3 bg-[#0D2818] hover:bg-[#1A5D3A] text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isEnrolling ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Enrolling...
                                    </>
                                ) : (
                                    'Confirm Enrollment'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Withdraw Modal */}
            <Modal
                isOpen={withdrawModal.open}
                onClose={() => setWithdrawModal({ ...withdrawModal, open: false })}
                title="Revoke Course Application"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">Are you sure?</h4>
                            <p className="text-xs text-red-600 mt-1">
                                You are about to withdraw from <strong>{withdrawModal.courseTitle}</strong>.
                                This will remove the course and any pending fee records permanently.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setWithdrawModal({ ...withdrawModal, open: false })}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmWithdraw}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                        >
                            Confirm Revoke
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BrowseCourses;
