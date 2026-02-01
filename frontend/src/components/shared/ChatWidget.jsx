import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import {
    MessageCircle, X, Send, User, ShieldCheck,
    Bell, ChevronLeft, Loader2, Search, Trash2
} from 'lucide-react';
import { chatAPI, userAPI } from '../../services/api';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

const ChatWidget = () => {
    const { user, isAuthenticated } = useSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState(false);
    const [activeChat, setActiveChat] = useState(null); // { userId, userName }
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [adminUser, setAdminUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all | student | intern | teacher | job
    const [tabUnreadCounts, setTabUnreadCounts] = useState({});
    const [allUsers, setAllUsers] = useState([]); // List of all verified users for the active tab (unified directory)

    const socketRef = useRef();
    const scrollRef = useRef();
    const activeChatRef = useRef(activeChat);
    const isOpenRef = useRef(isOpen);
    const myIdRef = useRef((user.id || user._id || '').toString());
    const [incomingNotify, setIncomingNotify] = useState(null); // { senderName, text }

    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        myIdRef.current = (user.id || user._id || '').toString();
    }, [user.id, user._id]);

    // Show for all authenticated users
    const shouldShow = isAuthenticated;

    useEffect(() => {
        if (!shouldShow) return;

        // Initialize Socket
        socketRef.current = io(SOCKET_URL, {
            withCredentials: true
        });

        const myId = user.id || user._id;
        socketRef.current.emit('join_chat', myId);

        socketRef.current.on('new_global_message', (data) => {
            const myIdStr = myIdRef.current;
            const senderIdRaw = data.senderId || data.sender?._id || data.sender;
            const recipientIdRaw = data.recipientId || data.recipient?._id || data.recipient;

            if (!senderIdRaw || !recipientIdRaw) return;

            const senderId = String(senderIdRaw);
            const recipientId = String(recipientIdRaw);

            // The 'other side' of the conversation
            const otherSideId = senderId === myIdStr ? recipientId : senderId;

            // Use refs to check state without re-binding listener
            const currentActive = activeChatRef.current;
            const isCurrentlyOpen = isOpenRef.current;
            const currentActiveId = currentActive?.userId ? String(currentActive.userId) : null;

            // Debug log (optional but helpful)
            // console.log('Socket Message:', { senderId, otherSideId, currentActiveId, isCurrentlyOpen });

            // If we are currently chatting with this user (Active Chat matches sender/recipient)
            if (currentActiveId === otherSideId) {
                setMessages(prev => {
                    // Prevent duplicates
                    if (prev.some(m => m._id === data._id)) return prev;
                    return [...prev, data];
                });

                // If the widget is ALSO open, mark as read immediately
                if (isCurrentlyOpen) {
                    chatAPI.markAsRead(otherSideId)
                        .then(() => fetchUnreadCount())
                        .catch(console.error);
                } else {
                    // If widget is closed but active chat is set (minimized?), show notification
                    // But usually activeChat implies intention to see
                    // We'll treat it as "Background" update if not open
                    setIncomingNotify({
                        senderName: data.senderName || 'New Message',
                        text: data.text
                    });
                    setUnreadCount(prev => prev + 1);
                }
            } else {
                // Not the active chat
                if (recipientId === myIdStr) {
                    setUnreadCount(prev => prev + 1);

                    setIncomingNotify({
                        senderName: data.senderName || 'New Message',
                        text: data.text
                    });
                    // Clear notification after 5s
                    setTimeout(() => setIncomingNotify(null), 5000);
                }

                // Sync lists
                setTimeout(() => {
                    fetchUnreadCount();
                    if (user?.role === 'admin') {
                        fetchConversations();
                    }
                }, 500);
            }
        });

        // Initial data fetch
        fetchUnreadCount();
        if (user?.role !== 'admin') {
            fetchAdmin();
            // Also fetch messages/check for existing conversation
            const checkExistingChat = async () => {
                try {
                    const res = await userAPI.getVerifiedByRole('admin');
                    if (res.data.data && res.data.data.length > 0) {
                        const admin = res.data.data[0];
                        const msgRes = await chatAPI.getMessages(admin._id);
                        if (msgRes.data.data && msgRes.data.data.length > 0) {
                            startChat(admin);
                        }
                    }
                } catch (e) {
                    console.error('Error checking existing chat:', e);
                }
            };
            checkExistingChat();
        } else if (user?.role === 'admin') {
            fetchConversations();
        }

        return () => {
            socketRef.current?.disconnect();
        };
    }, [shouldShow, user?.role, (user.id || user._id)]);

    const scrollToBottom = (instant = false) => {
        if (!scrollRef.current) return;
        const container = scrollRef.current.parentElement;
        if (!container) return;

        const performScroll = () => {
            container.scrollTop = container.scrollHeight;
        };

        if (instant) {
            performScroll();
        } else {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }

        // Multi-trigger to handle layout shifts/images
        setTimeout(performScroll, 50);
        setTimeout(performScroll, 200);
        setTimeout(performScroll, 500);
    };

    useEffect(() => {
        if (isOpen && (activeChat || messages.length > 0)) {
            scrollToBottom(messages.length <= 1);
        }
    }, [messages, activeChat, isOpen]);

    const fetchUnreadCount = async () => {
        try {
            const res = await chatAPI.getUnread();
            setUnreadCount(res.data.count);
        } catch (e) {
            console.error('Error fetching unread count:', e);
        }
    };

    const fetchAdmin = async () => {
        try {
            const res = await userAPI.getVerifiedByRole('admin');
            if (res.data.data && res.data.data.length > 0) {
                setAdminUser(res.data.data[0]);
            }
        } catch (e) {
            console.error('Error fetching admin:', e);
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await chatAPI.getConversations();
            const convs = res.data.data || [];
            setConversations(convs);

            // Calculate unread counts per role
            const counts = {
                student: 0,
                intern: 0,
                teacher: 0,
                job: 0
            };

            convs.forEach(c => {
                if (c.unreadCount > 0 && c.user.role) {
                    // Normalize role to lowercase to handle potential inconsistencies
                    const role = c.user.role.toLowerCase();
                    counts[role] = (counts[role] || 0) + c.unreadCount;
                }
            });
            setTabUnreadCounts(counts);

            // Also update total unread count for badge
            fetchUnreadCount();
        } catch (e) {
            console.error('Error fetching conversations:', e);
        }
    };

    const fetchAllUsersByRole = async (role) => {
        try {
            const res = await userAPI.getVerifiedByRole(role === 'all' ? 'student' : role); // Default to student for 'all' or specific role
            // If role is 'all', maybe we just show students or we need a multi-role fetch
            // For now, let's fetch based on the selected tab
            if (role === 'all') {
                // In 'All' tab, we primarily show recent conversations. 
                // To start a 'New Chat', users should pick a specific role tab.
                setAllUsers([]);
                return;
            }
            setAllUsers(res.data.data || []);
        } catch (e) {
            console.error('Error fetching all users:', e);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin' && activeTab !== 'all') {
            fetchAllUsersByRole(activeTab);
        } else {
            setAllUsers([]);
        }
    }, [activeTab]);

    const fetchMessages = async (otherUserId) => {
        setIsLoading(true);
        try {
            const res = await chatAPI.getMessages(otherUserId);
            setMessages(res.data.data || []);

            // Mark as read and update badge
            chatAPI.markAsRead(otherUserId)
                .then(() => {
                    fetchUnreadCount();
                    if (user?.role === 'admin') fetchConversations();
                })
                .catch(console.error);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const recipientId = user?.role === 'admin' ? activeChat.userId : adminUser?._id;

        if (!newMessage.trim() || !recipientId) return;

        const text = newMessage;
        setNewMessage('');

        try {
            const res = await chatAPI.sendMessage(recipientId, text);
            const savedMsg = res.data.data;

            // Optimistic update: Add message to local state immediately
            if (activeChat && activeChat.userId.toString() === recipientId.toString()) {
                setMessages(prev => {
                    if (prev.some(m => m._id === savedMsg._id)) return prev;
                    return [...prev, savedMsg];
                });
            }

            // Backend now handles socket emission to both parties
            if (user?.role === 'admin') {
                fetchConversations();
            }

        } catch (e) {
            console.error('Error sending message:', e);
        }
    };

    const handleDeleteChat = async () => {
        const confirmClear = confirm(
            "⚠️ CLEAR CHAT HISTORY ONLY?\n\n" +
            "This will permanently remove all messages with this user.\n" +
            "The user account will NOT be deleted and will remain in the 'Students/Teachers' sections.\n\n" +
            "Proceed?"
        );
        if (!confirmClear) return;

        try {
            console.log('[ChatWidget] Calling chatAPI.clearChatHistory...');
            const res = await chatAPI.clearChatHistory(activeChat.userId);
            alert(
                `✅ Success: Chat history cleared.\n\n` +
                `The user has been removed from the "Recent" list because there are no messages.\n` +
                `You can find them again in the "Students", "Teachers", or "Freelancers" tabs to start a new chat.`
            );
            closeChat();
            fetchConversations();
        } catch (e) {
            console.error('Error deleting chat:', e);
            alert('Failed to clear chat history');
        }
    };

    const startChat = (targetUser) => {
        if (!targetUser) return;
        const targetId = targetUser._id || targetUser.userId || targetUser.id;
        if (!targetId) {
            console.error('StartChat failed: No ID found for user', targetUser);
            return;
        }

        setActiveChat({
            userId: targetId,
            userName: targetUser.name || targetUser.user?.name || 'User'
        });
        fetchMessages(targetId);
    };

    const closeChat = () => {
        setActiveChat(null);
        setMessages([]);
        setIsOpen(false); // Fully close the widget
    };

    if (!shouldShow) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-full max-w-[95vw] md:w-[600px] bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[800px] max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-purple-600 p-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {activeChat ? (
                                    <button
                                        onClick={closeChat}
                                        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 group"
                                    >
                                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                        <span className="font-bold text-sm">Back</span>
                                    </button>
                                ) : (
                                    <div className="w-14 h-14 bg-white/20 rounded-[1.25rem] flex items-center justify-center shadow-inner">
                                        <MessageCircle className="w-7 h-7" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-xl leading-none">
                                        {activeChat ? activeChat.userName : 'Message Center'}
                                    </h3>
                                    <p className="text-[12px] text-purple-100 uppercase tracking-[0.2em] font-black mt-1.5 opacity-80">
                                        {activeChat ? 'Direct Message' : (user?.role === 'admin' ? 'Recent Conversations' : 'Support Chat')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeChat && user?.role === 'admin' && (
                                    <button
                                        onClick={handleDeleteChat}
                                        className="p-3 hover:bg-white/10 rounded-full transition-all text-white/80 hover:text-white hover:bg-red-500/20"
                                        title="Clear Chat History (Messages Only)"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-white/10 rounded-full transition-all hover:rotate-90">
                                    <X className="w-7 h-7" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
                            {!activeChat ? (
                                // Conversation List (Admin) or Welcome (Jober)
                                <div className="p-4 space-y-4 flex-1">
                                    {user?.role === 'admin' ? (
                                        <>
                                            <div className="relative mb-4">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search users..."
                                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>

                                            {/* Tabs */}
                                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                                {[
                                                    { id: 'all', label: 'Recent' },
                                                    { id: 'student', label: 'Students' },
                                                    { id: 'intern', label: 'Interns' },
                                                    { id: 'teacher', label: 'Teachers' },
                                                    { id: 'job', label: 'Freelancers' }
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setActiveTab(tab.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === tab.id
                                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                                                            : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
                                                            }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {(() => {
                                                // Unified Logic: Merge conversations + allUsers
                                                let displayedItems = [];

                                                if (activeTab === 'all') {
                                                    // Just show existing conversations
                                                    displayedItems = conversations.map(c => ({
                                                        ...c,
                                                        isConvo: true,
                                                        userObj: c.user
                                                    }));
                                                } else {
                                                    // Map of existing convos for this tab for easy lookup
                                                    const convoMap = new Map();
                                                    conversations.filter(c => c.user && c.user.role === activeTab).forEach(c => {
                                                        const uid = c.user?._id || c._id;
                                                        if (uid) convoMap.set(uid.toString(), c);
                                                    });

                                                    // Merge: All users from directory
                                                    allUsers.forEach(u => {
                                                        const id = (u._id || u.id).toString();
                                                        if (convoMap.has(id)) {
                                                            const c = convoMap.get(id);
                                                            displayedItems.push({
                                                                ...c,
                                                                isConvo: true,
                                                                userObj: c.user
                                                            });
                                                            convoMap.delete(id); // Remove to avoid duplicates
                                                        } else {
                                                            displayedItems.push({
                                                                _id: u._id || u.id,
                                                                userObj: u,
                                                                isConvo: false,
                                                                unreadCount: 0,
                                                                lastMessage: 'No messages yet',
                                                                lastMessageAt: null
                                                            });
                                                        }
                                                    });

                                                    // Any convos left that weren't in allUsers (unlikely but safe)
                                                    convoMap.forEach(c => {
                                                        displayedItems.push({
                                                            ...c,
                                                            isConvo: true,
                                                            userObj: c.user
                                                        });
                                                    });
                                                }

                                                // Final Filter & Sort
                                                const filtered = displayedItems
                                                    .filter(item => {
                                                        const name = item.userObj?.name || '';
                                                        return name.toLowerCase().includes(searchQuery.toLowerCase());
                                                    })
                                                    .sort((a, b) => {
                                                        // Sort by most recent first
                                                        if (a.lastMessageAt && b.lastMessageAt) {
                                                            return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
                                                        }
                                                        if (a.lastMessageAt) return -1;
                                                        if (b.lastMessageAt) return 1;
                                                        // Fallback to name
                                                        return a.userObj.name.localeCompare(b.userObj.name);
                                                    });

                                                if (filtered.length === 0) {
                                                    return (
                                                        <div className="text-center py-32 opacity-20">
                                                            <MessageCircle className="w-20 h-20 mx-auto mb-4" />
                                                            <p className="text-lg font-black uppercase tracking-tighter">No users found</p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="grid gap-3">
                                                        {filtered.map((item) => (
                                                            <button
                                                                key={item._id}
                                                                onClick={() => startChat(item.userObj)}
                                                                className="w-full p-5 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-100 transition-all flex items-center gap-5 text-left group relative overflow-hidden"
                                                            >
                                                                {/* Activity Indicator */}
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-purple-600 transition-all" />

                                                                <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center text-purple-600 font-black text-xl shadow-inner text-center">
                                                                    {(item.userObj?.name || 'U').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-black text-gray-900 truncate text-base group-hover:text-purple-600 transition-colors">
                                                                                {item.userObj?.name || 'Unknown User'}
                                                                            </h4>
                                                                            <span className="px-2 py-0.5 bg-gray-100 text-[10px] rounded-lg font-bold text-gray-500 uppercase tracking-wider">
                                                                                {item.userObj.role || 'User'}
                                                                            </span>
                                                                        </div>
                                                                        {item.lastMessageAt && (
                                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                                                {new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <p className={`text-sm truncate pr-4 ${item.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                                                            {item.lastMessage}
                                                                        </p>
                                                                        {item.unreadCount > 0 && (
                                                                            <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white text-[11px] rounded-xl flex items-center justify-center font-black shadow-lg shadow-purple-200">
                                                                                {item.unreadCount}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        <div className="text-center py-10 space-y-6 flex-1 flex flex-col justify-center">
                                            <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                                <ShieldCheck className="w-10 h-10 text-purple-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-900">Contact Admin</h4>
                                                <p className="text-sm text-gray-500 px-6">
                                                    Have a question or need help with a task? Chat directly with our administration team.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => adminUser && startChat(adminUser)}
                                                disabled={!adminUser}
                                                className="mx-auto w-40 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-900/10 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                            >
                                                {adminUser ? (
                                                    <>
                                                        <MessageCircle className="w-4 h-4" />
                                                        Chat Now
                                                    </>
                                                ) : (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Chat Window
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                            </div>
                                        ) : (
                                            messages.map((msg, index) => {
                                                const myId = (user.id || user._id).toString();
                                                const senderId = (msg.sender?._id || msg.sender || msg.senderId).toString();
                                                const isMe = senderId === myId;

                                                return (
                                                    <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-[15px] shadow-sm leading-relaxed ${isMe
                                                            ? 'bg-purple-600 text-white rounded-tr-none shadow-purple-100'
                                                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none pr-6'
                                                            }`}>
                                                            {msg.text}
                                                        </div>
                                                        <span className={`text-[10px] text-gray-400 mt-1.5 px-1 font-bold uppercase tracking-wider ${isMe ? 'mr-1' : 'ml-1'}`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={scrollRef} />
                                    </div>

                                    {/* Input */}
                                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Incoming Message Notification */}
            <AnimatePresence>
                {incomingNotify && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 50, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 50, scale: 0.8 }}
                        onClick={() => {
                            setIsOpen(true);
                            setIncomingNotify(null);
                        }}
                        className="absolute bottom-20 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-purple-100 p-4 cursor-pointer hover:bg-purple-50 transition-colors z-50 flex items-start gap-3"
                    >
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-0.5">{incomingNotify.senderName}</p>
                            <p className="text-sm text-gray-700 truncate font-medium">{incomingNotify.text}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIncomingNotify(null); }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all relative ${isOpen ? 'bg-white text-purple-600 rotate-90' : 'bg-purple-600 text-white'
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center font-bold">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </motion.button>
        </div >
    );
};

export default ChatWidget;
