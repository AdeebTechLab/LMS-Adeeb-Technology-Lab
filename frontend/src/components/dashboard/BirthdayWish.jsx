import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Heart, Sparkles, ChevronRight, Gift, PartyPopper } from 'lucide-react';
import api from '../../services/api';
import { useSelector } from 'react-redux';

const BirthdayWish = () => {
    const { user } = useSelector((state) => state.auth);
    const [birthdays, setBirthdays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [wishingId, setWishingId] = useState(null);

    useEffect(() => {
        fetchBirthdays();
        
        // Trigger confetti if it's a birthday
        const timer = setTimeout(() => {
            if (birthdays.length > 0) {
                createConfetti();
            }
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [birthdays.length]);

    const createConfetti = () => {
        const colors = ['#ff8e01', '#222d38', '#ffd700', '#ff4500', '#ffffff'];
        const container = document.getElementById('birthday-confetti-container');
        if (!container) return;

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = Math.random() * 2 + 3 + 's';
            container.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => confetti.remove(), 5000);
        }
    };

    const fetchBirthdays = async () => {
        try {
            const res = await api.get('/users/birthdays');
            if (res.data.success) {
                setBirthdays(res.data.data);
                console.log('🎂 [BirthdayWish] Birthdays fetched:', res.data.data.length, res.data.data);
            }
        } catch (error) {
            console.error('Error fetching birthdays:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleWish = async (id, hasWished) => {
        if (hasWished) return; // Prevent multiple wishes if clicked again somehow
        
        try {
            setWishingId(id);
            // Wish only - no un-wish
            const res = await api.post(`/users/${id}/wish`);
            if (res.data.success) {
                fetchBirthdays();
                createConfetti(); // Celebration on wish!
            }
        } catch (error) {
            console.error('Error sending wish:', error);
        } finally {
            setWishingId(null);
        }
    };

    if (!isLoading && birthdays.length === 0) return null;

    return (
        <div id="birthday-confetti-container" className="relative group/birthday">
            <style>{`
                .confetti-piece {
                    position: absolute;
                    top: -20px;
                    z-index: 1000;
                    opacity: 0.8;
                    pointer-events: none;
                    border-radius: 2px;
                    animation: fall linear forwards;
                }
                @keyframes fall {
                    to {
                        transform: translateY(500px) rotate(720deg);
                        opacity: 0;
                    }
                }
                .shimmer-bg {
                    background: linear-gradient(
                        90deg, 
                        rgba(255,255,255,0) 0%, 
                        rgba(255,255,255,0.1) 50%, 
                        rgba(255,255,255,0) 100%
                    );
                    background-size: 200% 100%;
                    animation: shimmer 3s infinite linear;
                }
                @keyframes shimmer {
                    from { background-position: 200% 0; }
                    to { background-position: -200% 0; }
                }
                .floating {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(10deg); }
                }
            `}</style>
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative overflow-hidden bg-gradient-to-br from-primary via-[#ff8e01] to-[#ff4500] rounded-[3rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(255,142,1,0.3)] mb-10 group"
            >
                {/* Background Shimmer */}
                <div className="absolute inset-0 shimmer-bg pointer-events-none" />

                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/20 rounded-full blur-3xl animate-pulse" />
                
                {/* Floating Icons */}
                <motion.div className="absolute top-10 right-20 text-4xl opacity-20 floating select-none pointer-events-none">🎂</motion.div>
                <motion.div className="absolute bottom-10 left-10 text-4xl opacity-20 floating select-none pointer-events-none" style={{ animationDelay: '1s' }}>🎈</motion.div>
                <motion.div className="absolute top-1/2 left-1/4 text-3xl opacity-10 floating select-none pointer-events-none" style={{ animationDelay: '2s' }}>✨</motion.div>
                <motion.div className="absolute bottom-1/4 right-1/3 text-3xl opacity-10 floating select-none pointer-events-none" style={{ animationDelay: '1.5s' }}>🎁</motion.div>

                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                    {/* Left side: Message */}
                    <div className="flex-1 text-center lg:text-left">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-[10px] font-black tracking-widest mb-6 border border-white/30"
                        >
                            <PartyPopper className="w-4 h-4 animate-bounce" />
                            CELEBRATION TIME!
                        </motion.div>
                        
                        <motion.h2 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-4xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight"
                        >
                            It's a special time for <span className="text-white/70">our stars!</span> 🌟
                        </motion.h2>
                        
                        <motion.p 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-white/90 text-lg md:text-xl font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed"
                        >
                            A very Happy Birthday to our amazing lab members! Let's make their day amazing and full of joy.
                        </motion.p>
                    </div>

                    {/* Right side: The Stars */}
                    <div className="flex-1 w-full max-w-2xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {birthdays.map((person, index) => {
                                const currentYear = new Date().getFullYear();
                                const hasWished = person.birthdayWishes?.some(w => 
                                    (w.from?._id || w.from) === (user?.id || user?._id) && w.year === currentYear
                                );
                                const wishCount = person.birthdayWishes?.filter(w => w.year === currentYear).length || 0;

                                return (
                                    <motion.div 
                                        key={person._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 + (index * 0.1) }}
                                        whileHover={{ y: -5, scale: 1.02 }}
                                        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 group/card hover:bg-white/20 transition-all duration-500 shadow-xl"
                                    >
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="relative">
                                                {person.photo ? (
                                                    <img src={person.photo} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/40 shadow-lg" />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl border-2 border-white/40">
                                                        {person.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md">
                                                    <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="text-white font-black text-base truncate max-w-[120px]">{person.name}</h4>
                                                <span className="text-white/60 text-[9px] font-black uppercase tracking-widest mt-0.5">
                                                    {person.roles ? person.roles.join(' / ') : person.role}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-full">
                                                <Heart className={`w-3 h-3 ${wishCount > 0 ? 'fill-red-400 text-red-400' : 'text-white/60'}`} />
                                                <span className="text-xs font-black text-white">{wishCount}</span>
                                            </div>

                                            <button
                                                onClick={() => handleWish(person._id, hasWished)}
                                                disabled={wishingId === person._id || hasWished}
                                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                                    hasWished 
                                                    ? 'bg-white/10 text-white/50 border border-white/5 cursor-default' 
                                                    : 'bg-white text-primary shadow-lg shadow-black/10 hover:shadow-xl active:scale-95'
                                                }`}
                                            >
                                                {wishingId === person._id ? (
                                                    <PartyPopper className="w-3.5 h-3.5 animate-bounce" />
                                                ) : hasWished ? (
                                                    <>WISHED <PartyPopper className="w-3.5 h-3.5" /></>
                                                ) : (
                                                    <>WISH <Gift className="w-3.5 h-3.5" /></>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default BirthdayWish;
