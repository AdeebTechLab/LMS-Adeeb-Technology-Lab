import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
    User, Mail, Phone, MapPin, Calendar, CreditCard,
    Edit2, Save, X, Camera, BookOpen, GraduationCap, Users, Loader2, Clock,
    FileText, Briefcase, Globe, Award, Link as LinkIcon
} from 'lucide-react';
import { authAPI, enrollmentAPI, settingsAPI } from '../../services/api';
import { updateUser } from '../../features/auth/authSlice';

const InfoField = ({ icon: Icon, label, value, name, type = 'text', editable = true, isEditing, editForm, onChange }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            {isEditing && editable ? (
                <input
                    type={type}
                    name={name}
                    value={editForm[name] || ''}
                    onChange={onChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
            ) : (
                <p className="font-medium text-gray-900 truncate">{value || 'Not provided'}</p>
            )}
        </div>
    </div>
);

const SelectField = ({ icon: Icon, label, value, name, options, editable = true, isEditing, editForm, onChange }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            {isEditing && editable ? (
                <select
                    name={name}
                    value={editForm[name] || ''}
                    onChange={onChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <p className="font-medium text-gray-900 truncate">
                    {options.find(opt => opt.value === value)?.label || value || 'Not provided'}
                </p>
            )}
        </div>
    </div>
);

const StudentProfile = () => {
    const { user: initialUser } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [enrollments, setEnrollments] = useState([]);
    const [user, setUser] = useState(initialUser);

    const [profileData, setProfileData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        cnic: user?.cnic || '',
        fatherName: user?.fatherName || '',
        dob: user?.dob || '',
        age: user?.age || '',
        gender: user?.gender || '',
        education: user?.education || '',
        guardianName: user?.guardianName || '',
        guardianPhone: user?.guardianPhone || '',
        guardianOccupation: user?.guardianOccupation || '',
        address: user?.address || '',
        city: user?.city || user?.location || '',
        country: user?.country || 'Pakistan',
        course: '',
        attendType: user?.attendType || 'Physical',
        cityToAttend: user?.location || '',
        rollNumber: user?.rollNumber || '', // Academic Roll No
        heardAbout: user?.heardAbout || '',
        // Intern Specific
        degree: user?.degree || '',
        university: user?.university || '',
        department: user?.department || '',
        semester: user?.semester || '',
        cgpa: user?.cgpa || '',
        majorSubjects: user?.majorSubjects || '',
        resumeUrl: user?.resumeUrl || '',
        pictureUrl: user?.photo || '',
        registeredAt: user?.createdAt || new Date().toISOString(),
        isVerified: user?.isVerified || false
    });

    const [editForm, setEditForm] = useState({ ...profileData });

    useEffect(() => {
        fetchUserData();
        fetchEnrollments();
        fetchSettings();
    }, []);

    // Sync profileData when user changes (e.g. after fetchUserData)
    useEffect(() => {
        if (user) {
            const newData = {
                fullName: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                cnic: user.cnic || '',
                fatherName: user.fatherName || '',
                dob: user.dob || '',
                age: user.age || '',
                gender: user.gender || '',
                education: user.education || '',
                guardianName: user.guardianName || '',
                guardianPhone: user.guardianPhone || '',
                guardianOccupation: user.guardianOccupation || '',
                address: user.address || '',
                city: user.city || user.location || '',
                country: user.country || 'Pakistan',
                attendType: user.attendType || 'Physical',
                cityToAttend: user.location || '',
                rollNumber: user.rollNumber || '',
                heardAbout: user.heardAbout || '',
                degree: user.degree || '',
                university: user.university || '',
                department: user.department || '',
                semester: user.semester || '',
                cgpa: user.cgpa || '',
                majorSubjects: user.majorSubjects || '',
                resumeUrl: user.resumeUrl || '',
                pictureUrl: user.photo || '',
                registeredAt: user.createdAt || new Date().toISOString(),
                isVerified: user.isVerified || false
            };
            setProfileData(prev => ({ ...prev, ...newData }));
            setEditForm(prev => ({ ...prev, ...newData }));
        }
    }, [user]);

    const [allowBioEditing, setAllowBioEditing] = useState(true);

    // Check if user has bio data - if no data, allow editing regardless of setting
    const hasNoData = !user?.phone && !user?.city && !user?.address;

    const fetchUserData = async () => {
        setIsLoading(true);
        try {
            const res = await authAPI.getMe();
            if (res.data.success) {
                setUser(res.data.user);
                dispatch(updateUser(res.data.user));
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.getAll();
            // Use role-specific setting (student or intern)
            const settingKey = user?.role === 'intern' ? 'allowBioEditing_intern' : 'allowBioEditing_student';
            setAllowBioEditing(res.data.data[settingKey] ?? false);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    // Final check: allow editing if setting is on OR if user has no data
    const canEditBio = allowBioEditing || hasNoData;

    const fetchEnrollments = async () => {
        try {
            const response = await enrollmentAPI.getMy();
            const data = response.data.data || [];
            setEnrollments(data);
            if (data.length > 0) {
                setProfileData(prev => ({
                    ...prev,
                    course: data[0].course?.title || 'Not enrolled'
                }));
            }
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        }
    };

    const handleEdit = () => {
        setEditForm({ ...profileData });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditForm({ ...profileData });
        setIsEditing(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await authAPI.updateProfile({
                name: editForm.fullName,
                phone: editForm.phone,
                cnic: editForm.cnic,
                fatherName: editForm.fatherName,
                dob: editForm.dob,
                gender: editForm.gender,
                education: editForm.education,
                guardianName: editForm.guardianName,
                guardianPhone: editForm.guardianPhone,
                guardianOccupation: editForm.guardianOccupation,
                address: editForm.address,
                city: editForm.city,
                country: editForm.country,
                attendType: editForm.attendType,
                location: editForm.cityToAttend,
                rollNumber: editForm.rollNumber,
                heardAbout: editForm.heardAbout,
                degree: editForm.degree,
                university: editForm.university,
                department: editForm.department,
                semester: editForm.semester,
                cgpa: editForm.cgpa,
                majorSubjects: editForm.majorSubjects,
                resumeUrl: editForm.resumeUrl
            });

            setProfileData({ ...editForm });
            setIsEditing(false);

            // Update local user and Redux store
            if (response.data.user) {
                setUser(response.data.user);
                dispatch(updateUser(response.data.user));
            }
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };



    return (
        <div className="space-y-6">
            {/* Header Card */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 text-white relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    {/* Profile Picture */}
                    <div className="relative">
                        <div className="w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold border-4 border-white/30 overflow-hidden">
                            {user?.photo ? (
                                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                profileData.fullName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors">
                            <Camera className="w-5 h-5 text-primary" />
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                            <h1 className="text-3xl font-bold">{profileData.fullName || user?.name}</h1>
                            {profileData.isVerified && (
                                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/20">
                                    <Users className="w-3 h-3" /> Verified
                                </span>
                            )}
                        </div>
                        <p className="text-white/80 text-lg mb-3">
                            <BookOpen className="w-5 h-5 inline mr-2" />
                            {profileData.course || 'Student'}
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                {profileData.attendType}
                            </span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm capitalize">
                                {profileData.city || user?.location || 'Location not set'}
                            </span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-mono tracking-tight">
                                ID: {user?.rollNo || '—'}
                            </span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                Joined {profileData.registeredAt ? new Date(profileData.registeredAt).toLocaleDateString() : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Edit Button */}
                    <div>
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-5 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="px-5 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Profile Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Personal Information
                    </h2>
                    <div className="space-y-4">
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={User} label="Full Name" value={profileData.fullName} name="fullName" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Mail} label="Email" value={profileData.email} name="email" type="email" editable={false} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Phone} label="Phone" value={profileData.phone} name="phone" editable={canEditBio} />
                        {!canEditBio && isEditing && (
                            <p className="text-xs text-red-500 font-medium px-4">
                                * Bio editing is currently disabled by administrator.
                            </p>
                        )}
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={User} label="Father's Name" value={profileData.fatherName} name="fatherName" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={CreditCard} label="CNIC" value={profileData.cnic} name="cnic" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Calendar} label="Date of Birth" value={profileData.dob ? new Date(profileData.dob).toLocaleDateString() : ''} name="dob" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={User} label="Gender" value={profileData.gender} name="gender" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={GraduationCap} label="Education" value={profileData.education} name="education" editable={canEditBio} />
                        <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={MapPin} label="Address" value={profileData.address} name="address" editable={canEditBio} />
                        <div className="grid grid-cols-2 gap-4">
                            <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={MapPin} label="City" value={profileData.city} name="city" editable={canEditBio} />
                            <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={MapPin} label="Country" value={profileData.country} name="country" editable={canEditBio} />
                        </div>
                    </div>
                </motion.div>
                <div className="space-y-6">
                    {/* Academic / Other Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100"
                    >
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-primary" />
                            Academic Information
                        </h2>
                        <div className="space-y-4">
                            <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={FileText} label="Academic Roll No" value={profileData.rollNumber} name="rollNumber" editable={canEditBio} />
                            <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Users} label="Heard About Us Via" value={profileData.heardAbout} name="heardAbout" editable={canEditBio} />
                            <div className="grid grid-cols-2 gap-4">
                                <SelectField 
                                    isEditing={isEditing} 
                                    editForm={editForm} 
                                    onChange={handleChange} 
                                    icon={Clock} 
                                    label="Attend Type" 
                                    value={profileData.attendType} 
                                    name="attendType" 
                                    options={[
                                        { value: 'Physical', label: 'Physical (OnSite)' },
                                        { value: 'Online', label: 'Online (Remote)' }
                                    ]} 
                                    editable={canEditBio} 
                                />
                                <SelectField 
                                    isEditing={isEditing} 
                                    editForm={editForm} 
                                    onChange={handleChange} 
                                    icon={MapPin} 
                                    label="Campus" 
                                    value={profileData.cityToAttend} 
                                    name="cityToAttend" 
                                    options={[
                                        { value: '', label: 'Select Campus' },
                                        { value: 'islamabad', label: 'Islamabad' },
                                        { value: 'bahawalpur', label: 'Bahawalpur' }
                                    ]} 
                                    editable={canEditBio} 
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Professional Details (For Interns) */}
                    {(user?.role === 'intern' || profileData.degree) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
                        >
                            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-primary" />
                                Professional / Degree Details
                            </h2>
                            <div className="space-y-4">
                                <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={GraduationCap} label="Degree Program" value={profileData.degree} name="degree" editable={canEditBio} />
                                <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Globe} label="University / Institution" value={profileData.university} name="university" editable={canEditBio} />
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={BookOpen} label="Department" value={profileData.department} name="department" editable={canEditBio} />
                                    <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Calendar} label="Semester" value={profileData.semester} name="semester" editable={canEditBio} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Award} label="CGPA / Grade" value={profileData.cgpa} name="cgpa" editable={canEditBio} />
                                    <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={LinkIcon} label="Resume Link" value={profileData.resumeUrl} name="resumeUrl" editable={canEditBio} />
                                </div>
                                <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={FileText} label="Major Subjects" value={profileData.majorSubjects} name="majorSubjects" editable={canEditBio} />
                            </div>
                        </motion.div>
                    )}

                    {/* Guardian Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 border border-gray-100"
                    >
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Guardian Information
                        </h2>
                        <div className="space-y-4">
                            <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={User} label="Guardian Name" value={profileData.guardianName} name="guardianName" editable={canEditBio} />
                            <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Phone} label="Guardian Phone" value={profileData.guardianPhone} name="guardianPhone" editable={canEditBio} />
                            <InfoField isEditing={isEditing} editForm={editForm} onChange={handleChange} icon={Users} label="Guardian Occupation" value={profileData.guardianOccupation} name="guardianOccupation" editable={canEditBio} />
                        </div>
                    </motion.div>
                </div>

                {/* Course Information */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100 lg:col-span-2"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        Enrolled Courses
                    </h2>
                    {enrollments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No courses enrolled yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {enrollments.map((enrollment) => (
                                <div key={enrollment._id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900">{enrollment.course?.title || 'Course'}</p>
                                        <p className="text-sm text-gray-500">{enrollment.course?.teacher?.name || 'TBA'}</p>
                                        <p className="text-xs text-primary mt-1 capitalize">{enrollment.status || 'enrolled'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
            {/* Announcements Popup - Only on Main Profile Page */}
        </div>
    );
};

export default StudentProfile;



