import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, Layout, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const themes = [
    {
        id: 'orange',
        name: 'Adeeb Classic',
        color: '#ff8e01',
        preview: 'bg-primary',
        bgLight: 'bg-primary/5',
        description: 'Official Brand Identity'
    },
    {
        id: 'gold',
        name: 'Luxury Gold',
        color: '#f5d7a5',
        preview: 'bg-[#f5d7a5]',
        bgLight: 'bg-[#6b3d25]/10',
        description: 'Premium & Elegant'
    },
    {
        id: 'olive',
        name: 'Olive Garden',
        color: '#678018',
        preview: 'bg-[#678018]',
        bgLight: 'bg-[#324321]/10',
        description: 'Nature & Harmony'
    },
    {
        id: 'navy',
        name: 'Midnight Navy',
        color: '#1154bd',
        preview: 'bg-[#1154bd]',
        bgLight: 'bg-[#0a316a]/10',
        description: 'Deep & Trustworthy'
    },
    {
        id: 'lavender',
        name: 'Royal Lavender',
        color: '#6841c2',
        preview: 'bg-[#fedef6]',
        bgLight: 'bg-[#6841c2]/10',
        description: 'Creative & Calm'
    },
    {
        id: 'rose-pink',
        name: 'Rose Petal',
        color: '#b11954',
        preview: 'bg-[#f83c93]',
        bgLight: 'bg-[#b11954]/10',
        description: 'Bold & Passionate'
    }
];

const Settings = () => {
    const { theme, setTheme, isDark, toggleTheme } = useTheme();
    const [showSuccess, setShowSuccess] = useState(false);

    const handleThemeChange = (id) => {
        setTheme(id);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12 p-6 lg:p-10 min-h-screen">
            {/* Success Toast */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 dark:border-gray-100"
                    >
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black uppercase tracking-widest text-xs">Aesthetic Updated Successfully!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-black p-10 text-white shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 text-primary"
                        >
                            <Palette className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Personalization Studio</span>
                        </motion.div>
                        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">Settings</h1>
                        <p className="text-gray-400 font-medium text-sm tracking-wide max-w-md">
                            Craft your perfect workspace. Every adjustment here ripples through your entire LMS experience.
                        </p>
                    </div>
                </div>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full -ml-10 -mb-10" />
            </div>

            {/* Main Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Core Preferences */}
                <div className="lg:col-span-1 space-y-8">
                    <section className="bg-white dark:bg-[#1a1f2e] rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/20 dark:shadow-none transition-all hover:shadow-2xl">
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
                                    {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase italic leading-none">Appearance</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Light vs Dark Mode</p>
                                </div>
                            </div>

                            <div 
                                onClick={toggleTheme}
                                className="group relative cursor-pointer"
                            >
                                <div className={`h-16 rounded-2xl border-2 transition-all duration-500 flex items-center justify-between px-5 ${isDark ? 'bg-gray-800 border-primary/40' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-primary' : 'text-gray-500'}`}>
                                        {isDark ? 'Midnight Active' : 'Solar Active'}
                                    </span>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${isDark ? 'bg-primary' : 'bg-gray-300'}`}>
                                        <motion.div 
                                            animate={{ x: isDark ? 24 : 0 }}
                                            className="w-4 h-4 bg-white rounded-full shadow-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Progress Placeholder */}
                    <div className="bg-primary/5 dark:bg-primary/5 rounded-[2rem] p-8 border-2 border-dashed border-primary/20 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg">
                            <Layout className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest italic">UI Layouts</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Compact vs Relaxed Views</p>
                        </div>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-[0.2em] rounded-full">Coming Soon</span>
                    </div>
                </div>

                {/* Right Column: Theme Selection */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <Palette className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Vibrant Themes</h2>
                        </div>
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{themes.length} Masterpieces</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {themes.map((t) => (
                            <motion.div
                                key={t.id}
                                whileHover={{ y: -5, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleThemeChange(t.id)}
                                className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border-2 transition-all duration-500 p-6 ${
                                    theme === t.id
                                        ? 'bg-white dark:bg-gray-800/50 shadow-2xl'
                                        : 'bg-white/40 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/[0.07] hover:shadow-xl'
                                }`}
                                style={{
                                    borderColor: theme === t.id ? t.color : 'rgba(0,0,0,0.05)'
                                }}
                            >
                                <div className="flex items-center gap-5">
                                    {/* Swatch with glow */}
                                    <div className="relative shrink-0">
                                        <div
                                            style={{ backgroundColor: t.color }}
                                            className="w-16 h-16 rounded-2xl shadow-2xl shadow-inner flex items-center justify-center text-white relative z-10"
                                        >
                                            {theme === t.id && <Check className="w-8 h-8 stroke-[3.5px]" />}
                                        </div>
                                        {theme === t.id && (
                                            <motion.div 
                                                layoutId="activeGlow"
                                                style={{ backgroundColor: t.color }}
                                                className="absolute inset-0 blur-2xl opacity-40 rounded-full" 
                                            />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4
                                            className={`text-lg font-black uppercase italic tracking-tighter truncate transition-colors duration-300 ${
                                                theme === t.id ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white'
                                            }`}
                                        >
                                            {t.name}
                                        </h4>
                                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 line-clamp-1">
                                            {t.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Active Indicator Bar */}
                                {theme === t.id && (
                                    <motion.div 
                                        layoutId="activeBar"
                                        style={{ backgroundColor: t.color }}
                                        className="absolute bottom-0 left-0 right-0 h-1"
                                    />
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Personalization Teaser */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="mt-12 p-10 rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border border-primary/10 flex flex-col items-center text-center space-y-6"
                    >
                        <div className="flex -space-x-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`w-12 h-12 rounded-2xl border-4 border-white dark:border-gray-900 shadow-xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-900`} />
                            ))}
                        </div>
                        <div className="max-w-md">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">More Personalization Coming Soon</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                                We're working on advanced sidebar themes, custom fonts, and workspace layouts to give you absolute control.
                            </p>
                        </div>
                        <button className="px-6 py-2.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all">
                            Stay Notified
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Settings;



