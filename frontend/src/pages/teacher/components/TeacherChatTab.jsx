import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
    MessageCircle, Send, User, Search, Loader2, Users, Mail
} from 'lucide-react';
import { chatAPI } from '../../../services/api';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

const TeacherChatTab = ({ course, students }) => {
    const { user } = useSelector((state) => state.auth);
    const [studentsWithUnread, setStudentsWithUnread] = useState([]);
    const [activeStudent, setActiveStudent] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const socketRef = useRef();
    const scrollRef = useRef();
    const activeStudentRef = useRef(activeStudent);

    useEffect(() => {
        activeStudentRef.current = activeStudent;
    }, [activeStudent]);

    // Initialize socket and fetch students
    useEffect(() => {
        fetchStudentsWithUnread();

        socketRef.current = io(SOCKET_URL, { withCredentials: true });
        const myId = user.id || user._id;
        socketRef.current.emit('join_chat', myId);

        socketRef.current.on('new_global_message', (data) => {
            const currentStudent = activeStudentRef.current;
            if (!currentStudent) return;

            const senderId = String(data.senderId || data.sender?._id || data.sender);
            const courseId = String(data.course || data.courseId || '');
            const currentStudentId = String(currentStudent._id);
            const currentCourseId = String(course.id || course._id);

            // If message is from current chat student in current course
            if (senderId === currentStudentId && courseId === currentCourseId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === data._id)) return prev;
                    return [...prev, data];
                });
                // Mark as read
                chatAPI.markCourseAsRead(currentCourseId, senderId).catch(console.error);
            }

            // Refresh students to update unread counts
            fetchStudentsWithUnread();
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [user, course]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchStudentsWithUnread = async () => {
        try {
            const res = await chatAPI.getTeacherCourses();
            const coursesData = res.data.data || [];
            // Find students for this specific course
            const thisCourse = coursesData.find(c => String(c._id) === String(course.id || course._id));
            if (thisCourse && thisCourse.students && thisCourse.students.length > 0) {
                setStudentsWithUnread(thisCourse.students);
            } else if (students && students.length > 0) {
                // Fallback to provided students list
                setStudentsWithUnread(students.map(s => ({ ...s, unreadCount: 0 })));
            } else {
                setStudentsWithUnread([]);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            if (students && students.length > 0) {
                setStudentsWithUnread(students.map(s => ({ ...s, unreadCount: 0 })));
            } else {
                setStudentsWithUnread([]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const openChat = async (student) => {
        setActiveStudent(student);
        setMessages([]);

        try {
            const courseId = course.id || course._id;
            const res = await chatAPI.getCourseMessages(courseId, student._id);
            setMessages(res.data.data || []);
            // Mark as read
            await chatAPI.markCourseAsRead(courseId, student._id);
            fetchStudentsWithUnread();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeStudent || isSending) return;

        const studentId = activeStudent._id || activeStudent.id;
        if (!studentId) {
            console.error('No student ID found');
            return;
        }

        setIsSending(true);
        try {
            const courseId = course.id || course._id;
            const res = await chatAPI.sendCourseMessage(courseId, studentId, newMessage.trim());
            if (res.data && res.data.data) {
                setMessages(prev => [...prev, res.data.data]);
            }
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const courseId = course.id || course._id;
            const res = await chatAPI.searchByEmail(query, courseId);
            setSearchResults(res.data.data || []);
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (date) => {
        const today = new Date();
        const msgDate = new Date(date);
        if (msgDate.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups, msg) => {
        const date = formatDate(msg.createdAt);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {});

    // Filter students based on search
    const displayStudents = searchQuery && searchResults.length > 0 
        ? searchResults 
        : studentsWithUnread;

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (studentsWithUnread.length === 0 && students.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">No Students Available</h3>
                <p className="text-gray-500 text-sm">No students are enrolled in this course yet.</p>
            </div>
        );
    }

    return (
        <div className="flex h-[500px] gap-4">
            {/* Students List */}
            <div className="w-72 bg-gray-50 rounded-xl p-3 flex flex-col">
                {/* Search */}
                <div className="mb-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search by email..."
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {isSearching && (
                            <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />
                        )}
                    </div>
                </div>

                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                    Students ({displayStudents.length})
                </h3>
                <div className="space-y-1 flex-1 overflow-y-auto">
                    {displayStudents.map((student) => (
                        <button
                            key={student._id}
                            onClick={() => openChat(student)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                activeStudent?._id === student._id
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'hover:bg-gray-100'
                            }`}
                        >
                            <div className="relative">
                                {student.photo ? (
                                    <img src={student.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                )}
                                {student.unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {student.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 text-left overflow-hidden">
                                <p className="font-semibold text-sm truncate">{student.name}</p>
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {student.email}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 rounded-xl flex flex-col">
                {activeStudent ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 bg-white rounded-t-xl">
                            <div className="flex items-center gap-3">
                                {activeStudent.photo ? (
                                    <img src={activeStudent.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-gray-900">{activeStudent.name}</h4>
                                    <p className="text-xs text-gray-500">{activeStudent.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {Object.entries(groupedMessages).map(([date, msgs]) => (
                                <div key={date}>
                                    <div className="flex items-center gap-3 my-4">
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                        <span className="text-xs text-gray-400 font-medium">{date}</span>
                                        <div className="flex-1 h-px bg-gray-200"></div>
                                    </div>
                                    {msgs.map((msg) => {
                                        const isMe = String(msg.sender?._id || msg.sender) === String(user.id || user._id);
                                        return (
                                            <motion.div
                                                key={msg._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}
                                            >
                                                <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                                                    isMe
                                                        ? 'bg-emerald-600 text-white rounded-br-md'
                                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                                                }`}>
                                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                                    <p className={`text-[10px] mt-1 ${isMe ? 'text-emerald-200' : 'text-gray-400'}`}>
                                                        {formatTime(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ))}
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                                    <p className="text-sm">No messages yet. Start the conversation!</p>
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white rounded-b-xl border-t border-gray-100">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleSendMessage()}
                                    disabled={!newMessage.trim() || !activeStudent || isSending}
                                    className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Users className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Select a student to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherChatTab;
