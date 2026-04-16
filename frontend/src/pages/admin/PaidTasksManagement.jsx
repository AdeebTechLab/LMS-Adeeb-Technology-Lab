import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, Calendar, CheckCircle, Loader2, Eye, Users, Briefcase, AlertCircle, Link, Trash2, PenSquare, MessageSquare, Star, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { taskAPI, userNotificationAPI } from '../../services/api';
import { useSelector } from 'react-redux';
import { getCategoryIcon, getCategoryColor, getCategoryBg } from '../../utils/taskCategoryIcons';

const PaidTasksManagement = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const { user } = useSelector((state) => state.auth);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode] = useState(null);
    const [viewingProfile, setViewingProfile] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [completedShowcase, setCompletedShowcase] = useState([]);
    const [editingFeedback, setEditingFeedback] = useState(null);
    const [editFeedbackData, setEditFeedbackData] = useState({ text: '', rating: 5 });
    const [isSavingFeedback, setIsSavingFeedback] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        skills: '',
        category: 'web',
        type: 'task',
        images: [],
        isLifetime: false,
    });
    const [imagePreviews, setImagePreviews] = useState([]);

    useEffect(() => {
        const title = (formData.title || '').toLowerCase();

        if (title.includes('web dev without coding')) {
            setFormData(prev => ({ ...prev, category: 'Web Dev Without Coding' }));
        } else if (title.includes('app dev without coding')) {
            setFormData(prev => ({ ...prev, category: 'App Dev Without Coding' }));
        } else if (title.includes('web development') || title.includes('site') || title.includes('react') || title.includes('html') || title.includes('frontend') || title.includes('backend') || title.includes('fullstack')) {
            setFormData(prev => ({ ...prev, category: 'Web Development' }));
        } else if (title.includes('app development') || title.includes('ios') || title.includes('android') || title.includes('flutter')) {
            setFormData(prev => ({ ...prev, category: 'App Development' }));
        } else if (title.includes('cyber security')) {
            setFormData(prev => ({ ...prev, category: 'Cyber Security' }));
        } else if (title.includes('machine learning') || title.includes('ml')) {
            setFormData(prev => ({ ...prev, category: 'Machine learning' }));
        } else if (title.includes('ai') || title.includes('intelligence')) {
            setFormData(prev => ({ ...prev, category: 'ai' }));
        } else if (title.includes('iot') || title.includes('internet of thing')) {
            setFormData(prev => ({ ...prev, category: 'Internet of Thing [IOT]' }));
        } else if (title.includes('office work')) {
            setFormData(prev => ({ ...prev, category: 'Office Work [IT]' }));
        } else if (title.includes('freelanc')) {
            setFormData(prev => ({ ...prev, category: 'Freelancing' }));
        } else if (title.includes('marketing') || title.includes('ads')) {
            setFormData(prev => ({ ...prev, category: 'Digital Marketing, Ads' }));
        } else if (title.includes('video edit')) {
            setFormData(prev => ({ ...prev, category: 'Video Editing' }));
        } else if (title.includes('graphic design')) {
            setFormData(prev => ({ ...prev, category: 'Graphic Designer' }));
        } else if (title.includes('e-commerce') || title.includes('amazon') || title.includes('shopify')) {
            setFormData(prev => ({ ...prev, category: 'E-Commerce' }));
        } else if (title.includes('ui') || title.includes('ux') || title.includes('design') || title.includes('figma')) {
            setFormData(prev => ({ ...prev, category: 'UX/UI Designing' }));
        } else if (title.includes('youtube')) {
            setFormData(prev => ({ ...prev, category: 'Youtuber Course' }));
        } else if (title.includes('arch')) {
            setFormData(prev => ({ ...prev, category: 'Home Architecture' }));
        } else if (title.includes('programm')) {
            setFormData(prev => ({ ...prev, category: 'Programming' }));
        } else if (title.includes('tax')) {
            setFormData(prev => ({ ...prev, category: 'Taxation' }));
        } else if (title.includes('trad')) {
            setFormData(prev => ({ ...prev, category: 'Trading' }));
        } else if (title.includes('truck') || title.includes('dispatch')) {
            setFormData(prev => ({ ...prev, category: 'Truck Dispatching' }));
        } else if (title.includes('software dev')) {
            setFormData(prev => ({ ...prev, category: 'Software Development' }));
        }
    }, [formData.title]);

    // Fetch tasks on component mount
    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setIsFetching(true);
        setError('');
        try {
            const [allRes, showcaseRes] = await Promise.all([
                taskAPI.getAll(),
                taskAPI.getCompletedShowcase()
            ]);
            setTasks(allRes.data.data || []);
            setCompletedShowcase(showcaseRes.data.data || []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setError('Failed to load tasks. Please try again.');
        } finally {
            setIsFetching(false);
        }
    };

    // Check if task deadline has passed without assignment
    const isExpired = (task) => {
        if (task.isLifetime) return false;
        if (!task.deadline) return false;
        // Expired if not assigned to ANYONE and status is open
        return new Date(task.deadline) < new Date() && (!task.assignedTo || task.assignedTo.length === 0) && task.status === 'open';
    };

    // Filter tasks by status category
    const openTasks = tasks.filter(t => t.status === 'open' && !isExpired(t));
    // Assigned or submitted means "in progress" effectively
    const assignedTasks = tasks.filter(t => t.status === 'assigned' || t.status === 'submitted');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const expiredTasks = tasks.filter(t => isExpired(t));

    const getFilteredByTab = () => {
        switch (activeTab) {
            case 'open': return openTasks;
            case 'assigned': return assignedTasks;
            case 'completed': return completedTasks;
            case 'expired': return expiredTasks;
            case 'showcase': return completedShowcase;
            default: return tasks;
        }
    };

    const handleEditFeedback = (task, feedback) => {
        setEditingFeedback({ taskId: task._id, feedbackId: feedback._id });
        setEditFeedbackData({ text: feedback.text, rating: feedback.rating });
    };

    const handleSaveFeedback = async () => {
        if (!editingFeedback || !editFeedbackData.text.trim()) return;
        setIsSavingFeedback(true);
        try {
            await taskAPI.editFeedback(editingFeedback.taskId, editingFeedback.feedbackId, editFeedbackData);
            setEditingFeedback(null);
            setEditFeedbackData({ text: '', rating: 5 });
            fetchTasks();
            alert('Feedback updated successfully!');
        } catch (err) {
            console.error('Error editing feedback:', err);
            alert(err.response?.data?.message || 'Failed to update feedback');
        } finally {
            setIsSavingFeedback(false);
        }
    };

    const handleDeleteFeedback = async (taskId, feedbackId) => {
        if (!window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) return;
        try {
            await taskAPI.deleteFeedback(taskId, feedbackId);
            fetchTasks();
            alert('Feedback deleted successfully!');
        } catch (err) {
            console.error('Error deleting feedback:', err);
            alert(err.response?.data?.message || 'Failed to delete feedback');
        }
    };

    const filteredTasks = getFilteredByTab().filter((task) =>
        task.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusConfig = (status) => {
        switch (status) {
            case 'open': return { variant: 'success', label: 'Open for Applications' };
            case 'assigned': return { variant: 'warning', label: 'Assigned' };
            case 'submitted': return { variant: 'info', label: 'Pending Review' };
            case 'completed': return { variant: 'primary', label: 'Completed' };
            default: return { variant: 'secondary', label: status };
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('budget', formData.budget);
            submitData.append('deadline', formData.deadline);
            submitData.append('skills', formData.skills);
            submitData.append('category', formData.category);
            submitData.append('type', formData.type);
            submitData.append('isLifetime', formData.isLifetime);
            
            if (formData.images && formData.images.length > 0) {
                formData.images.forEach(img => {
                    if (img instanceof File) {
                        submitData.append('images', img);
                    } else if (typeof img === 'string') {
                        submitData.append('existingImages', img);
                    }
                });
            }

            if (editingTask) {
                await taskAPI.update(editingTask._id, submitData);
            } else {
                await taskAPI.create(submitData);
            }
            setIsModalOpen(false);
            setEditingTask(null);
            setFormData({ title: '', description: '', budget: '', deadline: '', skills: '', category: 'web', type: 'task', images: [], isLifetime: false });
            setImagePreviews([]);
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Error saving task:', err);
            setError(err.response?.data?.message || 'Failed to save task/item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description,
            budget: task.budget,
            deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
            skills: task.skills,
            category: task.category || 'web',
            type: task.type || 'task',
            images: task.images && task.images.length > 0 ? task.images : (task.image ? [task.image] : []),
            isLifetime: task.isLifetime || false,
        });
        setImagePreviews(task.images && task.images.length > 0 ? task.images : (task.image ? [task.image] : []));
        setIsModalOpen(true);
    };

    const handleUnassignTask = async (taskId, userId) => {
        if (!window.confirm("Are you sure you want to remove this user from the task?")) return;
        try {
            await taskAPI.unassign(taskId, userId);
            // Update local state without full reload if possible, or just fetchTasks
            fetchTasks();
            // Update selectedTask if in view mode
            if (selectedTask && selectedTask._id === taskId) {
                const updatedTaskRes = await taskAPI.getAll();
                const updatedTask = updatedTaskRes.data.data.find(t => t._id === taskId);
                setSelectedTask(updatedTask);
            }
            alert('User unassigned successfully!');
        } catch (err) {
            console.error('Error unassigning task:', err);
            alert(err.response?.data?.message || 'Failed to unassign task');
        }
    };

    const handleAssignTask = async (taskId, applicantId) => {
        try {
            await taskAPI.assign(taskId, applicantId);
            // Don't close modal or clear view mode immediately, so they can assign more if they want
            // Just refresh data
            fetchTasks();
            // We need to update selectedTask too if we are viewing applicants
            const updatedTaskRes = await taskAPI.getAll();
            const updatedTask = updatedTaskRes.data.data.find(t => t._id === taskId);
            setSelectedTask(updatedTask);
            alert('User assigned successfully!');
        } catch (err) {
            console.error('Error assigning task:', err);
            alert(err.response?.data?.message || 'Failed to assign task');
        }
    };

    const handleViewApplicants = async (task) => {
        setSelectedTask(task);
        setViewMode('applicants');

        // Mark related notifications as read
        try {
            const notifRes = await userNotificationAPI.getAll();
            const relatedNotifications = (notifRes.data.data || []).filter(
                n => n.relatedTask?._id === task._id || n.relatedTask === task._id
            );
            for (const notif of relatedNotifications) {
                if (!notif.isRead) {
                    await userNotificationAPI.markAsRead(notif._id);
                }
            }
        } catch (err) {
            console.error('Error marking notifications as read:', err);
        }
    };

    const handleVerifyAndPay = async (taskId) => {
        if (!window.confirm("ARE YOU SURE? Only proceed if payment is clear. This will mark the task as COMPLETED and signify payment has been sent.")) return;

        try {
            await taskAPI.adminComplete(taskId);
            setViewMode(null);
            setSelectedTask(null);
            setActiveTab('completed'); // Switch to completed tab
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Error completing task:', err);
            alert(err.response?.data?.message || 'Failed to complete task');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this task from the database? This action cannot be undone.')) return;

        setIsDeleting(taskId);
        try {
            await taskAPI.delete(taskId);
            fetchTasks(); // Refresh list
            alert('Task deleted permanently.');
        } catch (err) {
            console.error('Error deleting task:', err);
            alert(err.response?.data?.message || 'Failed to delete task');
        } finally {
            setIsDeleting(false);
        }
    };

    const isAssignedTo = (task, userId) => {
        if (!task.assignedTo || !Array.isArray(task.assignedTo)) return false;
        return task.assignedTo.some(u => {
            const uId = u._id || u;
            return String(uId) === String(userId);
        });
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">Loading tasks...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Paid Tasks</h1>
                    <p className="text-gray-500">Create and manage freelance tasks</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => {
                            setEditingTask(null);
                            setFormData({ title: '', description: '', budget: '', deadline: '', skills: '', category: 'web', type: 'task', images: [], isLifetime: false });
                            setImagePreviews([]);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-300 font-medium"
                    >
                        <Briefcase className="w-5 h-5" />
                        Create Paid Task
                    </button>
                    <button
                        onClick={() => {
                            setEditingTask(null);
                            setFormData({ title: '', description: '', budget: '', deadline: '', skills: '', category: 'E-Commerce', type: 'product', images: [], isLifetime: false });
                            setImagePreviews([]);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all duration-300 font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                        Add Item For Sale
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600">{error}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'all' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'}`}
                >
                    All ({tasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('open')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'open' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'}`}
                >
                    Open ({openTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('assigned')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'assigned' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-600'}`}
                >
                    Assigned ({assignedTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'completed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600'}`}
                >
                    Completed ({completedTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('expired')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'expired' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'}`}
                >
                    Expired ({expiredTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('showcase')}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'showcase' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'}`}
                >
                    <MessageSquare className="w-4 h-4" />
                    Work Feedback ({completedShowcase.filter(t => t.feedback && t.feedback.length > 0).length})
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-gray-700"
                    />
                </div>
            </div>

            {/* No Tasks */}
            {filteredTasks.length === 0 && activeTab !== 'showcase' && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No tasks found</h3>
                    <p className="text-gray-400">Create your first paid task to get started</p>
                </div>
            )}

            {/* Work Feedback Showcase Tab */}
            {activeTab === 'showcase' && (
                <div className="space-y-6">
                    {completedShowcase.filter(t => t.feedback && t.feedback.length > 0).length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600">No feedback yet</h3>
                            <p className="text-gray-400">Feedback from freelancers will appear here after they complete tasks</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedShowcase
                                .filter(t => t.feedback && t.feedback.length > 0)
                                .map((task, index) => (
                                    <motion.div
                                        key={task._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            {(() => {
                                                const IconComponent = getCategoryIcon(task.category);
                                                return (
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryBg(task.category)}`}>
                                                        <IconComponent className={`w-6 h-6 ${getCategoryColor(task.category)}`} />
                                                    </div>
                                                );
                                            })()}
                                            <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
                                        </div>

                                        <h3 className="font-bold text-gray-900 mb-2">{task.title}</h3>
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>

                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {(task.skills || '').split(',').map((skill, i) => (
                                                <span key={i} className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-md">
                                                    {skill.trim()}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Completed By */}
                                        <div className="mb-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <span className="text-xs text-gray-400 font-medium">Completed By:</span>
                                            <div className="flex -space-x-2">
                                                {(task.assignedTo || []).map((u, i) => (
                                                    <div key={i} title={u.name} className="w-7 h-7 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-600">
                                                        {u.photo ? <img src={u.photo} alt="" className="w-full h-full rounded-full object-cover" /> : u.name?.charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Feedback Entries */}
                                        <div className="space-y-3">
                                            <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Jobber Feedback</p>
                                            {task.feedback.map((f) => (
                                                <div key={f._id} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-semibold text-indigo-900">{f.user?.name || 'Anonymous'}</span>
                                                        <div className="flex text-amber-500 text-xs">
                                                            {[...Array(5)].map((_, i) => (
                                                                <span key={i}>{i < f.rating ? '★' : '☆'}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-indigo-800 italic mb-3">"{f.text}"</p>
                                                    <div className="flex items-center gap-2 pt-2 border-t border-indigo-100">
                                                        <button
                                                            onClick={() => handleEditFeedback(task, f)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-white hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all"
                                                        >
                                                            <PenSquare className="w-3 h-3" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFeedback(task._id, f._id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 rounded-lg border border-red-200 transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tasks Grid */}
            {activeTab !== 'showcase' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map((task, index) => {
                    const statusConfig = getStatusConfig(task.status);
                    const unassignedApplicantsCount = task.applicants?.filter(a => !isAssignedTo(task, a.user?._id)).length || 0;
                    const hasNewApplicants = task.status === 'assigned' && unassignedApplicantsCount > 0;

                    return (
                        <motion.div
                            key={task._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-white rounded-2xl p-6 border border-gray-100 ${task.status === 'assigned' ? 'opacity-95' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                {(() => {
                                    const IconComponent = getCategoryIcon(task.category);
                                    return (
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryBg(task.category)}`}>
                                            <IconComponent className={`w-6 h-6 ${getCategoryColor(task.category)}`} />
                                        </div>
                                    );
                                })()}
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {task.applicants?.length > 0 && (
                                        <span className="px-2.5 py-1 bg-yellow-400 text-yellow-900 text-xs font-extrabold rounded-lg shadow-sm">
                                            {task.applicants.length} Applicant{task.applicants.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {hasNewApplicants && (
                                        <span className="px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 text-xs font-extrabold rounded-lg shadow-sm animate-pulse flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {unassignedApplicantsCount} New!
                                        </span>
                                    )}
                                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                                    <button
                                        onClick={() => handleDeleteTask(task._id)}
                                        disabled={isDeleting === task._id}
                                        className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm border border-red-100"
                                        title="Permanently Delete Task"
                                    >
                                        {isDeleting === task._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => handleEditClick(task)}
                                        className="px-3 py-1 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-sm border border-purple-100"
                                        title="Edit Task"
                                    >
                                        <PenSquare className="w-3 h-3" />
                                        Edit
                                    </button>
                                </div>
                            </div>

                            {task.type === 'product' && (task.images && task.images.length > 0 || task.image) && (
                                <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                                    <img src={task.images && task.images.length > 0 ? task.images[0] : task.image} alt={task.title} className="w-full h-full object-cover" />
                                    {(task.images && task.images.length > 1) && (
                                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                                            +{task.images.length - 1} images
                                        </div>
                                    )}
                                </div>
                            )}

                            <h3 className="font-bold text-gray-900 mb-2">{task.title}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>

                            <div className="flex flex-wrap gap-1 mb-4">
                                {(task.skills || '').split(',').map((skill, i) => (
                                    <span key={i} className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-md">
                                        {skill.trim()}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-sm mb-4">
                                <span className="flex items-center gap-1 text-gray-500">
                                    <Calendar className="w-4 h-4" />
                                    {task.isLifetime ? 'Lifetime' : (task.deadline && new Date(task.deadline).toLocaleDateString())}
                                </span>
                                <span className={task.type === 'product' ? "font-bold text-emerald-600" : "font-bold text-purple-600"}>
                                    Rs {isNaN(Number(task.budget)) ? task.budget : Number(task.budget).toLocaleString()}
                                </span>
                            </div>

                            {/* Assigned Person Info */}
                            {task.assignedTo && task.assignedTo.length > 0 && (
                                <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Assigned To ({task.assignedTo.length})</p>
                                    <div className="flex flex-wrap gap-1">
                                        {task.assignedTo.map((u, i) => (
                                            <Badge key={i} variant="warning" className="flex items-center gap-1">
                                                {u.name}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnassignTask(task._id, u._id); }}
                                                    className="ml-1 hover:text-red-600 focus:outline-none"
                                                    title="Remove User"
                                                >
                                                    &times;
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions based on status */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                {task.status === 'open' && (
                                    <button
                                        onClick={() => handleViewApplicants(task)}
                                        className="flex-1 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl flex items-center justify-center gap-1"
                                    >
                                        <Users className="w-4 h-4" />
                                        {task.applicants?.length || 0} Applicants
                                    </button>
                                )}
                                {task.status === 'assigned' && (
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => handleViewApplicants(task)}
                                            className={`flex-1 py-2 text-sm font-medium rounded-xl flex items-center justify-center gap-1 relative ${hasNewApplicants ? 'bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                                            title="View Applicants & Assign More"
                                        >
                                            <Users className="w-4 h-4" />
                                            {hasNewApplicants ? `New Applicants (${unassignedApplicantsCount})` : `Assigned (${task.assignedTo?.length || 0})`}
                                            {hasNewApplicants && (
                                                <span className="absolute top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleVerifyAndPay(task._id)}
                                            className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center justify-center gap-1"
                                            title="Complete & Pay Task"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Complete & Pay
                                        </button>
                                    </div>
                                )}
                                {task.status === 'submitted' && (
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => { setSelectedTask(task); setViewMode('submission'); }}
                                            className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center gap-1"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Review {task.submissions?.length || 0} Submissions
                                        </button>
                                        <button
                                            onClick={() => handleViewApplicants(task)}
                                            className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl flex items-center justify-center gap-1"
                                            title="View Applicants & Assign More"
                                        >
                                            <Users className="w-4 h-4" />
                                            Applicants
                                        </button>
                                        <button
                                            onClick={() => handleVerifyAndPay(task._id)}
                                            className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center justify-center gap-1"
                                            title="Complete & Pay Task"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Complete & Pay
                                        </button>
                                    </div>
                                )}
                                {task.status === 'completed' && (
                                    <div className="flex-1 py-2 text-sm text-center text-emerald-600 bg-emerald-50 rounded-xl flex items-center justify-center gap-1">
                                        <CheckCircle className="w-4 h-4" />
                                        Payment Sent
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>}

            {/* Create/Edit Task Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? (editingTask.type === 'product' ? "Edit Item" : "Edit Paid Task") : (formData.type === 'product' ? "Add Item For Sale" : "Create Paid Task")} size="lg">
                <form onSubmit={handleCreateTask} className="space-y-5">
                    {formData.type === 'product' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Item Images (Optional)</label>
                            <div className="flex flex-wrap items-center gap-4">
                                {imagePreviews.map((preview, idx) => (
                                    <div key={idx} className="relative mt-2">
                                        <img src={preview} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const newImages = [...formData.images];
                                                newImages.splice(idx, 1);
                                                const newPreviews = [...imagePreviews];
                                                newPreviews.splice(idx, 1);
                                                setFormData({ ...formData, images: newImages });
                                                setImagePreviews(newPreviews);
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                            title="Remove image"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        if (files.length > 0) {
                                            const validFiles = files.filter(f => f.type.startsWith('image/'));
                                            setFormData({ ...formData, images: [...formData.images, ...validFiles] });
                                            const newPreviews = validFiles.map(f => URL.createObjectURL(f));
                                            setImagePreviews([...imagePreviews, ...newPreviews]);
                                        }
                                        e.target.value = ''; // Reset input to allow adding same file again if needed
                                    }}
                                    className="w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{formData.type === 'product' ? 'Product Name *' : 'Task Title *'}</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder={formData.type === 'product' ? "e.g., Premium Office Chair" : "e.g., Build a Landing Page"}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Budget (Rs) *</label>
                            <input
                                type="text"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                placeholder="e.g., 25000 or 1500-2500"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deadline *</label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                    required={!formData.isLifetime}
                                    disabled={formData.isLifetime}
                                />
                                <label className="flex items-center gap-2 cursor-pointer mt-1">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isLifetime}
                                        onChange={(e) => setFormData({ ...formData, isLifetime: e.target.checked, deadline: e.target.checked ? '' : formData.deadline })}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-600">Lifetime (No Deadline)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    {formData.type !== 'product' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
                                <input
                                    type="text"
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    placeholder="e.g., React, Node.js, MongoDB"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Task Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white"
                                    required={formData.type !== 'product'}
                                >
                            <option value="web">Web Development (General)</option>
                            <option value="ai">AI (General)</option>
                            <option value="Web Development">Web Development (Full Stack)</option>
                            <option value="Web Dev Without Coding">Web Dev Without Coding</option>
                            <option value="App Development">App Development</option>
                            <option value="App Dev Without Coding">App Dev Without Coding</option>
                            <option value="Software Development">Software Development</option>
                            <option value="Programming">Programming</option>
                            <option value="Cyber Security">Cyber Security</option>
                            <option value="Machine learning">Machine learning</option>
                            <option value="Internet of Thing [IOT]">Internet of Thing [IOT]</option>
                            <option value="Office Work [IT]">Office Work [IT]</option>
                            <option value="Freelancing">Freelancing</option>
                            <option value="Digital Marketing, Ads">Digital Marketing, Ads</option>
                            <option value="E-Commerce">E-Commerce</option>
                            <option value="Video Editing">Video Editing</option>
                            <option value="Graphic Designer">Graphic Designer</option>
                            <option value="UX/UI Designing">UX/UI Designing</option>
                            <option value="Youtuber Course">Youtuber Course</option>
                            <option value="Home Architecture">Home Architecture</option>
                                <option value="Taxation">Taxation</option>
                                <option value="Trading">Trading</option>
                                <option value="Truck Dispatching">Truck Dispatching</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </>
                )}
                    <div className="flex gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className={`flex-1 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 ${formData.type === 'product' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingTask ? 'Update ' + (formData.type === 'product' ? 'Item' : 'Task') : 'Create ' + (formData.type === 'product' ? 'Item' : 'Task'))}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Applicants Modal */}
            <Modal isOpen={viewMode === 'applicants' && selectedTask} onClose={() => { setViewMode(null); setSelectedTask(null); }} title="Task Applicants" size="lg">
                {selectedTask && (
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className="text-sm text-gray-500">Budget: Rs {isNaN(Number(selectedTask.budget)) ? selectedTask.budget : Number(selectedTask.budget).toLocaleString()}</p>
                        </div>
                        {(!selectedTask.applicants || selectedTask.applicants.length === 0) ? (
                            <p className="text-center text-gray-500 py-8">No applications yet</p>
                        ) : (
                            <div className="space-y-3">
                                {selectedTask.applicants.map((applicant) => {
                                    const isAssigned = isAssignedTo(selectedTask, applicant.user?._id);
                                    return (
                                        <div key={applicant.user?._id || applicant._id} className={`p-4 rounded-xl border ${isAssigned ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-lg">
                                                        {applicant.user?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {applicant.user?.name}
                                                            {isAssigned && <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">ASSIGNED</span>}
                                                        </p>
                                                        <p className="text-sm text-gray-500">{applicant.user?.email}</p>
                                                        {applicant.user?.rating && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <span className="text-amber-500">★</span>
                                                                <span className="text-xs text-gray-500">{applicant.user.rating} • {applicant.user.completedTasks || 0} tasks</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setViewingProfile(applicant.user)}
                                                        className="px-3 py-2 text-purple-600 bg-white border border-purple-200 hover:bg-purple-50 text-sm rounded-xl font-medium flex items-center gap-1"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Profile
                                                    </button>
                                                    {isAssigned ? (
                                                        <button
                                                            onClick={() => handleUnassignTask(selectedTask._id, applicant.user?._id)}
                                                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-xl font-medium"
                                                        >
                                                            Unassign
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAssignTask(selectedTask._id, applicant.user?._id)}
                                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl font-medium"
                                                        >
                                                            Assign
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {applicant.message && (
                                                <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                                                    <p className="text-xs text-gray-400 mb-1">Application Message:</p>
                                                    <p className="text-sm text-gray-600">{applicant.message}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* View Profile Modal */}
            <Modal isOpen={viewingProfile !== null} onClose={() => setViewingProfile(null)} title="Applicant Profile" size="lg">
                {viewingProfile && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                            {viewingProfile.photo ? (
                                <img
                                    src={viewingProfile.photo}
                                    alt={viewingProfile.name}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-lg">
                                    {viewingProfile.name?.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{viewingProfile.name}</h3>
                                <p className="text-gray-500">{viewingProfile.email}</p>
                                {(viewingProfile.rating > 0 || viewingProfile.completedTasks > 0) && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-amber-500 text-lg">★ {viewingProfile.rating || 0}</span>
                                        <span className="text-sm text-gray-400">({viewingProfile.completedTasks || 0} tasks completed)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Phone</p>
                                <p className="text-sm font-medium text-gray-900">{viewingProfile.phone || 'Not provided'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Experience</p>
                                <p className="text-sm font-medium text-gray-900">{viewingProfile.experience || 'Not specified'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Education</p>
                                <p className="text-sm font-medium text-gray-900">{viewingProfile.education || 'Not provided'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">CNIC</p>
                                <p className="text-sm font-medium text-gray-900">{viewingProfile.cnic || 'Not provided'}</p>
                            </div>
                        </div>

                        {(viewingProfile.city || viewingProfile.address) && (
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-2">Address</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {[viewingProfile.address, viewingProfile.city].filter(Boolean).join(', ') || 'Not provided'}
                                </p>
                            </div>
                        )}

                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-400 mb-2">Skills</p>
                            <div className="flex flex-wrap gap-2">
                                {(viewingProfile.skills || 'No skills listed').split(',').map((skill, i) => (
                                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-lg">
                                        {skill.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {viewingProfile.portfolio && (
                                <a
                                    href={viewingProfile.portfolio}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                                >
                                    <p className="text-xs text-gray-400 mb-1">Portfolio</p>
                                    <p className="text-blue-600 font-medium text-sm truncate">{viewingProfile.portfolio}</p>
                                </a>
                            )}
                            {viewingProfile.cvUrl && (
                                <a
                                    href={viewingProfile.cvUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                                >
                                    <p className="text-xs text-gray-400 mb-1">CV/Resume</p>
                                    <p className="text-green-600 font-medium text-sm">View CV →</p>
                                </a>
                            )}
                        </div>

                        <button onClick={() => setViewingProfile(null)} className="w-full py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Close
                        </button>
                    </div>
                )}
            </Modal>

            {/* View Submission Modal */}
            <Modal isOpen={viewMode === 'submission' && selectedTask} onClose={() => { setViewMode(null); setSelectedTask(null); }} title={`Review Submissions (${selectedTask?.submissions?.length || 0})`} size="lg">
                {selectedTask?.submissions && selectedTask.submissions.length > 0 ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                            <p className="text-sm text-gray-500">Budget: Rs {isNaN(Number(selectedTask.budget)) ? selectedTask.budget : Number(selectedTask.budget).toLocaleString()}</p>
                        </div>

                        {selectedTask.submissions.map((sub, idx) => (
                            <div key={idx} className="p-4 border rounded-xl bg-white shadow-sm">
                                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {sub.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{sub.user?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-gray-500">{sub.user?.email}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">{new Date(sub.submittedAt).toLocaleString()}</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Notes</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.notes}</p>
                                    </div>

                                    {sub.projectLink && (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Project Link</p>
                                            <a href={sub.projectLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium">
                                                <Link className="w-3 h-3" /> {sub.projectLink}
                                            </a>
                                        </div>
                                    )}

                                    <div className="bg-emerald-50 p-3 rounded-lg">
                                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Payment Details</p>
                                        <p className="text-sm font-mono text-emerald-800">{sub.accountDetails}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
                            <button onClick={() => { setViewMode(null); setSelectedTask(null); }} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                                Close
                            </button>
                            <button
                                onClick={() => handleVerifyAndPay(selectedTask._id)}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Complete & Pay Task
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center text-gray-500">
                        No submissions found for this task yet.
                    </div>
                )}
            </Modal>

            {/* Edit Feedback Modal */}
            <Modal isOpen={editingFeedback !== null} onClose={() => setEditingFeedback(null)} title="Edit Feedback" size="md">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Rating</label>
                        <div className="flex justify-center gap-2 text-3xl">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setEditFeedbackData({ ...editFeedbackData, rating: star })}
                                    className={`transition-colors ${editFeedbackData.rating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Text *</label>
                        <textarea
                            value={editFeedbackData.text}
                            onChange={(e) => setEditFeedbackData({ ...editFeedbackData, text: e.target.value })}
                            placeholder="Feedback text..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button onClick={() => setEditingFeedback(null)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveFeedback}
                            disabled={isSavingFeedback || !editFeedbackData.text.trim()}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSavingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default PaidTasksManagement;
