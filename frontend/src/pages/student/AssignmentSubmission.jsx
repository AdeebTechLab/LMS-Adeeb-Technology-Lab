import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Clock, Calendar, Search, Filter, AlertCircle, XCircle, ChevronLeft, ChevronRight,
    BookOpen, GraduationCap, ArrowRight, ExternalLink, Send, FileText, ClipboardList, Plus, Link as LinkIcon, MessageCircle, MapPin, Zap, X
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Loader, { ButtonLoader } from '../../components/ui/Loader';
import { assignmentAPI, courseAPI, dailyTaskAPI, enrollmentAPI, chatAPI, feeAPI } from '../../services/api';
import StudentChatTab from './components/StudentChatTab';
import StudentAttendanceTab from './components/StudentAttendanceTab';
import StudentTestsTab from './components/StudentTestsTab';
import { io } from 'socket.io-client';

// ... (socket setup remains same)

// Portal for submissions and work logs
const AssignmentSubmission = () => {
    // ... (state remains same)

    // ... (effects remain same)

    // ... (handlers remain same)

    return (
        <div className="space-y-6">
            {/* ... */}
            {!selectedCourseId ? (
                // ... (Course selection view)
            ) : (
                <div className="space-y-6">
                    {/* ... (Course header) */}

                    {/* ... (Tabs) */}

                    {/* Tab Content */}
                    {(() => {
                        // ...
                        return (
                            <>
                                {isLoading ? (
                                    <Loader message="Synchronizing Workspace..." />
                                ) : activeTab === 'assignments' ? (
                                    // ...
                                ) : (
                                    // ...
                                )}
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
                                                { label: 'Overdue', icon: AlertCircle, count: filteredAssignments.filter((a) => a.status === 'overdue' || (a.status === 'pending' && isDeadlinePassed(a.deadline))).length, color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30' },
                                            ].map((stat) => (
                                                <div key={stat.label} className={`${stat.color} rounded-2xl p-4 border flex items-center justify-between shadow-sm`}>
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70 block mb-1">{stat.label}</span>
                                                        <p className="text-2xl font-black leading-none">{stat.count}</p>
                                                    </div>
                                                    <div className={`p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm`}>
                                                        <stat.icon className="w-5 h-5 opacity-80" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {filteredAssignments.length === 0 ? (
                                            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                                                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assignments Found</h3>
                                                <p className="text-gray-500 italic">No assignments are currently registered for this workspace.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {filteredAssignments.map((assignment, index) => {
                                                    const canSubmit = !isDeadlinePassed(assignment.deadline) && assignment.status === 'pending' && !isRestricted && !isCompleted;
                                                    const statusConfig = getStatusConfig(assignment.status, assignment.deadline);

                                                    return (
                                                        <motion.div
                                                            key={assignment.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={`bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-2xl hover:border-primary dark:hover:border-primary/50 group relative overflow-hidden ${assignment.status === 'graded' ? 'opacity-95' : ''}`}
                                                        >
                                                            {/* Status Glow Background */}
                                                            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full -mr-20 -mt-20 blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${assignment.status === 'graded' ? 'bg-primary' : assignment.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'}`}></div>

                                                            <div className="flex flex-col h-full relative z-10">
                                                                {/* Header */}
                                                                <div className="flex items-start justify-between mb-6">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${assignment.status === 'graded' ? 'bg-primary shadow-primary/10 dark:shadow-none' : assignment.status === 'submitted' ? 'bg-blue-600 shadow-blue-100 dark:shadow-none' : 'bg-[#0f2847] shadow-slate-100 dark:shadow-none'}`}>
                                                                            <FileText className="w-6 h-6" />
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">TASK #{index + 1}</span>
                                                                            <h3 className="font-black text-gray-900 dark:text-white text-lg uppercase tracking-tight group-hover:text-primary dark:group-hover:text-primary transition-colors leading-tight">{assignment.title}</h3>
                                                                        </div>
                                                                    </div>
                                                                    <Badge variant={statusConfig.variant}>{statusConfig.label.toUpperCase()}</Badge>
                                                                </div>

                                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6 whitespace-pre-wrap">
                                                                    {assignment.description}
                                                                </p>

                                                                <div className="mt-auto pt-6 border-t border-gray-50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                                    <div className="flex flex-wrap items-center gap-3">
                                                                        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5/50 dark:bg-primary/10 rounded-2xl border border-primary/10 dark:border-primary/30 group/date transition-all hover:bg-primary/10 dark:hover:bg-primary/20">
                                                                            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-primary">
                                                                                <Calendar className="w-4 h-4" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[9px] font-black text-primary/60 dark:text-primary/40 uppercase tracking-widest leading-none mb-1">Target Date</p>
                                                                                <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">{formatDate(assignment.deadline)}</p>
                                                                            </div>
                                                                        </div>
                                                                        {canSubmit && (
                                                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30 animate-pulse">
                                                                                <Clock className="w-4 h-4 text-amber-500" />
                                                                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                                                                                    {getTimeRemaining(assignment.deadline)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {(canSubmit || assignment.status === 'rejected') && selectedAssignment?.id !== assignment.id && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedAssignment(assignment);
                                                                                setSubmissionUrl(assignment.status === 'rejected' ? (assignment.submissionLink || '') : '');
                                                                                setSubmissionText(assignment.status === 'rejected' ? (assignment.notes || '') : '');
                                                                            }}
                                                                            disabled={isRestricted}
                                                                            className={`px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-white shadow-xl hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98] ring-offset-2 focus:ring-2 focus:ring-primary/50 ${assignment.status === 'rejected' ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-red-950/20' : 'bg-primary hover:bg-primary shadow-orange-200 dark:shadow-orange-900/40'} disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2 w-full sm:w-auto`}
                                                                        >
                                                                            <Send className="w-4 h-4" />
                                                                            {isRestricted ? (currentEnrollment?.isPaused ? 'LOCKED' : 'LOCKED') : (assignment.status === 'rejected' ? 'RESUBMIT' : 'SUBMIT ASSIGNMENT')}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-6">
                                                                    {(assignment.status === 'submitted' || assignment.status === 'graded') && (
                                                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                                            {/* Final Result Box */}
                                                                            {assignment.status === 'graded' && (
                                                                                <div className="bg-primary/5 dark:bg-primary/20 p-4 rounded-2xl border border-primary/10 dark:border-primary/30 text-center flex flex-col justify-center min-h-[90px]">
                                                                                    <p className="text-[9px] font-black text-primary dark:text-primary uppercase tracking-widest mb-1">Final Result</p>
                                                                                    <p className="text-3xl font-black text-primary dark:text-primary">{assignment.grade}<span className="text-lg text-primary">/{assignment.totalMarks}</span></p>
                                                                                </div>
                                                                            )}

                                                                            {/* Feedback Box */}
                                                                            {assignment.status === 'graded' && (
                                                                                <div className="bg-gradient-to-br from-amber-50 to-primary/5 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-700/30 shadow-sm relative overflow-hidden min-h-[90px]">
                                                                                    <MessageCircle className="absolute -right-4 -bottom-4 w-16 h-16 text-amber-100/50 dark:text-amber-900/10 transform rotate-12" />
                                                                                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                                        <MessageCircle className="w-3 h-3" />
                                                                                        Feedback
                                                                                    </p>
                                                                                    <p className="text-[11px] text-gray-800 dark:text-gray-200 italic leading-relaxed whitespace-pre-wrap line-clamp-3">"{assignment.feedback || 'No feedback provided'}"</p>
                                                                                </div>
                                                                            )}

                                                                            {/* My Submission Box */}
                                                                            <div className={`p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex flex-col justify-between min-h-[90px] ${assignment.status !== 'graded' ? 'lg:col-span-3' : ''}`}>
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">My Submission</p>
                                                                                    {assignment.status === 'submitted' && (
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                                            <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Pending</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="space-y-2">
                                                                                    {assignment.submissionLink && (
                                                                                        <a
                                                                                            href={assignment.submissionLink}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="flex items-center gap-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800/30"
                                                                                        >
                                                                                            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                                                                                            <span className="truncate">View My Work</span>
                                                                                            <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                                                                                        </a>
                                                                                    )}

                                                                                    {assignment.notes && (
                                                                                        <div className="bg-white/60 dark:bg-black/20 p-2 rounded-xl border border-slate-200 dark:border-slate-800/50">
                                                                                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium whitespace-pre-wrap leading-tight line-clamp-2">{assignment.notes}</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {assignment.status === 'rejected' && assignment.feedback && (
                                                                        <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-5 rounded-2xl border border-red-200 dark:border-red-700/30 shadow-sm relative overflow-hidden">
                                                                            <MessageCircle className="absolute -right-4 -bottom-4 w-16 h-16 text-red-100/50 dark:text-red-900/10 transform rotate-12" />
                                                                            <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                                                <XCircle className="w-3 h-3" />
                                                                                Rejection Reason
                                                                            </p>
                                                                            <p className="text-xs text-gray-800 dark:text-gray-200 italic leading-relaxed whitespace-pre-wrap">"{assignment.feedback}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* SUBMISSION MODAL POPUP */}
                                        <AnimatePresence>
                                            {selectedAssignment && (
                                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        onClick={() => setSelectedAssignment(null)}
                                                        className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-xl"
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                                                        className="bg-white dark:bg-[#0f172a] w-full max-w-xl rounded-[3rem] shadow-2xl border border-white/20 dark:border-slate-800 relative z-10 overflow-hidden"
                                                    >
                                                        {/* Modal Header */}
                                                        <div className="bg-primary p-10 text-white relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                                                            <div className="flex items-center gap-5 relative z-10">
                                                                <div className="w-16 h-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                                                                    <Send className="w-8 h-8 text-white" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">ASSIGNMENT SUBMIT</h3>
                                                                    <p className="text-primary/10 text-[11px] font-black uppercase tracking-widest opacity-90 flex items-center gap-2">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                                        Post your work for review
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedAssignment(null)}
                                                                className="absolute top-8 right-8 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors text-white"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>

                                                        {/* Modal Body */}
                                                        <div className="p-10 space-y-8">
                                                            <div className="space-y-4">
                                                                <div className="group">
                                                                    <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block ml-1 group-focus-within:text-primary transition-colors">
                                                                        Work Link
                                                                    </label>
                                                                    <div className="relative">
                                                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                                                                            <LinkIcon className="w-5 h-5" />
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="e.g. GitHub, Google Drive, or Website Link"
                                                                            value={submissionUrl}
                                                                            onChange={(e) => setSubmissionUrl(e.target.value)}
                                                                            className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:ring-8 focus:ring-[#ff8e01]/5 focus:border-primary font-bold transition-all text-sm dark:text-white placeholder:text-slate-400"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="group">
                                                                    <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block ml-1 group-focus-within:text-primary transition-colors">
                                                                        Notes for Teacher
                                                                    </label>
                                                                    <div className="relative">
                                                                        <div className="absolute top-5 left-0 pl-5 pointer-events-none text-slate-300 group-focus-within:text-primary transition-colors">
                                                                            <FileText className="w-5 h-5" />
                                                                        </div>
                                                                        <textarea
                                                                            placeholder="Share any specific details about your implementation..."
                                                                            rows="4"
                                                                            value={submissionText}
                                                                            onChange={(e) => setSubmissionText(e.target.value)}
                                                                            className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-black/40 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:ring-8 focus:ring-[#ff8e01]/5 focus:border-primary font-bold transition-all resize-none text-sm dark:text-white placeholder:text-slate-400 min-h-[140px]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="pt-4">
                                                                <button
                                                                    onClick={() => handleSubmit(selectedAssignment.id)}
                                                                    disabled={isSubmitting || isRestricted}
                                                                    className="w-full py-5 bg-primary hover:bg-primary text-white font-black uppercase tracking-widest text-xs rounded-3xl shadow-2xl shadow-primary dark:shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 ring-offset-4 ring-offset-white dark:ring-offset-[#0f172a] focus:ring-4 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <ButtonLoader isLoading={isSubmitting}>
                                                                        CONFIRM & SUBMIT WORK
                                                                    </ButtonLoader>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : activeTab === 'daily_tasks' ? (
                                    /* DAILY LOGS VIEW */
                                    <div className="space-y-6">
                                        <div className="bg-white dark:bg-[#1a1f2e] rounded-[2.5rem] p-10 border border-gray-100 dark:border-gray-800 shadow-sm">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Post Daily Log</h3>
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-primary/5 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary">
                                                    <Plus className="w-6 h-6" />
                                                </div>
                                            </div>

                                            <form onSubmit={handleSubmitDailyTask} className="space-y-6">
                                                {(user?.role === 'intern' || user?.role === 'admin') && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 block ml-1">Live Work Link</label>
                                                        <div className="relative group">
                                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                                                <LinkIcon className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={newTaskLink}
                                                                onChange={(e) => setNewTaskLink(e.target.value)}
                                                                disabled={isRestricted || isCompleted}
                                                                placeholder="URL (GitHub, Drive, Website)"
                                                                className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-gray-900 dark:text-gray-100 font-bold transition-all disabled:opacity-50"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <textarea
                                                        value={newTaskContent}
                                                        onChange={(e) => {
                                                            setNewTaskContent(e.target.value);
                                                            e.target.style.height = 'auto';
                                                            e.target.style.height = `${e.target.scrollHeight}px`;
                                                        }}
                                                        disabled={isRestricted || isCompleted}
                                                        placeholder="Describe your achievements and challenges today..."
                                                        rows={4}
                                                        className="daily-log-textarea w-full px-7 py-5 bg-gray-50 dark:bg-gray-900/50 border border-primary dark:border-primary/50 rounded-3xl outline-none focus:ring-4 focus:ring-[#ff8e01]/20 focus:border-primary text-gray-900 dark:text-gray-100 font-medium transition-all resize-none overflow-hidden shadow-inner disabled:opacity-50 min-h-[7rem]"
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting || !newTaskContent.trim() || isRestricted || isCompleted}
                                                    className="w-full py-6 bg-primary hover:bg-[#e67f00] text-white rounded-[1.5rem] font-black text-lg tracking-widest uppercase shadow-2xl shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50"
                                                >
                                                    <ButtonLoader isLoading={isSubmitting} icon={<Send className="w-6 h-6" />}>
                                                        {isCompleted ? 'LOGS ARCHIVED' : (isRestricted ? (currentEnrollment?.isPaused ? 'LOCKED (PAUSED)' : 'PORTAL LOCKED') : (resubmittingTaskId ? 'UPDATE ARCHIVE ENTRY' : 'COMMIT DAILY LOG'))}
                                                    </ButtonLoader>
                                                </button>
                                            </form>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2 mb-6 text-center">--- Activity Archive ---</h4>
                                            {dailyTasks.length === 0 ? (
                                                <div className="py-20 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                                    <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No historical data found for this workspace</p>
                                                </div>
                                            ) : (
                                                [...dailyTasks]
                                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                                    .map((task, idx) => (
                                                        <motion.div
                                                            key={task._id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className={`bg-white p-7 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden ${task.status === 'verified' ? 'opacity-70' : ''}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                                                        <p className="text-[10px] font-black text-gray-900 leading-none">{new Date(task.date || task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">{new Date(task.createdAt).getFullYear()}</p>
                                                                    </div>
                                                                    <Badge variant={task.status === 'verified' ? 'success' : 'warning'}>{task.status.toUpperCase()}</Badge>
                                                                </div>
                                                                {task.status === 'rejected' && (
                                                                    <button onClick={() => { setResubmittingTaskId(task._id); setNewTaskContent(task.content); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-black text-primary underline uppercase tracking-widest">Edit & Re-commit</button>
                                                                )}
                                                            </div>
                                                            <div className="bg-gray-50/50 dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 text-sm italic text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-4 whitespace-pre-wrap">"{task.content}"</div>
                                                            {task.workLink && (
                                                                <a href={task.workLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-black text-primary uppercase hover:bg-primary/5 w-fit px-3 py-1.5 rounded-lg border border-primary/10 transition-all">
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                    Review Work
                                                                </a>
                                                            )}
                                                            {task.feedback && (
                                                                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                                                                    <p className="text-[10px] font-black text-primary dark:text-primary uppercase tracking-widest mb-2">Teacher Evaluation</p>
                                                                    <p className="text-sm font-semibold italic text-primary dark:text-primary">"{task.feedback}"</p>
                                                                    {task.marks !== undefined && (
                                                                        <div className="mt-4 flex items-center justify-between bg-primary/5 dark:bg-primary/20 p-4 rounded-xl border border-primary/10 dark:border-primary/30">
                                                                            <span className="text-xs font-black text-primary dark:text-primary uppercase">Proficiency Met</span>
                                                                            <span className="text-xl font-black text-primary dark:text-primary">{task.marks}<span className="text-xs text-primary dark:text-primary">/100</span></span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === 'attendance' ? (
                                    /* ATTENDANCE VIEW */
                                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[400px]">
                                        {selectedCourseId && myCourses.find(c => c._id === selectedCourseId) ? (
                                            <StudentAttendanceTab course={myCourses.find(c => c._id === selectedCourseId)} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                                                <Clock className="w-16 h-16 mb-4 opacity-50" />
                                                <p className="text-lg font-bold">Select a course to view attendance</p>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'chat' ? (
                                    /* CHAT VIEW */
                                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm min-h-[500px]">
                                        {selectedCourseId && myCourses.find(c => c._id === selectedCourseId) ? (
                                            <StudentChatTab
                                                course={myCourses.find(c => c._id === selectedCourseId)}
                                                isRestricted={false}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                                                <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                                                <p className="text-lg font-bold">Select a course to start chatting</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* TESTS VIEW */
                                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm min-h-[400px]">
                                        {selectedCourseId && myCourses.find(c => c._id === selectedCourseId) ? (
                                            <StudentTestsTab
                                                courseId={selectedCourseId}
                                                isRestricted={isRestricted}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                                                <Zap className="w-16 h-16 mb-4 opacity-50 text-primary" />
                                                <p className="text-lg font-bold">Select a course to view tests</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

            )}
        </div>
    );
};

export default AssignmentSubmission;



