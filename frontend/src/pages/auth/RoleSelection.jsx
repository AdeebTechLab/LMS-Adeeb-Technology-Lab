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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl">
                {/* Back Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <Link
                        to="/login"
                        className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        <span>Back to Login</span>
                    </Link>
                </motion.div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">Join Our Platform</h1>
                    <p className="text-gray-500 text-lg">Select how you would like to register</p>
                </motion.div>

                {/* Role Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roles.map((role, index) => (
                        <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                        >
                            <Link to={role.path}>
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group cursor-pointer h-full">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`w-14 h-14 ${role.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <role.icon className={`w-7 h-7 ${role.iconColor}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                                                {role.title}
                                            </h3>
                                            <p className="text-gray-500 text-sm leading-relaxed">
                                                {role.description}
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <div className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all">
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
                    transition={{ delay: 0.7 }}
                    className="text-center mt-8 text-gray-500"
                >
                    Already have an account?{' '}
                    <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
                        Log in here
                    </Link>
                </motion.p>
            </div>
        </div>
    );
};

export default RoleSelection;
