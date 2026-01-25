import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, User, XCircle, Loader2 } from 'lucide-react';
import { certificateAPI } from '../../services/api';

const VerifyCertificate = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [certificates, setCertificates] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        setCertificates([]);

        try {
            const response = await certificateAPI.verify(searchQuery.trim());
            if (response.data.success) {
                setCertificates(response.data.certificates);
            }
        } catch (error) {
            console.error('Error verifying certificate:', error);
            setCertificates([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-gray-800">
            {/* Red Header Bar */}
            <div className="bg-[#B22222] text-white p-6 shadow-md border-b-4 border-[#8B0000]">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Online Verification The Computer Courses Bahawalpur, Islamabad Powered by Adeeb Technology Lab
                    </h1>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-6xl mx-auto p-4 md:p-8">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Search Field Container */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                        <label className="block text-sm font-medium text-gray-600 mb-2 italic">Online Student Verification</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Enter Roll Number (e.g., 0001)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-300 rounded focus:border-[#B22222] outline-none transition-all shadow-inner text-lg"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="px-8 py-3.5 bg-[#B22222] hover:bg-[#8B0000] text-white font-bold rounded transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                            </button>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#F2F2F2] border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-r border-gray-200">Photo</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-r border-gray-200">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-r border-gray-200">Reg. No</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-r border-gray-200">Position</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-r border-gray-200">Skills</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {hasSearched && certificates.length > 0 ? (
                                    certificates.map((cert, index) => (
                                        <motion.tr
                                            key={index}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-6 py-4 border-r border-gray-200">
                                                <div className="w-20 h-24 bg-gray-100 border border-gray-300 p-1 flex items-center justify-center mx-auto overflow-hidden">
                                                    {cert.photo ? (
                                                        <img src={cert.photo} alt={cert.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-10 h-10 text-gray-300" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-base font-medium text-gray-900 border-r border-gray-200">{cert.name}</td>
                                            <td className="px-6 py-4 text-base text-gray-700 border-r border-gray-200">{cert.rollNo}</td>
                                            <td className="px-6 py-4 text-base text-gray-700 border-r border-gray-200">{cert.position}</td>
                                            <td className="px-6 py-4 text-base text-gray-700 border-r border-gray-200">{cert.skills}</td>
                                            <td className="px-6 py-4 text-base text-gray-700">{cert.duration}</td>
                                        </motion.tr>
                                    ))
                                ) : hasSearched && !isSearching ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <XCircle className="w-12 h-12 text-red-400" />
                                                <p className="text-xl font-bold text-gray-600">No Record Found</p>
                                                <p className="text-gray-400">Please check the Roll Number and try again.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                            Enter a roll number to verify student completion details.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-12 text-center">
                    <a href="/" className="text-[#B22222] font-bold text-lg hover:underline decoration-2 underline-offset-4">
                        Home
                    </a>
                </div>

                <div className="mt-8 text-center text-sm text-gray-400 italic">
                    Subscribe to: Comments (Atom)
                </div>
            </main>
        </div>
    );
};

export default VerifyCertificate;
