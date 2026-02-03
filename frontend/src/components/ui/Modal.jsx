import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showClose = true,
}) => {
    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[90vw]',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[40]"
                    />

                    {/* Modal Container - Centered */}
                    <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className={`w-full ${sizes[size]} bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto`}
                        >
                            {/* Header */}
                            {(title || showClose) && (
                                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                    {title && (
                                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                                    )}
                                    {showClose && (
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors ml-auto"
                                        >
                                            <X className="w-5 h-5 text-gray-500" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Modal;
