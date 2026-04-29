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
                    className="px-6 py-2.5 bg-primary hover:bg-primary text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Create Notification
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                                        n.type === 'success' ? 'bg-primary' :
                                            n.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                                        }`} />

                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-2 rounded-xl bg-${n.type === 'warning' ? 'amber' : n.type === 'success' ? 'emerald' : n.type === 'error' ? 'rose' : 'blue'}-50`}>
                                                {n.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
                                                    n.type === 'success' ? <CheckCircle className="w-5 h-5 text-primary" /> :
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
                size="xl"
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
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                                placeholder="Enter notification title"
                            />
                        </div>

                        <div className="space-y-0">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Message</label>
                                <div className="flex bg-gray-100 p-0.5 rounded-lg overflow-hidden border border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isHtmlView: false })}
                                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-md transition-all ${!formData.isHtmlView ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Visual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isHtmlView: true })}
                                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-tight rounded-md transition-all ${formData.isHtmlView ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Code
                                    </button>
                                </div>
                            </div>

                            {/* WordPress Style Toolbar */}
                            {!formData.isHtmlView && (
                                <div className="mb-0 flex flex-wrap items-center gap-0.5 p-1.5 bg-[#2c3338] border border-gray-700 rounded-t-xl shadow-lg">
                                    <select
                                        onChange={(e) => document.execCommand('formatBlock', false, e.target.value)}
                                        className="h-8 px-2 bg-[#3c434a] border border-gray-600 text-white text-[11px] font-bold rounded outline-none mr-2 cursor-pointer hover:bg-gray-700"
                                    >
                                        <option value="p">Paragraph</option>
                                        <option value="h1">Heading 1</option>
                                        <option value="h2">Heading 2</option>
                                        <option value="h3">Heading 3</option>
                                        <option value="h4">Heading 4</option>
                                        <option value="pre">Preformatted</option>
                                    </select>

                                    <div className="flex items-center gap-0.5">
                                        {[
                                            { cmd: 'bold', label: 'B', title: 'Bold', class: 'font-black' },
                                            { cmd: 'italic', label: 'I', title: 'Italic', class: 'italic font-serif' },
                                            { cmd: 'underline', label: 'U', title: 'Underline', class: 'underline' },
                                            { cmd: 'strikeThrough', label: 'abc', title: 'Strikethrough', class: 'line-through' }
                                        ].map(btn => (
                                            <button
                                                key={btn.cmd}
                                                type="button"
                                                onClick={() => document.execCommand(btn.cmd, false)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] hover:text-white rounded transition-colors"
                                                title={btn.title}
                                            >
                                                <span className={`${btn.class} text-sm`}>{btn.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="w-px h-6 bg-gray-600 mx-1.5" />

                                    <div className="flex items-center gap-0.5">
                                        <button type="button" onClick={() => document.execCommand('insertUnorderedList', false)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] rounded" title="Bullet List">
                                            <span className="text-lg leading-none">•</span>
                                        </button>
                                        <button type="button" onClick={() => document.execCommand('insertOrderedList', false)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] rounded" title="Numbered List">
                                            <span className="text-[11px] font-bold">1.</span>
                                        </button>
                                        <button type="button" onClick={() => document.execCommand('formatBlock', false, 'blockquote')} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] rounded" title="Blockquote">
                                            <span className="text-lg leading-none">“</span>
                                        </button>
                                    </div>

                                    <div className="w-px h-6 bg-gray-600 mx-1.5" />

                                    <div className="flex items-center gap-0.5">
                                        <button type="button" onClick={() => document.execCommand('justifyLeft', false)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] rounded" title="Align Left">
                                            <span className="text-xs">L</span>
                                        </button>
                                        <button type="button" onClick={() => document.execCommand('justifyCenter', false)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] rounded" title="Align Center">
                                            <span className="text-xs">C</span>
                                        </button>
                                        <button type="button" onClick={() => document.execCommand('justifyRight', false)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] rounded" title="Align Right">
                                            <span className="text-xs">R</span>
                                        </button>
                                    </div>

                                    <div className="w-px h-6 bg-gray-600 mx-1.5" />

                                    <div className="flex items-center gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const url = prompt('Enter link URL:');
                                                if (url) document.execCommand('createLink', false, url);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] rounded"
                                            title="Insert Link"
                                        >
                                            <span className="text-[10px] font-black text-blue-400">URL</span>
                                        </button>
                                        <button type="button" onClick={() => document.execCommand('unlink', false)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#3c434a] rounded" title="Remove Link">
                                            <span className="text-[10px] font-black text-rose-400">X</span>
                                        </button>
                                    </div>

                                    <div className="w-px h-6 bg-gray-600 mx-1.5 ml-auto" />

                                    <button
                                        type="button"
                                        onClick={() => document.execCommand('removeFormat', false)}
                                        className="px-2 h-8 flex items-center justify-center text-rose-400 hover:bg-[#3c434a] rounded text-[10px] font-black"
                                        title="Clear Formatting"
                                    >
                                        CLEAR
                                    </button>
                                </div>
                            )}

                            {/* Editor Container */}
                            <div className={`relative border border-gray-200 ${!formData.isHtmlView ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}>
                                {formData.isHtmlView ? (
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value, isHtml: true })}
                                        className="w-full min-h-[300px] p-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed outline-none rounded-xl"
                                        placeholder="Enter HTML source code here..."
                                    />
                                ) : (
                                    <div
                                        contentEditable
                                        onInput={(e) => setFormData({ ...formData, message: e.currentTarget.innerHTML, isHtml: true })}
                                        onBlur={(e) => setFormData({ ...formData, message: e.currentTarget.innerHTML, isHtml: true })}
                                        className="w-full min-h-[300px] p-6 bg-white outline-none text-sm leading-relaxed overflow-y-auto rounded-b-xl prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: formData.message }}
                                    ></div>
                                )}
                            </div>
                            <p className="mt-2 text-[10px] font-medium text-gray-400 italic flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                * Tip: Use 'Visual' tab for easy formatting and 'Code' tab for advanced HTML/CSS styling.
                            </p>
                        </div>

                        {/* Scheduling Section */}
                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Clock className={`w-4 h-4 ${formData.showLifetime ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <span className="text-sm font-black text-gray-900">Show Lifetime</span>
                                    </div>
                                    <p className="text-[10px] font-medium text-gray-500">Permanent display until manually dismissed</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.showLifetime}
                                        onChange={(e) => {
                                            const isLifetime = e.target.checked;
                                            setFormData({
                                                ...formData,
                                                showLifetime: isLifetime,
                                                startDate: isLifetime ? '' : formData.startDate || new Date().toISOString().slice(0, 16),
                                                endDate: isLifetime ? '' : formData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                                            });
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {!formData.showLifetime && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            <Calendar className="w-3 h-3" /> Start Display
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold text-gray-700 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                            <Calendar className="w-3 h-3 text-rose-400" /> End Display
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none text-sm font-bold text-gray-700 shadow-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.showLifetime && (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100/50">
                                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                                    <p className="text-[11px] font-bold text-blue-800 leading-tight">
                                        This notification will stay visible on the dashboard until users click dismiss.
                                    </p>
                                </div>
                            )}
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
                            className="flex-1 py-3 bg-primary hover:bg-primary text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50"
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



