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
    Filter,
    X,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { courseAPI, userAPI } from '../../services/api';
import { getCourseIcon, getCourseColor, getCourseStyle } from '../../utils/courseIcons';

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
        title: '',
        description: '',
        fee: '',
        originalPrice: '',
        durationMonths: '',
        teachers: [],
        targetAudience: '',
        city: '',
        category: '', // Added category
        bookLink: '',
    });

    // Filters State
    const [selectedRoles, setSelectedRoles] = useState([]); // 'students', 'interns'
    const [selectedCities, setSelectedCities] = useState([]); // 'Bahawalpur', 'Islamabad'

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

    const filteredCourses = courses.filter((course) => {
        const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.teachers?.some(t => t.name?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(course.targetAudience);
        const matchesCity = selectedCities.length === 0 || selectedCities.includes(course.city);

        return matchesSearch && matchesRole && matchesCity;
    });

    const toggleFilter = (type, value) => {
        if (type === 'role') {
            setSelectedRoles(prev =>
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            );
        } else {
            setSelectedCities(prev =>
                prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            );
        }
    };

    const clearFilters = () => {
        setSelectedRoles([]);
        setSelectedCities([]);
        setSearchQuery('');
    };

    const handleOpenModal = (course = null) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title: course.title,
                description: course.description,
                description: course.description,
                fee: course.fee?.toString() || '',
                originalPrice: course.originalPrice?.toString() || '',
                durationMonths: course.durationMonths?.toString() || '',
                teachers: course.teachers?.map(t => t._id) || [],
                targetAudience: course.targetAudience || 'students',
                city: course.city || '',
                category: course.category || '',
                bookLink: course.bookLink || '',
            });
        } else {
            setEditingCourse(null);
            setFormData({
                title: '',
                description: '',
                description: '',
                fee: '',
                originalPrice: '',
                durationMonths: '',
                teachers: [],
                targetAudience: '',
                city: '',
                category: '',
                bookLink: '',
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
                description: formData.description,
                description: formData.description,
                fee: formData.fee, // Send as string
                originalPrice: formData.originalPrice, // Send as string
                durationMonths: Number(formData.durationMonths),
                teachers: formData.teachers,
                targetAudience: formData.targetAudience,
                location: formData.city.toLowerCase(),
                category: formData.category, // Send category
                city: formData.city,
                bookLink: formData.bookLink,
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

            {/* Filters and Search */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:border-emerald-500/20 focus-within:bg-white transition-all">
                        <Search className="w-5 h-5 text-gray-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Search courses or teachers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-gray-700 placeholder:text-gray-400"
                        />
                    </div>

                    {/* Clear Button */}
                    {(selectedRoles.length > 0 || selectedCities.length > 0 || searchQuery) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-medium"
                        >
                            <X className="w-4 h-4" />
                            Clear Filters
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                    {/* Role Filters */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audience:</span>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => toggleFilter('role', 'students')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedRoles.includes('students')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Students
                            </button>
                            <button
                                onClick={() => toggleFilter('role', 'interns')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedRoles.includes('interns')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Interns
                            </button>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-gray-200 hidden sm:block" />

                    {/* City Filters */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location:</span>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => toggleFilter('city', 'Islamabad')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedCities.includes('Islamabad')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Islamabad
                            </button>
                            <button
                                onClick={() => toggleFilter('city', 'Bahawalpur')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedCities.includes('Bahawalpur')
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Bahawalpur
                            </button>
                        </div>
                    </div>
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
                            {(() => {
                                const style = getCourseStyle(course.category, course.title);
                                const Icon = style.icon;
                                return (
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${style.gradient}`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                );
                            })()}
                            <div className="flex items-center gap-2">
                                <Badge variant="info">
                                    {course.city || 'N/A'}
                                </Badge>
                                <Badge variant={course.targetAudience === 'students' ? 'success' : 'purple'}>
                                    {course.targetAudience}
                                </Badge>
                            </div>
                        </div>

                        <h3 className="font-bold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>

                        {/* Teachers */}
                        <div className="mb-3">
                            {course.teachers && course.teachers.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {course.teachers.map((teacher, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                                                {teacher?.name?.charAt(0) || 'T'}
                                            </div>
                                            <span className="text-xs text-gray-600">{teacher?.name || 'Teacher'}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400">No teachers assigned</span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Clock className="w-4 h-4" />
                                {course.durationMonths} {course.durationMonths === 1 ? 'month' : 'months'}
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Calendar className="w-4 h-4" />
                                {course.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-1 text-gray-500">
                                <Users className="w-4 h-4" />
                                <span className="text-sm">{getEnrolledCount(course)} enrolled</span>
                            </div>
                            <div className="flex flex-col items-end">
                                {course.originalPrice && !isNaN(parseFloat(course.originalPrice)) && parseFloat(course.originalPrice) > parseFloat(course.fee) && (
                                    <span className="text-[10px] text-red-500 line-through font-medium">
                                        Rs {Number(course.originalPrice).toLocaleString()}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 font-semibold text-emerald-600">
                                    <span>{isNaN(Number(course.fee)) ? course.fee : `Rs ${Number(course.fee).toLocaleString()}`}</span>
                                </div>
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

                    {/* Assign Teachers (Checkboxes) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assign Teachers <span className="text-red-500">*</span>
                        </label>
                        <div className="border border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto bg-gray-50">
                            {teachers.length === 0 ? (
                                <p className="text-sm text-gray-400">No teachers available</p>
                            ) : (
                                <div className="space-y-2">
                                    {teachers.map((teacher) => (
                                        <label key={teacher._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.teachers.includes(teacher._id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, teachers: [...formData.teachers, teacher._id] });
                                                    } else {
                                                        setFormData({ ...formData, teachers: formData.teachers.filter(id => id !== teacher._id) });
                                                    }
                                                }}
                                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm font-medium text-gray-700">{teacher.name}</span>
                                                <span className="text-xs text-gray-500 ml-2">({teacher.specialization || teacher.email})</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.teachers.length} teacher(s) selected
                        </p>
                    </div>

                    {/* Fee and Duration Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fee / Text <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.fee}
                                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                                placeholder="15000 or Coming Soon"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Original Price / Text <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.originalPrice}
                                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                                placeholder="20000"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Duration (Months) <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.durationMonths}
                                onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                                required
                            >
                                <option value="">Select duration</option>
                                <option value="1">1 month</option>
                                <option value="2">2 months</option>
                                <option value="3">3 months</option>
                                <option value="4">4 months</option>
                                <option value="5">5 months</option>
                                <option value="6">6 months</option>
                                <option value="7">7 months</option>
                                <option value="8">8 months</option>
                                <option value="9">9 months</option>
                                <option value="10">10 months</option>
                            </select>
                        </div>
                    </div>

                    {/* Target Audience */}
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

                    {/* City */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            City <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                            required
                        >
                            <option value="">Select city</option>
                            <option value="Bahawalpur">Bahawalpur</option>
                            <option value="Islamabad">Islamabad</option>
                        </select>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                            required
                        >
                            <option value="">Select category</option>
                            <option value="Web Development">Web Development</option>
                            <option value="AI & Machine Learning">AI & Machine Learning</option>
                            <option value="Graphic Design">Graphic Design</option>
                            <option value="App Development">App Development</option>
                            <option value="Cybersecurity">Cybersecurity</option>
                            <option value="Cloud Computing">Cloud Computing</option>
                            <option value="Digital Marketing">Digital Marketing</option>
                            <option value="Video Editing">Video Editing</option>
                            <option value="Finance & Accounting">Finance & Accounting</option>
                            <option value="Office Productivity">Office Productivity</option>
                        </select>
                    </div>

                    {/* Book Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Book / Resource Link
                        </label>
                        <input
                            type="url"
                            value={formData.bookLink}
                            onChange={(e) => setFormData({ ...formData, bookLink: e.target.value })}
                            placeholder="https://example.com/course-book.pdf"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-xs"
                        />
                        <p className="text-[10px] text-gray-400 mt-1 italic uppercase tracking-widest font-black">Direct link to course materials</p>
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
