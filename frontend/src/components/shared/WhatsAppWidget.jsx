import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User, Mail, Phone } from 'lucide-react';

const WhatsAppWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        // Auto-open after 10 seconds to catch user's attention
        const timer = setTimeout(() => {
            setIsOpen(true);
        }, 10000);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        const message = `Hello AdeebTechLab Support,\n\nI need assistance with my account.\n\n*My Details:*\n👤 *Name:* ${formData.name}\n📧 *Email:* ${formData.email}\n📱 *Phone:* ${formData.phone}\n\nPlease help me as soon as possible.`;
        const whatsappUrl = `https://wa.me/923092333121?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="fixed bottom-6 left-6 z-[9999] flex flex-col items-start">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9, rotate: -5 }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9, rotate: 5 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className="mb-4 w-[320px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#25D366] to-[#128C7E] p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                                    <MessageCircle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">Support Chat</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                        <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">We're Online</p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="p-2 hover:bg-white/10 rounded-full transition-all hover:rotate-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-gray-50/50">
                            <div className="text-center mb-2">
                                <p className="text-xs text-gray-500 font-medium">
                                    Please provide your details to start the conversation on WhatsApp. Ager apsy password reset nahi ho raha to ya form fill kary foran apka password apko bta diya jay ga.
                                </p>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="group relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#25D366] transition-colors" />
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Full Name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-[#25D366]/10 focus:border-[#25D366] outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="group relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#25D366] transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email Address"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-[#25D366]/10 focus:border-[#25D366] outline-none transition-all shadow-sm"
                                    />
                                </div>
                                <div className="group relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#25D366] transition-colors" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone Number"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-[#25D366]/10 focus:border-[#25D366] outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#075E54] text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-green-200 group"
                            >
                                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                Start WhatsApp Chat
                            </button>
                            
                            <p className="text-[10px] text-center text-gray-400 font-medium">
                                Secure & Instant Support
                            </p>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all relative ${
                    isOpen ? 'bg-white text-[#25D366]' : 'bg-[#25D366] text-white'
                }`}
            >
                {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-8 h-8" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white"></span>
                    </span>
                )}
            </motion.button>
        </div>
    );
};

export default WhatsAppWidget;


