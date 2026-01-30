import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import {
    User, Mail, Phone, MapPin, CreditCard,
    Edit2, Save, X, Camera, BookOpen, GraduationCap, Briefcase, Loader2
} from 'lucide-react';
import { authAPI, courseAPI } from '../../services/api';
import { updateUser } from '../../features/auth/authSlice';

const TeacherProfile = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [myCourses, setMyCourses] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);

    const [profileData, setProfileData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        cnic: user?.cnic || '',
        qualification: user?.qualification || '',
        specialization: user?.specialization || '',
        experience: user?.experience || '',
        address: '',
        city: user?.location || '',
        country: 'Pakistan',
        joinedAt: user?.createdAt || new Date().toISOString(),
        status: user?.isVerified ? 'Verified' : 'Pending'
    });

    const [editForm, setEditForm] = useState({ ...profileData });

    useEffect(() => {
        fetchMyCourses();
    }, []);

    const fetchMyCourses = async () => {
        try {
            const response = await courseAPI.getAll();
            const allCourses = response.data.data || [];
            // Filter courses where this teacher is assigned (check teachers array)
            const teacherCourses = allCourses.filter(c =>
                c.teachers?.some(t => String(t._id || t) === String(user?._id))
            );
            setMyCourses(teacherCourses);
            // Calculate total students
            const students = teacherCourses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);
            setTotalStudents(students);
        } catch (error) {
            console.error('Error fetching courses:', error);
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
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                {isEditing && editable ? (
                    <input
                        type={type}
                        name={name}
                        value={editForm[name] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                ) : (
                    <p className="font-medium text-gray-900 truncate">{value || 'Not provided'}</p>
                )}
            </div>
        </div>
    );

    const stats = [
        { label: 'My Courses', value: myCourses.length.toString(), icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
        { label: 'Active Students', value: totalStudents.toString(), icon: User, color: 'bg-emerald-100 text-emerald-600' },
        { label: 'Classes This Month', value: '0', icon: GraduationCap, color: 'bg-purple-100 text-purple-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 text-white relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    {/* Profile Picture */}
                    <div className="relative">
                        <div className="w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold border-4 border-white/30 overflow-hidden">
                            {user?.photo ? (
                                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                (profileData.fullName || 'T').charAt(0).toUpperCase()
                            )}
                        </div>
                        <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors">
                            <Camera className="w-5 h-5 text-orange-600" />
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{profileData.fullName || user?.name}</h1>
                        <p className="text-orange-100 text-lg mb-3">
                            <GraduationCap className="w-5 h-5 inline mr-2" />
                            Teacher
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                                {profileData.status}
                            </span>
                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm capitalize">
                                {profileData.city || user?.location || 'Location not set'}
                            </span>
                        </div>
                    </div>

                    {/* Edit Button */}
                    <div>
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="px-6 py-3 bg-white text-orange-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-5 py-3 bg-white text-orange-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
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

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-xl p-6 border border-gray-100"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Profile Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <User className="w-5 h-5 text-orange-600" />
                        Personal Information
                    </h2>
                    <div className="space-y-4">
                        <InfoField icon={User} label="Full Name" value={profileData.fullName} name="fullName" editable={false} />
                        <InfoField icon={Mail} label="Email" value={profileData.email} name="email" type="email" editable={false} />
                        <InfoField icon={Phone} label="Phone" value={profileData.phone} name="phone" />
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest px-4 italic">* Contact admin to change legal biodata (Name, CNIC, etc.)</p>
                        <InfoField icon={CreditCard} label="CNIC" value={profileData.cnic} name="cnic" editable={false} />
                        <InfoField icon={GraduationCap} label="Qualification" value={profileData.qualification} name="qualification" editable={false} />
                        <InfoField icon={Briefcase} label="Specialization / Skills" value={profileData.specialization} name="specialization" editable={false} />
                        <InfoField icon={Briefcase} label="Experience" value={profileData.experience} name="experience" editable={false} />
                        <InfoField icon={MapPin} label="City" value={profileData.city} name="city" />
                    </div>
                </motion.div>

                {/* My Courses */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-orange-600" />
                        My Courses
                    </h2>
                    {myCourses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No courses assigned yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myCourses.map((course) => (
                                <div key={course._id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BookOpen className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900">{course.title}</p>
                                        <p className="text-sm text-gray-500">{course.enrolledCount || 0} students enrolled</p>
                                        <p className="text-xs text-orange-600 mt-1 capitalize">{course.duration || 'Ongoing'}</p>
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

export default TeacherProfile;
