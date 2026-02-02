import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
    MessageCircle, Send, User, Loader2, GraduationCap
} from 'lucide-react';
import { chatAPI } from '../../../services/api';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

const StudentChatTab = ({ course, isRestricted }) => {
    const { user } = useSelector((state) => state.auth);
    const [teachers, setTeachers] = useState([]);
    const [activeTeacher, setActiveTeacher] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const socketRef = useRef();
    const scrollRef = useRef();
    const activeTeacherRef = useRef(activeTeacher);

    useEffect(() => {
        activeTeacherRef.current = activeTeacher;
    }, [activeTeacher]);

    // Initialize socket and fetch teachers
    useEffect(() => {
        fetchTeachers();

        socketRef.current = io(SOCKET_URL, { withCredentials: true });
        const myId = user.id || user._id;
        socketRef.current.emit('join_chat', myId);

        socketRef.current.on('new_global_message', (data) => {
            const currentTeacher = activeTeacherRef.current;
            if (!currentTeacher) return;

            const senderId = String(data.senderId || data.sender?._id || data.sender);
            const courseId = String(data.course || data.courseId || '');
            const currentTeacherId = String(currentTeacher._id);
            const currentCourseId = String(course._id || course.id);

            // If message is from current chat teacher in current course
            if (senderId === currentTeacherId && courseId === currentCourseId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === data._id)) return prev;
                    return [...prev, data];
                });
                // Mark as read
                chatAPI.markCourseAsRead(currentCourseId, senderId).catch(console.error);
            }

            // Refresh teachers to update unread counts
            fetchTeachers();
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [user, course._id || course.id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchTeachers = async () => {
        try {
            const res = await chatAPI.getStudentCourses();
            const coursesData = res.data.data || [];
            // Find teachers for this specific course
            const courseId = course._id || course.id;
            const thisCourse = coursesData.find(c => String(c._id) === String(courseId));
            if (thisCourse && thisCourse.teachers && thisCourse.teachers.length > 0) {
                setTeachers(thisCourse.teachers);
                // Auto-select first teacher if none selected
                if (!activeTeacherRef.current) {
                    openChat(thisCourse.teachers[0]);
                }
            } else if (course.teachers && course.teachers.length > 0) {
                // Fallback to teachers from course prop
                const fallbackTeachers = course.teachers.map(t => ({
                    _id: t._id || t,
                    name: t.name || 'Teacher',
                    email: t.email || '',
                    photo: t.photo || '',
                    unreadCount: 0
                }));
                setTeachers(fallbackTeachers);
                if (!activeTeacherRef.current && fallbackTeachers.length > 0) {
                    openChat(fallbackTeachers[0]);
                }
            } else {
                setTeachers([]);
            }
        } catch (error) {
            console.error('Error fetching teachers:', error);
            setTeachers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const openChat = async (teacher) => {
        setActiveTeacher(teacher);
        setMessages([]);

        try {
            const courseId = course._id || course.id;
            const res = await chatAPI.getCourseMessages(courseId, teacher._id);
            setMessages(res.data.data || []);
            // Mark as read
            await chatAPI.markCourseAsRead(courseId, teacher._id);
            fetchTeachers();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !activeTeacher || isSending || isRestricted) return;

        const teacherId = activeTeacher._id || activeTeacher.id;
        if (!teacherId) {
            console.error('No teacher ID found');
            return;
        }

        setIsSending(true);
        try {
            const courseId = course._id || course.id;
            const res = await chatAPI.sendCourseMessage(courseId, teacherId, newMessage.trim());
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

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (teachers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">No Teachers Available</h3>
                <p className="text-gray-500 text-sm">No teachers are assigned to this course yet.</p>
            </div>
        );
    }

    return (
        <div className="flex h-[500px] gap-4">
            {/* Teachers List */}
            <div className="w-64 bg-gray-50 rounded-xl p-3 flex flex-col">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                    Teachers
                </h3>
                <div className="space-y-1 flex-1 overflow-y-auto">
                    {teachers.map((teacher) => (
                        <button
                            key={teacher._id}
                            onClick={() => openChat(teacher)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                                activeTeacher?._id === teacher._id
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'hover:bg-gray-100'
                            }`}
                        >
                            <div className="relative">
                                {teacher.photo ? (
                                    <img src={teacher.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <GraduationCap className="w-5 h-5 text-purple-600" />
                                    </div>
                                )}
                                {teacher.unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {teacher.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-sm truncate">{teacher.name}</p>
                                <p className="text-xs text-gray-500 truncate">{teacher.email}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 rounded-xl flex flex-col">
                {activeTeacher ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 bg-white rounded-t-xl">
                            <div className="flex items-center gap-3">
                                {activeTeacher.photo ? (
                                    <img src={activeTeacher.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <GraduationCap className="w-5 h-5 text-purple-600" />
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-gray-900">{activeTeacher.name}</h4>
                                    <p className="text-xs text-gray-500">Teacher</p>
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
                            {isRestricted && (
                                <p className="text-xs text-red-500 mb-2">Messaging disabled due to payment restrictions.</p>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    disabled={isRestricted}
                                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
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
                                    disabled={!newMessage.trim() || !activeTeacher || isSending || isRestricted}
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
                        <User className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Select a teacher to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentChatTab;
