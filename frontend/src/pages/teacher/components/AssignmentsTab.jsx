import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Calendar, MoreHorizontal, Users, Loader2, CheckCircle, Clock, X, Upload, Edit2, Search, ChevronDown, Check } from 'lucide-react';
import api, { assignmentAPI } from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';

const AssignmentsTab = ({ course, students }) => { // Accept students prop
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [assignSearchTerm, setAssignSearchTerm] = useState(''); // For searching students when assigning

    // Create Form State
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        dueDate: '',
        totalMarks: 100,
        assignTo: 'all', // all | selected
        assignedUsers: [] // Array of student IDs
    });
    const [isCreating, setIsCreating] = useState(false);

    // Grading State
    const [gradeMarks, setGradeMarks] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [isGrading, setIsGrading] = useState(false);

    useEffect(() => {
        fetchAssignments();
    }, [course._id]);

    const fetchAssignments = async () => {
        setIsLoading(true);
        try {
            const res = await assignmentAPI.getByCourse(course._id);
            setAssignments(res.data.assignments || []);
        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await assignmentAPI.create({
                ...newAssignment,
                courseId: course._id,
            });
            await fetchAssignments();
            setIsCreateModalOpen(false);
            setNewAssignment({
                title: '',
                description: '',
                dueDate: '',
                totalMarks: 100,
                assignTo: 'all',
                assignedUsers: []
            });
            alert('Assignment created successfully!');
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Failed to create assignment');
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditAssignment = (assignment) => {
        setEditingAssignment({
            ...assignment,
            dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateAssignment = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await assignmentAPI.update(editingAssignment._id, editingAssignment);
            await fetchAssignments();
            setIsEditModalOpen(false);
            setEditingAssignment(null);
            alert('Assignment updated successfully!');
        } catch (error) {
            console.error('Error updating assignment:', error);
            alert('Failed to update assignment');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteAssignment = async (id) => {
        if (!confirm('Are you sure you want to delete this assignment? This will remove all student submissions as well.')) return;
        try {
            await assignmentAPI.delete(id);
            setAssignments(prev => prev.filter(a => a._id !== id));
            alert('Assignment deleted successfully');
        } catch (error) {
            console.error('Error deleting assignment:', error);
            alert('Failed to delete assignment');
        }
    };

    const handleViewSubmissions = (assignment) => {
        setSelectedAssignment(assignment);
        setIsSubmissionsModalOpen(true);
        setSelectedSubmission(null);
    };

    const handleGradeSubmission = async (e) => {
        e.preventDefault();
        submitAssignmentGrading('graded');
    };

    const handleRejectSubmission = async (submission = null) => {
        if (!confirm('Are you sure you want to reject this submission? The student will be notified to resubmit.')) return;
        submitAssignmentGrading('rejected', submission);
    };

    const submitAssignmentGrading = async (status, submissionOverride = null) => {
        const targetSubmission = submissionOverride || selectedSubmission;
        if (!selectedAssignment || !targetSubmission) return;

        setIsGrading(true);
        try {
            const res = await assignmentAPI.grade(
                selectedAssignment._id,
                targetSubmission._id,
                status === 'rejected' ? 0 : Number(gradeMarks),
                submissionOverride ? '' : gradeFeedback,
                status
            );

            // Update local state to reflect grade and feedback
            const updatedAssignments = assignments.map(a =>
                a._id === selectedAssignment._id ? res.data.assignment : a
            );
            setAssignments(updatedAssignments);

            // Update selected assignment to refresh the modal view
            setSelectedAssignment(res.data.assignment);
            setSelectedSubmission(null);
            setGradeMarks('');
            setGradeFeedback('');
            alert(`Submission ${status === 'rejected' ? 'rejected' : 'graded'} successfully!`);
        } catch (error) {
            console.error('Error grading:', error);
            alert(`Failed to ${status === 'rejected' ? 'reject' : 'grade'} submission`);
        } finally {
            setIsGrading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">Assignments</h3>
                <button
                    onClick={() => {
                        // Reset form state when opening modal to prevent focus issues
                        setNewAssignment({
                            title: '',
                            description: '',
                            dueDate: '',
                            totalMarks: 100,
                            assignTo: 'all',
                            assignedUsers: []
                        });
                        setAssignSearchTerm('');
                        setIsCreateModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#0D2818] hover:bg-[#1A5D3A] text-white rounded-xl font-medium transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Assignment
                </button>
            </div>

            {/* Student Filter - Improved Design */}
            <div className="relative">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Users className="w-3 h-3" />
                    Filter Assignments by Student
                </p>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[300px]">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl transition-all ${isDropdownOpen ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-gray-100 hover:border-gray-200'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-bold text-gray-700">
                                    {selectedStudentFilter === 'all'
                                        ? 'All Students (View All Assignments)'
                                        : students.find(s => s.id === selectedStudentFilter)?.name || 'Select Student'}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[60] overflow-hidden"
                            >
                                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search student name..."
                                            value={studentSearchTerm}
                                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500 transition-all font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    <button
                                        onClick={() => {
                                            setSelectedStudentFilter('all');
                                            setIsDropdownOpen(false);
                                            setStudentSearchTerm('');
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedStudentFilter === 'all'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        View All Assignments
                                        {selectedStudentFilter === 'all' && <Check className="w-4 h-4" />}
                                    </button>

                                    <div className="h-px bg-gray-50 my-1" />

                                    {students && students
                                        .filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                                        .map((student) => (
                                            <button
                                                key={student.id}
                                                onClick={() => {
                                                    setSelectedStudentFilter(student.id);
                                                    setIsDropdownOpen(false);
                                                    setStudentSearchTerm('');
                                                }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedStudentFilter === student.id
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {student.photo ? (
                                                        <img src={student.photo} alt={student.name} className="w-6 h-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700">
                                                            {student.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    {student.name}
                                                </div>
                                                {selectedStudentFilter === student.id && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}

                                    {students && students.filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())).length === 0 && (
                                        <div className="py-8 text-center text-xs text-gray-400 font-medium">
                                            No students found
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {selectedStudentFilter !== 'all' && (
                        <button
                            onClick={() => setSelectedStudentFilter('all')}
                            className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider flex items-center gap-1.5 px-3 py-2 bg-red-50 rounded-lg transition-colors"
                        >
                            <X className="w-3 h-3" />
                            Clear Filter
                        </button>
                    )}
                </div>

                {/* Overlay to close dropdown when clicking outside */}
                {isDropdownOpen && (
                    <div
                        className="fixed inset-0 z-[55]"
                        onClick={() => setIsDropdownOpen(false)}
                    />
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : (
                <div className="space-y-4">
                    {assignments
                        .filter(assignment => {
                            if (selectedStudentFilter === 'all') return true;
                            // Show if assigned to all OR specifically assigned to this student
                            return assignment.assignTo === 'all' ||
                                (assignment.assignedUsers && assignment.assignedUsers.includes(selectedStudentFilter));
                        })
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .map((assignment, index) => {
                            const submissionCount = assignment.submissions?.length || 0;
                            const gradedCount = assignment.submissions?.filter(s => s.marks !== undefined && s.marks !== null).length || 0;
                            const isFullyGraded = submissionCount > 0 && gradedCount === submissionCount;
                            const isOverdue = new Date(assignment.dueDate) < new Date();

                            return (
                                <motion.div
                                    key={assignment._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all ${isFullyGraded ? 'opacity-50 grayscale-[0.5]' : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xs font-black text-gray-300 tracking-tighter uppercase whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">ASGN #{index + 1}</span>
                                                <h4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{assignment.title}</h4>
                                                <div className="flex gap-2">
                                                    <Badge variant="info">ASSIGNED</Badge>
                                                    {isOverdue && <Badge variant="error font-black uppercase">Expired</Badge>}
                                                    {isFullyGraded && <Badge variant="success">ALL GRADED</Badge>}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium">{assignment.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Submissions</p>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xl font-black text-emerald-600">{submissionCount}</span>
                                                <span className="text-sm text-gray-400">/</span>
                                                <span className="text-xl font-black text-red-500">{assignment.assignTo === 'all' ? (students?.length || '?') : (assignment.assignedUsers?.length || 0)}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditAssignment(assignment)}
                                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                title="Edit Assignment"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAssignment(assignment._id)}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Delete Assignment"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 text-xs font-bold text-gray-500 uppercase">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                            </div>
                                            {gradedCount < submissionCount && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-lg border border-amber-100 text-[10px] font-black text-amber-600 uppercase">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {submissionCount - gradedCount} Pending Marks
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleViewSubmissions(assignment)}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                        >
                                            {isFullyGraded ? 'REVIEW GRADES' : 'GRADE SUBMISSIONS'}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}

                    {assignments.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            No assignments created yet.
                        </div>
                    )}
                </div>
            )}

            {/* Create Assignment Modal */}
            <Modal
                key={isCreateModalOpen ? 'create-modal-open' : 'create-modal-closed'}
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Assignment"
            >
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={newAssignment.title}
                            onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={newAssignment.description}
                            onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                            rows="3"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={newAssignment.dueDate}
                                onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                            <input
                                type="number"
                                value={newAssignment.totalMarks}
                                onChange={(e) => setNewAssignment({ ...newAssignment, totalMarks: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                required
                            />
                        </div>
                    </div>

                    {/* Assign To Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="assignTo"
                                    checked={newAssignment.assignTo === 'all'}
                                    onChange={() => setNewAssignment({ ...newAssignment, assignTo: 'all', assignedUsers: [] })}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-600">All Students</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="assignTo"
                                    checked={newAssignment.assignTo === 'selected'}
                                    onChange={() => setNewAssignment({ ...newAssignment, assignTo: 'selected' })}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-600">Selected Students</span>
                            </label>
                        </div>

                        {newAssignment.assignTo === 'selected' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Search & Controls */}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or reg no..."
                                            value={assignSearchTerm}
                                            onChange={(e) => setAssignSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const searchTerm = assignSearchTerm.toLowerCase();
                                            const visibleStudents = students.filter(s =>
                                            (s.name?.toLowerCase().includes(searchTerm) ||
                                                s.rollNo?.toLowerCase().includes(searchTerm))
                                            );
                                            // Add visible students to selection if not already selected
                                            const newSelection = new Set(newAssignment.assignedUsers || []);
                                            visibleStudents.forEach(s => newSelection.add(s.id || s._id));
                                            setNewAssignment({ ...newAssignment, assignedUsers: Array.from(newSelection) });
                                        }}
                                        className="px-3 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAssignment({ ...newAssignment, assignedUsers: [] })}
                                        className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {/* List */}
                                <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white shadow-inner">
                                    {students?.filter(s =>
                                        s.name?.toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
                                        s.rollNo?.toLowerCase().includes(assignSearchTerm.toLowerCase())
                                    ).map(student => (
                                        <label key={student.id || student._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={newAssignment.assignedUsers?.includes(student.id || student._id)}
                                                onChange={(e) => {
                                                    const sId = student.id || student._id;
                                                    const current = newAssignment.assignedUsers || [];
                                                    if (e.target.checked) {
                                                        setNewAssignment({ ...newAssignment, assignedUsers: [...current, sId] });
                                                    } else {
                                                        setNewAssignment({ ...newAssignment, assignedUsers: current.filter(id => id !== sId) });
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                            />
                                            <div className="flex-1 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {student.photo ? (
                                                        <img src={student.photo} alt={student.name} className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                                            {student.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                                        <p className="text-xs text-gray-400">{student.rollNo}</p>
                                                    </div>
                                                </div>
                                                {newAssignment.assignedUsers?.includes(student.id || student._id) && (
                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                    {students?.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-4">No students enrolled</p>
                                    )}
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs text-gray-400">
                                        {students?.length} total students
                                    </span>
                                    <span className="text-xs font-bold text-emerald-600">
                                        {newAssignment.assignedUsers?.length || 0} selected
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create Assignment
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Assignment Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Assignment"
            >
                {editingAssignment && (
                    <form onSubmit={handleUpdateAssignment} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={editingAssignment.title}
                                onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={editingAssignment.description}
                                onChange={(e) => setEditingAssignment({ ...editingAssignment, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                rows="3"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={editingAssignment.dueDate}
                                    onChange={(e) => setEditingAssignment({ ...editingAssignment, dueDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                                <input
                                    type="number"
                                    value={editingAssignment.totalMarks}
                                    onChange={(e) => setEditingAssignment({ ...editingAssignment, totalMarks: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Submissions Modal */}
            <Modal
                isOpen={isSubmissionsModalOpen}
                onClose={() => setIsSubmissionsModalOpen(false)}
                title={`Submissions: ${selectedAssignment?.title}`}
                size="xl"
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {selectedAssignment?.submissions && selectedAssignment.submissions.length > 0 ? (
                        selectedAssignment.submissions.map((submission) => (
                            <div key={submission._id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        {submission.user?.photo ? (
                                            <img src={submission.user.photo} alt={submission.user?.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                                                {submission.user?.name?.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900 text-sm">{submission.user?.name}</p>
                                                {submission.user?.rollNo && (
                                                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                                                        {submission.user?.rollNo}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {new Date(submission.submittedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {submission.status === 'graded' ? (
                                        <div className="text-right">
                                            <Badge variant="success">Graded</Badge>
                                            <p className="text-lg font-bold text-emerald-600 mt-1">{submission.marks}<span className="text-xs text-emerald-400">/{selectedAssignment.totalMarks}</span></p>
                                        </div>
                                    ) : submission.status === 'rejected' ? (
                                        <Badge variant="error">Rejected</Badge>
                                    ) : (
                                        <Badge variant="warning">Pending Grade</Badge>
                                    )}
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-100">
                                        <p className="font-black text-gray-400 text-[10px] uppercase mb-1 tracking-widest">Student Notes</p>
                                        <p className="italic font-medium text-gray-700">{submission.notes || 'No notes provided'}</p>
                                    </div>

                                    {submission.fileUrl && (
                                        <a
                                            href={submission.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100 transition-colors"
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            VIEW ATTACHED FILE
                                        </a>
                                    )}

                                    {submission.feedback && (
                                        <div className="text-sm text-blue-700 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                            <p className="font-black text-blue-500 text-[10px] uppercase mb-1 tracking-widest">Feedback Given</p>
                                            <p className="italic font-medium">{submission.feedback}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                    {selectedSubmission?._id === submission._id ? (
                                        <form onSubmit={handleGradeSubmission} className="space-y-3">
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Obtained Marks</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={gradeMarks}
                                                            onChange={(e) => setGradeMarks(e.target.value)}
                                                            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                                                            max={selectedAssignment.totalMarks}
                                                            required
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">/ {selectedAssignment.totalMarks}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Teacher Feedback</label>
                                                <textarea
                                                    placeholder="Enter feedback for the student..."
                                                    value={gradeFeedback}
                                                    onChange={(e) => setGradeFeedback(e.target.value)}
                                                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none font-medium"
                                                    rows="2"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={isGrading}
                                                    className="flex-1 py-2 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all font-bold"
                                                >
                                                    {isGrading ? 'SAVING...' : 'SAVE GRADE'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRejectSubmission()}
                                                    disabled={isGrading}
                                                    className="px-6 py-2 bg-red-100 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-200 transition-all font-bold"
                                                >
                                                    {isGrading ? '...' : 'REJECT'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSubmission(null);
                                                        setGradeMarks('');
                                                        setGradeFeedback('');
                                                    }}
                                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedSubmission(submission);
                                                    setGradeMarks(submission.marks || '');
                                                    setGradeFeedback(submission.feedback || '');
                                                }}
                                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95"
                                            >
                                                {submission.marks ? 'EDIT GRADE' : 'GRADE SUBMISSION'}
                                            </button>
                                            {(submission.status === 'submitted' || !submission.status) && (
                                                <button
                                                    onClick={() => handleRejectSubmission(submission)}
                                                    disabled={isGrading}
                                                    className="px-6 py-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    REJECT
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">No submissions yet.</p>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default AssignmentsTab;
