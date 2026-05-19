import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    MessageSquare,
    Users,
    LogOut,
    ShieldCheck,
    Send,
    Monitor,
    UserMinus,
    VolumeX,
    LayoutGrid,
    Maximize2,
    Sidebar as SidebarIcon,
    X,
} from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { WebRTCMeetingManager } from '../../lib/adeebMeet/WebRTCMeetingManager';
import {
    buildLocalMediaStream,
    getSocketURL,
    resolveAvatarUrl,
} from '../../lib/adeebMeet/webrtcConfig';

const SOCKET_URL = getSocketURL();

const AdeebMeet = () => {
    const { roomName } = useParams();
    const navigate = useNavigate();
    const { user, role } = useSelector((state) => state.auth);

    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(true);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [layout, setLayout] = useState('grid');
    const [peers, setPeers] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    const socketRef = useRef(null);
    const managerRef = useRef(null);
    const userVideoRef = useRef(null);
    const userStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const chatEndRef = useRef(null);
    const mainContainerRef = useRef(null);

    const isTeacher = role === 'teacher' || role === 'admin';

    const leaveClass = useCallback(() => {
        managerRef.current?.destroy();
        managerRef.current = null;
        socketRef.current?.disconnect();
        socketRef.current = null;
        userStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        userStreamRef.current = null;
        screenStreamRef.current = null;
        navigate(`/${role}/dashboard`);
    }, [navigate, role]);

    useEffect(() => {
        if (!user || !roomName) return;

        let cancelled = false;

        const init = async () => {
            try {
                const { stream, hasAudio, hasVideo } = await buildLocalMediaStream();
                if (cancelled) return;

                userStreamRef.current = stream;
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = stream;
                }
                setIsMuted(!hasAudio);
                setIsVideoOff(!hasVideo);
                if (!hasAudio && !hasVideo) {
                    toast('Camera/mic unavailable — you can still listen and chat', { icon: 'ℹ️' });
                }

                const socket = io(SOCKET_URL, {
                    withCredentials: true,
                    transports: ['websocket', 'polling'],
                });
                socketRef.current = socket;

                const userDetails = {
                    id: user?._id || user?.id,
                    name: user?.name || 'Guest',
                    photo: user?.photo || null,
                    role: role || 'student',
                };

                const onClassEnded = () => {
                    toast.error('Teacher ended the class');
                    leaveClass();
                };

                const onKicked = () => {
                    toast.error('You were removed from the class');
                    leaveClass();
                };

                const onForceMute = () => {
                    managerRef.current?.setMuted(true);
                    setIsMuted(true);
                    toast('Teacher muted your microphone', { icon: '🔇' });
                };

                const startMeeting = () => {
                    if (cancelled || managerRef.current) return;
                    setConnectionStatus('connected');
                    const manager = new WebRTCMeetingManager({
                        socket,
                        mySocketId: socket.id,
                        myUserDetails: userDetails,
                        localStream: stream,
                        onPeersChange: setPeers,
                        onParticipantsChange: setParticipants,
                    });
                    manager.onClassEnded = onClassEnded;
                    manager.onKicked = onKicked;
                    manager.onForceMute = onForceMute;
                    managerRef.current = manager;
                    manager.joinRoom(roomName);
                };

                if (socket.connected) startMeeting();
                else socket.on('connect', startMeeting);

                socket.on('connect_error', () => {
                    setConnectionStatus('error');
                    toast.error('Could not connect to meeting server');
                });

                socket.on('classroom_message', (data) => {
                    setMessages((prev) => [...prev, data]);
                });

                socket.io.on('reconnect', () => {
                    toast.success('Reconnected to meeting');
                    managerRef.current?.joinRoom(roomName);
                });

                setIsLoading(false);
            } catch (err) {
                console.error('Meet init error:', err);
                toast.error('Failed to start meeting');
                setIsLoading(false);
            }
        };

        init();

        return () => {
            cancelled = true;
            managerRef.current?.destroy();
            socketRef.current?.disconnect();
            userStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, [roomName, user, role, leaveClass]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const toggleMute = () => {
        const next = !isMuted;
        managerRef.current?.setMuted(next);
        setIsMuted(next);
    };

    const toggleVideo = () => {
        const next = !isVideoOff;
        managerRef.current?.setVideoEnabled(!next);
        setIsVideoOff(next);
    };

    const toggleScreenShare = async () => {
        if (!managerRef.current) return;
        try {
            if (!isScreenSharing) {
                const displayStream = await managerRef.current.startScreenShare();
                screenStreamRef.current = displayStream;
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = displayStream;
                }
                setIsScreenSharing(true);
                toast.success('Screen sharing started');
            } else {
                await managerRef.current.stopScreenShare();
                screenStreamRef.current = null;
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = userStreamRef.current;
                }
                setIsScreenSharing(false);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Screen share failed');
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !managerRef.current) return;
        const data = {
            roomId: roomName,
            text: newMessage.trim(),
            senderId: user?._id || user?.id,
            senderName: user?.name,
            senderPhoto: user?.photo,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        managerRef.current.sendChatMessage(roomName, data);
        setMessages((prev) => [...prev, data]);
        setNewMessage('');
    };

    const endClassForEveryone = () => {
        if (!isTeacher || !window.confirm('End class for everyone?')) return;
        managerRef.current?.endClassForEveryone();
        leaveClass();
    };

    const toggleFullscreen = () => {
        const el = mainContainerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen?.().catch(() => toast.error('Fullscreen not supported'));
        } else {
            document.exitFullscreen?.();
        }
    };

    const totalTiles = 1 + peers.length;
    const gridClass =
        layout === 'grid'
            ? totalTiles === 1
                ? 'grid-cols-1 max-w-4xl mx-auto'
                : totalTiles === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : totalTiles <= 4
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1';

    const avatar = (photo, name) => resolveAvatarUrl(photo, name, SOCKET_URL);

    return (
        <motion.div
            ref={mainContainerRef}
            className="fixed inset-0 bg-[#0f0f0f] text-white flex flex-col font-sans select-none adeeb-meet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <header className="h-14 bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 md:px-6 z-30 shrink-0">
                <motion.div
                    className="flex items-center gap-3"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                >
                    <motion.div
                        className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30"
                        whileHover={{ scale: 1.05 }}
                    >
                        <img src="/logo.png" alt="Adeeb" className="w-6 h-6 brightness-0 invert" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h2 className="text-sm font-black uppercase tracking-tighter italic flex items-center gap-2">
                            Adeeb Meet
                            <span className="bg-red-500 text-[9px] px-1.5 py-0.5 rounded-full not-italic animate-pulse">
                                LIVE
                            </span>
                        </h2>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                            Room: {roomName} · {participants.length} joined
                        </p>
                    </motion.div>
                </motion.div>

                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                        <ShieldCheck
                            className={`w-4 h-4 ${connectionStatus === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`}
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            {connectionStatus === 'connected' ? 'Connected' : 'Connecting…'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={leaveClass}
                        className="px-3 py-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Leave
                    </button>
                    {isTeacher && (
                        <button
                            type="button"
                            onClick={endClassForEveryone}
                            className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            End Class
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden min-h-0">
                <div className="flex-1 p-3 md:p-4 overflow-y-auto min-h-0">
                    <div className={`grid gap-3 md:gap-4 ${gridClass}`}>
                        <VideoTile
                            stream={isScreenSharing ? screenStreamRef.current : userStreamRef.current}
                            name={`You${isTeacher ? ' (Teacher)' : ''}`}
                            photo={user?.photo}
                            isMuted={isMuted}
                            isVideoOff={isVideoOff && !isScreenSharing}
                            isLocal
                            isScreenShare={isScreenSharing}
                            videoRef={userVideoRef}
                            avatarUrl={avatar(user?.photo, user?.name)}
                        />

                        {peers.map((peer) => (
                            <RemoteVideoTile
                                key={peer.peerId}
                                peer={peer}
                                avatarUrl={avatar(peer.userDetails?.photo, peer.userDetails?.name)}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    {(showChat || showParticipants) && (
                        <motion.aside
                            initial={{ x: 320, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 320, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="w-full max-w-[320px] bg-black/50 backdrop-blur-3xl border-l border-white/5 flex flex-col shrink-0"
                        >
                            <motion.div
                                className="flex border-b border-white/5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowChat(true);
                                        setShowParticipants(false);
                                    }}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${showChat ? 'text-primary border-b-2 border-primary' : 'text-white/40'}`}
                                >
                                    Chat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowChat(false);
                                        setShowParticipants(true);
                                    }}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${showParticipants ? 'text-primary border-b-2 border-primary' : 'text-white/40'}`}
                                >
                                    People ({participants.length})
                                </button>
                            </motion.div>

                            <motion.div
                                className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.05 }}
                            >
                                {showChat && (
                                    <div className="space-y-3">
                                        {messages.length === 0 && (
                                            <p className="text-xs text-white/30 text-center py-8">
                                                No messages yet. Say hello!
                                            </p>
                                        )}
                                        {messages.map((msg, i) => (
                                            <motion.div
                                                key={`${msg.time}-${i}`}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex flex-col ${msg.senderId === (user?._id || user?.id) ? 'items-end' : 'items-start'}`}
                                            >
                                                <span className="text-[9px] text-white/40 mb-1">
                                                    {msg.senderName} · {msg.time}
                                                </span>
                                                <motion.div
                                                    whileHover={{ scale: 1.01 }}
                                                    className={`px-3 py-2 rounded-2xl text-xs max-w-[95%] ${
                                                        msg.senderId === (user?._id || user?.id)
                                                            ? 'bg-primary text-white rounded-tr-sm'
                                                            : 'bg-white/5 border border-white/10 rounded-tl-sm'
                                                    }`}
                                                >
                                                    {msg.text}
                                                </motion.div>
                                            </motion.div>
                                        ))}
                                        <motion.div ref={chatEndRef} />
                                    </div>
                                )}

                                {showParticipants && (
                                    <div className="space-y-2">
                                        {participants.map((p) => (
                                            <ParticipantRow
                                                key={p.socketId}
                                                name={p.userDetails?.name || 'Guest'}
                                                role={p.userDetails?.role || 'student'}
                                                photo={p.userDetails?.photo}
                                                isSelf={p.socketId === socketRef.current?.id}
                                                isTeacher={isTeacher}
                                                onKick={() => {
                                                    if (window.confirm(`Remove ${p.userDetails?.name}?`)) {
                                                        managerRef.current?.kickUser(p.socketId);
                                                    }
                                                }}
                                                onMute={() => managerRef.current?.muteUser(p.socketId)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>

                            {showChat && (
                                <motion.form
                                    onSubmit={sendMessage}
                                    className="p-3 border-t border-white/5 flex gap-2 shrink-0"
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                >
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Message everyone…"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
                                    />
                                    <motion.button
                                        type="submit"
                                        whileTap={{ scale: 0.95 }}
                                        className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"
                                    >
                                        <Send className="w-4 h-4" />
                                    </motion.button>
                                </motion.form>
                            )}
                        </motion.aside>
                    )}
                </AnimatePresence>
            </main>

            <footer className="h-[72px] md:h-20 bg-black/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-center px-4 z-30 shrink-0">
                <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-center">
                    <ControlBtn
                        onClick={toggleMute}
                        active={!isMuted}
                        icon={isMuted ? MicOff : Mic}
                        danger={isMuted}
                        label={isMuted ? 'Unmute' : 'Mute'}
                    />
                    <ControlBtn
                        onClick={toggleVideo}
                        active={!isVideoOff}
                        icon={isVideoOff ? VideoOff : Video}
                        danger={isVideoOff}
                        label={isVideoOff ? 'Camera on' : 'Camera off'}
                    />
                    <ControlBtn
                        onClick={toggleScreenShare}
                        active={isScreenSharing}
                        icon={isScreenSharing ? X : Monitor}
                        accent={isScreenSharing}
                        label={isScreenSharing ? 'Stop share' : 'Share screen'}
                    />
                    <motion.div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />
                    <ControlBtn
                        onClick={() => setLayout(layout === 'grid' ? 'sidebar' : 'grid')}
                        icon={layout === 'grid' ? SidebarIcon : LayoutGrid}
                        label="Layout"
                    />
                    <ControlBtn
                        onClick={() => {
                            setShowChat((c) => !c);
                            if (!showChat) setShowParticipants(false);
                        }}
                        active={showChat}
                        icon={MessageSquare}
                        label="Chat"
                    />
                    <ControlBtn
                        onClick={() => {
                            setShowParticipants((p) => !p);
                            if (!showParticipants) setShowChat(false);
                        }}
                        active={showParticipants}
                        icon={Users}
                        label="People"
                    />
                    <ControlBtn onClick={toggleFullscreen} icon={Maximize2} label="Fullscreen" />
                </div>
            </footer>

            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#0f0f0f] z-[100] flex flex-col items-center justify-center"
                    >
                        <motion.div
                            className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mb-6 relative"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <img src="/logo.png" alt="" className="w-10 h-10 brightness-0 invert" />
                            <motion.div
                                className="absolute inset-0 border-2 border-primary rounded-3xl"
                                animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                        </motion.div>
                        <h2 className="text-lg font-black uppercase italic tracking-tight">
                            Joining Adeeb Meet
                        </h2>
                        <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">
                            Setting up camera & microphone…
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const VideoTile = ({
    stream,
    name,
    isMuted,
    isVideoOff,
    isLocal,
    isScreenShare,
    videoRef,
    avatarUrl,
}) => {
    const internalRef = useRef(null);
    const ref = videoRef || internalRef;

    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
        }
    }, [stream, ref]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white/5 rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 aspect-video min-h-[180px] group shadow-xl"
        >
            <video
                ref={ref}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full object-cover bg-[#1a1a1a] ${isLocal && !isScreenShare ? 'mirror' : ''}`}
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10">
                <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                <span className="text-[10px] font-bold truncate max-w-[140px]">{name}</span>
                {isMuted && <MicOff className="w-3 h-3 text-red-400 shrink-0" />}
                {isScreenShare && (
                    <span className="text-[8px] bg-emerald-500/80 px-1 rounded uppercase font-black">
                        Screen
                    </span>
                )}
            </div>
            <AnimatePresence>
                {isVideoOff && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center"
                    >
                        <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full border-4 border-white/10 mb-3" />
                        <span className="text-xs text-white/40 font-bold uppercase tracking-widest">
                            Camera off
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const RemoteVideoTile = ({ peer, avatarUrl }) => {
    const videoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoOff, setIsVideoOff] = useState(false);

    useEffect(() => {
        const stream = peer.remoteStream;
        if (!stream || !videoRef.current) return;

        videoRef.current.srcObject = stream;

        const updateTracks = () => {
            const audio = stream.getAudioTracks()[0];
            const video = stream.getVideoTracks()[0];
            setIsMuted(!audio || !audio.enabled);
            setIsVideoOff(!video || !video.enabled || video.readyState !== 'live');
        };

        updateTracks();
        stream.addEventListener('addtrack', updateTracks);
        stream.addEventListener('removetrack', updateTracks);

        const interval = setInterval(updateTracks, 1000);
        return () => {
            stream.removeEventListener('addtrack', updateTracks);
            stream.removeEventListener('removetrack', updateTracks);
            clearInterval(interval);
        };
    }, [peer.remoteStream, peer.peerId]);

    const name = peer.userDetails?.name || 'Guest';
    const isTeacherPeer = peer.userDetails?.role === 'teacher' || peer.userDetails?.role === 'admin';

    return (
        <VideoTile
            stream={peer.remoteStream}
            name={`${name}${isTeacherPeer ? ' (Teacher)' : ''}`}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            videoRef={videoRef}
            avatarUrl={avatarUrl}
        />
    );
};

const ControlBtn = ({ onClick, active, icon: Icon, danger, accent, label }) => (
    <motion.div className="flex flex-col items-center gap-0.5" whileHover={{ y: -2 }}>
        <motion.button
            type="button"
            onClick={onClick}
            whileTap={{ scale: 0.92 }}
            className={`w-11 h-11 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-colors ${
                danger
                    ? 'bg-rose-500 text-white'
                    : accent
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
            }`}
        >
            <Icon className="w-5 h-5" />
        </motion.button>
        <span className="text-[7px] md:text-[8px] font-bold uppercase text-white/30 hidden sm:block">
            {label}
        </span>
    </motion.div>
);

const ParticipantRow = ({ name, role, photo, isSelf, isTeacher, onKick, onMute }) => {
    const avatarUrl = resolveAvatarUrl(photo, name, SOCKET_URL);

    return (
        <motion.div
            layout
            className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 group"
        >
            <motion.div className="flex items-center gap-2 min-w-0" whileHover={{ x: 2 }}>
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                        {name} {isSelf && '(You)'}
                    </p>
                    <p className="text-[9px] text-white/40 uppercase">{role}</p>
                </div>
            </motion.div>
            {!isSelf && isTeacher && (
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={onMute}
                        title="Mute participant"
                        className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-400"
                    >
                        <VolumeX className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onKick}
                        title="Remove participant"
                        className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400"
                    >
                        <UserMinus className="w-4 h-4" />
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default AdeebMeet;
