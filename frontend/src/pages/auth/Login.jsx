import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { loginStart, loginSuccess, loginFailure } from '../../features/auth/authSlice';
import { authAPI } from '../../services/api';

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
        agreeTerms: true,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
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
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        dispatch(loginStart());

        try {
            // Call real API
            const response = await authAPI.login({
                email: formData.email,
                password: formData.password
            });

            const { user, token } = response.data;

            // Store user in localStorage for persistence
            localStorage.setItem('user', JSON.stringify(user));

            dispatch(loginSuccess({ user, token }));

            // Navigate based on role
            const role = user.role;
            if (role === 'admin') navigate('/admin/dashboard');
            else if (role === 'teacher') navigate('/teacher/profile');
            else if (role === 'intern') navigate('/intern/dashboard');
            else if (role === 'job') navigate('/job/tasks');
            else navigate('/student/profile');
        } catch (err) {
            const message = err.response?.data?.message || 'Invalid email or password';
            dispatch(loginFailure(message));
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
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]">
                    {/* Animated Background Elements */}
                    <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse-slow delay-300"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-float"></div>
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
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                            </svg>
                        </div>
                    </motion.div>

                    {/* Illustration */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="relative"
                    >
                        {/* Abstract VR/Education illustration */}
                        <div className="w-80 h-80 relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-orange-400/30 to-red-500/30 backdrop-blur-sm animate-spin-slow"></div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-white">
                                    <motion.h2
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                        className="text-3xl font-bold mb-2"
                                    >
                                        EduLMS
                                    </motion.h2>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1 }}
                                        className="text-white/70 text-sm"
                                    >
                                        Learn. Grow. Succeed.
                                    </motion.p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Decorative Lines */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-orange-500/10 to-transparent"></div>
                </div>
            </motion.div>

            {/* Right Side - Login Form */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white"
            >
                <div className="w-full max-w-md">
                    {/* Back Button */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => navigate('/')}
                        className="flex items-center text-gray-500 hover:text-gray-700 mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        <span>Back</span>
                    </motion.button>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8"
                    >
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Log in</h1>
                        <p className="text-gray-500">
                            Don't have an account?{' '}
                            <Link
                                to="/register"
                                className="text-gray-900 font-semibold underline hover:text-primary transition-colors"
                            >
                                Create an Account
                            </Link>
                        </p>
                    </motion.div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-4 p-4 ${error.includes('pending') ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-600'} border rounded-xl text-sm font-medium`}
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Success/Pending Message from Registration */}
                    {window.history.state?.usr?.message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium"
                        >
                            {window.history.state.usr.message}
                        </motion.div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john@example.com"
                                    className={`w-full px-4 py-3.5 pl-12 border ${errors.email ? 'border-red-400' : 'border-gray-200'
                                        } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                />
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                            )}
                        </motion.div>

                        {/* Password Field */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3.5 pl-12 pr-12 border ${errors.password ? 'border-red-400' : 'border-gray-200'
                                        } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                            )}
                        </motion.div>

                        {/* Forgot Password */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55 }}
                            className="text-right"
                        >
                            <Link
                                to="/forgot-password"
                                className="text-sm text-gray-600 hover:text-primary underline transition-colors"
                            >
                                Forgot Password?
                            </Link>
                        </motion.div>

                        {/* Submit Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 btn-ripple disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <span>Log in</span>
                            )}
                        </motion.button>

                        {/* Terms Checkbox */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.65 }}
                            className="flex items-center"
                        >
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                id="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <label htmlFor="agreeTerms" className="ml-2 text-sm text-gray-600 cursor-pointer">
                                I agree to the{' '}
                                <Link to="/terms" className="font-semibold text-gray-900 underline">
                                    Terms & Condition
                                </Link>
                            </label>
                        </motion.div>
                        {errors.agreeTerms && (
                            <p className="text-sm text-red-500">{errors.agreeTerms}</p>
                        )}
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
