import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, User, Mail, Phone, CreditCard,
    MapPin, Briefcase, FileText, Camera, ChevronDown, AlertCircle, Eye, EyeOff, Calendar, X
} from 'lucide-react';
import { authAPI } from '../../services/api';
import ImageCropper from '../../components/ui/ImageCropper';
import { PAKISTAN_CITIES, COUNTRIES } from '../../utils/locations';

const SKILLS = [
    'Trading', 'Taxation', 'Freelancing', 'Video Editing', 'E-Commerce',
    'Programming', 'Office Work [IT]', 'Cyber Security', 'Machine Learning',
    'Truck Dispatching', 'UX/UI Designing', 'Youtuber Course', 'Graphic Designer',
    'Home Architecture', 'Internet of Thing [IOT]', 'Digital Marketing, Ads',
    'Web Development', 'App Development', 'Software Development',
    'App Dev Without Coding', 'Web Dev Without Coding', 'Other'
];

const CITIES = PAKISTAN_CITIES;
const HEARD_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp Group', 'Website',
    'YouTube', 'Friends & Family', 'Twitter', 'LinkedIn', 'Other'
];

// Define components OUTSIDE to prevent re-creation and focus loss
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
                    } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
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
                    } rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 appearance-none cursor-pointer`}
            >
                <option value="">{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
);

const JobRegister = () => {
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
        email: '',
        phone: '',
        cnic: '',
        city: '',
        otherCity: '',
        country: '',
        otherCountry: '',
        qualification: '',
        teachingExp: '',
        experienceDetails: '',
        skills: [],
        cvUrl: '',
        preferredCity: '',
        preferredMode: '',
        heardAbout: '',
        password: '',
        confirmPassword: '',
        dob: '',
        age: '',
        termsAccepted: false
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

        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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

    const validateForm = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.fatherName.trim()) newErrors.fatherName = 'Father name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.phone) newErrors.phone = 'Phone is required';
        if (!formData.cnic) newErrors.cnic = 'CNIC is required';
        if (!formData.dob) newErrors.dob = 'Date of Birth is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.country) newErrors.country = 'Country is required';
        if (!formData.qualification) newErrors.qualification = 'Qualification is required';
        if (!formData.teachingExp) newErrors.teachingExp = 'This field is required';
        if (formData.skills.length === 0) newErrors.skills = 'Select at least one skill';
        if (!formData.preferredCity) newErrors.preferredCity = 'Preferred city is required';
        if (!formData.preferredMode) newErrors.preferredMode = 'Preferred mode is required';
        if (!formData.heardAbout) newErrors.heardAbout = 'This field is required';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept terms';

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
            submitData.append('phone', formData.phone);
            submitData.append('role', 'job');
            submitData.append('location', formData.city === 'Other' ? formData.otherCity : formData.city);
            submitData.append('country', formData.country === 'Other' ? formData.otherCountry : formData.country);
            submitData.append('cnic', formData.cnic);
            submitData.append('dob', formData.dob);
            submitData.append('age', formData.age);
            submitData.append('skills', formData.skills.join(', '));
            submitData.append('experience', formData.experienceDetails);
            submitData.append('portfolio', formData.cvUrl);

            if (photoFile) {
                submitData.append('photo', photoFile);
            }

            await authAPI.register(submitData);
            navigate('/login', {
                state: {
                    message: 'Application submitted! You can now login with your credentials.',
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
        <div className="min-h-screen flex">
            {cropperSrc && (
                <ImageCropper
                    imageSrc={cropperSrc}
                    onCrop={handleCropDone}
                    onCancel={() => setCropperSrc(null)}
                    accentColor="purple"
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
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-fuchsia-500 to-purple-800">
                    {/* Animated Background Elements */}
                    <div className="absolute top-20 left-20 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-fuchsia-300/20 rounded-full blur-3xl animate-pulse-slow delay-300"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-float"></div>
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
                                <Briefcase className="w-16 h-16 text-white hidden" />
                            </div>
                            <h2 className="text-white text-2xl font-bold tracking-tight">LMS Adeeb Technology Lab</h2>
                        </motion.div>

                        {/* Detailed Information - Scrollable Area */}
                        <div
                            className="w-full overflow-y-auto pr-2 custom-scrollbar text-left"
                            style={{ maxHeight: '55vh' }}
                        >
                            <div className="space-y-6 text-white/90 pb-4">
                                {/* Status Banner */}
                                <div className="bg-primary/20 backdrop-blur-sm rounded-xl p-4 border border-primary/30">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-bold">Jobs Application Form</h3>
                                        <span className="px-2 py-1 bg-primary text-white text-xs font-bold rounded">Open</span>
                                    </div>
                                    <p className="text-sm font-semibold text-primary">Applications are currently open!</p>
                                    <p className="text-xs mt-1 text-white/60">Last Date To Apply: Always Open</p>
                                </div>

                                <div className="bg-fuchsia-500/20 p-3 rounded-lg border border-fuchsia-500/30">
                                    <p className="text-sm font-semibold">Type: On-Site / Remote</p>
                                </div>

                                {/* Why Join? */}
                                <div>
                                    <h4 className="font-bold mb-3 border-l-4 border-yellow-400 pl-3 uppercase text-xs tracking-widest text-fuchsia-400">Why Join Our Team?</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-center gap-2">✅ Teach in Professional Environment</li>
                                        <li className="flex items-center gap-2">✅ Get Paid for Each Course</li>
                                        <li className="flex items-center gap-2">✅ Build Career with Adeeb Tech Lab</li>
                                        <li className="flex items-center gap-2">✅ Teach Online or On-Site</li>
                                    </ul>
                                </div>

                                {/* Teaching Fields */}
                                <div>
                                    <h4 className="font-bold mb-3 border-l-4 border-yellow-400 pl-3 uppercase text-xs tracking-widest text-fuchsia-400">Teaching Fields Available</h4>
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="p-2 bg-white/5 rounded">💻 Web Development</div>
                                        <div className="p-2 bg-white/5 rounded">🧠 Artificial Intelligence</div>
                                        <div className="p-2 bg-white/5 rounded">📊 Digital Marketing</div>
                                        <div className="p-2 bg-white/5 rounded">🎨 Graphic Design</div>
                                        <div className="p-2 bg-white/5 rounded">💬 IELTS & Communication</div>
                                        <div className="p-2 bg-white/5 rounded">🧾 Taxation & E-Commerce</div>
                                    </div>
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
                className="w-full lg:w-1/2 h-screen overflow-y-auto p-8 bg-white"
            >
                <div className="w-full max-w-2xl mx-auto py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="mb-6">
                            <Link
                                to="/register"
                                className="inline-flex items-center text-gray-600 hover:text-primary transition-colors font-medium"
                            >
                                ← Back
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Application</h1>
                        <p className="text-gray-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-primary font-semibold underline hover:text-purple-700 transition-colors"
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
                                <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
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
                            <User className="w-5 h-5 text-primary" /> Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Full Name *" name="fullName" icon={User} placeholder="Your full name" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                            <InputField label="Father Name *" name="fatherName" icon={User} placeholder="Father's name" value={formData.fatherName} onChange={handleChange} error={errors.fatherName} />
                            <InputField label="Email Address *" name="email" type="email" icon={Mail} placeholder="your@email.com" value={formData.email} onChange={handleChange} error={errors.email} />
                            <InputField label="Phone Number *" name="phone" type="tel" icon={Phone} placeholder="+92 300 1234567" value={formData.phone} onChange={handleChange} error={errors.phone} />
                            <InputField label="CNIC Number *" name="cnic" icon={CreditCard} placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleCNICChange} error={errors.cnic} />
                            <InputField label="Date of Birth *" name="dob" type="date" icon={Calendar} value={formData.dob} onChange={handleChange} error={errors.dob} />
                            <InputField label="Age (Auto) *" name="age" type="number" placeholder="Calculated automatically" value={formData.age} onChange={handleChange} error={errors.age} readOnly />
                            <SelectField label="City *" name="city" options={PAKISTAN_CITIES} placeholder="Select City" value={formData.city} onChange={handleChange} error={errors.city} />
                            {formData.city === 'Other' && (
                                <InputField label="Specify City *" name="otherCity" placeholder="Enter your city" value={formData.otherCity} onChange={handleChange} error={errors.otherCity} />
                            )}
                            
                            <SelectField label="Country *" name="country" options={COUNTRIES} placeholder="Select Country" value={formData.country} onChange={handleChange} error={errors.country} />
                            {formData.country === 'Other' && (
                                <InputField label="Specify Country *" name="otherCountry" placeholder="Enter your country" value={formData.otherCountry} onChange={handleChange} error={errors.otherCountry} />
                            )}
                        </div>

                        {/* Professional Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary" /> Professional Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Highest Qualification *" name="qualification" placeholder="e.g. M.Sc Computer Science" value={formData.qualification} onChange={handleChange} error={errors.qualification} />
                            <SelectField label="Any Work Experience *" name="teachingExp" options={['Yes', 'No']} placeholder="Select" value={formData.teachingExp} onChange={handleChange} error={errors.teachingExp} />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Experience Details</label>
                                <textarea
                                    name="experienceDetails"
                                    value={formData.experienceDetails}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Write about your experience..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Skills or Fields you specialize in * <span className="text-gray-400 text-xs">(select multiple)</span></label>
                                <div className="flex flex-wrap gap-2">
                                    {SKILLS.map(skill => (
                                        <label
                                            key={skill}
                                            className={`px-4 py-2 rounded-full border cursor-pointer transition-all text-sm ${formData.skills.includes(skill)
                                                ? 'bg-primary/10 border-primary text-purple-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.skills.includes(skill)}
                                                onChange={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        skills: prev.skills.includes(skill)
                                                            ? prev.skills.filter(s => s !== skill)
                                                            : [...prev.skills, skill]
                                                    }));
                                                }}
                                                className="hidden"
                                            />
                                            {skill}
                                        </label>
                                    ))}
                                </div>
                                {errors.skills && <p className="mt-1 text-sm text-red-500">{errors.skills}</p>}
                            </div>
                        </div>

                        {/* Preferences & Attachments */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" /> Preferences & Attachments
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="CV/Resume URL (Drive/Dropbox)" name="cvUrl" type="url" icon={FileText} placeholder="https://drive.google.com/..." value={formData.cvUrl} onChange={handleChange} error={errors.cvUrl} />
                            <SelectField label="Preferred City *" name="preferredCity" options={CITIES} placeholder="Select City" value={formData.preferredCity} onChange={handleChange} error={errors.preferredCity} />
                            <SelectField label="Preferred Mode *" name="preferredMode" options={['Remote', 'On-Site']} placeholder="Select Mode" value={formData.preferredMode} onChange={handleChange} error={errors.preferredMode} />
                            <div className="md:col-span-2">
                                <SelectField label="How did you hear about us? *" name="heardAbout" options={HEARD_OPTIONS} placeholder="Select Option" value={formData.heardAbout} onChange={handleChange} error={errors.heardAbout} />
                            </div>
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
                                        className={`w-full px-4 py-3 border ${errors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
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
                                        className={`w-full px-4 py-3 border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50`}
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

                        {/* Terms Checkbox */}
                        <div className="mb-8">
                            <label className={`flex items-start gap-3 p-4 rounded-xl border ${errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                <input
                                    type="checkbox"
                                    name="termsAccepted"
                                    checked={formData.termsAccepted}
                                    onChange={handleChange}
                                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700">I Accept All Terms and Conditions</span>
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !formData.termsAccepted}
                            className="w-full py-4 bg-primary hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <span>Submit Application</span>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>


        </div>
    );
};

export default JobRegister;




