import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { MessageSquare, Send, Trash2, Users, Loader2 } from 'lucide-react';
import { chatAPI } from '../../services/api';

const getSocketURL = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return apiUrl.replace('/api', '');
};

const isUserOnline = (lastSeen) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) / 1000 / 60 < 2;
};

const DiscussionRoom = () => {
    const { user, role } = useSelector((state) => state.auth);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const socketRef = useRef(null);
    const bottomRef = useRef(null);
    const myId = user?._id || user?.id;
    const myEmail = (user?.email || '').toLowerCase();
    const myRollNo = (user?.rollNo || '').toLowerCase();
    const isAdmin = role === 'admin';

    const loadMessages = async () => {
        try {
            const res = await chatAPI.getDiscussionMessages();
            setMessages(res.data.data || []);
            try {
                await chatAPI.markDiscussionRead();
            } catch (readError) {
                console.error('Discussion read mark failed:', readError);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Discussion messages load nahi ho sakay.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMessages();

        socketRef.current = io(getSocketURL(), { withCredentials: true });
        if (myId) socketRef.current.emit('join_chat', String(myId));

        socketRef.current.on('discussion_message', (message) => {
            setMessages(prev => prev.some(m => String(m._id) === String(message._id)) ? prev : [...prev, message]);
            setTimeout(() => {
                chatAPI.markDiscussionRead().catch(() => {});
            }, 300);
        });

        socketRef.current.on('discussion_message_deleted', ({ messageId }) => {
            setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
        });

        socketRef.current.on('discussion_cleared', () => {
            setMessages([]);
        });

        socketRef.current.on('user_status_update', (data) => {
            setMessages(prev => prev.map(msg => (
                String(msg.sender?._id) === String(data.userId)
                    ? { ...msg, sender: { ...msg.sender, lastSeen: data.lastSeen } }
                    : msg
            )));
        });

        const heartbeatInterval = setInterval(() => {
            if (socketRef.current && myId) socketRef.current.emit('heartbeat', String(myId));
        }, 30000);

        return () => {
            clearInterval(heartbeatInterval);
            socketRef.current?.disconnect();
        };
    }, [myId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const sendMessage = async (e) => {
        e.preventDefault();
        const text = newMessage.trim();
        if (!text || sending) return;
        setSending(true);
        setNewMessage('');
        try {
            const res = await chatAPI.sendDiscussionMessage(text);
            const saved = res.data.data;
            setMessages(prev => prev.some(m => String(m._id) === String(saved._id)) ? prev : [...prev, saved]);
        } catch (error) {
            setNewMessage(text);
            alert(error.response?.data?.message || 'Message send nahi ho saka.');
        } finally {
            setSending(false);
        }
    };

    const deleteMessage = async (messageId) => {
        if (!window.confirm('Ye message delete karna hai?')) return;
        try {
            await chatAPI.deleteDiscussionMessage(messageId);
            setMessages(prev => prev.filter(m => String(m._id) !== String(messageId)));
        } catch (error) {
            alert(error.response?.data?.message || 'Message delete nahi ho saka.');
        }
    };

    const clearAll = async () => {
        if (!window.confirm('Poori discussion room chat clear karni hai?')) return;
        try {
            await chatAPI.clearDiscussion();
            setMessages([]);
        } catch (error) {
            alert(error.response?.data?.message || 'Discussion clear nahi ho saki.');
        }
    };

    return (
        <div className="p-4 md:p-6 h-[calc(100vh-120px)] flex flex-col gap-4 bg-gray-50 dark:bg-gray-950">
            <div className="relative overflow-hidden bg-gradient-to-r from-[var(--bg-sidebar)] to-[var(--bg-sidebar-light)] rounded-2xl p-5 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-16 left-1/3 w-44 h-44 rounded-full bg-white/10 blur-3xl" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Discussion Room</h1>
                        <p className="text-white/70 text-sm">Premium group discussion for all panels.</p>
                    </div>
                </div>
                <div className="relative z-10 flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-white/15 border border-white/20 text-xs font-black flex items-center gap-2 text-white">
                        <Users className="w-4 h-4 text-white" />
                        {messages.length} Messages
                    </div>
                    {isAdmin && (
                        <button
                            onClick={clearAll}
                            className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/25 text-xs font-black flex items-center gap-2 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading discussion...
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-white dark:bg-gray-950">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                                <MessageSquare className="w-16 h-16 mb-3 opacity-30" />
                                <p className="font-black uppercase tracking-widest">No discussion yet</p>
                                <p className="text-sm">Pehla message send karein.</p>
                            </div>
                        ) : messages.map((msg) => {
                            const sender = msg.sender || {};
                            const mine = String(sender._id) === String(myId)
                                || (!!myEmail && (sender.email || '').toLowerCase() === myEmail)
                                || (!!myRollNo && (sender.rollNo || '').toLowerCase() === myRollNo);
                            const online = isUserOnline(sender.lastSeen);
                            return (
                                <div key={msg._id} className={`flex items-start gap-4 ${mine ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                                    <div className="relative shrink-0">
                                        <img
                                            src={sender.photo || user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(sender.name || 'User')}&background=1e1f21&color=fff`}
                                            alt={sender.name || 'User'}
                                            className="w-11 h-11 rounded-full object-cover border border-primary/50 shadow-sm"
                                        />
                                        {online && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-950 shadow-[0_0_10px_rgba(34,197,94,0.9)]" />
                                        )}
                                    </div>
                                    <div className={`min-w-0 max-w-[calc(100%-64px)] sm:max-w-[72%] ${mine ? 'ml-auto' : 'mr-auto'}`}>
                                        <div className={`group relative rounded-xl ${
                                            mine
                                                ? 'bg-primary/5 border-primary/15'
                                                : 'bg-gray-50 dark:bg-[#1e1f21] border-gray-100 dark:border-white/[0.06]'
                                        } border px-5 py-4 shadow-sm overflow-hidden ${
                                            mine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                                        }`}>
                                            <span className={`absolute top-3 bottom-3 w-[3px] rounded-full bg-primary/60 ${mine ? 'right-0' : 'left-0'}`} />
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-sm font-black text-gray-900 dark:text-white truncate">
                                                        {sender.name || 'User'}
                                                    </span>
                                                    {sender.rollNo && (
                                                        <span className="shrink-0 text-[11px] font-bold text-gray-500 dark:text-[#8E9297]">
                                                            #{sender.rollNo}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-normal text-gray-800 dark:text-white">{msg.text}</p>
                                            <p className="text-[10px] mt-3 text-right font-semibold text-gray-500 dark:text-[#8E9297]">
                                                {new Date(msg.createdAt).toLocaleString('en-US', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </p>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => deleteMessage(msg._id)}
                                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/15 text-red-200 border border-red-500/20 shadow-lg hidden group-hover:flex items-center justify-center hover:bg-red-500/25"
                                                    title="Delete message"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}

                <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#171819] flex gap-3">
                    <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Discussion room mein message type karein..."
                        className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#1e1f21] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#8E9297] outline-none focus:border-primary/70"
                    />
                    <button
                        disabled={!newMessage.trim() || sending}
                        className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DiscussionRoom;
