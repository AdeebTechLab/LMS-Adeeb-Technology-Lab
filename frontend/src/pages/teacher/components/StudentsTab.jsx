import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, PauseCircle, Loader2, UserCheck } from 'lucide-react';
import { enrollmentAPI } from '../../../services/api';

const StudentsTab = ({ course }) => {
    const [enrollments, setEnrollments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchEnrollments();
    }, [course]);

    const fetchEnrollments = async () => {
        setIsLoading(true);
        try {
            const res = await enrollmentAPI.getAll();
            const all = res.data.data || [];
            const courseId = String(course.id || course._id);
            const courseEnrollments = all.filter(e => {
                const eCourseId = String(e.course?._id || e.course);
                return eCourseId === courseId && (e.status === 'enrolled' || e.isPaused);
            });
            setEnrollments(courseEnrollments);
        } catch (err) {
            console.error('Error loading enrollments:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <span className="ml-3 text-gray-500 font-medium">Loading students...</span>
            </div>
        );
    }

    const pausedCount = enrollments.filter(e => e.isPaused).length;
    const activeCount = enrollments.length - pausedCount;

    return (
        <div className="space-y-6">
            {/* Header stats */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <UserCheck className="w-4 h-4" />
                    <span className="font-bold text-sm">{activeCount} Active</span>
                </div>
                {pausedCount > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                        <PauseCircle className="w-4 h-4" />
                        <span className="font-bold text-sm">{pausedCount} Paused</span>
                    </div>
                )}
                <p className="text-xs text-gray-400 font-medium ml-auto">
                    Pause/Resume is managed by the admin.
                </p>
            </div>

            {enrollments.length === 0 ? (
                <div className="text-center py-16">
                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No enrolled students found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {enrollments.map((enrollment, index) => {
                        const student = enrollment.user || {};
                        const isPaused = enrollment.isPaused;

                        return (
                            <motion.div
                                key={enrollment._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isPaused
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-gray-50 border-gray-100'
                                    }`}
                            >
                                {/* Avatar */}
                                <div className={`w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border-2 ${isPaused ? 'border-amber-300 opacity-60' : 'border-white shadow'}`}>
                                    {student.photo ? (
                                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                            {(student.name || 'S').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`font-bold text-sm truncate ${isPaused ? 'text-amber-800' : 'text-gray-900'}`}>
                                            {student.name || 'Unknown Student'}
                                        </p>
                                        {isPaused && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-black uppercase rounded-full tracking-wider">
                                                <PauseCircle className="w-2.5 h-2.5" />
                                                Paused
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium">
                                        {student.rollNo || '—'} &bull; {student.email || '—'}
                                    </p>
                                    {isPaused && enrollment.pausedAt && (
                                        <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                                            Paused on {new Date(enrollment.pausedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentsTab;
