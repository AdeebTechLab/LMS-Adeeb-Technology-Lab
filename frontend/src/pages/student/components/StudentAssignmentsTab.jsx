import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, Upload, CheckCircle, Clock, Loader2, Link as LinkIcon, X } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import { assignmentAPI } from '../../../services/api';
import Modal from '../../../components/ui/Modal';
import { useSelector } from 'react-redux';

const StudentAssignmentsTab = ({ course }) => {
    const { user } = useSelector(state => state.auth);
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    // Submission Form
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleOpenSubmit = (assignment) => {
        setSelectedAssignment(assignment);
        setIsSubmitModalOpen(true);
        setNotes('');
        setFile(null);
    };

    const getMySubmission = (assignment) => {
        return assignment.submissions?.find(s => s.user?._id === user?._id || s.user === user?._id);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('notes', notes);
            if (file) {
                formData.append('file', file);
            }

            await assignmentAPI.submit(selectedAssignment._id, formData);

            // Refresh assignments to show updated status
            await fetchAssignments();

            setIsSubmitModalOpen(false);
        } catch (error) {
            console.error('Error submitting:', error);
            alert(error.response?.data?.message || 'Failed to submit assignment');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">My Assignments</h3>

            <div className="space-y-4">
                {assignments.map((assignment) => {
                    const submission = getMySubmission(assignment);
                    const isSubmitted = !!submission;
                    const isGraded = submission && submission.marks !== undefined;
                    const isOverdue = new Date(assignment.dueDate) < new Date() && !isSubmitted;

                    return (
                        <motion.div
                            key={assignment._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                        >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                                        <Badge variant={isGraded ? 'success' : isSubmitted ? 'info' : isOverdue ? 'error' : 'warning'}>
                                            {isGraded ? 'Graded' : isSubmitted ? 'Submitted' : isOverdue ? 'Missed' : 'Pending'}
                                        </Badge>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-4 whitespace-pre-wrap">{assignment.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                        </span>
                                        {assignment.totalMarks && (
                                            <span className="font-semibold">
                                                Total Marks: {assignment.totalMarks}
                                            </span>
                                        )}
                                    </div>

                                    {isGraded && (
                                        <div className="mt-4 bg-emerald-50 p-3 rounded-xl border border-emerald-100 inline-block">
                                            <p className="text-sm font-bold text-emerald-700">
                                                Obtained Marks: {submission.marks} / {assignment.totalMarks}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {isSubmitted ? (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
                                            </span>
                                            {submission.fileUrl && (
                                                <a
                                                    href={submission.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    View Submission
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleOpenSubmit(assignment)}
                                            disabled={isOverdue}
                                            className={`px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm text-white ${isOverdue ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                                                }`}
                                        >
                                            <Upload className="w-4 h-4" />
                                            Submit Work
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {assignments.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No assignments assigned to this course.
                    </div>
                )}
            </div>

            {/* Submit Modal */}
            <Modal
                isOpen={isSubmitModalOpen}
                onClose={() => setIsSubmitModalOpen(false)}
                title={`Submit: ${selectedAssignment?.title}`}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Submission Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                            rows="4"
                            placeholder="Add any comments..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Attach File (Optional)</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="flex items-center justify-center gap-2 text-emerald-600">
                                    <FileText className="w-5 h-5" />
                                    <span className="text-sm font-medium">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setFile(null);
                                        }}
                                        className="p-1 hover:bg-red-100 rounded-full text-red-500 z-10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                                    <p className="text-sm text-gray-500">Click to upload file</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsSubmitModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Submit
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StudentAssignmentsTab;
