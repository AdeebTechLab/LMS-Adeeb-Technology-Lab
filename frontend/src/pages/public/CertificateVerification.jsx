import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Award, Calendar, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { certificateAPI } from '../../services/api';

const CertificateVerification = () => {
    const [rollNo, setRollNo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [certificates, setCertificates] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!rollNo.trim()) return;

        setIsLoading(true);
        setError(null);
        setCertificates(null);

        try {
            const response = await certificateAPI.verify(rollNo);
            setCertificates(response.data.certificates);
        } catch (err) {
            setError(err.response?.data?.message || 'No certificates found for this roll number');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header / Hero Section */}
            <div className="bg-[#1a1c23] text-white pt-20 pb-24 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
                    <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-500 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-6 border border-white/10">
                            <Award className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                            Certificate Verification
                        </h1>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
                            Verify the authenticity of certificates issued by Adeeb Technology Lab.
                            Enter the student's Roll Number below to view their verified credentials.
                        </p>
                    </motion.div>

                    {/* Search Box */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="max-w-xl mx-auto"
                    >
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                value={rollNo}
                                onChange={(e) => setRollNo(e.target.value)}
                                placeholder="Enter Roll Number (e.g., WEB-2024-001)"
                                className="w-full px-6 py-4 pl-14 text-lg bg-white text-gray-900 rounded-2xl shadow-xl focus:ring-4 focus:ring-emerald-500/20 focus:outline-none placeholder-gray-400 transition-all font-medium border-0"
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                            <button
                                type="submit"
                                disabled={isLoading || !rollNo.trim()}
                                className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Verify <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </div>

            {/* Results Section */}
            <div className="flex-1 px-4 py-12 -mt-10 relative z-20">
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-lg mx-auto"
                            >
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h3>
                                <p className="text-gray-500">{error}</p>
                            </motion.div>
                        )}

                        {certificates && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100">
                                        <CheckCircle className="w-4 h-4" />
                                        Verified Credentials Found ({certificates.length})
                                    </div>
                                </div>

                                {certificates.map((cert, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden relative group hover:shadow-md transition-shadow"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full -mr-16 -mt-16 z-0"></div>

                                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                                            {/* User Photo */}
                                            <div className="flex-shrink-0">
                                                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                                                    <img
                                                        src={cert.photo || `https://ui-avatars.com/api/?name=${cert.name}&background=random`}
                                                        alt={cert.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                    <div>
                                                        <h2 className="text-2xl font-bold text-gray-900 mb-1">{cert.name}</h2>
                                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                                                                {cert.rollNo}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{cert.position}</span>
                                                        </div>
                                                    </div>
                                                    {cert.certificateLink && (
                                                        <a
                                                            href={cert.certificateLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
                                                        >
                                                            <FileTextWrapper className="w-4 h-4" />
                                                            View Document
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div>
                                                        <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-semibold">Course / Program</p>
                                                        <p className="font-bold text-gray-900 text-lg">{cert.course}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-semibold">Skills Verified</p>
                                                        <p className="font-medium text-gray-700">{cert.skills}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-semibold">Duration</p>
                                                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                                                            <Calendar className="w-4 h-4 text-emerald-500" />
                                                            {cert.duration}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-semibold">Issued On</p>
                                                        <p className="font-medium text-gray-700">
                                                            {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Simple Footer */}
            <div className="bg-white py-8 border-t border-gray-100 text-center text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} Adeeb Technology Lab. All rights reserved.</p>
            </div>
        </div>
    );
};

// Helper component for the icon to avoid import issues if not available in lucide-react used above
const FileTextWrapper = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
);

export default CertificateVerification;
