import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Plus, Calendar, Clock, Trash2, Edit2,
    CheckCircle, XCircle, AlertCircle, Info, Loader2, Save, X
} from 'lucide-react';
import { notificationAPI } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const NotificationManagement = () => {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [modal, setModal] = useState({ open: false, mode: 'create', data: null });

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'info',
        startDate: '',
        endDate: '',
        isActive: true,
        isHtml: false,
        showLifetime: false,
        targetAudience: ['all']
    });

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const response = await notificationAPI.getAll();
            setNotifications(response.data.data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (mode, data = null) => {
        setModal({ open: true, mode, data });
        if (mode === 'edit' && data) {
            setFormData({
                title: data.title,
                message: data.message,
                type: data.type,
                startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 16) : '',
                endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 16) : '',
                isActive: data.isActive,
                isHtml: data.isHtml || false,
                showLifetime: data.showLifetime || false,
                targetAudience: data.targetAudience || ['all']
            });
        } else {
            setFormData({
                title: '',
                message: '',
                type: 'info',
                startDate: new Date().toISOString().slice(0, 16),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                isActive: true,
                isHtml: false,
                showLifetime: false,
                targetAudience: ['all']
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const payload = {
                title: formData.title,
                message: formData.message,
                type: formData.type,
                isActive: formData.isActive,
                isHtml: formData.isHtml,
                showLifetime: formData.showLifetime,
                targetAudience: formData.targetAudience
            };

            // Only include dates if not lifetime
            if (!formData.showLifetime) {
                payload.startDate = formData.startDate;
                payload.endDate = formData.endDate;
            }

            if (modal.mode === 'edit') {
                await notificationAPI.update(modal.data._id, payload);
            } else {
                await notificationAPI.create(payload);
            }

            fetchNotifications();
            setModal({ open: false, mode: 'create', data: null });
        } catch (error) {
            console.error('Error saving notification:', error);
            alert(error.response?.data?.message || 'Failed to save notification');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;
        try {
            await notificationAPI.delete(id);
            fetchNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
            alert('Failed to delete notification');
        }
    };

    const getStatus = (n) => {
        const now = new Date();
        const start = new Date(n.startDate);
        const end = new Date(n.endDate);

        if (!n.isActive) return { label: 'Disabled', variant: 'error', dimmed: true };
        if (now < start) return { label: 'Scheduled', variant: 'warning', dimmed: false };
        if (now > end) return { label: 'Expired', variant: 'info', dimmed: true };
        return { label: 'Active', variant: 'success', dimmed: false };
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications Management</h1>
                    <p className="text-gray-500">Manage dashboard popup announcements</p>
                </div>
                <button
                    onClick={() => handleOpenModal('create')}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Create Notification
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {notifications.map((n) => {
                            const status = getStatus(n);
                            return (
                                <motion.div
                                    key={n._id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col transition-all shadow-sm hover:shadow-md ${status.dimmed ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                >
                                    <div className={`h-1.5 w-full ${n.type === 'warning' ? 'bg-amber-400' :
                                        n.type === 'success' ? 'bg-emerald-500' :
                                            n.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                                        }`} />

                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-2 rounded-xl bg-${n.type === 'warning' ? 'amber' : n.type === 'success' ? 'emerald' : n.type === 'error' ? 'rose' : 'blue'}-50`}>
                                                {n.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
                                                    n.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> :
                                                        n.type === 'error' ? <XCircle className="w-5 h-5 text-rose-600" /> : <Info className="w-5 h-5 text-blue-600" />}
                                            </div>
                                            <Badge variant={status.variant}>{status.label}</Badge>
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{n.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-1">
                                            {n.message}
                                        </p>

                                        <div className="space-y-2 mb-6 text-xs text-gray-400 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{new Date(n.startDate).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>to {new Date(n.endDate).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                                            <button
                                                onClick={() => handleOpenModal('edit', n)}
                                                className="flex-1 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(n._id)}
                                                className="flex-1 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {notifications.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No notifications created yet</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal for Create/Edit */}
            <Modal
                isOpen={modal.open}
                onClose={() => setModal({ open: false, mode: 'create', data: null })}
                title={modal.mode === 'create' ? 'Create Notification' : 'Edit Notification'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                                placeholder="Enter notification title"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Message</label>

                            {/* HTML Enable Checkbox */}
                            <div className="mb-3 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isHtml"
                                    checked={formData.isHtml}
                                    onChange={(e) => setFormData({ ...formData, isHtml: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                                />
                                <label htmlFor="isHtml" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Enable HTML Rendering
                                </label>
                            </div>

                            {formData.isHtml && (
                                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                                    ℹ️ <strong>HTML + CSS Supported:</strong> You can use inline styles and CSS for rich formatting. Safe tags like p, div, span, h1-h6, img, table, etc. are allowed.
                                </div>
                            )}

                            <textarea
                                required
                                rows={formData.isHtml ? 8 : 6}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono text-sm"
                                placeholder={formData.isHtml ? `<div style="background: linear-gradient(to right, #10b981, #3b82f6); padding: 20px; border-radius: 12px; color: white;">\n  <h2 style="margin: 0; font-size: 24px;">Important Update!</h2>\n  <p style="margin-top: 10px;">Your notification with <strong>CSS styling</strong></p>\n</div>` : "Enter notification message"}
                            />
                        </div>

                        {/* Lifetime Toggle */}
                        <div className="border-t border-gray-200 pt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="showLifetime"
                                    checked={formData.showLifetime}
                                    onChange={(e) => {
                                        const isLifetime = e.target.checked;
                                        setFormData({
                                            ...formData,
                                            showLifetime: isLifetime,
                                            // Clear dates when enabling lifetime
                                            startDate: isLifetime ? '' : formData.startDate || new Date().toISOString().slice(0, 16),
                                            endDate: isLifetime ? '' : formData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                                        });
                                    }}
                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                                />
                                <label htmlFor="showLifetime" className="text-sm font-bold text-gray-700 cursor-pointer">
                                    🕒 Show Lifetime (Permanent Display)
                                </label>
                            </div>
                            {formData.showLifetime && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                                    ℹ️ This notification will display permanently until manually dismissed by users.
                                </div>
                            )}
                        </div>

                        {/* Date Fields - Dimmed when lifetime is enabled */}
                        <div className={`grid grid-cols-2 gap-4 transition-opacity ${formData.showLifetime ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Start Date {formData.showLifetime && '(Disabled)'}
                                </label>
                                <input
                                    type="datetime-local"
                                    required={!formData.showLifetime}
                                    disabled={formData.showLifetime}
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                    End Date {formData.showLifetime && '(Disabled)'}
                                </label>
                                <input
                                    type="datetime-local"
                                    required={!formData.showLifetime}
                                    disabled={formData.showLifetime}
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                                >
                                    <option value="info">Information</option>
                                    <option value="success">Success</option>
                                    <option value="warning">Warning</option>
                                    <option value="error">Critical/Error</option>
                                </select>
                            </div>
                            <div className="flex items-center pt-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <div className={`block w-12 h-7 rounded-full transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                        <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : ''}`} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Currently Active</span>
                                </label>
                            </div>
                        </div>

                        {/* Target Audience Selector */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Target Audience</label>
                            <div className="flex flex-wrap gap-2">
                                {['all', 'student', 'teacher', 'intern', 'job'].map(role => {
                                    const isSelected = (formData.targetAudience || ['all']).includes(role);
                                    return (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => {
                                                const current = formData.targetAudience || ['all'];
                                                let newAudience;

                                                if (role === 'all') {
                                                    newAudience = ['all'];
                                                } else {
                                                    // If clicking a specific role, remove 'all'
                                                    let withoutAll = current.filter(r => r !== 'all');

                                                    if (current.includes(role)) {
                                                        // Toggle off
                                                        newAudience = withoutAll.filter(r => r !== role);
                                                    } else {
                                                        // Toggle on
                                                        newAudience = [...withoutAll, role];
                                                    }

                                                    // If nothing selected, default back to 'all'
                                                    if (newAudience.length === 0) newAudience = ['all'];
                                                }
                                                setFormData({ ...formData, targetAudience: newAudience });
                                            }}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {role === 'all' ? '📢 All Users' :
                                                role === 'student' ? '🎓 Students' :
                                                    role === 'teacher' ? '👨‍🏫 Teachers' :
                                                        role === 'intern' ? '💼 Interns' : '🔍 Job Seekers'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>


                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => setModal({ open: false, mode: 'create', data: null })}
                            className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <X className="w-5 h-5" />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {modal.mode === 'create' ? 'Create' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default NotificationManagement;
