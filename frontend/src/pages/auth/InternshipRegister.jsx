import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, User, Mail, Phone, CreditCard, Calendar,
    MapPin, BookOpen, Building, GraduationCap, FileText, Camera, Receipt, ChevronDown
} from 'lucide-react';
import { authAPI } from '../../services/api';

const PROGRAMS = [
    'Trading', 'Taxation', 'Freelancing', 'Video Editing', 'E-Commerce',
    'Programming', 'Office Work [IT]', 'Cyber Security', 'Machine Learning',
    'Truck Dispatching', 'UX/UI Designing', 'Youtuber Course', 'Graphic Designer',
    'Home Architecture', 'Internet of Thing [IOT]', 'Digital Marketing, Ads',
    'Web Development', 'App Development', 'Software Development',
    'App Dev Without Coding', 'Web Dev Without Coding', 'Other'
];

const CITIES = ['Bahawalpur', 'Islamabad'];
const DURATIONS = ['3 Month', '6 Month', '1 Year'];
const HEARD_OPTIONS = [
    'Poster & Panaflex', 'Facebook', 'Instagram', 'WhatsApp', 'Website',
    'YouTube', 'Event / Seminar', 'Friends & Family', 'Other'
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
        degree: '',
        university: '',
        department: '',
        semester: '',
        rollNumber: '',
        cgpa: '',
        majorSubjects: '',
        program: '',
        duration: '',
        internCity: '',
        internType: '',
        requirements: [],
        resumeUrl: '',
        pictureUrl: '',
        feeUrl: '',
        reason: '',
        heardAbout: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false,
        dataConfirmed: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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
        if (!formData.program) newErrors.program = 'Program is required';
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
            submitData.append('gender', formData.gender);
            submitData.append('guardianName', formData.fatherName);
            submitData.append('address', formData.homeAddress);
            submitData.append('city', formData.city);
            submitData.append('education', `${formData.degree} - ${formData.university}`);
            submitData.append('attendType', formData.internType);
            submitData.append('heardAbout', formData.heardAbout);

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

    const requirementOptions = ['Home WiFi', 'Personal Laptop', 'No Laptop', 'No WiFi'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <Link to="/register" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        <span>Back to Role Selection</span>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Internship Registration</h1>
                    <p className="text-gray-500">Apply for our internship programs and gain hands-on experience</p>
                </motion.div>

                {/* Form */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
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
                        <User className="w-5 h-5 text-blue-600" /> Personal Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        <InputField label="Full Name *" name="fullName" icon={User} placeholder="Your full name" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
                        <InputField label="Father's Name *" name="fatherName" icon={User} placeholder="Father's name" value={formData.fatherName} onChange={handleChange} error={errors.fatherName} />
                        <InputField label="Date of Birth *" name="dob" type="date" icon={Calendar} value={formData.dob} onChange={handleChange} error={errors.dob} />
                        <SelectField label="Gender *" name="gender" options={['Male', 'Female']} placeholder="Select Gender" value={formData.gender} onChange={handleChange} error={errors.gender} />
                        <InputField label="CNIC / B-Form *" name="cnic" icon={CreditCard} placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleCNICChange} error={errors.cnic} />
                        <InputField label="Contact Number *" name="contact" type="tel" icon={Phone} placeholder="+92 300 1234567" value={formData.contact} onChange={handleChange} error={errors.contact} />
                        <InputField label="Email Address *" name="email" type="email" icon={Mail} placeholder="your@email.com" value={formData.email} onChange={handleChange} error={errors.email} />
                        <InputField label="City *" name="city" icon={MapPin} placeholder="Your city" value={formData.city} onChange={handleChange} error={errors.city} />
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
                        <SelectField label="Internship Program *" name="program" options={PROGRAMS} placeholder="Select Program" value={formData.program} onChange={handleChange} error={errors.program} />
                        <SelectField label="Duration *" name="duration" options={DURATIONS} placeholder="Select Duration" value={formData.duration} onChange={handleChange} error={errors.duration} />
                        <SelectField label="City for Internship *" name="internCity" options={CITIES} placeholder="Select City" value={formData.internCity} onChange={handleChange} error={errors.internCity} />
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
                        <InputField label="Picture URL (Drive/Social Media)" name="pictureUrl" type="url" icon={Camera} placeholder="https://..." value={formData.pictureUrl} onChange={handleChange} error={errors.pictureUrl} />
                        <InputField label="Registration Fee Screenshot (Link)" name="feeUrl" type="url" icon={Receipt} placeholder="https://drive.google.com/..." value={formData.feeUrl} onChange={handleChange} error={errors.feeUrl} />
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
                        <InputField label="Password *" name="password" type="password" placeholder="Create a password" value={formData.password} onChange={handleChange} error={errors.password} />
                        <InputField label="Confirm Password *" name="confirmPassword" type="password" placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
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
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
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
                </motion.form>
            </div>
        </div>
    );
};

export default InternshipRegister;
