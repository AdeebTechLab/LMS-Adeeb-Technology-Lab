import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, User, Mail, Phone, CreditCard, Calendar,
    MapPin, BookOpen, Users, Camera, Receipt, ChevronDown, GraduationCap, Eye, EyeOff
} from 'lucide-react';
import { authAPI } from '../../services/api';

const COURSES = [
    'Trading', 'Taxation', 'Freelancing', 'Video Editing', 'E-Commerce',
    'Programming', 'Office Work [IT]', 'Cyber Security', 'Machine Learning',
    'Truck Dispatching', 'UX/UI Designing', 'Youtuber Course', 'Graphic Designer',
    'Home Architecture', 'Internet of Thing [IOT]', 'Digital Marketing, Ads',
    'Web Development', 'App Development', 'Software Development',
    'App Dev Without Coding', 'Web Dev Without Coding', 'Other'
];

const CITIES = ['Bahawalpur', 'Islamabad'];
const HEARD_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp', 'Website',
    'YouTube', 'Event / Seminar', 'Friends & Family', 'Twitter', 'LinkedIn', 'Other'
];

// Reusable Input Component - defined outside to prevent re-creation
const InputField = ({ label, name, type = 'text', icon: Icon, placeholder, value, onChange, error, ...props }) => (
    <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-3 ${Icon ? 'pl-11' : 'px-4'} border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50`}
                {...props}
            />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

// Reusable Select Component - defined outside to prevent re-creation
const SelectField = ({ label, name, options, placeholder, value, onChange, error }) => (
    <div className="form-group">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full px-4 py-3 border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50 appearance-none cursor-pointer`}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

const StudentRegister = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [photoFile, setPhotoFile] = useState(null);
    const [feeFile, setFeeFile] = useState(null);
    const [apiError, setApiError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        cnic: '',
        dob: '',
        age: '',
        gender: '',
        fatherName: '',
        course: '',
        cityToAttend: '',
        attendClasses: '',
        education: '',
        guardianName: '',
        guardianPhone: '',
        guardianOccupation: '',
        address: '',
        city: '',
        country: '',
        pictureUrl: '',
        feeScreenshotUrl: '',
        heardAbout: '',
        termsAccepted: false,
        dataConfirmed: false,
        password: '',
        confirmPassword: ''
    });

    const calculateAge = (dob) => {
        if (!dob) return '';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === 'dob') {
            const age = calculateAge(value);
            setFormData(prev => ({
                ...prev,
                dob: value,
                age: age.toString()
            }));
            if (errors.age) setErrors(prev => ({ ...prev, age: '' }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePhotoChange = (e) => {
        if (e.target.files[0]) {
            setPhotoFile(e.target.files[0]);
        }
    };

    const handleFeeChange = (e) => {
        if (e.target.files[0]) {
            setFeeFile(e.target.files[0]);
        }
    };

    const formatCNIC = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 5) return numbers;
        if (numbers.length <= 12) return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
        return `${numbers.slice(0, 5)}-${numbers.slice(5, 12)}-${numbers.slice(12, 13)}`;
    };

    const handleCNICChange = (e) => {
        const formatted = formatCNIC(e.target.value);
        if (formatted.length <= 15) {
            setFormData(prev => ({ ...prev, cnic: formatted }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.phone) newErrors.phone = 'Phone is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.cnic) newErrors.cnic = 'CNIC/BForm is required';
        if (!formData.dob) newErrors.dob = 'Date of birth is required';
        if (!formData.age) newErrors.age = 'Age is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.course) newErrors.course = 'Course selection is required';
        if (!formData.cityToAttend) newErrors.cityToAttend = 'City to attend is required';
        if (!formData.attendClasses) newErrors.attendClasses = 'Class type is required';
        if (!formData.education) newErrors.education = 'Education is required';
        if (!formData.guardianName) newErrors.guardianName = 'Guardian name is required';
        if (!formData.guardianPhone) newErrors.guardianPhone = 'Guardian phone is required';
        if (!formData.guardianOccupation) newErrors.guardianOccupation = 'Guardian occupation is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.country) newErrors.country = 'Country is required';
        if (!formData.heardAbout) newErrors.heardAbout = 'This field is required';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept terms';
        if (!formData.dataConfirmed) newErrors.dataConfirmed = 'You must confirm data accuracy';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setApiError('');

        try {
            // Create FormData for multipart upload
            const submitData = new FormData();
            submitData.append('name', formData.fullName);
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('phone', formData.phone);
            submitData.append('role', 'student');
            submitData.append('location', formData.cityToAttend.toLowerCase());
            // Student-specific fields
            submitData.append('cnic', formData.cnic);
            submitData.append('dob', formData.dob);
            submitData.append('age', formData.age);
            submitData.append('gender', formData.gender);
            submitData.append('education', formData.education);
            submitData.append('guardianName', formData.guardianName);
            submitData.append('guardianPhone', formData.guardianPhone);
            submitData.append('guardianOccupation', formData.guardianOccupation);
            submitData.append('address', formData.address);
            submitData.append('city', formData.city);
            submitData.append('country', formData.country);
            submitData.append('attendType', formData.attendClasses);
            submitData.append('heardAbout', formData.heardAbout);
            submitData.append('fatherName', formData.fatherName);

            if (photoFile) {
                submitData.append('photo', photoFile);
            }
            if (feeFile) {
                submitData.append('feeScreenshot', feeFile);
            }

            await authAPI.register(submitData);
            navigate('/login', {
                state: {
                    message: 'Registration successful! You can now login with your credentials.',
                    isPending: false
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
        <div className="h-screen flex overflow-hidden">
            {/* Left Side - Registration Form - Scrollable */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 h-screen overflow-y-auto p-6 bg-gradient-to-br from-emerald-50 to-teal-50"
            >
                <div className="w-full max-w-2xl mx-auto py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <Link
                                to="/register"
                                className="inline-flex items-center text-gray-600 hover:text-emerald-600 transition-colors font-medium group"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                                <span>Back</span>
                            </Link>
                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center overflow-hidden">
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                    <GraduationCap className="w-6 h-6 text-emerald-600 hidden" />
                                </div>
                                <span className="font-bold text-gray-900">AdeebTechLab</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Registration</h1>
                        <p className="text-gray-500">Fill in your details to enroll in our technical courses</p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
                    >
                        {/* Personal Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Full Name *" name="fullName" icon={User} placeholder="Enter your full name" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                            <InputField label="Father Name" name="fatherName" icon={User} placeholder="Father's full name" value={formData.fatherName} onChange={handleChange} />
                            <InputField label="Phone *" name="phone" type="tel" icon={Phone} placeholder="+92 300 1234567" value={formData.phone} onChange={handleChange} error={errors.phone} />
                            <InputField label="Email *" name="email" type="email" icon={Mail} placeholder="your@email.com" value={formData.email} onChange={handleChange} error={errors.email} />
                            <InputField label="CNIC/BForm *" name="cnic" icon={CreditCard} placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleCNICChange} error={errors.cnic} />
                            <InputField label="Date of Birth *" name="dob" type="date" icon={Calendar} value={formData.dob} onChange={handleChange} error={errors.dob} />
                            <InputField label="Age (Auto) *" name="age" type="number" placeholder="Calculated automatically" value={formData.age} onChange={handleChange} error={errors.age} readOnly />
                            <SelectField label="Gender *" name="gender" options={['Male', 'Female']} placeholder="Select Gender" value={formData.gender} onChange={handleChange} error={errors.gender} />
                        </div>

                        {/* Course & Attendance */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">Course Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <SelectField label="Course *" name="course" options={COURSES} placeholder="Select Course" value={formData.course} onChange={handleChange} error={errors.course} />
                            <SelectField label="City to Attend Classes *" name="cityToAttend" options={CITIES} placeholder="Select City" value={formData.cityToAttend} onChange={handleChange} error={errors.cityToAttend} />
                            <SelectField label="Attend Classes *" name="attendClasses" options={['Online', 'Physical']} placeholder="Select Type" value={formData.attendClasses} onChange={handleChange} error={errors.attendClasses} />
                            <InputField label="Education *" name="education" icon={BookOpen} placeholder="Your highest education" value={formData.education} onChange={handleChange} error={errors.education} />
                        </div>

                        {/* Guardian Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">Guardian Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Guardian Name *" name="guardianName" icon={Users} placeholder="Guardian's full name" value={formData.guardianName} onChange={handleChange} error={errors.guardianName} />
                            <InputField label="Guardian Phone *" name="guardianPhone" type="tel" icon={Phone} placeholder="Guardian's phone" value={formData.guardianPhone} onChange={handleChange} error={errors.guardianPhone} />
                            <InputField label="Guardian Occupation *" name="guardianOccupation" placeholder="Guardian's occupation" value={formData.guardianOccupation} onChange={handleChange} error={errors.guardianOccupation} />
                        </div>

                        {/* Address */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">Address</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address *</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="Enter your complete address"
                                    className={`w-full px-4 py-3 border ${errors.address ? 'border-red-400' : 'border-gray-200'
                                        } rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50`}
                                />
                                {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                            </div>
                            <InputField label="City *" name="city" icon={MapPin} placeholder="Your city" value={formData.city} onChange={handleChange} error={errors.city} />
                            <InputField label="Country *" name="country" placeholder="Your country" value={formData.country} onChange={handleChange} error={errors.country} />
                        </div>

                        {/* Attachments */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">Attachments</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50"
                                />
                                <p className="mt-1 text-xs text-red-500 font-medium">⚠️ Upload image less than 1MB</p>
                                {photoFile && <p className="mt-1 text-sm text-emerald-600">Selected: {photoFile.name}</p>}
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Registration Fee Screenshot <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFeeChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50"
                                />
                                <p className="mt-1 text-xs text-red-500 font-medium">⚠️ Upload image less than 1MB</p>
                                {feeFile ? (
                                    <p className="mt-1 text-sm text-emerald-600">Selected: {feeFile.name}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">Pay Rs. 300 and upload screenshot (optional)</p>
                                )}
                            </div>
                        </div>

                        {apiError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                                {apiError}
                            </div>
                        )}

                        {/* Additional Info */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">Account Setup</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Create a password"
                                        className={`w-full px-4 py-3 border ${errors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50`}
                                    />
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm your password"
                                        className={`w-full px-4 py-3 border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/50`}
                                    />
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
                            <SelectField label="How did you hear about us? *" name="heardAbout" options={HEARD_OPTIONS} placeholder="Select Option" value={formData.heardAbout} onChange={handleChange} error={errors.heardAbout} />
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-4 mb-8">
                            <label className={`flex items-start gap-3 p-4 rounded-xl border ${errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                <input
                                    type="checkbox"
                                    name="termsAccepted"
                                    checked={formData.termsAccepted}
                                    onChange={handleChange}
                                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-700">I Accept All Terms and Conditions</span>
                            </label>

                            <label className={`flex items-start gap-3 p-4 rounded-xl border ${errors.dataConfirmed ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                <input
                                    type="checkbox"
                                    name="dataConfirmed"
                                    checked={formData.dataConfirmed}
                                    onChange={handleChange}
                                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-700">I confirm that all provided data is correct and I agree to abide by the organisation's requirements if admitted.</span>
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !formData.termsAccepted || !formData.dataConfirmed}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Registering...</span>
                                </>
                            ) : (
                                <span>Register Now</span>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>

            {/* Right Side - Decorative Panel with Image - Fixed */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 h-screen sticky top-0 relative overflow-hidden"
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
                    {/* Logo & Branding - Centered */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="flex flex-col items-center justify-center gap-6"
                    >
                        <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 overflow-hidden shadow-2xl">
                            <img
                                src="/logo.png"
                                alt="AdeebTechLab Logo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <GraduationCap className="w-16 h-16 text-white hidden" />
                        </div>
                        <h1 className="text-white text-4xl font-bold tracking-tight">AdeebTechLab</h1>
                        <p className="text-white/70 text-lg">Empowering Your Tech Journey</p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default StudentRegister;
