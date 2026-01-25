import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    Edit,
    Trash2,
    Users,
    BookOpen,
    Loader2,
    Calendar,
    Clock,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { courseAPI, userAPI } from '../../services/api';

const CourseManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        fee: '',
        duration: '',
        teacher: '',
        maxStudents: '',
        startDate: '',
        endDate: '',
        targetAudience: '',
        location: '',
    });

    // Fetch courses and users on component mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsFetching(true);
        setError('');
        try {
            const [coursesRes, teachersRes] = await Promise.all([
                courseAPI.getAll(),
                userAPI.getVerifiedByRole('teacher')
            ]);
            setCourses(coursesRes.data.data || []);
            setTeachers(teachersRes.data.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const filteredCourses = courses.filter((course) =>
        course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.teacher?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenModal = (course = null) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title: course.title,
                description: course.description,
                fee: course.fee?.toString() || '',
                duration: course.duration,
                teacher: course.teacher?._id || '',
                maxStudents: course.maxStudents?.toString() || '',
                startDate: course.startDate?.split('T')[0] || '',
                endDate: course.endDate?.split('T')[0] || '',
                targetAudience: course.targetAudience || 'students',
                location: course.location || '',
            });
        } else {
            setEditingCourse(null);
            setFormData({
                title: '',
                description: '',
                fee: '',
                duration: '',
                teacher: '',
                maxStudents: '',
                startDate: '',
                endDate: '',
                targetAudience: '',
                location: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const courseData = {
                title: formData.title,
                description: formData.description,
                fee: Number(formData.fee),
                duration: formData.duration,
                teacher: formData.teacher,
                maxStudents: Number(formData.maxStudents),
                startDate: formData.startDate,
                endDate: formData.endDate,
                targetAudience: formData.targetAudience,
                location: formData.location,
            };

            if (editingCourse) {
                await courseAPI.update(editingCourse._id, courseData);
            } else {
                await courseAPI.create(courseData);
            }

            handleCloseModal();
            fetchData(); // Refresh the list
        } catch (err) {
            console.error('Error saving course:', err);
            setError(err.response?.data?.message || 'Failed to save course. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (courseId) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await courseAPI.delete(courseId);
                fetchData(); // Refresh the list
            } catch (err) {
                console.error('Error deleting course:', err);
                alert(err.response?.data?.message || 'Failed to delete course');
            }
        }
    };

    const getEnrolledCount = (course) => {
        // This will be populated from the enrollments count
        return course.enrolledCount || 0;
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
                    <p className="text-gray-500">Create and manage all courses</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0D2818] hover:bg-[#1A5D3A] text-white rounded-xl transition-all duration-300 font-medium"
                    >
                        <BookOpen className="w-5 h-5" />
                        Add New Course
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search courses or teachers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* No Courses Message */}
            {filteredCourses.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No courses found</h3>
                    <p className="text-gray-400">Create your first course to get started</p>
                </div>
            )}

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                    <motion.div
                        key={course._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={course.status === 'active' ? 'success' : 'warning'}>
                                    {course.status}
                                </Badge>
                                <Badge variant={course.targetAudience === 'students' ? 'info' : 'purple'}>
                                    {course.targetAudience}
                                </Badge>
                            </div>
                        </div>

                        <h3 className="font-bold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                                {course.teacher?.name?.charAt(0) || 'T'}
                            </div>
                            <span className="text-sm text-gray-600">{course.teacher?.name || 'No teacher assigned'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Clock className="w-4 h-4" />
                                {course.duration}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                {course.startDate && new Date(course.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-1 text-gray-500">
                                <Users className="w-4 h-4" />
                                <span className="text-sm">{getEnrolledCount(course)}/{course.maxStudents}</span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                                <span>Rs {(course.fee || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <button
                                onClick={() => handleOpenModal(course)}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center gap-1"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(course._id)}
                                className="flex-1 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-1"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Create/Edit Course Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCourse ? 'Edit Course' : 'Create New Course'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Error in modal */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-600 text-sm">{error}</span>
                        </div>
                    )}

                    {/* Course Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Course Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Web Development Bootcamp"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detailed course description..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                            required
                        />
                    </div>

                    {/* Assign Teacher */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assign Teacher <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.teacher}
                            onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                            required
                        >
                            <option value="">Select a registered teacher</option>
                            {teachers.map((teacher) => (
                                <option key={teacher._id} value={teacher._id}>
                                    {teacher.name} - {teacher.specialization || teacher.email}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Only registered teachers are shown</p>
                    </div>

                    {/* Fee and Duration Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Monthly Fee (Rs) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">Rs</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.fee}
                                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                                    placeholder="15000"
                                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Duration <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                                required
                            >
                                <option value="">Select duration</option>
                                <option value="4 weeks">4 weeks</option>
                                <option value="6 weeks">6 weeks</option>
                                <option value="8 weeks">8 weeks</option>
                                <option value="10 weeks">10 weeks</option>
                                <option value="12 weeks">12 weeks</option>
                                <option value="14 weeks">14 weeks</option>
                                <option value="16 weeks">16 weeks</option>
                            </select>
                        </div>
                    </div>

                    {/* Max Students and Target Audience Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Students <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={formData.maxStudents}
                                onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                                placeholder="50"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Target Audience <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.targetAudience}
                                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                                required
                            >
                                <option value="">Select audience</option>
                                <option value="students">For Students</option>
                                <option value="interns">For Interns</option>
                            </select>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Course Location <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                            required
                        >
                            <option value="">Select location</option>
                            <option value="islamabad">Islamabad</option>
                            <option value="bahawalpur">Bahawalpur</option>
                        </select>
                    </div>

                    {/* Start and End Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                min={formData.startDate}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                required
                            />
                        </div>
                    </div>


                    {/* Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3 bg-[#0D2818] hover:bg-[#1A5D3A] text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {editingCourse ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                editingCourse ? 'Update Course' : 'Create Course'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CourseManagement;
