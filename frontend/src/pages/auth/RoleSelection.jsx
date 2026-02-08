import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    GraduationCap, BookOpen, Briefcase, Users, ArrowLeft
} from 'lucide-react';

const RoleSelection = () => {
    const roles = [
        {
            id: 'student',
            title: 'Join as Student',
            description: 'Enroll in computer courses and start your learning journey',
            icon: BookOpen,
            path: '/register/student',
            color: 'from-emerald-500 to-teal-600',
            bgColor: 'bg-emerald-50',
            iconColor: 'text-emerald-600'
        },
        {
            id: 'internship',
            title: 'Join as Intern',
            description: 'Apply for internship programs and gain hands-on experience',
            icon: Users,
            path: '/register/internship',
            color: 'from-blue-500 to-indigo-600',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600'
        },
        {
            id: 'job',
            title: 'Apply for Job',
            description: 'Looking for teaching or staff positions? Apply here',
            icon: Briefcase,
            path: '/register/job',
            color: 'from-purple-500 to-pink-600',
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600'
        },
        {
            id: 'teacher',
            title: 'Join as Teacher',
            description: 'Register as a teacher and share your knowledge',
            icon: GraduationCap,
            path: '/register/teacher',
            color: 'from-orange-500 to-red-600',
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-600'
        }
    ];

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Left Side - Role Selection Form */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto"
            >
                <div className="w-full max-w-xl py-4">
                    {/* Back Button */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <Link
                            to="/login"
                            className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            <span>Back to Login</span>
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-10"
                    >
                        <h1 className="text-4xl font-bold text-gray-900 mb-3">Join Our Platform</h1>
                        <p className="text-gray-500 text-lg">Select your role to get started on your journey</p>
                    </motion.div>

                    {/* Role Cards Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {roles.map((role, index) => (
                            <motion.div
                                key={role.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                            >
                                <Link to={role.path}>
                                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            {/* Icon */}
                                            <div className={`w-14 h-14 ${role.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                                                <role.icon className={`w-7 h-7 ${role.iconColor}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">
                                                    {role.title}
                                                </h3>
                                                <p className="text-gray-500 text-sm leading-relaxed">
                                                    {role.description}
                                                </p>
                                            </div>

                                            {/* Arrow */}
                                            <div className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Already have account */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-center mt-8 text-gray-500"
                    >
                        Already have an account?{' '}
                        <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
                            Log in here
                        </Link>
                    </motion.p>
                </div>
            </motion.div>

            {/* Right Side - Decorative Panel with Image */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]">
                    {/* Animated Background Elements */}
                    <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse-slow delay-300"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-float"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8">
                    {/* Logo & Branding */}
                    {/* Centered Logo Square */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="flex flex-col items-center justify-center gap-3 h-full"
                    >
                        <div className="relative w-56 h-56 group flex-shrink-0">
                            {/* Outer Glow */}
                            <div className="absolute -inset-4 bg-orange-500/20 rounded-3xl blur-2xl group-hover:bg-orange-500/30 transition-all duration-500"></div>

                            {/* Square Glass Container */}
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden flex items-center justify-center p-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                                <img
                                    src="/logo.png"
                                    alt="AdeebTechLab Logo"
                                    className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500 relation z-10"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <GraduationCap className="w-20 h-20 text-white hidden" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Branding Text - Moved Below Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex flex-col items-center text-center z-20"
                    >
                        <h2 className="text-white text-3xl font-bold tracking-tight mb-0">Adeeb Technology Lab</h2>
                        <p className="text-white/60 text-base">Digital tech expert software house LMS</p>
                    </motion.div>

                    {/* Decorative Lines */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-orange-500/10 to-transparent"></div>
                </div>
            </motion.div>
        </div>
    );
};

export default RoleSelection;
