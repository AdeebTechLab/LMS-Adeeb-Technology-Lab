import React from 'react';
import { motion } from 'framer-motion';

const Loader = ({ message = 'Loading...', size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-32 h-32',
        lg: 'w-48 h-48',
        xl: 'w-64 h-64'
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px] w-full">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
            >
                <img 
                    src="/loading.gif" 
                    alt="Loading..." 
                    className={`${sizeClasses[size] || sizeClasses.md} object-contain`}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJueXp4YnlpNXJueXp4YnlpNXJueXp4YnlpNXJueXp4YnlpNXJueSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif';
                    }}
                />
            </motion.div>
            {message && (
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-gray-500 dark:text-gray-400 font-black uppercase tracking-[0.2em] text-xs animate-pulse"
                >
                    {message}
                </motion.p>
            )}
        </div>
    );
};

export const FullScreenLoader = ({ message = 'Loading Data...' }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-sm">
            <Loader message={message} size="lg" />
        </div>
    );
};

export const ButtonLoader = ({ className = "w-5 h-5" }) => {
    return (
        <img 
            src="/loading.gif" 
            alt="..." 
            className={`${className} object-contain inline-block brightness-200`}
            style={{ filter: 'brightness(2) contrast(1.2)' }}
        />
    );
};

export default Loader;
