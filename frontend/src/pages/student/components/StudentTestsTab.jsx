import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, Clock, CheckCircle, FileText, 
    ChevronRight, Loader2, AlertCircle, PlayCircle, Award, X
} from 'lucide-react';
import { testAPI } from '../../../services/api';
import Badge from '../../../components/ui/Badge';

const StudentTestsTab = ({ courseId, isRestricted }) => {
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState(null);
    const [isTakingTest, setIsTakingTest] = useState(false);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [testResult, setTestResult] = useState(null);
    const [showReview, setShowReview] = useState(false);
    const [direction, setDirection] = useState(0); // 1 for next, -1 for previous

    // Prevent navigation/refresh during test
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isTakingTest && !testResult) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        const handleContextMenu = (e) => {
            if (isTakingTest && !testResult) {
                e.preventDefault();
            }
        };

        const handleKeyDown = (e) => {
            if (isTakingTest && !testResult) {
                // Disable Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+S, F12
                if (
                    (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 's')) ||
                    e.key === 'F12'
                ) {
                    e.preventDefault();
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isTakingTest, testResult]);

    useEffect(() => {
        fetchTests();
    }, [courseId]);

    useEffect(() => {
        let timer;
        if (isTakingTest && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleSubmitTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isTakingTest, timeLeft]);

    const fetchTests = async () => {
        try {
            const res = await testAPI.getByCourse(courseId);
            setTests(res.data.tests || []);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartTest = (test) => {
        if (isRestricted) {
            alert("You cannot take tests while your account is restricted.");
            return;
        }

        setIsLoading(true); // Show loader while shuffling/preparing
        
        setTimeout(() => {
            // 1. Shuffle Questions
            const qList = [...(test.questions || [])];
            for (let i = qList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [qList[i], qList[j]] = [qList[j], qList[i]];
            }

            // 2. Shuffle Options for each question
            const processedQuestions = qList.map(q => {
                const optionsWithOriginalIndex = (q.options || []).map((opt, idx) => ({
                    text: opt,
                    originalIndex: idx
                }));

                // Fisher-Yates shuffle for options
                for (let i = optionsWithOriginalIndex.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsWithOriginalIndex[i], optionsWithOriginalIndex[j]] = [optionsWithOriginalIndex[j], optionsWithOriginalIndex[i]];
                }

                return {
                    ...q,
                    shuffledOptions: optionsWithOriginalIndex
                };
            });

            setShuffledQuestions(processedQuestions);
            setSelectedTest(test);
            setIsTakingTest(true);
            setTimeLeft((test.duration || 30) * 60);
            setAnswers({});
            setCurrentQuestionIndex(0);
            setIsLoading(false);
        }, 800); // Small delay to show "Preparing Test"
    };

    const handleSubmitTest = async () => {
        if (isSubmitting) return;

        const answeredCount = Object.keys(answers).length;
        if (answeredCount < shuffledQuestions.length) {
            alert(`Please answer all questions before finishing. (${answeredCount}/${shuffledQuestions.length} answered)`);
            return;
        }

        setIsSubmitting(true);
        try {
            const formattedAnswers = Object.keys(answers).map(qId => ({
                questionId: qId,
                selectedOption: answers[qId]
            }));

            const res = await testAPI.submit(selectedTest._id, formattedAnswers);
            setTestResult({
                score: res.data.score,
                totalMarks: res.data.totalMarks,
                questions: res.data.questions,
                userAnswers: answers
            });
            setShowReview(true); // Automatically show review after result
            fetchTests();
        } catch (error) {
            console.error('Error submitting test:', error);
            alert(error.response?.data?.message || "Failed to submit test");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <img src="/loading.gif" alt="Loading" className="w-32 h-32 object-contain" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs animate-pulse">
                    {isTakingTest ? 'Preparing your test...' : 'Loading Tests...'}
                </p>
            </div>
        );
    }

    if (isTakingTest && selectedTest) {
        const currentQuestion = shuffledQuestions[currentQuestionIndex];
        const answeredCount = Object.keys(answers).length;
        const progress = (answeredCount / shuffledQuestions.length) * 100;

        return (
            <div className="fixed inset-0 z-[3000] bg-[#f8fafc] flex flex-col h-[100dvh] w-screen overflow-hidden font-sans select-none overscroll-none">
                {/* Header with Title and Timer */}
                <div className="shrink-0 p-4 sm:p-5 bg-white/80 backdrop-blur-md border-b border-orange-50 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-[#ff8e01] rounded-2xl blur-lg opacity-10" />
                            <div className="relative p-2.5 rounded-2xl bg-gradient-to-br from-[#ff8e01] to-[#ffa534] shadow-md">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">{selectedTest.title}</h3>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Session</span>
                            </div>
                        </div>
                    </div>

                    {/* Centered Premium Timer (No Card) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className={`flex flex-col items-center transition-all duration-500 text-red-600`}>
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 text-red-400`}>Time Left</span>
                            <div className="flex items-center gap-2">
                                <Clock className={`w-4 h-4 ${timeLeft < 60 ? 'animate-pulse' : 'text-red-600'}`} />
                                <span className="text-2xl font-black tabular-nums tracking-wider leading-none">{formatTime(timeLeft)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                            <span className="text-[10px] font-black text-[#ff8e01] uppercase leading-none">In Progress</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center no-scrollbar">
                    <div className="max-w-4xl w-full py-4">
                        {/* Progress and Label */}
                        <div className="flex flex-col items-center space-y-1.5 mb-6">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Progress</span>
                            <div className="flex items-center gap-3 w-full">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-white shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-gradient-to-r from-[#ff8e01] to-[#ffa534] rounded-full shadow-lg"
                                    />
                                </div>
                                <span className="text-[10px] font-black text-slate-800 tabular-nums">{Math.round(progress)}%</span>
                            </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-2xl border-2 border-slate-50 flex flex-wrap gap-2 justify-center shadow-sm mb-8">
                            {shuffledQuestions.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setDirection(i > currentQuestionIndex ? 1 : -1);
                                        setCurrentQuestionIndex(i);
                                    }}
                                    className={`w-10 h-10 rounded-xl font-black text-xs transition-all border-2 ${
                                        currentQuestionIndex === i
                                        ? 'bg-[#ff8e01] border-[#ff8e01] text-white shadow-xl shadow-orange-100 scale-110 z-10'
                                        : answers[shuffledQuestions[i]._id] !== undefined
                                        ? 'bg-orange-50 border-orange-100 text-[#ff8e01]'
                                        : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={currentQuestionIndex}
                                custom={direction}
                                initial={{ opacity: 0, x: direction === 1 ? 150 : -150 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: direction === 1 ? -150 : 150 }}
                                transition={{ 
                                    x: { type: "spring", stiffness: 100, damping: 20 },
                                    opacity: { duration: 0.5 }
                                }}
                                className="bg-white p-8 sm:p-12 rounded-[3rem] border-2 border-orange-100 shadow-xl shadow-orange-100/20 space-y-10 relative overflow-hidden"
                            >
                                {/* Background Accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/20 rounded-bl-[5rem] -mr-10 -mt-10" />

                                <div className="space-y-4 relative">
                                    <span className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                                        Question {currentQuestionIndex + 1}
                                    </span>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
                                        {currentQuestion.question}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {currentQuestion.shuffledOptions.map((opt, oIdx) => (
                                        <button
                                            key={oIdx}
                                            onClick={() => setAnswers({...answers, [currentQuestion._id]: opt.originalIndex})}
                                            className={`group p-5 rounded-[2rem] text-left border-2 transition-all flex items-center gap-6 ${
                                                answers[currentQuestion._id] === opt.originalIndex
                                                ? 'border-[#ff8e01] bg-white shadow-xl shadow-orange-100/50 translate-x-2'
                                                : 'border-slate-50 bg-slate-50/50 hover:border-orange-100 hover:bg-white hover:translate-x-1'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 shrink-0 rounded-2xl border-2 flex items-center justify-center font-black text-base transition-all ${
                                                answers[currentQuestion._id] === opt.originalIndex
                                                ? 'bg-[#ff8e01] border-[#ff8e01] text-white shadow-lg shadow-orange-200'
                                                : 'bg-white border-slate-100 text-slate-400 group-hover:border-orange-50 group-hover:text-[#ff8e01]'
                                            }`}>
                                                {String.fromCharCode(65 + oIdx)}
                                            </div>
                                            <span className={`text-lg font-bold transition-colors ${
                                                answers[currentQuestion._id] === opt.originalIndex ? 'text-slate-900' : 'text-slate-600'
                                            }`}>{opt.text}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="shrink-0 p-4 bg-white border-t flex items-center justify-center">
                    <div className="max-w-4xl w-full flex items-center justify-between">
                        <button 
                            disabled={currentQuestionIndex === 0}
                            onClick={() => {
                                setDirection(-1);
                                setCurrentQuestionIndex(prev => prev - 1);
                            }}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-0"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                            Previous
                        </button>

                        {currentQuestionIndex === shuffledQuestions.length - 1 ? (
                            <button 
                                onClick={handleSubmitTest}
                                disabled={isSubmitting || Object.keys(answers).length < shuffledQuestions.length}
                                className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-3 group ${
                                    Object.keys(answers).length < shuffledQuestions.length
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    : 'bg-slate-900 text-white hover:bg-black'
                                }`}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Finish Test
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    setDirection(1);
                                    setCurrentQuestionIndex(prev => prev + 1);
                                }}
                                className="px-8 py-3 bg-[#ff8e01] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#e67e01] transition-all shadow-lg flex items-center gap-3 group"
                            >
                                Next Question
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Detailed Review Overlay */}
                <AnimatePresence>
                    {showReview && testResult && (
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="absolute inset-0 z-[5000] bg-white flex flex-col overflow-hidden"
                        >
                            <div className="p-6 sm:p-8 border-b bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm">
                                <div className="flex-1">
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{selectedTest?.title}</h2>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Test Review Session</p>
                                </div>

                                <div className="flex-1 flex justify-end">
                                    <div className="px-4 py-2 bg-orange-50 rounded-xl flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#ff8e01] animate-pulse" />
                                        <span className="text-[10px] font-black text-[#ff8e01] uppercase tracking-widest">Test Completed</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 sm:p-12 space-y-8 no-scrollbar bg-slate-50/50">
                                <div className="max-w-5xl mx-auto space-y-8 pb-12">
                                    {/* Final Score Card at Top */}
                                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-10 rounded-[3rem] text-center shadow-2xl shadow-slate-200 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ff8e01] to-transparent" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Final Performance Score</span>
                                        <div className="flex items-baseline justify-center gap-2 mb-6">
                                            <span className="text-6xl font-black text-white leading-none">{testResult.score}</span>
                                            <span className="text-xl font-black text-slate-500 leading-none">/ {testResult.totalMarks}</span>
                                        </div>
                                        
                                        <div className="flex items-center justify-center gap-8 py-5 border-y border-slate-700/50 mb-6">
                                            <div className="text-center">
                                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Correct</span>
                                                <span className="text-xl font-black text-white">{(testResult?.questions || []).filter(q => testResult.userAnswers?.[q._id] === q.correctOption).length}</span>
                                            </div>
                                            <div className="w-px h-6 bg-slate-700" />
                                            <div className="text-center">
                                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">Incorrect</span>
                                                <span className="text-xl font-black text-white">{(testResult?.questions || []).filter(q => testResult.userAnswers?.[q._id] !== q.correctOption).length}</span>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                setIsTakingTest(false);
                                                setSelectedTest(null);
                                                setTestResult(null);
                                                setShowReview(false);
                                            }}
                                            className="w-full py-4 bg-[#ff8e01] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-orange-900/20 hover:bg-[#e67e01] transition-all"
                                        >
                                            Return to Dashboard
                                        </button>
                                    </div>
                                    {(testResult?.questions || []).map((q, idx) => {
                                        const userChoice = testResult.userAnswers?.[q._id];
                                        const isCorrect = userChoice === q.correctOption;

                                        return (
                                            <div key={q._id} className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-200 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 0.1}s` }}>
                                                <div className="flex items-center gap-6">
                                                    <div className="relative shrink-0">
                                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg bg-white border-2 ${
                                                            isCorrect ? 'border-emerald-100' : 'border-red-100'
                                                        }`}>
                                                            <span className={`text-2xl font-black ${isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                {idx + 1}
                                                            </span>
                                                        </div>
                                                        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                                                            isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                                                        }`}>
                                                            {isCorrect ? (
                                                                <CheckCircle className="w-4 h-4 text-white" />
                                                            ) : (
                                                                <X className="w-4 h-4 text-white" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-xl font-bold text-gray-800 leading-relaxed">{q.question}</h4>
                                                        {!isCorrect && userChoice === undefined && (
                                                            <span className="text-[10px] font-black text-red-500 uppercase mt-1 block tracking-widest">Question Skipped</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 sm:ml-14">
                                                    {q.options.map((opt, oIdx) => {
                                                        const isUserSelection = userChoice === oIdx;
                                                        const isCorrectOption = q.correctOption === oIdx;
                                                        
                                                        let bgColor = 'bg-slate-50 border-transparent';
                                                        let textColor = 'text-slate-600';
                                                        let iconColor = 'bg-slate-100 text-slate-400';

                                                        if (isCorrectOption) {
                                                            bgColor = 'bg-emerald-50 border-emerald-200';
                                                            textColor = 'text-emerald-700';
                                                            iconColor = 'bg-emerald-500 text-white';
                                                        } else if (isUserSelection && !isCorrect) {
                                                            bgColor = 'bg-red-50 border-red-200';
                                                            textColor = 'text-red-700';
                                                            iconColor = 'bg-red-500 text-white';
                                                        }

                                                        return (
                                                            <div 
                                                                key={oIdx}
                                                                className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${bgColor}`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${iconColor}`}>
                                                                    {String.fromCharCode(65 + oIdx)}
                                                                </div>
                                                                <span className={`font-bold ${textColor}`}>{opt}</span>
                                                                {isCorrectOption && (
                                                                    <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
                                                                )}
                                                                {isUserSelection && !isCorrect && (
                                                                    <AlertCircle className="w-5 h-5 text-red-500 ml-auto" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="h-12" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">My Tests</h3>
                    <p className="text-sm text-gray-500">View and take tests for your course</p>
                </div>
            </div>

            {tests.length === 0 ? (
                <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                    <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold italic">No tests are currently available for this course.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tests.map((test) => {
                        const submission = test.submissions?.[0];
                        const isCompleted = !!submission;

                        return (
                            <div 
                                key={test._id}
                                className="bg-white border-2 border-gray-100 rounded-3xl p-6 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-2xl bg-orange-50">
                                        <Zap className="w-6 h-6 text-[#ff8e01]" />
                                    </div>
                                    <Badge variant={isCompleted ? 'success' : 'warning'}>
                                        {isCompleted ? 'Completed' : 'Pending'}
                                    </Badge>
                                </div>
                                
                                <h4 className="text-lg font-black text-gray-900 mb-1 uppercase tracking-tight">{test.title}</h4>
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{test.duration} MINS</span>
                                    {test.dueDate && (
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            DUE: {new Date(test.dueDate).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mb-6 line-clamp-2">{test.description || 'No instructions provided'}</p>
                                
                                {isCompleted ? (
                                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl">
                                                <Award className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Your Score</p>
                                                <p className="text-xl font-black text-emerald-700 leading-none">{submission.score} / {test.totalMarks}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Percentage</p>
                                            <p className="text-xl font-black text-emerald-700 leading-none">
                                                {Math.round((submission.score / test.totalMarks) * 100)}%
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-xl">
                                                <Clock className="w-3.5 h-3.5 text-[#ff8e01]" />
                                                {test.duration} Mins
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-xl">
                                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                                {test.questions?.length || 0} MCQs
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleStartTest(test)}
                                            className="w-full py-4 bg-[#ff8e01] text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#e67e01] transition-all shadow-lg shadow-orange-100"
                                        >
                                            <PlayCircle className="w-5 h-5" />
                                            Start Test Now
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentTestsTab;
