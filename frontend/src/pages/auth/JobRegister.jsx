import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, User, Mail, Phone, CreditCard,
    MapPin, Briefcase, FileText, Camera, ChevronDown, AlertCircle
} from 'lucide-react';
import { authAPI } from '../../services/api';

const SKILLS = [
    'Trading', 'Taxation', 'Freelancing', 'Video Editing', 'E-Commerce',
    'Programming', 'Office Work [IT]', 'Cyber Security', 'Machine Learning',
    'Truck Dispatching', 'UX/UI Designing', 'Youtuber Course', 'Graphic Designer',
    'Home Architecture', 'Internet of Thing [IOT]', 'Digital Marketing, Ads',
    'Web Development', 'App Development', 'Software Development',
    'App Dev Without Coding', 'Web Dev Without Coding', 'Other'
];

const CITIES = ['Bahawalpur', 'Islamabad'];
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
                    } rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-gray-50/50`}
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
                    } rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-gray-50/50 appearance-none cursor-pointer`}
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

    const [formData, setFormData] = useState({
        fullName: '',
        fatherName: '',
        email: '',
        phone: '',
        cnic: '',
        city: '',
        qualification: '',
        teachingExp: '',
        experienceDetails: '',
        skills: [],
        cvUrl: '',
        preferredCity: '',
        preferredMode: '',
        pictureUrl: '',
        heardAbout: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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

    const validateForm = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.fatherName.trim()) newErrors.fatherName = 'Father name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.phone) newErrors.phone = 'Phone is required';
        if (!formData.cnic) newErrors.cnic = 'CNIC is required';
        if (!formData.city) newErrors.city = 'City is required';
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
            submitData.append('location', formData.preferredCity.toLowerCase());

            submitData.append('skills', formData.skills.join(', '));

            await authAPI.register(submitData);
            navigate('/login', {
                state: {
                    message: 'Application submitted! Your account is now pending admin verification. You will be able to log in once an admin approves your request.',
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
            {/* Left Side - Registration Form - Scrollable */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full lg:w-1/2 h-screen overflow-y-auto p-8 bg-gradient-to-br from-purple-50 to-pink-50"
            >
                <div className="w-full max-w-2xl mx-auto py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <Link to="/register" className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors">
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                <span>Back to Role Selection</span>
                            </Link>
                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100">
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center overflow-hidden">
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                    <Briefcase className="w-6 h-6 text-purple-600 hidden" />
                                </div>
                                <span className="font-bold text-gray-900">AdeebTechLab</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Application</h1>
                        <p className="text-gray-500">Apply for teaching or staff positions at AdeebTechLab</p>
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

                        {/* Personal Information */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <User className="w-5 h-5 text-purple-600" /> Personal Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Full Name *" name="fullName" icon={User} placeholder="Your full name" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                            <InputField label="Father Name *" name="fatherName" icon={User} placeholder="Father's name" value={formData.fatherName} onChange={handleChange} error={errors.fatherName} />
                            <InputField label="Email Address *" name="email" type="email" icon={Mail} placeholder="your@email.com" value={formData.email} onChange={handleChange} error={errors.email} />
                            <InputField label="Phone Number *" name="phone" type="tel" icon={Phone} placeholder="+92 300 1234567" value={formData.phone} onChange={handleChange} error={errors.phone} />
                            <InputField label="CNIC Number *" name="cnic" icon={CreditCard} placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleCNICChange} error={errors.cnic} />
                            <InputField label="City *" name="city" icon={MapPin} placeholder="Your city" value={formData.city} onChange={handleChange} error={errors.city} />
                        </div>

                        {/* Professional Details */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-purple-600" /> Professional Details
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-gray-50/50"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Skills or Fields you specialize in * <span className="text-gray-400 text-xs">(select multiple)</span></label>
                                <div className="flex flex-wrap gap-2">
                                    {SKILLS.map(skill => (
                                        <label
                                            key={skill}
                                            className={`px-4 py-2 rounded-full border cursor-pointer transition-all text-sm ${formData.skills.includes(skill)
                                                ? 'bg-purple-100 border-purple-500 text-purple-700'
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
                            <FileText className="w-5 h-5 text-purple-600" /> Preferences & Attachments
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="CV/Resume URL (Drive/Dropbox)" name="cvUrl" type="url" icon={FileText} placeholder="https://drive.google.com/..." value={formData.cvUrl} onChange={handleChange} error={errors.cvUrl} />
                            <InputField label="Picture URL (Drive/Social Media)" name="pictureUrl" type="url" icon={Camera} placeholder="https://..." value={formData.pictureUrl} onChange={handleChange} error={errors.pictureUrl} />
                            <SelectField label="Preferred City *" name="preferredCity" options={CITIES} placeholder="Select City" value={formData.preferredCity} onChange={handleChange} error={errors.preferredCity} />
                            <SelectField label="Preferred Mode *" name="preferredMode" options={['Remote', 'On-Site']} placeholder="Select Mode" value={formData.preferredMode} onChange={handleChange} error={errors.preferredMode} />
                            <div className="md:col-span-2">
                                <SelectField label="How did you hear about us? *" name="heardAbout" options={HEARD_OPTIONS} placeholder="Select Option" value={formData.heardAbout} onChange={handleChange} error={errors.heardAbout} />
                            </div>
                        </div>

                        {/* Account Setup */}
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">Account Setup</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <InputField label="Password *" name="password" type="password" placeholder="Create a password" value={formData.password} onChange={handleChange} error={errors.password} />
                            <InputField label="Confirm Password *" name="confirmPassword" type="password" placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
                        </div>

                        {/* Terms Checkbox */}
                        <div className="mb-8">
                            <label className={`flex items-start gap-3 p-4 rounded-xl border ${errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-pointer hover:bg-gray-100 transition-colors`}>
                                <input
                                    type="checkbox"
                                    name="termsAccepted"
                                    checked={formData.termsAccepted}
                                    onChange={handleChange}
                                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">I Accept All Terms and Conditions</span>
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !formData.termsAccepted}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
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
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow delay-300"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-float"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
                    {/* Logo & Branding */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="mb-8 flex flex-col items-center"
                    >
                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden mb-4 shadow-xl">
                            <img
                                src="/logo.png"
                                alt="AdeebTechLab Logo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <Briefcase className="w-10 h-10 text-white hidden" />
                        </div>
                        <h2 className="text-white text-2xl font-bold tracking-tight">AdeebTechLab</h2>
                        <p className="text-white/60 text-sm mt-1">Empowering Your Tech Journey</p>
                    </motion.div>

                    {/* Illustration */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="relative w-full h-full flex items-center justify-center p-12"
                    >
                        <div className="relative w-full max-w-md aspect-[3/4] group">
                            {/* Outer Glow */}
                            <div className="absolute -inset-4 bg-purple-500/20 rounded-[2.5rem] blur-2xl group-hover:bg-purple-500/30 transition-all duration-500"></div>

                            {/* Glass Frame */}
                            <div className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
                                <img
                                    src="/loginimage.webp"
                                    alt="Job Application Illustration"
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                />
                                {/* Overlay gradient to blend bottom */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/60 via-transparent to-transparent"></div>
                            </div>

                            {/* Floating decorative elements */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl animate-pulse"></div>
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
                        </div>
                    </motion.div>

                    {/* Decorative Lines */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-purple-500/10 to-transparent"></div>
                </div>
            </motion.div>
        </div>
    );
};

export default JobRegister;

