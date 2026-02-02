import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, UserCheck, UserX, Trash2, User, Mail, Phone, MapPin,
    Briefcase, Loader2, CheckCircle, Clock, Star, FileText, Edit2, Save, Camera, Upload, Plus, Shield
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { userAPI, settingsAPI } from '../../services/api';

const JobsManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [jobUsers, setJobUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, user: null });
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editForm, setEditForm] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);

    useEffect(() => {
        fetchJobUsers();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.getAll();
            setAllowBioEditing(res.data.data.allowBioEditing_job ?? false);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const [allowBioEditing, setAllowBioEditing] = useState(false);

    const toggleBioEditing = async () => {
        try {
            const newValue = !allowBioEditing;
            await settingsAPI.update('allowBioEditing_job', newValue);
            setAllowBioEditing(newValue);
        } catch (error) {
            console.error('Error updating setting:', error);
        }
    };

    const fetchJobUsers = async () => {
        setIsLoading(true);
        try {
            const res = await userAPI.getByRole('job');
            setJobUsers(res.data.data || []);
        } catch (error) {
            console.error('Error fetching job users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.verify(confirmModal.user._id);
            setJobUsers(prev => prev.map(u =>
                u._id === confirmModal.user._id ? { ...u, isVerified: true } : u
            ));
        } catch (error) {
            console.error('Error verifying user:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const handleUnverify = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.unverify(confirmModal.user._id);
            setJobUsers(prev => prev.map(u =>
                u._id === confirmModal.user._id ? { ...u, isVerified: false } : u
            ));
        } catch (error) {
            console.error('Error unverifying user:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const handleDelete = async () => {
        if (!confirmModal.user) return;
        setIsProcessing(true);
        try {
            await userAPI.delete(confirmModal.user._id);
            setJobUsers(prev => prev.filter(u => u._id !== confirmModal.user._id));
        } catch (error) {
            console.error('Error deleting user:', error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ open: false, action: null, user: null });
        }
    };

    const handleEditClick = (user) => {
        setEditModal({ open: true, user });
        setSelectedFile(null);
        setPhotoPreview(user.photo || null);
        setEditForm({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            cnic: user.cnic || '',
            fatherName: user.fatherName || user.guardianName || '',
            city: user.city || '',
            qualification: user.qualification || '',
            teachingExperience: user.teachingExperience || '',
            experienceDetails: user.experienceDetails || '',
            skills: user.skills || '',
            preferredCity: user.preferredCity || '',
            preferredMode: user.preferredMode || '',
            heardAbout: user.heardAbout || ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const formData = new FormData();
            Object.keys(editForm).forEach(key => {
                if (editForm[key] !== null && editForm[key] !== undefined) {
                    formData.append(key, editForm[key]);
                }
            });

            if (selectedFile) {
                formData.append('photo', selectedFile);
            }

            const res = await userAPI.update(editModal.user._id, formData);
            setJobUsers(prev => prev.map(u => u._id === editModal.user._id ? res.data.data : u));
            setEditModal({ open: false, user: null });
            setSelectedFile(null);
            setPhotoPreview(null);
        } catch (error) {
            console.error('Error updating user:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredUsers = jobUsers.filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.skills?.toLowerCase().includes(searchQuery.toLowerCase());

        if (filterStatus === 'verified') return matchesSearch && u.isVerified;
        if (filterStatus === 'pending') return matchesSearch && !u.isVerified;
        return matchesSearch;
    });

    const verifiedCount = jobUsers.filter(u => u.isVerified).length;
    const pendingCount = jobUsers.filter(u => !u.isVerified).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">Loading job applicants...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Freelancers / Job Applicants</h1>
                    <p className="text-gray-500">View and manage registered job seekers</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-purple-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-purple-600">{verifiedCount}</p>
                        <p className="text-xs text-gray-500">Verified</p>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 rounded-xl text-center">
                        <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                    </div>
                    <button
                        onClick={toggleBioEditing}
                        className={`p-2.5 border rounded-xl transition-colors flex items-center gap-2 text-sm font-bold shadow-sm ${allowBioEditing
                            ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                            : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                            }`}
                        title={allowBioEditing ? "Bio Editing is Enabled for Users" : "Bio Editing is Disabled for Users"}
                    >
                        {allowBioEditing ? <Edit2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                        {allowBioEditing ? 'EDITS ON' : 'EDITS OFF'}
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or skills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-gray-700"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'verified', 'pending'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-xl font-medium capitalize transition-all ${filterStatus === status
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Job Users List */}
            {filteredUsers.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No job applicants found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredUsers.map((user, index) => (
                        <motion.div
                            key={user._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-2xl p-6 border border-gray-100"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Photo & Basic Info */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center overflow-hidden">
                                        {user.photo ? (
                                            <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-xl font-bold">{user.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">{user.name}</h3>
                                            {user.isVerified ? (
                                                <Badge variant="success">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="warning">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Mail className="w-4 h-4" /> {user.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm flex-1">
                                    <div>
                                        <p className="text-gray-400">Phone</p>
                                        <p className="font-medium text-gray-700">{user.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Location</p>
                                        <p className="font-medium text-gray-700 capitalize">{user.location || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Tasks Done</p>
                                        <p className="font-medium text-gray-700">{user.completedTasks || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Rating</p>
                                        <p className="font-medium text-gray-700 flex items-center gap-1">
                                            <Star className="w-4 h-4 text-amber-400" />
                                            {user.rating > 0 ? user.rating.toFixed(1) : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    {!user.isVerified ? (
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'verify', user })}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center gap-2"
                                        >
                                            <UserCheck className="w-4 h-4" />
                                            Verify
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmModal({ open: true, action: 'unverify', user })}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium flex items-center gap-2"
                                        >
                                            <UserX className="w-4 h-4" />
                                            Revoke
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEditClick(user)}
                                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl"
                                        title="Edit Bio"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal({ open: true, action: 'delete', user })}
                                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Skills */}
                            {user.skills && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-sm text-gray-400 mb-2">Skills</p>
                                    <div className="flex flex-wrap gap-2">
                                        {user.skills.split(',').map((skill, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                                                {skill.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Confirm Modal */}
            <Modal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, action: null, user: null })}
                title={
                    confirmModal.action === 'verify' ? 'Verify User' :
                        confirmModal.action === 'unverify' ? 'Revoke Verification' : 'Delete User'
                }
                size="md"
            >
                {confirmModal.user && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl text-center ${confirmModal.action === 'delete' ? 'bg-red-50' :
                            confirmModal.action === 'verify' ? 'bg-purple-50' : 'bg-amber-50'
                            }`}>
                            {confirmModal.action === 'verify' && <UserCheck className="w-12 h-12 text-purple-600 mx-auto mb-2" />}
                            {confirmModal.action === 'unverify' && <UserX className="w-12 h-12 text-amber-600 mx-auto mb-2" />}
                            {confirmModal.action === 'delete' && <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-2" />}

                            <p className="text-gray-700">
                                {confirmModal.action === 'verify' && 'You are about to verify:'}
                                {confirmModal.action === 'unverify' && 'You are about to revoke verification for:'}
                                {confirmModal.action === 'delete' && 'You are about to permanently delete:'}
                            </p>
                            <p className="text-xl font-bold text-gray-900 mt-2">{confirmModal.user.name}</p>
                            <p className="text-sm text-gray-500">{confirmModal.user.email}</p>
                        </div>

                        {confirmModal.action === 'delete' && (
                            <p className="text-sm text-red-500 text-center">
                                This action cannot be undone. All data associated with this user will be removed.
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ open: false, action: null, user: null })}
                                className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={
                                    confirmModal.action === 'verify' ? handleVerify :
                                        confirmModal.action === 'unverify' ? handleUnverify : handleDelete
                                }
                                disabled={isProcessing}
                                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${confirmModal.action === 'delete'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : confirmModal.action === 'verify'
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                                    }`}
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {confirmModal.action === 'verify' && <UserCheck className="w-5 h-5" />}
                                        {confirmModal.action === 'unverify' && <UserX className="w-5 h-5" />}
                                        {confirmModal.action === 'delete' && <Trash2 className="w-5 h-5" />}
                                    </>
                                )}
                                Confirm
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={editModal.open}
                onClose={() => setEditModal({ open: false, user: null })}
                title="Edit Applicant Bio"
                size="lg"
            >
                <form onSubmit={handleUpdate} className="space-y-4">
                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center justify-center pb-6 border-b border-gray-100 mb-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 group-hover:border-emerald-500 transition-all">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-8 h-8 text-gray-400" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setSelectedFile(file);
                                            setPhotoPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-lg shadow-lg">
                                <Plus className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3">Click to update profile photo</p>
                    </div>

                    {/* Personal Information */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name *</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email Address *</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Father Name</label>
                            <input
                                type="text"
                                value={editForm.fatherName}
                                onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">CNIC Number</label>
                            <input
                                type="text"
                                value={editForm.cnic}
                                onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Home City</label>
                            <select
                                value={editForm.city}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            >
                                <option value="">Select City</option>
                                <option value="Bahawalpur">Bahawalpur</option>
                                <option value="Islamabad">Islamabad</option>
                            </select>
                        </div>
                    </div>

                    {/* Professional Details */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Qualification</label>
                            <input
                                type="text"
                                value={editForm.qualification}
                                onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Teaching Experience</label>
                            <input
                                type="text"
                                value={editForm.teachingExperience}
                                onChange={(e) => setEditForm({ ...editForm, teachingExperience: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-gray-700">Skills (Comma separated)</label>
                            <input
                                type="text"
                                value={editForm.skills}
                                onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                                placeholder="e.g. Photoshop, Web Design, Data Entry"
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Work Experience Details</label>
                        <textarea
                            value={editForm.experienceDetails}
                            onChange={(e) => setEditForm({ ...editForm, experienceDetails: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                        />
                    </div>

                    {/* Preferences & Misc */}
                    <h3 className="font-semibold text-gray-900 pb-2 border-b mt-6">Preferences & Misc</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Preferred City</label>
                            <select
                                value={editForm.preferredCity}
                                onChange={(e) => setEditForm({ ...editForm, preferredCity: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            >
                                <option value="">Select City</option>
                                <option value="Bahawalpur">Bahawalpur</option>
                                <option value="Islamabad">Islamabad</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Preferred Mode</label>
                            <select
                                value={editForm.preferredMode}
                                onChange={(e) => setEditForm({ ...editForm, preferredMode: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            >
                                <option value="">Select Mode</option>
                                <option value="Physical">Physical</option>
                                <option value="Online">Online</option>
                                <option value="Both">Both</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Heard About</label>
                            <input
                                type="text"
                                value={editForm.heardAbout}
                                onChange={(e) => setEditForm({ ...editForm, heardAbout: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setEditModal({ open: false, user: null })}
                            className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Update Bio
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default JobsManagement;
