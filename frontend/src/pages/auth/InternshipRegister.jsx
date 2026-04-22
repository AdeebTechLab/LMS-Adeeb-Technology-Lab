import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, User, Mail, Phone, CreditCard, Calendar,
    MapPin, BookOpen, Building, GraduationCap, FileText, Camera, Receipt, ChevronDown, Eye, EyeOff, Users, Briefcase, X
} from 'lucide-react';
import { authAPI } from '../../services/api';
import ImageCropper from '../../components/ui/ImageCropper';
import { PAKISTAN_CITIES, COUNTRIES } from '../../utils/locations';

const PROGRAMS = [
    'Trading', 'Taxation', 'Freelancing', 'Video Editing', 'E-Commerce',
    'Programming', 'Office Work [IT]', 'Cyber Security', 'Machine Learning',
    'Truck Dispatching', 'UX/UI Designing', 'Youtuber Course', 'Graphic Designer',
    'Home Architecture', 'Internet of Thing [IOT]', 'Digital Marketing, Ads',
    'Web Development', 'App Development', 'Software Development',
    'App Dev Without Coding', 'Web Dev Without Coding', 'Other'
];

const INTERN_CITIES = ['Bahawalpur', 'Islamabad'];
const CITIES = PAKISTAN_CITIES;
const DURATIONS = ['3 Month', '6 Month', '1 Year'];
const HEARD_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp', 'Website',
    'YouTube', 'Event / Seminar', 'Friends & Family', 'Other'
];

const InputField = ({ label, name, type = 'text', icon: Icon, placeholder, value, onChange, error, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-4 py-3 ${Icon ? 'pl-11' : ''} border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50`}
                {...props}
            />
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

const SelectField = ({ label, name, options, placeholder, value, onChange, error }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        <div className="relative">
            <select
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full px-4 py-3 border ${error ? 'border-red-400' : 'border-gray-200'
                    } rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 appearance-none cursor-pointer`}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

const InternshipRegister = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [cropperSrc, setCropperSrc] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        fatherName: '',
        dob: '',
        gender: '',
        cnic: '',
        contact: '',
        email: '',
        homeAddress: '',
        city: '',
        otherCity: '',
        country: '',
        otherCountry: '',
        degree: '',
        university: '',
        department: '',
        semester: '',
        rollNumber: '',
        cgpa: '',
        majorSubjects: '',
        duration: '',
        internCity: '',
        internType: '',
        requirements: [],
        resumeUrl: '',
        guardianPhone: '',
        guardianOccupation: '',
        feeUrl: '',
        reason: '',
        heardAbout: '',
        age: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false,
        dataConfirmed: false
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
            let finalValue = type === 'checkbox' ? checked : value;
            setFormData(prev => ({
                ...prev,
                [name]: finalValue
            }));
        }
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setCropperSrc(reader.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropDone = (croppedFile, croppedDataUrl) => {
        if (croppedFile.size > 1 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, photo: 'Cropped image is still over 1MB. Try zooming out.' }));
            setCropperSrc(null);
            return;
        }
        setPhotoFile(croppedFile);
        setPhotoPreview(croppedDataUrl);
        setCropperSrc(null);
        if (errors.photo) setErrors(prev => ({ ...prev, photo: '' }));
    };

    const handleRequirementChange = (value) => {
        setFormData(prev => ({
            ...prev,
            requirements: prev.requirements.includes(value)
                ? prev.requirements.filter(r => r !== value)
                : [...prev.requirements, value]
        }));
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
        if (!formData.fatherName.trim()) newErrors.fatherName = "Father's name is required";
        if (!formData.dob) newErrors.dob = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.cnic) newErrors.cnic = 'CNIC is required';
        if (!formData.contact) newErrors.contact = 'Contact is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.homeAddress) newErrors.homeAddress = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.degree) newErrors.degree = 'Degree is required';
        if (!formData.university) newErrors.university = 'University is required';
        if (!formData.duration) newErrors.duration = 'Duration is required';
        if (!formData.internCity) newErrors.internCity = 'City is required';
        if (!formData.internType) newErrors.internType = 'Type is required';
        if (!formData.heardAbout) newErrors.heardAbout = 'This field is required';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'Required';
        if (!formData.dataConfirmed) newErrors.dataConfirmed = 'Required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setApiError('');
        try {
            const submitData = new FormData();
            submitData.append('name', formData.fullName);
            submitData.append('email', formData.email);
            submitData.append('password', formData.password);
            submitData.append('phone', formData.contact);
            submitData.append('role', 'intern');
            submitData.append('location', formData.internCity.toLowerCase());
            // Intern-specific fields
            submitData.append('cnic', formData.cnic);
            submitData.append('dob', formData.dob);
            submitData.append('age', formData.age);
            submitData.append('gender', formData.gender);
            submitData.append('fatherName', formData.fatherName);
            submitData.append('guardianName', formData.fatherName); // Keep fallback if needed
            submitData.append('address', formData.homeAddress);
            submitData.append('city', formData.city === 'Other' ? formData.otherCity : formData.city);
            submitData.append('country', formData.country === 'Other' ? formData.otherCountry : formData.country);
            submitData.append('education', `${formData.degree} - ${formData.university}`);
            submitData.append('degree', formData.degree);
            submitData.append('university', formData.university);
            submitData.append('department', formData.department);
            submitData.append('semester', formData.semester);
            submitData.append('rollNumber', formData.rollNumber);
            submitData.append('cgpa', formData.cgpa);
            submitData.append('majorSubjects', formData.majorSubjects);
            submitData.append('attendType', formData.internType);
            submitData.append('heardAbout', formData.heardAbout);
            submitData.append('guardianPhone', formData.guardianPhone);
            submitData.append('guardianOccupation', formData.guardianOccupation);

            if (photoFile) {
                submitData.append('photo', photoFile);
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

    const requirementOptions = ['Home WiFi', 'Personal Laptop', 'No Laptop', 'No WiFi'];

    return (
        <div className="h-screen flex overflow-hidden">
            {cropperSrc && (
                <ImageCropper
                    imageSrc={cropperSrc}
                    onCrop={handleCropDone}
                    onCancel={() => setCropperSrc(null)}
                    accentColor="blue"
                />
            )}
            {/* Left Side - Decorative - Fixed */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:flex lg:w-1/2 h-screen sticky top-0 relative overflow-hidden"
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-500 to-blue-800">
                    {/* Animated Background Elements */}
                    <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-pulse-slow delay-300"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-float"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-8 lg:p-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="w-full max-w-lg bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/20 p-8 lg:p-10 shadow-2xl flex flex-col items-center relative overflow-hidden"
                    >
                        {/* Subtle inner glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="flex flex-col items-center gap-3 mb-4"
                        >
                            <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden shadow-xl">
                                <img
                                    src="/logo.png"
                                    alt="Adeeb Technology Lab Logo"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <GraduationCap className="w-16 h-16 text-white hidden" />
                            </div>
                            <h2 className="text-white text-2xl font-bold tracking-tight">LMS Adeeb Technology Lab</h2>
                        </motion.div>

                        {/* Detailed Information - Scrollable Area */}
                        <div
                            className="w-full overflow-y-auto pr-2 custom-scrollbar text-left"
                            style={{ maxHeight: '55vh' }}
                        >
                            <div className="space-y-6 text-white/90 pb-4">
                                {/* Announcements */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                                        Announcement
                                    </h3>
                                    <p className="text-sm leading-relaxed text-yellow-400 font-medium">
                                        🚀 Launch your tech career with hands-on experience!
                                    </p>
                                </div>

                                {/* Key Details */}
                                {(() => {
                                    const lastDate = new Date('2026-06-06');
                                    const today = new Date();
                                    const diffTime = lastDate - today;
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    // Open if within 20 days before or 20 days after the last date
                                    const isOpen = diffDays <= 20 && diffDays >= -20;
                                    
                                    return (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                <p className="text-xs text-white/60">Status</p>
                                                <p className={`font-bold ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
                                                    {isOpen ? 'Open' : 'Closed'}
                                                </p>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                                <p className="text-xs text-white/60">Last Date</p>
                                                <p className="font-bold">06/06/2026</p>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-lg border border-white/5 col-span-2 text-center">
                                                <p className="text-xs text-white/60">Duration</p>
                                                <p className="font-bold">3 - 6 Months</p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="bg-blue-400/20 p-3 rounded-lg border border-blue-400/30">
                                    <p className="text-sm font-semibold">Type: On-Site / Remote</p>
                                </div>

                                {/* Requirements */}
                                <div>
                                    <h4 className="font-bold mb-3 border-l-4 border-yellow-400 pl-3 uppercase text-xs tracking-widest">Internship Requirements</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-center gap-2">💻 Personal Laptop</li>
                                        <li className="flex items-center gap-2">🌐 Home Wi-Fi</li>
                                    </ul>
                                </div>

                                {/* Fields Include */}
                                <div>
                                    <h4 className="font-bold mb-3 border-l-4 border-yellow-400 pl-3 uppercase text-xs tracking-widest">Internship Fields Include</h4>
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="p-2 bg-white/5 rounded">📌 Office Work (IT)</div>
                                        <div className="p-2 bg-white/5 rounded">📌 Social Media Marketing</div>
                                        <div className="p-2 bg-white/5 rounded">📌 Graphic Designing</div>
                                        <div className="p-2 bg-white/5 rounded">📌 Video Editing</div>
                                        <div className="p-2 bg-white/5 rounded">📌 Web, App & Software Development</div>
                                        <div className="p-2 bg-white/5 rounded">📌 Team Management</div>
                                    </div>
                                </div>

                                {/* Internship Benefits */}
                                <div>
                                    <h4 className="font-bold mb-3 border-l-4 border-yellow-400 pl-3 uppercase text-xs tracking-widest">Internship Benefits</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-center gap-2">✅ Work on real projects</li>
                                        <li className="flex items-center gap-2">✅ Learn industry skills</li>
                                        <li className="flex items-center gap-2">✅ Internship Certificate</li>
                                        <li className="flex items-center gap-2">✅ Online & On-Site Available</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Right Side - Registration Form - Scrollable */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 h-screen overflow-y-auto p-6 bg-white"
            >
                <div className="w-full max-w-2xl mx-auto py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="mb-6">
                            <Link
                                to="/register"
                                className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium"
                            >
                                ← Back
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Internship Registration</h1>
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-blue-600 font-semibold underline hover:text-blue-700 transition-colors"
                            >
                                Log in
                            </Link>
                        </p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
                    >
                        {apiError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                                {apiError}
                            </div>
                        )}

                        {/* Photo Upload */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center">
                                            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                            <span className="text-[10px] text-gray-500 font-medium">Photo</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    id="photo-upload"
                                />
                                {photoPreview && (
                                    <button
                                        type="button"
                                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Upload profile picture (Max 2MB)</p>
                            {errors.photo && <p className="mt-1 text-xs text-red-500">{errors.photo}</p>}
                        </div>

                        {/* Personal Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Full Name *" name="fullName" icon={User} placeholder="Your full name" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                            <InputField label="Father's Name *" name="fatherName" icon={User} placeholder="Father's name" value={formData.fatherName} onChange={handleChange} error={errors.fatherName} />
                            <InputField label="Date of Birth *" name="dob" type="date" icon={Calendar} value={formData.dob} onChange={handleChange} error={errors.dob} />
                            <InputField label="Age (Auto) *" name="age" type="number" placeholder="Calculated automatically" value={formData.age} onChange={handleChange} error={errors.age} readOnly />
                            <SelectField label="Gender *" name="gender" options={['Male', 'Female']} placeholder="Select Gender" value={formData.gender} onChange={handleChange} error={errors.gender} />
                            <InputField label="CNIC / B-Form *" name="cnic" icon={CreditCard} placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleCNICChange} error={errors.cnic} />
                            <InputField label="Contact Number *" name="contact" type="tel" icon={Phone} placeholder="+92 300 1234567" value={formData.contact} onChange={handleChange} error={errors.contact} />
                            <InputField label="Email Address *" name="email" type="email" icon={Mail} placeholder="your@email.com" value={formData.email} onChange={handleChange} error={errors.email} />
                        </div>

                        {/* Guardian Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" /> Guardian Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField
                                label="Guardian Phone"
                                name="guardianPhone"
                                icon={Phone}
                                placeholder="Guardian's Phone"
                                value={formData.guardianPhone}
                                onChange={handleChange}
                            />
                            <InputField
                                label="Guardian Occupation"
                                name="guardianOccupation"
                                icon={Briefcase}
                                placeholder="Guardian's Occupation"
                                value={formData.guardianOccupation}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <SelectField label="City *" name="city" options={PAKISTAN_CITIES} placeholder="Select City" value={formData.city} onChange={handleChange} error={errors.city} />
                            {formData.city === 'Other' && (
                                <InputField label="Specify City *" name="otherCity" placeholder="Enter your city" value={formData.otherCity} onChange={handleChange} error={errors.otherCity} />
                            )}
                            
                            <SelectField label="Country *" name="country" options={COUNTRIES} placeholder="Select Country" value={formData.country} onChange={handleChange} error={errors.country} />
                            {formData.country === 'Other' && (
                                <InputField label="Specify Country *" name="otherCountry" placeholder="Enter your country" value={formData.otherCountry} onChange={handleChange} error={errors.otherCountry} />
                            )}

                            <div className="md:col-span-2">
                                <InputField label="Home Address *" name="homeAddress" icon={MapPin} placeholder="Complete address" value={formData.homeAddress} onChange={handleChange} error={errors.homeAddress} />
                            </div>
                        </div>

                        {/* Educational Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-blue-600" /> Educational Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Current Degree Program *" name="degree" icon={GraduationCap} placeholder="e.g. BS Computer Science" value={formData.degree} onChange={handleChange} error={errors.degree} />
                            <InputField label="Institution / University *" name="university" icon={Building} placeholder="University name" value={formData.university} onChange={handleChange} error={errors.university} />
                            <InputField label="Department / Faculty" name="department" icon={BookOpen} placeholder="Your department" value={formData.department} onChange={handleChange} error={errors.department} />
                            <InputField label="Current Semester / Year" name="semester" placeholder="e.g. 6th Semester" value={formData.semester} onChange={handleChange} error={errors.semester} />
                            <InputField label="CGPA or Percentage" name="cgpa" placeholder="e.g. 3.5 or 85%" value={formData.cgpa} onChange={handleChange} error={errors.cgpa} />
                            <div className="md:col-span-2">
                                <InputField label="Major Subjects / Courses" name="majorSubjects" placeholder="List your major subjects" value={formData.majorSubjects} onChange={handleChange} error={errors.majorSubjects} />
                            </div>
                        </div>

                        {/* Internship Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" /> Internship Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <SelectField label="Duration *" name="duration" options={DURATIONS} placeholder="Select Duration" value={formData.duration} onChange={handleChange} error={errors.duration} />
                            <SelectField label="City for Internship *" name="internCity" options={INTERN_CITIES} placeholder="Select City" value={formData.internCity} onChange={handleChange} error={errors.internCity} />
                            <SelectField label="Internship Type *" name="internType" options={['Physical', 'Online']} placeholder="Select Type" value={formData.internType} onChange={handleChange} error={errors.internType} />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
                                <div className="flex flex-wrap gap-3">
                                    {requirementOptions.map(req => (
                                        <label
                                            key={req}
                                            className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${formData.requirements.includes(req)
                                                ? 'bg-blue-100 border-blue-500 text-blue-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.requirements.includes(req)}
                                                onChange={() => handleRequirementChange(req)}
                                                className="hidden"
                                            />
                                            {req}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Attachments */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Attachments
                        </h2>
                        <div className="grid grid-cols-1 gap-5 mb-8">
                            <InputField label="Resume / CV (Google Drive Link)" name="resumeUrl" type="url" icon={FileText} placeholder="https://drive.google.com/..." value={formData.resumeUrl} onChange={handleChange} error={errors.resumeUrl} />
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-1 gap-5 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Why do you want to join this internship?</label>
                                <textarea
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Write a short answer..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
                                />
                            </div>
                            <SelectField label="How did you hear about us? *" name="heardAbout" options={HEARD_OPTIONS} placeholder="Select Option" value={formData.heardAbout} onChange={handleChange} error={errors.heardAbout} />
                        </div>

                        {/* Account Setup */}
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
                                        className={`w-full px-4 py-3 border ${errors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50`}
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
                                        placeholder="Confirm password"
                                        className={`w-full px-4 py-3 border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50`}
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
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-4 mb-8">
                            <label className={`flex items-start gap-3 p-4 rounded-xl border ${errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                <input
                                    type="checkbox"
                                    name="termsAccepted"
                                    checked={formData.termsAccepted}
                                    onChange={handleChange}
                                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">I Accept All Terms and Conditions</span>
                            </label>

                            <label className={`flex items-start gap-3 p-4 rounded-xl border ${errors.dataConfirmed ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                <input
                                    type="checkbox"
                                    name="dataConfirmed"
                                    checked={formData.dataConfirmed}
                                    onChange={handleChange}
                                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">I confirm that all provided data is correct and I agree to abide by the organisation's requirements if selected.</span>
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !formData.termsAccepted || !formData.dataConfirmed}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
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


        </div>
    );
};

export default InternshipRegister;
