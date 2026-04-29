import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Plus, Trash2, Clock, CheckCircle, FileText,
    ChevronRight, Loader2, Upload, AlertCircle, Eye, Users,
    Type, Clipboard, List, X, Search, Edit2, RefreshCw, MoreHorizontal
} from 'lucide-react';
import { testAPI } from '../../../services/api';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';

const TestsTab = ({ course, students }) => {
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Generation states
    const [isGenerating, setIsGenerating] = useState(false);
    const [inputMethod, setInputMethod] = useState('paste'); // 'file' | 'paste' | 'manual'
    const [pasteText, setPasteText] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        duration: 30,
        dueDate: '',
        scheduledAt: '',
        assignTo: 'all',
        assignedUsers: [],
        questions: []
    });

    const [editingTest, setEditingTest] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [assignSearchTerm, setAssignSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Filter states
    const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    useEffect(() => {
        fetchTests();
    }, [course._id || course.id]);

    const fetchTests = async () => {
        setIsLoading(true);
        try {
            const res = await testAPI.getByCourse(course._id || course.id);
            setTests(res.data.tests || []);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTest = async (e) => {
        e.preventDefault();
        if (formData.questions.length === 0) {
            alert("Please add at least one question.");
            return;
        }

        setIsSaving(true);
        try {
            await testAPI.create({
                ...formData,
                courseId: course._id || course.id
            });
            await fetchTests();
            setIsCreateModalOpen(false);
            resetForm();
            alert('Test published successfully!');
        } catch (error) {
            console.error('Error creating test:', error);
            alert(error.response?.data?.message || 'Failed to create test');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateTest = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await testAPI.update(editingTest._id, editingTest);
            await fetchTests();
            setIsEditModalOpen(false);
            setEditingTest(null);
            alert('Test updated successfully!');
        } catch (error) {
            console.error('Error updating test:', error);
            alert('Failed to update test');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTest = async (id) => {
        if (!confirm('Are you sure you want to delete this test? This cannot be undone.')) return;
        try {
            await testAPI.delete(id);
            setTests(prev => prev.filter(t => t._id !== id));
            alert('Test deleted successfully');
        } catch (error) {
            console.error('Error deleting test:', error);
            alert('Failed to delete test');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            duration: 30,
            dueDate: '',
            scheduledAt: '',
            assignTo: 'all',
            assignedUsers: [],
            questions: []
        });
        setPasteText('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsGenerating(true);
        // Simulate parsing the entire file and detecting all questions
        setTimeout(() => {
            const detectedCount = Math.floor(Math.random() * 5) + 5; // Simulate finding 5-10 questions
            const generatedQuestions = Array.from({ length: detectedCount }, (_, i) => ({
                question: `[Auto-Parsed] Question ${i + 1} from ${file.name.split('.')[0]} content...`,
                options: ["Option A", "Option B", "Option C", "Option D"],
                correctOption: 0,
                marks: 1
            }));

            if (isEditModalOpen && editingTest) {
                setEditingTest(prev => ({
                    ...prev,
                    questions: [...(prev.questions || []), ...generatedQuestions]
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    questions: [...prev.questions, ...generatedQuestions]
                }));
            }

            setIsGenerating(false);
            e.target.value = '';
            alert(`Successfully detected and added ${detectedCount} questions from ${file.name}`);
        }, 2000);
    };

    // Auto-parse paste text with debounce
    useEffect(() => {
        if (!pasteText.trim()) return;

        const timer = setTimeout(() => {
            handleParsePaste();
        }, 800); // Wait for 800ms after user stops pasting/typing

        return () => clearTimeout(timer);
    }, [pasteText]);

    const handleParsePaste = () => {
        if (!pasteText.trim()) return;
        setIsGenerating(true);

        setTimeout(() => {
            try {
                const questions = [];
                const rawBlocks = pasteText.split(/(?=Q[:.])/g);

                rawBlocks.forEach(block => {
                    if (!block.trim()) return;
                    const qMatch = block.match(/Q[:.]\s*(.*?)(?=[A-D][)|.])/s);
                    const questionText = qMatch ? qMatch[1].trim() : block.split('\n')[0].replace(/Q[:.]\s*/, '').trim();

                    const options = [];
                    const aMatch = block.match(/A[)|.]\s*(.*)/);
                    const bMatch = block.match(/B[)|.]\s*(.*)/);
                    const cMatch = block.match(/C[)|.]\s*(.*)/);
                    const dMatch = block.match(/D[)|.]\s*(.*)/);

                    if (aMatch) options.push(aMatch[1].split('\n')[0].trim());
                    if (bMatch) options.push(bMatch[1].split('\n')[0].trim());
                    if (cMatch) options.push(cMatch[1].split('\n')[0].trim());
                    if (dMatch) options.push(dMatch[1].split('\n')[0].trim());

                    if (options.length >= 2) {
                        questions.push({
                            question: questionText,
                            options: options,
                            correctOption: 0,
                            marks: 1
                        });
                    }
                });

                if (questions.length > 0) {
                    if (isEditModalOpen && editingTest) {
                        setEditingTest(prev => ({
                            ...prev,
                            questions: [...(prev.questions || []), ...questions]
                        }));
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            questions: [...prev.questions, ...questions]
                        }));
                    }
                    setPasteText('');
                } else {
                    alert("No valid questions found in the text. Format: Q. Question? A) Option 1 B) Option 2...");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsGenerating(false);
            }
        }, 1000);
    };

    const removeQuestion = (idx) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== idx)
        }));
    };

    const toggleStudentSelection = (studentId) => {
        setFormData(prev => {
            const isSelected = prev.assignedUsers.includes(studentId);
            return {
                ...prev,
                assignedUsers: isSelected
                    ? prev.assignedUsers.filter(id => id !== studentId)
                    : [...prev.assignedUsers, studentId]
            };
        });
    };

    const filteredTests = tests.filter(test => {
        const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStudent = selectedStudentFilter === 'all' ||
            test.assignTo === 'all' ||
            (test.assignedUsers && test.assignedUsers.includes(selectedStudentFilter));

        return matchesSearch && matchesStudent;
    });

    const selectedStudent = students?.find(s => s.id === selectedStudentFilter || s._id === selectedStudentFilter);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 space-y-6">
                <img src="/loading.gif" alt="Loading" className="w-32 h-32 object-contain" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs animate-pulse">Loading Tests...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header - Matching Assignments Style */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-50 rounded-2xl">
                            <Zap className="w-6 h-6 text-[#ff8e01]" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase">Tests & Exams</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Manage your MCQs and assessments</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchTests}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-500 hover:text-[#ff8e01] hover:bg-orange-50 rounded-xl transition-all group font-black text-[10px] uppercase tracking-widest"
                            title="Refresh Tests"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#ff8e01]' : 'group-active:rotate-180 transition-transform duration-500'}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            New Test
                        </button>
                    </div>
                </div>

                {/* Student Filter Section */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <Users className="w-4 h-4 text-[#ff8e01]" />
                            {selectedStudentFilter === 'all' ? 'Filter by Student' : `Student: ${selectedStudent?.name}`}
                            <ChevronRight className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] overflow-hidden"
                                >
                                    <div className="p-3 border-b border-gray-50">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search student..."
                                                value={studentSearchTerm}
                                                onChange={(e) => setStudentSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-[#ff8e01]/20"
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
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStudentFilter === 'all'
                                                ? 'bg-orange-50 text-[#ff8e01]'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            View All Tests
                                            {selectedStudentFilter === 'all' && <CheckCircle className="w-3.5 h-3.5" />}
                                        </button>

                                        <div className="h-px bg-gray-50 my-1" />

                                        {students?.filter(s => s.name?.toLowerCase().includes(studentSearchTerm.toLowerCase())).map((student) => (
                                            <button
                                                key={student.id || student._id}
                                                onClick={() => {
                                                    setSelectedStudentFilter(student.id || student._id);
                                                    setIsDropdownOpen(false);
                                                    setStudentSearchTerm('');
                                                }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStudentFilter === (student.id || student._id)
                                                    ? 'bg-orange-50 text-[#ff8e01]'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {student.photo ? (
                                                        <img src={student.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[8px] text-[#ff8e01]">
                                                            {student.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span className="truncate max-w-[140px]">{student.name}</span>
                                                </div>
                                                {selectedStudentFilter === (student.id || student._id) && <CheckCircle className="w-3.5 h-3.5" />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {selectedStudentFilter !== 'all' && (
                        <button
                            onClick={() => setSelectedStudentFilter('all')}
                            className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1.5 px-3 py-2 bg-red-50 rounded-lg transition-colors"
                        >
                            <X className="w-3 h-3" />
                            Clear Filter
                        </button>
                    )}
                </div>

                {/* Overlay to close dropdown */}
                {isDropdownOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsDropdownOpen(false)} />}
            </div>

            {/* Test Cards Grid */}
            {filteredTests.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                    <div className="p-6 bg-gray-50 rounded-full mb-6">
                        <Zap className="w-12 h-12 text-gray-300" />
                    </div>
                    <h4 className="text-xl font-black text-gray-900 uppercase mb-2">No Tests Found</h4>
                    <p className="text-gray-400 font-medium max-w-sm">Create your first test to start assessing your students. You can use AI to generate questions from files or text.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTests.map((test) => (
                        <motion.div
                            key={test._id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-100/20 transition-all group"
                        >
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-orange-50 rounded-2xl group-hover:bg-[#ff8e01] group-hover:text-white transition-colors">
                                        <FileText className="w-6 h-6 text-[#ff8e01] group-hover:text-white" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setEditingTest(test);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="p-2 hover:bg-gray-100 text-gray-400 hover:text-slate-900 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTest(test._id)}
                                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-lg font-black text-gray-900 uppercase leading-tight mb-1">{test.title}</h4>
                                    <p className="text-xs text-gray-500 font-medium line-clamp-2">{test.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-[#ff8e01]" />
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{test.duration} Mins</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <List className="w-4 h-4 text-[#ff8e01]" />
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{test.questions?.length} MCQs</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Recent Submissions</span>
                                        <div className="flex items-center">
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {test.submissions?.slice(0, 4).map((sub, i) => (
                                                    <div key={i} className="inline-block h-7 w-7 rounded-full ring-2 ring-white overflow-hidden bg-orange-100">
                                                        {sub.user?.photo ? (
                                                            <img src={sub.user.photo} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-[8px] font-black text-orange-400">
                                                                {sub.user?.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {test.submissions?.length > 4 && (
                                                    <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                                                        +{test.submissions.length - 4}
                                                    </div>
                                                )}
                                                {(!test.submissions || test.submissions.length === 0) && (
                                                    <span className="text-[10px] font-bold text-gray-300 italic">No submissions yet</span>
                                                )}
                                            </div>
                                            {test.submissions?.length > 0 && (
                                                <span className="ml-3 text-[10px] font-black text-slate-900 uppercase tracking-tight">
                                                    {test.submissions.length} Total
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedTest(test);
                                            setIsViewModalOpen(true);
                                        }}
                                        className="p-3 bg-slate-50 hover:bg-slate-900 text-slate-400 hover:text-white rounded-2xl transition-all shadow-sm group/btn"
                                    >
                                        <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Test Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Test"
                size="xl"
            >
                <div className="space-y-8 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Type className="w-4 h-4 text-[#ff8e01]" /> Basic Details
                            </h4>
                            <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Test Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm"
                                        placeholder="Enter test title..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm resize-none"
                                        placeholder="Briefly describe this test..."
                                        rows="2"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Duration (Mins)</label>
                                        <input
                                            type="number"
                                            value={formData.duration}
                                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Due Date</label>
                                        <input
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Publish At (Scheduled)</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.scheduledAt}
                                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm"
                                    />
                                    <p className="text-[9px] text-gray-400 mt-1 font-bold italic uppercase">Leave empty to publish immediately</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#ff8e01]" /> Assign To
                            </h4>
                            <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="assignTo"
                                                checked={formData.assignTo === 'all'}
                                                onChange={() => setFormData({ ...formData, assignTo: 'all', assignedUsers: [] })}
                                                className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-orange-500 transition-all cursor-pointer"
                                            />
                                            {formData.assignTo === 'all' && <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${formData.assignTo === 'all' ? 'text-[#ff8e01]' : 'text-gray-400'}`}>All Students</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="assignTo"
                                                checked={formData.assignTo === 'selected'}
                                                onChange={() => setFormData({ ...formData, assignTo: 'selected' })}
                                                className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-orange-500 transition-all cursor-pointer"
                                            />
                                            {formData.assignTo === 'selected' && <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                                        </div>
                                        <span className={`text-xs font-black uppercase tracking-widest transition-colors ${formData.assignTo === 'selected' ? 'text-[#ff8e01]' : 'text-gray-400'}`}>Selected</span>
                                    </label>
                                </div>

                                {formData.assignTo === 'selected' && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search student..."
                                                value={assignSearchTerm}
                                                onChange={(e) => setAssignSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-orange-500"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                            {students?.filter(s => s.name?.toLowerCase().includes(assignSearchTerm.toLowerCase())).map(student => (
                                                <button
                                                    key={student.id || student._id}
                                                    type="button"
                                                    onClick={() => toggleStudentSelection(student.id || student._id)}
                                                    className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${formData.assignedUsers.includes(student.id || student._id) ? 'bg-orange-50 border-orange-200 text-[#ff8e01]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                                >
                                                    <div className="relative shrink-0">
                                                        {student.photo ? (
                                                            <img src={student.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[8px] text-[#ff8e01] font-black uppercase">
                                                                {student.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-black truncate flex-1 text-left uppercase tracking-tighter">{student.name}</span>
                                                    {formData.assignedUsers.includes(student.id || student._id) && <CheckCircle className="w-3.5 h-3.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-4 h-4 text-[#ff8e01]" /> Question Generator
                            </h4>
                            {/* ... Question generator UI ... */}
                            <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />

                                <div className="flex gap-2 p-1 bg-white/10 rounded-xl">
                                    <button
                                        onClick={() => setInputMethod('paste')}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'paste' ? 'bg-white text-slate-900 shadow-lg' : 'hover:bg-white/5'}`}
                                    >Paste Text</button>
                                    <button
                                        onClick={() => setInputMethod('file')}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'file' ? 'bg-white text-slate-900 shadow-lg' : 'hover:bg-white/5'}`}
                                    >Upload File</button>
                                </div>

                                {inputMethod === 'paste' ? (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <textarea
                                                value={pasteText}
                                                onChange={(e) => setPasteText(e.target.value)}
                                                placeholder="Paste book text, paragraphs, or MCQs here..."
                                                className="w-full h-40 bg-white/10 border border-white/20 rounded-2xl p-4 text-xs font-medium outline-none focus:border-[#ff8e01] placeholder:text-white/30 resize-none"
                                            />
                                            {isGenerating && (
                                                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-300">
                                                    <img src="/loading.gif" className="w-12 h-12 brightness-0 invert" alt="loading" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Auto-Parsing...</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Auto-detect enabled: Just paste to begin</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group">
                                            <div className="p-4 bg-white/5 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-[#ff8e01]" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-white/70 tracking-widest">Upload PDF / DOC / TXT</span>
                                            <p className="text-[8px] text-white/30 uppercase mt-1">AI will auto-detect all questions</p>
                                            <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    {formData.questions.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <List className="w-4 h-4 text-[#ff8e01]" /> Questions ({formData.questions.length})
                                </h4>
                                <button
                                    onClick={() => setFormData({ ...formData, questions: [] })}
                                    className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                >Clear All</button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {formData.questions.map((q, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group relative">
                                        <button
                                            onClick={() => removeQuestion(idx)}
                                            className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="flex gap-4">
                                            <span className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff8e01] flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</span>
                                            <div className="space-y-4 flex-1">
                                                <p className="font-bold text-gray-800 leading-relaxed">{q.question}</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold ${oIdx === q.correctOption ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${oIdx === q.correctOption ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                                {String.fromCharCode(65 + oIdx)}
                                                            </div>
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-6 py-2.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl"
                        >Cancel</button>
                        <button
                            onClick={handleCreateTest}
                            disabled={isSaving || formData.questions.length === 0}
                            className="px-8 py-2.5 bg-[#ff8e01] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#e67e01] shadow-lg shadow-orange-100 flex items-center gap-2"
                        >
                            {isSaving ? <img src="/loading.gif" className="w-5 h-5 brightness-0 invert" alt="loading" /> : <CheckCircle className="w-4 h-4" />}
                            Publish Test
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Test Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingTest(null);
                }}
                title={editingTest ? `Edit Test: ${editingTest.title}` : "Edit Test"}
                size="xl"
            >
                {editingTest && (
                    <div className="space-y-8 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Type className="w-4 h-4 text-[#ff8e01]" /> Basic Details
                                </h4>
                                <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Test Title</label>
                                        <input
                                            type="text"
                                            value={editingTest.title}
                                            onChange={(e) => setEditingTest({ ...editingTest, title: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Description</label>
                                        <textarea
                                            value={editingTest.description}
                                            onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm resize-none"
                                            rows="2"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Duration (Mins)</label>
                                            <input
                                                type="number"
                                                value={editingTest.duration}
                                                onChange={(e) => setEditingTest({ ...editingTest, duration: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Due Date</label>
                                            <input
                                                type="date"
                                                value={editingTest.dueDate ? new Date(editingTest.dueDate).toISOString().split('T')[0] : ''}
                                                onChange={(e) => setEditingTest({ ...editingTest, dueDate: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Publish At (Scheduled)</label>
                                        <input
                                            type="datetime-local"
                                            value={editingTest.scheduledAt ? new Date(editingTest.scheduledAt).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => setEditingTest({ ...editingTest, scheduledAt: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border-2 border-white rounded-2xl outline-none focus:border-orange-500 shadow-sm font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[#ff8e01]" /> Assign To
                                </h4>
                                <div className="space-y-4 bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="editAssignTo"
                                                    checked={editingTest.assignTo === 'all'}
                                                    onChange={() => setEditingTest({ ...editingTest, assignTo: 'all', assignedUsers: [] })}
                                                    className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-orange-500 transition-all cursor-pointer"
                                                />
                                                {editingTest.assignTo === 'all' && <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                                            </div>
                                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${editingTest.assignTo === 'all' ? 'text-[#ff8e01]' : 'text-gray-400'}`}>All Students</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="editAssignTo"
                                                    checked={editingTest.assignTo === 'selected'}
                                                    onChange={() => setEditingTest({ ...editingTest, assignTo: 'selected' })}
                                                    className="w-5 h-5 appearance-none border-2 border-gray-200 rounded-full checked:border-orange-500 transition-all cursor-pointer"
                                                />
                                                {editingTest.assignTo === 'selected' && <div className="absolute w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                                            </div>
                                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${editingTest.assignTo === 'selected' ? 'text-[#ff8e01]' : 'text-gray-400'}`}>Selected</span>
                                        </label>
                                    </div>

                                    {editingTest.assignTo === 'selected' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search student..."
                                                    value={assignSearchTerm}
                                                    onChange={(e) => setAssignSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-orange-500"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                                {students?.filter(s => s.name?.toLowerCase().includes(assignSearchTerm.toLowerCase())).map(student => (
                                                    <button
                                                        key={student.id || student._id}
                                                        type="button"
                                                        onClick={() => {
                                                            const sId = student.id || student._id;
                                                            const current = editingTest.assignedUsers || [];
                                                            const newUsers = current.includes(sId) ? current.filter(id => id !== sId) : [...current, sId];
                                                            setEditingTest({ ...editingTest, assignedUsers: newUsers });
                                                        }}
                                                        className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${editingTest.assignedUsers?.includes(student.id || student._id) ? 'bg-orange-50 border-orange-200 text-[#ff8e01]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                                    >
                                                        <div className="relative shrink-0">
                                                            {student.photo ? (
                                                                <img src={student.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[8px] text-[#ff8e01] font-black uppercase">
                                                                    {student.name?.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-black truncate text-left flex-1 uppercase tracking-tighter">{student.name}</span>
                                                        {editingTest.assignedUsers?.includes(student.id || student._id) && <CheckCircle className="w-3.5 h-3.5" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-[#ff8e01]" /> Question Generator
                                </h4>
                                <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-4 relative overflow-hidden">
                                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
                                    
                                    <div className="flex gap-2 p-1 bg-white/10 rounded-xl">
                                        <button 
                                            type="button"
                                            onClick={() => setInputMethod('paste')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'paste' ? 'bg-white text-slate-900 shadow-lg' : 'hover:bg-white/5'}`}
                                        >Paste Text</button>
                                        <button 
                                            type="button"
                                            onClick={() => setInputMethod('file')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputMethod === 'file' ? 'bg-white text-slate-900 shadow-lg' : 'hover:bg-white/5'}`}
                                        >Upload File</button>
                                    </div>

                                    {inputMethod === 'paste' ? (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <textarea
                                                    value={pasteText}
                                                    onChange={(e) => setPasteText(e.target.value)}
                                                    placeholder="Paste book text, paragraphs, or MCQs here..."
                                                    className="w-full h-40 bg-white/10 border border-white/20 rounded-2xl p-4 text-xs font-medium outline-none focus:border-[#ff8e01] placeholder:text-white/30 resize-none"
                                                />
                                                {isGenerating && (
                                                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-300">
                                                        <img src="/loading.gif" className="w-12 h-12 brightness-0 invert" alt="loading" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Auto-Parsing...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 px-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Auto-detect enabled: Just paste to begin</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group">
                                                <div className="p-4 bg-white/5 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                    <Upload className="w-8 h-8 text-[#ff8e01]" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-white/70 tracking-widest">Upload PDF / DOC / TXT</span>
                                                <p className="text-[8px] text-white/30 uppercase mt-1">AI will auto-detect all questions</p>
                                                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Questions List for Editing */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                    <List className="w-4 h-4 text-[#ff8e01]" /> Test Questions ({editingTest.questions?.length || 0})
                                </h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const newQuestion = {
                                                question: "New MCQ Question?",
                                                options: ["Option A", "Option B", "Option C", "Option D"],
                                                correctOption: 0,
                                                marks: 5
                                            };
                                            setEditingTest({
                                                ...editingTest,
                                                questions: [...(editingTest.questions || []), newQuestion]
                                            });
                                        }}
                                        className="text-[10px] font-black text-[#ff8e01] uppercase tracking-widest hover:underline px-3 py-1 bg-orange-50 rounded-lg"
                                    >+ Add Question</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {editingTest.questions?.map((q, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group relative">
                                        <button
                                            onClick={() => {
                                                const updatedQuestions = editingTest.questions.filter((_, i) => i !== idx);
                                                setEditingTest({ ...editingTest, questions: updatedQuestions });
                                            }}
                                            className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="flex gap-4">
                                            <span className="w-8 h-8 rounded-xl bg-orange-50 text-[#ff8e01] flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</span>
                                            <div className="space-y-4 flex-1">
                                                <input
                                                    type="text"
                                                    value={q.question}
                                                    onChange={(e) => {
                                                        const updatedQuestions = [...editingTest.questions];
                                                        updatedQuestions[idx].question = e.target.value;
                                                        setEditingTest({ ...editingTest, questions: updatedQuestions });
                                                    }}
                                                    className="w-full font-bold text-gray-800 leading-relaxed bg-transparent border-b border-dashed border-gray-200 outline-none focus:border-[#ff8e01]"
                                                />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold ${oIdx === q.correctOption ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updatedQuestions = [...editingTest.questions];
                                                                    updatedQuestions[idx].correctOption = oIdx;
                                                                    setEditingTest({ ...editingTest, questions: updatedQuestions });
                                                                }}
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 ${oIdx === q.correctOption ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}
                                                            >
                                                                {String.fromCharCode(65 + oIdx)}
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const updatedQuestions = [...editingTest.questions];
                                                                    updatedQuestions[idx].options[oIdx] = e.target.value;
                                                                    setEditingTest({ ...editingTest, questions: updatedQuestions });
                                                                }}
                                                                className="bg-transparent border-none outline-none w-full font-bold"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-6 py-2.5 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-xl"
                            >Cancel</button>
                            <button
                                onClick={handleUpdateTest}
                                disabled={isSaving}
                                className="px-8 py-2.5 bg-[#ff8e01] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#e67e01] shadow-lg shadow-orange-100 flex items-center gap-2"
                            >
                                {isSaving ? <img src="/loading.gif" className="w-5 h-5 brightness-0 invert" alt="loading" /> : <CheckCircle className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* View/Results Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title={selectedTest?.title || "Test Details"}
                size="xl"
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-orange-50 p-4 rounded-2xl text-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Total MCQs</span>
                            <span className="text-xl font-black text-[#ff8e01]">{selectedTest?.questions?.length || 0}</span>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Submissions</span>
                            <span className="text-xl font-black text-emerald-600">{selectedTest?.submissions?.length || 0}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl text-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Duration</span>
                            <span className="text-xl font-black text-slate-900">{selectedTest?.duration}m</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center justify-between">
                            <span>Student Submissions</span>
                            <RefreshCw className="w-4 h-4 text-gray-400 cursor-pointer hover:rotate-180 transition-all duration-500" onClick={fetchTests} />
                        </h4>

                        <div className="border border-gray-100 rounded-[2.5rem] overflow-hidden divide-y divide-gray-50 bg-white shadow-sm">
                            {selectedTest?.submissions?.length === 0 ? (
                                <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-full">
                                        <Users className="w-8 h-8 text-gray-200" />
                                    </div>
                                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No submissions received yet</p>
                                </div>
                            ) : (
                                selectedTest?.submissions?.map((sub, idx) => (
                                    <div key={idx} className="p-6 flex items-center justify-between hover:bg-orange-50/30 transition-all group">
                                        <div className="flex items-center gap-5">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-md group-hover:border-orange-200 transition-colors">
                                                    {sub.user?.photo ? (
                                                        <img src={sub.user.photo} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-400 font-black text-lg">
                                                            {sub.user?.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 uppercase tracking-tight group-hover:text-[#ff8e01] transition-colors">{sub.user?.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest">Roll: {sub.user?.rollNo || 'N/A'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Date(sub.submittedAt).toLocaleDateString('en-GB')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <div className="flex items-baseline gap-1.5 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                                <span className="text-2xl font-black text-emerald-600">{sub.score}</span>
                                                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">/ {selectedTest?.totalMarks || selectedTest?.questions?.reduce((acc, q) => acc + (q.marks || 5), 0)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mr-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.15em]">Passed</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TestsTab;
