import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Mic, Share2, MessageSquare, Users, Settings, X, LogOut, Maximize2, ShieldCheck, AlertCircle } from 'lucide-react';
import Loader from '../../components/ui/Loader';
import { io } from 'socket.io-client';

const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace('/api', '');
};

const SOCKET_URL = getSocketURL();

const AdeebMeet = () => {
    const { roomName } = useParams();
    const navigate = useNavigate();
    const { user, role } = useSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [api, setApi] = useState(null);
    const jitsiContainerRef = useRef(null);

    useEffect(() => {
        // Socket connection for global end
        const socket = io(SOCKET_URL, { withCredentials: true });
        
        socket.on('live_class_ended', (data) => {
            // If the ended class link matches our current URL, force leave
            if (window.location.href.includes(data.id) || (data.link && window.location.href.includes(data.link))) {
                if (api) api.executeCommand('hangup');
                const dashboardPath = role ? `/${role}/dashboard` : '/';
                navigate(dashboardPath);
            }
        });

        // Load Jitsi External API script
        const scriptId = 'jitsi-external-api';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            script.onload = () => initMeet();
            document.body.appendChild(script);
        } else if (window.JitsiMeetExternalAPI) {
            initMeet();
        }

        // Safety timeout: Hide loader after 8 seconds anyway
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 8000);

        return () => {
            socket.disconnect();
            clearTimeout(timer);
            if (api) api.dispose();
        };
    }, [api]);

    const initMeet = () => {
        const domain = 'meet.jit.si';
        const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const avatarUrl = user?.photo ? (user.photo.startsWith('http') ? user.photo : `${serverUrl}/${user.photo}`) : null;

        const options = {
            roomName: `Adeeb-${roomName}`,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: user?.name || 'Guest User',
                email: user?.email || '',
                avatarUrl: avatarUrl
            },
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                enableWelcomePage: false,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
                brandingRoomAlias: 'Adeeb Meet',
                defaultLanguage: 'en',
                // Enable these to bypass moderator hurdles on some Jitsi deployments
                disableModeratorIndicator: true,
                enableNoAudioDetection: true,
                enableNoVideoDetection: true,
                allParticipantsAreModerators: true, // This helps bypass the "wait for moderator" screen
                enableLobby: false, // Ensure lobby is disabled
                toolbarButtons: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'security'
                ],
            },
            interfaceConfigOverwrite: {
                APP_NAME: 'Adeeb Meet',
                NATIVE_APP_NAME: 'Adeeb Meet',
                PROVIDER_NAME: 'Adeeb Technology Lab',
                BRAND_WATERMARK_LINK: 'https://adeeb-technology-lab.vercel.app',
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DEFAULT_REMOTE_DISPLAY_NAME: 'Student',
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'security'
                ],
            }
        };

        const meetApi = new window.JitsiMeetExternalAPI(domain, options);
        
        meetApi.addEventListeners({
            readyToClose: () => {
                navigate(-1);
            },
            videoConferenceJoined: () => {
                setIsLoading(false);
            }
        });

        setApi(meetApi);
    };

    return (
        <div className="fixed inset-0 bg-[#1a1a1a] z-[9999] flex flex-col">
            {/* Header / Custom Branding Bar */}
            <div className="h-14 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <img src="/logo.png" alt="Logo" className="w-5 h-5 brightness-0 invert" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-sm leading-none flex items-center gap-2">
                            Adeeb Meet <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md uppercase tracking-wider">Live</span>
                        </h2>
                        <p className="text-white/40 text-[10px] mt-0.5 font-medium">Session ID: {roomName}</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <div className="flex items-center gap-2 text-white/60 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        End-to-End Encrypted
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                         <span className="text-white/40 text-[10px] uppercase font-black tracking-widest">In Class</span>
                         <div className="flex -space-x-2">
                             {[1,2,3].map(i => (
                                 <div key={i} className="w-6 h-6 rounded-full border-2 border-[#1a1a1a] bg-gray-700 flex items-center justify-center text-[8px] text-white">
                                     {user?.name?.[0] || 'U'}
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        if(api) api.executeCommand('hangup');
                        const dashboardPath = role ? `/${role}/dashboard` : '/';
                        navigate(dashboardPath);
                    }}
                    className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave Class
                </button>
            </div>

            {/* Meet Container */}
            <div className="flex-1 relative bg-black">
                <AnimatePresence>
                    {isLoading && (
                        <motion.div 
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 bg-[#1a1a1a] flex flex-col items-center justify-center"
                        >
                            <div className="w-20 h-20 bg-primary/10 rounded-3xl p-4 mb-6 relative animate-pulse">
                                <Video className="w-full h-full text-primary" />
                                <div className="absolute inset-0 border-2 border-primary rounded-3xl animate-ping opacity-20" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Joining Meeting...</h3>
                            <p className="text-white/40 text-sm">Please wait while we connect you to Adeeb Meet</p>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <div ref={jitsiContainerRef} className="w-full h-full min-h-[500px]" />
            </div>

            {/* Footer / Info Bar */}
            <div className="h-10 bg-black/60 border-t border-white/5 flex items-center justify-center px-6 shrink-0">
                <p className="text-white/30 text-[10px] font-medium tracking-wide uppercase">
                    Powered by Adeeb Technology Lab Private Infrastructure © 2026
                </p>
            </div>
        </div>
    );
};

export default AdeebMeet;
