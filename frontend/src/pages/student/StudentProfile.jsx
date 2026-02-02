import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
    User, Mail, Phone, MapPin, Calendar, CreditCard,
    Edit2, Save, X, Camera, BookOpen, GraduationCap, Users, Loader2
} from 'lucide-react';
import { authAPI, enrollmentAPI, settingsAPI } from '../../services/api';
import { updateUser } from '../../features/auth/authSlice';

const StudentProfile = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [enrollments, setEnrollments] = useState([]);

    const [profileData, setProfileData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        cnic: user?.cnic || '',
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
        pictureUrl: user?.photo || '',
        registeredAt: user?.createdAt || new Date().toISOString(),
        isVerified: user?.isVerified || false
    });

    const [editForm, setEditForm] = useState({ ...profileData });

    useEffect(() => {
        fetchEnrollments();
        fetchSettings();
    }, []);

    const [allowBioEditing, setAllowBioEditing] = useState(true);

    // Check if user has bio data - if no data, allow editing regardless of setting
    const hasNoData = !user?.phone && !user?.city && !user?.address;

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
                location: editForm.city?.toLowerCase()
            });

            setProfileData({ ...editForm });
            setIsEditing(false);

            // Update Redux store
            if (response.data.user) {
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

    const InfoField = ({ icon: Icon, label, value, name, type = 'text', editable = true }) => (
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                {isEditing && editable ? (
                    <input
                        type={type}
                        name={name}
                        value={editForm[name] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                ) : (
                    <p className="font-medium text-gray-900 truncate">{value || 'Not provided'}</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white relative overflow-hidden"
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
                            <Camera className="w-5 h-5 text-emerald-600" />
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{profileData.fullName || user?.name}</h1>
                        <p className="text-emerald-100 text-lg mb-3">
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
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                Joined {new Date(profileData.registeredAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Edit Button */}
                    <div>
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="px-6 py-3 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-5 py-3 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
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
                        <User className="w-5 h-5 text-emerald-600" />
                        Personal Information
                    </h2>
                    <div className="space-y-4">
                        <InfoField icon={User} label="Full Name" value={profileData.fullName} name="fullName" editable={canEditBio} />
                        <InfoField icon={Mail} label="Email" value={profileData.email} name="email" type="email" editable={false} />
                        <InfoField icon={Phone} label="Phone" value={profileData.phone} name="phone" editable={canEditBio} />
                        {!canEditBio && isEditing && (
                            <p className="text-xs text-red-500 font-medium px-4">
                                * Bio editing is currently disabled by administrator.
                            </p>
                        )}
                        <InfoField icon={CreditCard} label="CNIC" value={profileData.cnic} name="cnic" editable={canEditBio} />
                        <InfoField icon={Calendar} label="Date of Birth" value={profileData.dob ? new Date(profileData.dob).toLocaleDateString() : ''} name="dob" editable={canEditBio} />
                        <InfoField icon={User} label="Gender" value={profileData.gender} name="gender" editable={canEditBio} />
                        <InfoField icon={GraduationCap} label="Education" value={profileData.education} name="education" editable={canEditBio} />
                        <InfoField icon={MapPin} label="Address" value={profileData.address} name="address" editable={canEditBio} />
                        <InfoField icon={MapPin} label="City" value={profileData.city} name="city" editable={canEditBio} />
                    </div>
                </motion.div>

                {/* Guardian Information */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-600" />
                        Guardian Information
                    </h2>
                    <div className="space-y-4">
                        <InfoField icon={User} label="Guardian Name" value={profileData.guardianName} name="guardianName" editable={canEditBio} />
                        <InfoField icon={Phone} label="Guardian Phone" value={profileData.guardianPhone} name="guardianPhone" editable={canEditBio} />
                        <InfoField icon={Users} label="Guardian Occupation" value={profileData.guardianOccupation} name="guardianOccupation" editable={canEditBio} />
                    </div>
                </motion.div>

                {/* Course Information */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-emerald-600" />
                        Enrolled Courses
                    </h2>
                    {enrollments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No courses enrolled yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {enrollments.map((enrollment) => (
                                <div key={enrollment._id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900">{enrollment.course?.title || 'Course'}</p>
                                        <p className="text-sm text-gray-500">{enrollment.course?.teacher?.name || 'TBA'}</p>
                                        <p className="text-xs text-emerald-600 mt-1 capitalize">{enrollment.status || 'enrolled'}</p>
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
