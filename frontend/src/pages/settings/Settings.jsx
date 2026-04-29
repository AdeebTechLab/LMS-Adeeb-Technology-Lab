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
        <div className="max-w-4xl mx-auto space-y-8 p-4">
            {/* Success Toast */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 right-6 z-50 bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/20"
                    >
                        <Check className="w-5 h-5" />
                        <span className="font-bold uppercase italic tracking-tight">Theme Applied Sitewide!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">
                    Personalize your learning experience
                </p>
            </div>

            {/* Dark Mode Toggle - Integrated for completeness */}
            <section className="bg-white dark:bg-[#1a1f2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
                            {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase italic">Dark Mode</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">Switch between light and dark backgrounds</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${isDark ? 'bg-primary' : 'bg-gray-200'}`}
                    >
                        <motion.div
                            animate={{ x: isDark ? 26 : 4 }}
                            className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                        />
                    </button>
                </div>
            </section>

            {/* Theme Selection */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase italic">Color Themes</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {themes.map((t) => (
                        <motion.div
                            key={t.id}
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleThemeChange(t.id)}
                            style={{
                                borderColor: theme === t.id ? t.color : 'transparent',
                                backgroundColor: theme === t.id ? `${t.color}10` : undefined
                            }}
                            className={`relative cursor-pointer p-5 rounded-3xl border-2 transition-all duration-300 flex items-center gap-4 ${theme === t.id
                                    ? 'shadow-lg shadow-black/5'
                                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2e] hover:border-gray-200 dark:hover:border-gray-700'
                                }`}
                        >
                            {/* Color Preview Swatch */}
                            <div
                                style={{ backgroundColor: t.color }}
                                className={`w-14 h-14 rounded-2xl shadow-inner flex items-center justify-center text-white`}
                            >
                                {theme === t.id && <Check className="w-6 h-6 stroke-[3px]" />}
                            </div>

                            <div className="flex-1">
                                <h4
                                    style={{ color: theme === t.id ? t.color : undefined }}
                                    className={`font-black uppercase italic tracking-tight ${theme !== t.id ? 'text-gray-900 dark:text-white' : ''}`}
                                >
                                    {t.name}
                                </h4>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                    {t.description}
                                </p>
                            </div>

                            {theme === t.id && (
                                <div className="absolute top-3 right-3">
                                    <div
                                        style={{ backgroundColor: t.color }}
                                        className="w-6 h-6 text-white rounded-full flex items-center justify-center shadow-md"
                                    >
                                        <Check className="w-4 h-4 stroke-[3px]" />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Layout Options Placeholder */}
            <section className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#1e2435] dark:to-[#1a1f2e] rounded-3xl p-8 border border-gray-100 dark:border-gray-800 text-center space-y-3">
                <Layout className="w-10 h-10 text-gray-400 mx-auto" />
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest italic">More Personalization Options Coming Soon</h3>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest px-4">
                    We're working on advanced layout controls and custom font settings to give you complete control over your dashboard.
                </p>
            </section>
        </div>
    );
};

export default Settings;



