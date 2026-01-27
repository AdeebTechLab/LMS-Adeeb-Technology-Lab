import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Calendar, MoreHorizontal, Users, Loader2, CheckCircle, Clock, X, Upload } from 'lucide-react';
import api, { assignmentAPI } from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';

const AssignmentsTab = ({ course, students }) => { // Accept students prop
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);

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
        } catch (error) {
            console.error('Error creating assignment:', error);
            alert('Failed to create assignment');
        } finally {
            setIsCreating(false);
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

    const handleRejectSubmission = async () => {
        if (!confirm('Are you sure you want to reject this submission? The student will be notified to resubmit.')) return;
        submitAssignmentGrading('rejected');
    };

    const submitAssignmentGrading = async (status) => {
        if (!selectedAssignment || !selectedSubmission) return;

        setIsGrading(true);
        try {
            const res = await assignmentAPI.grade(
                selectedAssignment._id,
                selectedSubmission._id,
                status === 'rejected' ? 0 : Number(gradeMarks),
                gradeFeedback,
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
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-[#0D2818] hover:bg-[#1A5D3A] text-white rounded-xl font-medium transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Assignment
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : (
                <div className="space-y-4">
                    {assignments
                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
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
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-black text-gray-900">{gradedCount}<span className="text-sm text-gray-400">/{submissionCount}</span></span>
                                            </div>
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
                            <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                                {students && students.length > 0 ? (
                                    students.map(student => (
                                        <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newAssignment.assignedUsers?.includes(student.id)}
                                                onChange={(e) => {
                                                    const current = newAssignment.assignedUsers || [];
                                                    if (e.target.checked) {
                                                        setNewAssignment({ ...newAssignment, assignedUsers: [...current, student.id] });
                                                    } else {
                                                        setNewAssignment({ ...newAssignment, assignedUsers: current.filter(id => id !== student.id) });
                                                    }
                                                }}
                                                className="rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {student.name?.charAt(0)}
                                                </div>
                                                <span className="text-sm text-gray-700">{student.name}</span>
                                                <span className="text-xs text-gray-400">({student.rollNo})</span>
                                            </div>
                                        </label>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 text-center py-2">No students enrolled</p>
                                )}
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
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                                            {submission.user?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{submission.user?.name}</p>
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
                                                    onClick={handleRejectSubmission}
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
                                        <button
                                            onClick={() => {
                                                setSelectedSubmission(submission);
                                                setGradeMarks(submission.marks || '');
                                                setGradeFeedback(submission.feedback || '');
                                            }}
                                            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                        >
                                            {submission.marks ? 'EDIT GRADE & FEEDBACK' : 'GRADE SUBMISSION'}
                                        </button>
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
