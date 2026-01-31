import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText, ClipboardList, Clock, Loader2, BookOpen, Calendar, MapPin, CreditCard, AlertCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { courseAPI, enrollmentAPI } from '../../services/api';

// Tabs
import StudentAttendanceTab from './components/StudentAttendanceTab';
import StudentAssignmentsTab from './components/StudentAssignmentsTab';
import StudentDailyTasksTab from './components/StudentDailyTasksTab';

import { useSelector } from 'react-redux';

const StudentCourseView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, role } = useSelector((state) => state.auth);
    const [course, setCourse] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('attendance'); // Default for students

    useEffect(() => {
        fetchCourseAndEnrollment();
    }, [id]);

    const fetchCourseAndEnrollment = async () => {
        setIsLoading(true);
        try {
            // Fetch Course
            const courseRes = await courseAPI.getOne(id);
            const courseData = courseRes.data.course || courseRes.data.data;
            setCourse(courseData);

            // Fetch My Enrollments to check isActive
            const enrollmentRes = await enrollmentAPI.getMy();
            const myEnrollments = enrollmentRes.data.data || [];
            const myEnrollment = myEnrollments.find(e => String(e.course?._id || e.course) === String(id));
            setEnrollment(myEnrollment);

            // Set default tab based on audience or role
            if (courseData.targetAudience === 'interns' || role === 'intern') {
                setActiveTab('daily_tasks');
            } else {
                setActiveTab('attendance');
            }
        } catch (error) {
            console.error('Error fetching course data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                    <p className="text-gray-500 font-medium tracking-tight">Loading Course Details...</p>
                </div>
            </div>
        );
    }

    if (!course) return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-800">Course not found</h2>
            <button onClick={() => navigate('/student/dashboard')} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold">Back to Dashboard</button>
        </div>
    );

    // Access Logic
    // Access is BLOCKED if first month is not verified
    const isFirstMonthVerified = enrollment?.installments?.[0]?.status === 'verified';
    const isAccessBlocked = !isFirstMonthVerified;

    // Submission is RESTRICTED if first month paid but isActive is false (means subsequent month overdue)
    const isSubmissionRestricted = enrollment && !enrollment.isActive && isFirstMonthVerified;

    return (
        <div className="space-y-6">
            {/* Header / Back */}
            <div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors font-medium text-sm"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${course.targetAudience === 'interns'
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                } shadow-lg shadow-emerald-900/10`}>
                                <BookOpen className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">{course.title}</h1>
                                <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(course.startDate).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1 uppercase">
                                        <MapPin className="w-4 h-4" />
                                        {course.location}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                                {course.bookLink && (
                                    <a
                                        href={course.bookLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors shadow-sm"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        BOOK
                                    </a>
                                )}
                                <Badge variant={course.status === 'active' ? 'success' : 'warning'}>
                                    {course.status.toUpperCase()}
                                </Badge>
                            </div>
                            {(isAccessBlocked || isSubmissionRestricted) && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg border border-red-100 text-[10px] font-black uppercase tracking-widest">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Account Restricted
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Logic */}
            <div className="space-y-6">
                {isAccessBlocked ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-12 border border-dashed border-amber-200 text-center shadow-xl shadow-amber-900/5"
                    >
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-2">First Payment Pending</h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">
                            Your full access is locked until your first month's fee is verified. Please visit the fee management portal to upload your proof.
                        </p>
                        <button
                            onClick={() => navigate(`/${role}/fees`)}
                            className="px-8 py-3 bg-[#0D2818] hover:bg-emerald-900 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-900/20 active:scale-95 flex items-center gap-2 mx-auto"
                        >
                            <CreditCard className="w-5 h-5" />
                            FEES PORTAL
                        </button>
                    </motion.div>
                ) : (
                    <>
                        {isSubmissionRestricted && (
                            <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-4 text-red-700 animate-pulse shadow-sm">
                                <AlertCircle className="w-6 h-6" />
                                <div className="flex-1">
                                    <p className="font-black text-xs uppercase tracking-tight">Payment Overdue - Submissions Disabled</p>
                                    <p className="text-[10px] font-medium opacity-80">You can view materials and previous work, but cannot submit new logs or assignments until your dues are cleared.</p>
                                </div>
                                <button onClick={() => navigate(`/${role}/fees`)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest">PAY NOW</button>
                            </div>
                        )}

                        {/* Tab Nav */}
                        <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200">
                            <button
                                onClick={() => setActiveTab('daily_tasks')}
                                className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'daily_tasks'
                                    ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <ClipboardList className="w-4 h-4 inline mr-2" />
                                {course.targetAudience === 'interns' ? 'Daily Tasks' : 'Class Logs'}
                            </button>
                            <button
                                onClick={() => setActiveTab('assignments')}
                                className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'assignments'
                                    ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <FileText className="w-4 h-4 inline mr-2" />
                                Assignments
                            </button>
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'attendance'
                                    ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <Clock className="w-4 h-4 inline mr-2" />
                                Attendance
                            </button>
                        </div>

                        {/* Tab Content */}
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[400px]"
                        >
                            {activeTab === 'daily_tasks' && <StudentDailyTasksTab course={course} isRestricted={isSubmissionRestricted} />}
                            {activeTab === 'assignments' && <StudentAssignmentsTab course={course} isRestricted={isSubmissionRestricted} />}
                            {activeTab === 'attendance' && <StudentAttendanceTab course={course} />}
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentCourseView;
