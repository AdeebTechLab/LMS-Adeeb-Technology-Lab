import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Eye, EyeOff, Mail, Lock, User, ArrowLeft, Loader2, GraduationCap, MapPin, ChevronDown,
    CreditCard, BookOpen, Phone, Briefcase
} from 'lucide-react';
import { authAPI } from '../../services/api';

const CITIES = ['Bahawalpur', 'Islamabad'];
const QUALIFICATIONS = [
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Ph.D.',
    'Diploma',
    'Certificate Course',
    'Other'
];

const TeacherRegister = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cnic: '',
        qualification: '',
        specialization: '',
        experience: '',
        location: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const formatCNIC = (value) => {
        // Remove all non-digits
        const digits = value.replace(/\D/g, '');
        // Format as XXXXX-XXXXXXX-X
        if (digits.length <= 5) return digits;
        if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
        return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
    };

    const handleCNICChange = (e) => {
        const formatted = formatCNIC(e.target.value);
        if (formatted.replace(/-/g, '').length <= 13) {
            setFormData(prev => ({ ...prev, cnic: formatted }));
        }
        if (errors.cnic) setErrors(prev => ({ ...prev, cnic: '' }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.phone) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^[0-9+\-\s]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Please enter a valid phone number';
        }

        if (!formData.cnic) {
            newErrors.cnic = 'CNIC is required';
        } else if (formData.cnic.replace(/-/g, '').length !== 13) {
            newErrors.cnic = 'CNIC must be 13 digits';
        }

        if (!formData.qualification) {
            newErrors.qualification = 'Qualification is required';
        }

        if (!formData.specialization.trim()) {
            newErrors.specialization = 'Specialization is required';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.location) {
            newErrors.location = 'Please select a location';
        }

        if (!formData.agreeTerms) {
            newErrors.agreeTerms = 'You must agree to the terms';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setApiError('');

        try {
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('role', 'teacher');
            submitData.append('phone', formData.phone);
            submitData.append('cnic', formData.cnic);
            submitData.append('qualification', formData.qualification);
            submitData.append('specialization', formData.specialization);
            submitData.append('experience', formData.experience);
            submitData.append('location', formData.location.toLowerCase());

            await authAPI.register(submitData);
            navigate('/login', {
                state: {
                    message: 'Registration successful! Your account is now pending admin verification. You will be able to log in once an admin approves your request.',
                    isPending: true
                }
            });
        } catch (err) {
            const message = err.response?.data?.message || 'Registration failed. Please try again.';
            setApiError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Decorative */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-500 to-orange-700">
                    {/* Animated Background Elements */}
                    <div className="absolute top-20 left-20 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse-slow delay-300"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-400/10 rounded-full blur-3xl animate-float"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="mb-8"
                    >
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                            <GraduationCap className="w-12 h-12 text-white" />
                        </div>
                    </motion.div>

                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-center text-white"
                    >
                        <h2 className="text-4xl font-bold mb-4">Join as Teacher</h2>
                        <p className="text-white/70 text-lg max-w-sm">
                            Share your knowledge and expertise with students worldwide
                        </p>
                    </motion.div>

                    {/* Features List */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="mt-12 space-y-4"
                    >
                        {[
                            'Create and manage courses',
                            'Track student progress',
                            'Grade assignments easily',
                            'Connect with learners',
                        ].map((feature, index) => (
                            <motion.div
                                key={feature}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + index * 0.1 }}
                                className="flex items-center text-white/80"
                            >
                                <div className="w-6 h-6 rounded-full bg-orange-200/20 flex items-center justify-center mr-3">
                                    <svg className="w-4 h-4 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                {feature}
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </motion.div>

            {/* Right Side - Register Form */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto"
            >
                <div className="w-full max-w-md py-8">
                    {/* Back Button */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Link
                            to="/register"
                            className="flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            <span>Back to Role Selection</span>
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6"
                    >
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Registration</h1>
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-orange-600 font-semibold underline hover:text-orange-700 transition-colors"
                            >
                                Log in
                            </Link>
                        </p>
                    </motion.div>

                    {/* API Error */}
                    {apiError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                            {apiError}
                        </div>
                    )}

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Dr. Ahmad Khan"
                                    className={`w-full px-4 py-3 pl-11 border ${errors.name ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50`}
                                />
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="ahmad@example.com"
                                    className={`w-full px-4 py-3 pl-11 border ${errors.email ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50`}
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        </div>

                        {/* Phone and CNIC Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="0300-1234567"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.phone ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50`}
                                    />
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">CNIC *</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="cnic"
                                        value={formData.cnic}
                                        onChange={handleCNICChange}
                                        placeholder="31234-5678901-2"
                                        className={`w-full px-4 py-3 pl-11 border ${errors.cnic ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50`}
                                    />
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                                {errors.cnic && <p className="mt-1 text-sm text-red-500">{errors.cnic}</p>}
                            </div>
                        </div>

                        {/* Qualification */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Qualification *</label>
                            <div className="relative">
                                <select
                                    name="qualification"
                                    value={formData.qualification}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 pl-11 border ${errors.qualification ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                >
                                    <option value="">Select Qualification</option>
                                    {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            </div>
                            {errors.qualification && <p className="mt-1 text-sm text-red-500">{errors.qualification}</p>}
                        </div>

                        {/* Specialization */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization / Skills *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleChange}
                                    placeholder="e.g., Web Development, Python, Data Science"
                                    className={`w-full px-4 py-3 pl-11 border ${errors.specialization ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50`}
                                />
                                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                            {errors.specialization && <p className="mt-1 text-sm text-red-500">{errors.specialization}</p>}
                        </div>

                        {/* Experience and Location Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Experience</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="experience"
                                        value={formData.experience}
                                        onChange={handleChange}
                                        placeholder="e.g., 5 Years"
                                        className={`w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50`}
                                    />
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location *</label>
                                <div className="relative">
                                    <select
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 pl-11 border ${errors.location ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 appearance-none cursor-pointer`}
                                    >
                                        <option value="">Select Location</option>
                                        {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                                {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3 pl-11 pr-11 border ${errors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50`}
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3 pl-11 pr-11 border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50`}
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start pt-2">
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                id="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                            <label htmlFor="agreeTerms" className="ml-2 text-sm text-gray-600 cursor-pointer">
                                I agree to the{' '}
                                <Link to="/terms" className="font-semibold text-gray-900 underline">
                                    Terms & Conditions
                                </Link>{' '}
                                and{' '}
                                <Link to="/privacy" className="font-semibold text-gray-900 underline">
                                    Privacy Policy
                                </Link>
                            </label>
                        </div>
                        {errors.agreeTerms && <p className="text-sm text-red-500">{errors.agreeTerms}</p>}

                        {/* Submit Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 mt-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                <span>Create Account</span>
                            )}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default TeacherRegister;
