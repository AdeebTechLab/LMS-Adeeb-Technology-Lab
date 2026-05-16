import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Video, VideoOff, Mic, MicOff, Share2, MessageSquare, 
    Users, X, LogOut, ShieldCheck, Send, Monitor, 
    MoreVertical, UserMinus, VolumeX, Hand, LayoutGrid, 
    Maximize2, Sidebar as SidebarIcon
} from 'lucide-react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import toast from 'react-hot-toast';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

const AdeebMeet = () => {
    const { roomName } = useParams();
    const navigate = useNavigate();
    const { user, role } = useSelector((state) => state.auth);
    
    // UI States
    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(true);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [layout, setLayout] = useState('grid'); // 'grid' or 'sidebar'
    
    // WebRTC & Socket States
    const [peers, setPeers] = useState([]); // [{ peerId, peer, userDetails }]
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const userStream = useRef();
    const screenStream = useRef();
    const chatEndRef = useRef();

    const isTeacher = role === 'teacher' || role === 'admin';

    const cleanupResources = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        if (userStream.current) {
            userStream.current.getTracks().forEach(track => track.stop());
            userStream.current = null;
        }
        if (screenStream.current) {
            screenStream.current.getTracks().forEach(track => track.stop());
            screenStream.current = null;
        }
        peersRef.current.forEach(({ peer }) => {
            try { peer.destroy(); } catch (e) {}
        });
        peersRef.current = [];
        setPeers([]);
    }, []);

    const leaveClass = () => {
        cleanupResources();
        navigate(`/${role}/dashboard`);
    };

    const createPeer = (userToSignal, callerId, stream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('classroom_signal', { 
                to: userToSignal, 
                from: callerId, 
                signal,
                userDetails: {
                    id: user?._id || user?.id,
                    name: user?.name,
                    photo: user?.photo,
                    role: role
                }
            });
        });

        return peer;
    };

    const addPeer = (incomingSignal, callerId, stream) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socketRef.current.emit('classroom_signal', { to: callerId, signal });
        });

        peer.signal(incomingSignal);

        return peer;
    };

    useEffect(() => {
        const init = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Secure context (HTTPS) required for video calling.');
                }

                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, 
                        audio: true 
                    });
                } catch (e) {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                }

                userStream.current = stream;
                if (userVideo.current) userVideo.current.srcObject = stream;

                socketRef.current = io(SOCKET_URL, { withCredentials: true });

                const userDetails = {
                    id: user?._id || user?.id,
                    name: user?.name || 'Guest',
                    photo: user?.photo || null,
                    role: role || 'student'
                };

                socketRef.current.emit('join_classroom', roomName, userDetails);
                setIsLoading(false);

                socketRef.current.on('existing_classroom_users', (users) => {
                    const peersList = [];
                    users.forEach(({ socketId, userDetails: otherUser }) => {
                        const peer = createPeer(socketId, socketRef.current.id, stream);
                        const peerObj = { peerId: socketId, peer, userDetails: otherUser };
                        peersRef.current.push(peerObj);
                        peersList.push(peerObj);
                    });
                    setPeers(peersList);
                });

                socketRef.current.on('classroom_signal', (payload) => {
                    const item = peersRef.current.find(p => p.peerId === payload.from);
                    if (item) {
                        item.peer.signal(payload.signal);
                    } else if (payload.signal.type === 'offer') {
                        // Handshake initiated by new joiner
                        const peer = addPeer(payload.signal, payload.from, stream);
                        const newPeerObj = {
                            peerId: payload.from,
                            peer,
                            userDetails: payload.userDetails
                        };
                        peersRef.current.push(newPeerObj);
                        setPeers(prev => [...prev, newPeerObj]);
                    }
                });

                socketRef.current.on('user_left_classroom', (socketId) => {
                    const peerObj = peersRef.current.find(p => p.peerId === socketId);
                    if (peerObj) peerObj.peer.destroy();
                    const updatedPeers = peersRef.current.filter(p => p.peerId !== socketId);
                    peersRef.current = updatedPeers;
                    setPeers(updatedPeers);
                });

                socketRef.current.on('classroom_message', (data) => {
                    setMessages(prev => [...prev, data]);
                });

                socketRef.current.on('teacher_action', (data) => {
                    if (data.action === 'mute_all' && !isTeacher) {
                        toggleMute(true);
                        toast.error('Teacher muted everyone');
                    }
                });

                socketRef.current.on('class_ended_by_teacher', () => {
                    toast.error('The teacher has ended the class');
                    leaveClass();
                });

            } catch (err) {
                console.error('Error:', err);
                toast.error(err.message);
                setIsLoading(false);
            }
        };

        init();

        return () => {
            // ONLY cleanup, NO navigation here
            if (socketRef.current) socketRef.current.disconnect();
            if (userStream.current) userStream.current.getTracks().forEach(track => track.stop());
            peersRef.current.forEach(({ peer }) => { try { peer.destroy(); } catch(e){} });
        };
    }, [roomName]);

    const toggleMute = (force) => {
        const newState = force !== undefined ? force : !isMuted;
        if (userStream.current) {
            userStream.current.getAudioTracks()[0].enabled = !newState;
            setIsMuted(newState);
        }
    };

    const toggleVideo = () => {
        if (userStream.current) {
            userStream.current.getVideoTracks()[0].enabled = isVideoOff;
            setIsVideoOff(!isVideoOff);
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const stream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
                screenStream.current = stream;
                
                // Replace track in all peers
                const videoTrack = stream.getVideoTracks()[0];
                peersRef.current.forEach(({ peer }) => {
                    peer.replaceTrack(userStream.current.getVideoTracks()[0], videoTrack, userStream.current);
                });

                // When sharing stops via browser UI
                videoTrack.onended = () => stopScreenSharing();
                
                if (userVideo.current) userVideo.current.srcObject = stream;
                setIsScreenSharing(true);
            } else {
                stopScreenSharing();
            }
        } catch (err) {
            console.error('Screen sharing failed:', err);
        }
    };

    const stopScreenSharing = () => {
        if (screenStream.current) {
            screenStream.current.getTracks().forEach(track => track.stop());
            const videoTrack = userStream.current.getVideoTracks()[0];
            peersRef.current.forEach(({ peer }) => {
                peer.replaceTrack(screenStream.current.getVideoTracks()[0], videoTrack, userStream.current);
            });
            if (userVideo.current) userVideo.current.srcObject = userStream.current;
            setIsScreenSharing(false);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const data = {
            roomId: roomName,
            text: newMessage,
            senderId: user?._id || user?.id,
            senderName: user?.name,
            senderPhoto: user?.photo,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socketRef.current.emit('classroom_message', data);
        setNewMessage('');
    };

    const endClassForEveryone = () => {
        if (!isTeacher) return;
        if (window.confirm('End class for everyone?')) {
            socketRef.current.emit('teacher_control', { roomId: roomName, action: 'end_class' });
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getAvatar = (photo, name) => {
        if (photo) {
            const serverUrl = SOCKET_URL;
            return photo.startsWith('http') ? photo : `${serverUrl}/${photo}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    };

    return (
        <div className="fixed inset-0 bg-[#0f0f0f] text-white flex flex-col font-sans select-none">
            {/* Top Bar */}
            <header className="h-14 bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-30">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                        <img src="/logo.png" alt="Adeeb" className="w-6 h-6 brightness-0 invert" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tighter italic flex items-center gap-2">
                            Adeeb Classroom <span className="bg-red-500 text-[9px] px-1.5 py-0.5 rounded-full not-italic">LIVE</span>
                        </h2>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">ID: {roomName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Secure Session</span>
                    </div>
                    <button 
                        onClick={leaveClass}
                        className="px-4 py-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-500 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Exit
                    </button>
                    {isTeacher && (
                        <button 
                            onClick={endClassForEveryone}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-rose-900/20"
                        >
                            End Class
                        </button>
                    )}
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* Video Area */}
                <div className={`flex-1 p-4 transition-all duration-500 ${layout === 'grid' ? 'overflow-y-auto' : 'flex gap-4'}`}>
                    <div className={`grid gap-4 h-full ${
                        layout === 'grid' 
                        ? `grid-cols-1 ${peers.length > 0 ? (peers.length > 3 ? 'md:grid-cols-3' : 'md:grid-cols-2') : ''}`
                        : 'flex-1 grid grid-cols-1'
                    }`}>
                        {/* Local Video */}
                        <div className="relative bg-white/5 rounded-3xl overflow-hidden border border-white/10 aspect-video group">
                            <video ref={userVideo} autoPlay muted playsInline className="w-full h-full object-cover mirror" />
                            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                                <img src={getAvatar(user?.photo, user?.name)} className="w-5 h-5 rounded-full object-cover" />
                                <span className="text-[10px] font-black uppercase tracking-widest">You {isTeacher && '(Teacher)'}</span>
                                {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                            </div>
                            <AnimatePresence>
                                {isVideoOff && (
                                    <motion.div 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center"
                                    >
                                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <VideoOff className="w-10 h-10 text-white/20" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-white/40">Camera Off</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Remote Videos */}
                        {peers.map((peer) => (
                            <VideoCard key={peer.peerId} peer={peer} />
                        ))}
                    </div>

                    {/* Sidebar layout right side thumbnails */}
                    {layout === 'sidebar' && peers.length > 0 && (
                        <div className="w-64 flex flex-col gap-3 overflow-y-auto pr-2">
                             {/* Small thumbnails for other users would go here in a real sidebar layout */}
                        </div>
                    )}
                </div>

                {/* Right Panel (Chat / Participants) */}
                <AnimatePresence>
                    {(showChat || showParticipants) && (
                        <motion.aside 
                            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
                            className="w-80 bg-black/40 backdrop-blur-3xl border-l border-white/5 flex flex-col overflow-hidden z-20"
                        >
                            <div className="flex border-b border-white/5">
                                <button 
                                    onClick={() => { setShowChat(true); setShowParticipants(false); }}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${showChat ? 'text-primary border-b-2 border-primary' : 'text-white/40'}`}
                                >
                                    Chat
                                </button>
                                <button 
                                    onClick={() => { setShowChat(false); setShowParticipants(true); }}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${showParticipants ? 'text-primary border-b-2 border-primary' : 'text-white/40'}`}
                                >
                                    Participants ({peers.length + 1})
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {showChat && (
                                    <div className="space-y-4">
                                        {messages.map((msg, i) => (
                                            <div key={i} className={`flex flex-col ${msg.senderId === (user?._id || user?.id) ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[9px] font-black uppercase text-white/40">{msg.senderName}</span>
                                                    <span className="text-[8px] text-white/20">{msg.time}</span>
                                                </div>
                                                <div className={`px-4 py-2 rounded-2xl text-xs max-w-[90%] ${
                                                    msg.senderId === (user?._id || user?.id) 
                                                    ? 'bg-primary text-white rounded-tr-none' 
                                                    : 'bg-white/5 text-white/80 rounded-tl-none border border-white/10'
                                                }`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                )}

                                {showParticipants && (
                                    <div className="space-y-3">
                                        <ParticipantRow name={user?.name} role={role} photo={user?.photo} isSelf />
                                        {peers.map(p => (
                                            <ParticipantRow 
                                                key={p.peerId} 
                                                name={p.userDetails.name} 
                                                role={p.userDetails.role} 
                                                photo={p.userDetails.photo}
                                                socketId={p.peerId}
                                                isTeacher={isTeacher}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {showChat && (
                                <form onSubmit={sendMessage} className="p-4 bg-black/20 border-t border-white/5 flex gap-2">
                                    <input 
                                        type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
                                    />
                                    <button type="submit" className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors">
                                        <Send className="w-4 h-4 text-white" />
                                    </button>
                                </form>
                            )}
                        </motion.aside>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Controls */}
            <footer className="h-20 bg-black/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-between px-8 z-30">
                <div className="hidden lg:flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Connection</span>
                        <span className="text-xs font-bold text-emerald-500">Peer-to-Peer Encrypted</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 absolute left-1/2 -translate-x-1/2">
                    <ControlBtn 
                        onClick={() => toggleMute()} active={!isMuted} 
                        icon={isMuted ? MicOff : Mic} danger={isMuted} 
                        label={isMuted ? 'Unmute' : 'Mute'}
                    />
                    <ControlBtn 
                        onClick={() => toggleVideo()} active={!isVideoOff} 
                        icon={isVideoOff ? VideoOff : Video} danger={isVideoOff} 
                        label={isVideoOff ? 'Start Video' : 'Stop Video'}
                    />
                    <ControlBtn 
                        onClick={() => toggleScreenShare()} active={isScreenSharing} 
                        icon={isScreenSharing ? X : Monitor} accent={isScreenSharing}
                        label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
                    />
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    <ControlBtn 
                        onClick={() => setLayout(layout === 'grid' ? 'sidebar' : 'grid')} 
                        icon={layout === 'grid' ? SidebarIcon : LayoutGrid}
                        label="Layout"
                    />
                    <ControlBtn 
                        onClick={() => { setShowChat(!showChat); if(!showChat) setShowParticipants(false); }} 
                        active={showChat} icon={MessageSquare} 
                        label="Chat"
                    />
                    <ControlBtn 
                        onClick={() => { setShowParticipants(!showParticipants); if(!showParticipants) setShowChat(false); }} 
                        active={showParticipants} icon={Users} 
                        label="People"
                    />
                </div>

                <div className="hidden lg:flex items-center gap-4">
                    <button className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                        <Maximize2 className="w-5 h-5 text-white/40" />
                    </button>
                </div>
            </footer>

            {/* Loader */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#0f0f0f] z-[100] flex flex-col items-center justify-center"
                    >
                        <div className="w-24 h-24 bg-primary/20 rounded-[2.5rem] flex items-center justify-center mb-8 relative">
                            <img src="/logo.png" className="w-12 h-12 brightness-0 invert" />
                            <div className="absolute inset-0 border-4 border-primary rounded-[2.5rem] animate-ping opacity-20" />
                        </div>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2">Connecting to Adeeb Meet</h2>
                        <p className="text-white/40 text-sm font-bold tracking-[0.2em] uppercase">Private & Secure Node Server</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const VideoCard = ({ peer }) => {
    const videoRef = useRef();
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        peer.peer.on('stream', stream => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        });
    }, [peer]);

    const getAvatar = (photo, name) => {
        if (photo) {
            const serverUrl = getSocketURL();
            return photo.startsWith('http') ? photo : `${serverUrl}/${photo}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    };

    return (
        <div className="relative bg-white/5 rounded-3xl overflow-hidden border border-white/10 aspect-video group">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
                <img src={getAvatar(peer.userDetails.photo, peer.userDetails.name)} className="w-5 h-5 rounded-full object-cover" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {peer.userDetails.name} {peer.userDetails.role === 'teacher' && '(Teacher)'}
                </span>
            </div>
        </div>
    );
};

const ControlBtn = ({ onClick, active, icon: Icon, danger, accent, label }) => (
    <div className="flex flex-col items-center gap-1 group">
        <button 
            onClick={onClick}
            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative ${
                danger ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/40' :
                accent ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' :
                active ? 'bg-primary text-white shadow-lg shadow-orange-900/40' :
                'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
        >
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <span className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">{label}</span>
    </div>
);

const ParticipantRow = ({ name, role, photo, isSelf, isTeacher, socketId }) => {
    const getAvatar = (photo, name) => {
        if (photo) {
            const serverUrl = getSocketURL();
            return photo.startsWith('http') ? photo : `${serverUrl}/${photo}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    };

    return (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img src={getAvatar(photo, name)} className="w-8 h-8 rounded-xl object-cover border border-white/10" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">{name} {isSelf && '(You)'}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{role}</span>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isSelf && isTeacher && (
                    <>
                        <button className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors">
                            <UserMinus className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-amber-500/20 rounded-lg text-amber-500 transition-colors">
                            <VolumeX className="w-4 h-4" />
                        </button>
                    </>
                )}
                {isSelf && <Hand className="w-4 h-4 text-primary" />}
            </div>
        </div>
    );
};

export default AdeebMeet;
