import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    TrendingUp,
    Award,
    BookOpen,
    Download,
    Loader2,
    RefreshCw,
    AlertCircle,
    GraduationCap
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { BarChart } from '../../components/charts/Charts';
import { useSelector } from 'react-redux';
import { assignmentAPI, dailyTaskAPI, enrollmentAPI } from '../../services/api';

const MarksSheet = () => {
    const { user } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [enrollments, setEnrollments] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');

    useEffect(() => {
        fetchMarksData();
    }, [user?._id]);

    const fetchMarksData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Enrollments
            const enrollRes = await enrollmentAPI.getMy();
            const enrollmentsData = enrollRes.data.data || [];

            // 2. Fetch Assignments Submissions
            const assignRes = await assignmentAPI.getMy();
            const assignments = assignRes.data.assignments || [];

            // Build a map of course marks
            const coursesWithMarks = enrollmentsData.map(enrollment => {
                const courseId = enrollment.course?._id;
                const courseTitle = enrollment.course?.title || 'Course';

                // Get assignment marks for this course (Sort by date for consistent numbering)
                const courseAssignments = assignments
                    .filter(a => String(a.course?._id || a.course) === String(courseId))
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)) // Oldest first for #1, #2...
                    .map((a, index) => {
                        const mySub = a.submissions?.find(s =>
                            String(s.user?._id || s.user) === String(user?._id || user?.id)
                        );
                        if (mySub && (mySub.marks !== undefined && mySub.marks !== null)) {
                            return {
                                assessment: a.title,
                                number: index + 1,
                                type: 'Assignment',
                                marks: mySub.marks,
                                total: a.totalMarks || 100
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);

                // Find teacher name from teachers array
                const teacherObj = enrollment.course?.teachers?.[0]; // Default to first teacher
                const teacherName = teacherObj?.name || (typeof teacherObj === 'string' ? 'Assigned' : 'TBA');

                return {
                    id: enrollment._id,
                    name: courseTitle,
                    teacher: teacherName,
                    status: enrollment.status || 'enrolled',
                    grades: courseAssignments, // Start with assignments
                    courseId // Keep for fetching daily tasks later if needed
                };
            });

            // 3. Fetch Daily Tasks per course
            const updatedCourses = await Promise.all(coursesWithMarks.map(async (course) => {
                try {
                    const dtRes = await dailyTaskAPI.getMy(course.courseId);
                    const tasks = dtRes.data.data || [];
                    const gradedTasks = tasks
                        .filter(t => t.status === 'graded' || t.status === 'verified')
                        .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)) // Oldest first
                        .map((t, index) => ({
                            assessment: `Work Log: ${new Date(t.date || t.createdAt).toLocaleDateString()}`,
                            number: index + 1,
                            type: 'Daily Task',
                            marks: t.marks,
                            total: 100 // Daily tasks are out of 100 now
                        }));

                    return {
                        ...course,
                        grades: [...course.grades, ...gradedTasks]
                    };
                } catch (e) {
                    return course;
                }
            }));

            setEnrollments(updatedCourses);
            // If there's only one course, select it by default
            if (updatedCourses.length === 1) {
                setSelectedCourseId(updatedCourses[0].courseId);
            } else if (updatedCourses.length > 0 && !selectedCourseId) {
                // If there are courses but none selected, select the first one
                setSelectedCourseId(updatedCourses[0].courseId);
            }


        } catch (error) {
            console.error('Error fetching marks data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculatePercentage = (marks, total) => {
        return ((marks / total) * 100).toFixed(1);
    };

    const calculateCourseAverage = (grades) => {
        if (!grades || grades.length === 0) return 0;
        const totalMarks = grades.reduce((sum, g) => sum + g.marks, 0);
        const totalPossible = grades.reduce((sum, g) => sum + g.total, 0);
        return totalPossible > 0 ? ((totalMarks / totalPossible) * 100).toFixed(1) : 0;
    };

    const getOverallAverage = () => {
        // Average of ALL assignments across ALL courses
        const allAssignments = enrollments.flatMap((c) => (c.grades || []).filter(g => g.type === 'Assignment'));
        if (allAssignments.length === 0) return 0;
        return calculateSimpleAverage(allAssignments);
    };

    const getGrade = (percentage) => {
        if (!percentage || isNaN(percentage)) return { grade: 'N/A', color: 'text-gray-400' };
        if (percentage >= 90) return { grade: 'A+', color: 'text-emerald-600' };
        if (percentage >= 85) return { grade: 'A', color: 'text-emerald-600' };
        if (percentage >= 80) return { grade: 'B+', color: 'text-blue-600' };
        if (percentage >= 75) return { grade: 'B', color: 'text-blue-600' };
        if (percentage >= 70) return { grade: 'C+', color: 'text-amber-600' };
        if (percentage >= 65) return { grade: 'C', color: 'text-amber-600' };
        if (percentage >= 60) return { grade: 'D', color: 'text-orange-600' };
        return { grade: 'F', color: 'text-red-600' };
    };

    const calculateSimpleAverage = (grades) => {
        if (!grades || grades.length === 0) return 0;
        const percentages = grades.map(g => (g.marks / g.total) * 100);
        const sum = percentages.reduce((a, b) => a + b, 0);
        return (sum / grades.length).toFixed(1);
    };

    const overallAverage = getOverallAverage();
    const overallGrade = getGrade(parseFloat(overallAverage));
    const totalAssignmentsCount = enrollments.reduce((sum, c) => sum + (c.grades?.filter(g => g.type === 'Assignment').length || 0), 0);

    const selectedCourse = enrollments.find(c => c.courseId === selectedCourseId);

    // Chart data
    const chartData = {
        labels: enrollments.map((c) => c.name.split(' ')[0]),
        datasets: [
            {
                data: enrollments.map((c) => parseFloat(calculateCourseAverage(c.grades))),
                backgroundColor: ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'],
                borderRadius: 8,
                barThickness: 40,
            },
        ],
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="ml-2 text-gray-600">Loading marks...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Academic Marks Sheet</h1>
                    <p className="text-gray-500">Select a course to view detailed grading and feedback</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchMarksData} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
                        <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#0D2818] to-[#1A5D3A] rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/70 text-sm mb-1 uppercase font-black tracking-widest">Global average</p>
                            <p className="text-4xl font-black">{overallAverage}%</p>
                            <p className={`text-lg font-black mt-1 text-white/80`}>Grade: {totalAssignmentsCount > 0 ? overallGrade.grade : 'N/A'}</p>
                        </div>
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Award className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </motion.div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Enrolled Courses</p>
                        <p className="text-3xl font-black text-gray-900">{enrollments.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Graded Assignments</p>
                        <p className="text-3xl font-black text-gray-900">{totalAssignmentsCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-emerald-600" />
                    </div>
                </div>
            </div>

            {/* Course Selector Step - High Visibility */}
            <div className="bg-[#f8fafc] p-8 rounded-3xl border-2 border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-900/5">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 uppercase tracking-tighter leading-none mb-1 text-lg">Step 1: Select Course</h3>
                        <p className="text-sm text-gray-500 font-medium italic">Reveal your detailed performance by choosing a course</p>
                    </div>
                </div>
                <div className="relative w-full md:w-96">
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className={`w-full px-6 py-4 bg-white border-2 rounded-2xl outline-none transition-all font-black text-lg uppercase tracking-tight appearance-none cursor-pointer ${!selectedCourseId ? 'border-amber-400 text-amber-600 animate-pulse ring-4 ring-amber-400/10' : 'border-emerald-500 text-emerald-600'
                            }`}
                    >
                        <option value="">-- Choose Course Here --</option>
                        {enrollments.map(c => (
                            <option key={c.courseId} value={c.courseId}>{c.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className={`w-3 h-3 border-r-2 border-b-2 rotate-45 ${!selectedCourseId ? 'border-amber-400' : 'border-emerald-600'}`}></div>
                    </div>
                </div>
            </div>

            {/* Detailed Performance - Only shown when course is selected */}
            {selectedCourse ? (
                <div className="space-y-6">
                    {(() => {
                        const assignmentGrades = selectedCourse.grades.filter(g => g.type === 'Assignment');
                        const dailyTaskGrades = selectedCourse.grades.filter(g => g.type === 'Daily Task');

                        const average = calculateSimpleAverage(assignmentGrades);
                        const gradeInfo = getGrade(parseFloat(average));

                        const dailyAvgMarks = dailyTaskGrades.length > 0
                            ? (dailyTaskGrades.reduce((sum, g) => sum + g.marks, 0) / dailyTaskGrades.length).toFixed(1)
                            : null;

                        return (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50">
                                <div className="p-8 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="font-black text-3xl text-gray-900 uppercase tracking-tighter mb-2">{selectedCourse.name}</h3>
                                        <div className="flex items-center gap-4">
                                            <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em]">Instructor: <span className="text-gray-900">{selectedCourse.teacher}</span></p>
                                            <Badge variant={selectedCourse.status === 'completed' ? 'success' : 'info'}>{selectedCourse.status.toUpperCase()}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Course Avg</p>
                                            <p className="text-4xl font-black text-gray-900">{average}%</p>
                                        </div>
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl border-2 ${gradeInfo.color.replace('text', 'border').replace('600', '200')} ${gradeInfo.color} bg-gray-50`}>
                                            {gradeInfo.grade}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-12">
                                    {/* Assignments */}
                                    <div>
                                        <div className="flex items-center justify-between mb-6 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
                                                <h4 className="font-black text-gray-900 uppercase tracking-widest">Assignments</h4>
                                            </div>
                                            {average > 0 && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 uppercase">Assignment Avg: {average}%</span>}
                                        </div>
                                        {assignmentGrades.length > 0 ? (
                                            <div className="overflow-hidden rounded-2xl border border-gray-100">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignment Name</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {assignmentGrades.map((grade, idx) => {
                                                            const perc = calculatePercentage(grade.marks, grade.total);
                                                            const gInfo = getGrade(parseFloat(perc));
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="py-4 px-6 font-black text-gray-300">ASGN #{grade.number}</td>
                                                                    <td className="py-4 px-6 font-bold text-gray-900">{grade.assessment}</td>
                                                                    <td className="py-4 px-6 font-medium text-gray-600">
                                                                        <span className="text-gray-900 font-bold">{grade.marks}</span><span className="text-xs opacity-50">/{grade.total}</span>
                                                                    </td>
                                                                    <td className={`py-4 px-6 font-black text-right ${gInfo.color}`}>{gInfo.grade} ({perc}%)</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : <p className="text-center py-8 text-gray-400 font-medium italic bg-gray-50 rounded-2xl border border-dashed">No assignments graded yet.</p>}
                                    </div>

                                    {/* Daily Tasks */}
                                    <div>
                                        <div className="flex items-center justify-between mb-6 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-50 rounded-lg"><RefreshCw className="w-5 h-5 text-emerald-600" /></div>
                                                <h4 className="font-black text-gray-900 uppercase tracking-widest">Daily work logs</h4>
                                            </div>
                                            {dailyAvgMarks && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase">Work Log Avg Score: {dailyAvgMarks}/100</span>}
                                        </div>
                                        {dailyTaskGrades.length > 0 ? (
                                            <div className="overflow-hidden rounded-2xl border border-gray-100">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {dailyTaskGrades.map((grade, idx) => {
                                                            const perc = calculatePercentage(grade.marks, grade.total);
                                                            const gInfo = getGrade(parseFloat(perc));
                                                            return (
                                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="py-4 px-6 font-black text-gray-300">LOG #{grade.number}</td>
                                                                    <td className="py-4 px-6 font-bold text-gray-900">{grade.assessment.split(': ')[1]}</td>
                                                                    <td className="py-4 px-6 font-medium text-gray-600">
                                                                        <span className="text-gray-900 font-bold">{grade.marks}</span><span className="text-xs opacity-50">/100</span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : <p className="text-center py-8 text-gray-400 font-medium italic bg-gray-50 rounded-2xl border border-dashed">No work logs graded yet.</p>}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })()}
                </div>
            ) : (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-20 text-center">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <TrendingUp className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase italic mb-2 tracking-tight">Viewing Stats Ready</h3>
                    <p className="text-gray-500 max-w-sm mx-auto font-medium">Please pick a course from the dropdown above to reveal your detailed academic breakdown and categories.</p>
                </div>
            )}
        </div>
    );
};

export default MarksSheet;
