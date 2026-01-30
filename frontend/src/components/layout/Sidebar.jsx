import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { assignmentAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    CreditCard,
    FileText,
    Settings,
    LogOut,
    ChevronDown,
    GraduationCap,
    ClipboardList,
    BarChart3,
    User,
    Calendar,
    X,
    Briefcase,
    Award,
    Bell,
} from 'lucide-react';
import { logout } from '../../features/auth/authSlice';
import { userAPI } from '../../services/api';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user, role } = useSelector((state) => state.auth);
    const [pendingCount, setPendingCount] = useState(0);
    const [adminPendingCounts, setAdminPendingCounts] = useState({});

    useEffect(() => {
        if (role === 'student' || role === 'intern') {
            fetchPendingCount();
            const interval = setInterval(fetchPendingCount, 5 * 60 * 1000);
            return () => clearInterval(interval);
        } else if (role === 'admin') {
            fetchAdminPendingCounts();
            const interval = setInterval(fetchAdminPendingCounts, 2 * 60 * 1000); // Admin refresh more frequent
            return () => clearInterval(interval);
        }
    }, [role]);

    const fetchAdminPendingCounts = async () => {
        try {
            const res = await userAPI.getPendingCounts();
            if (res.data.success) {
                setAdminPendingCounts(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching admin pending counts:', error);
        }
    };

    const fetchPendingCount = async () => {
        try {
            const res = await assignmentAPI.getMy();
            const assignments = res.data.assignments || [];

            const count = assignments.filter(a => {
                const mySub = a.submissions?.find(s => (s.user?._id || s.user) === (user?._id || user?.id));
                const isSubmitted = !!mySub;
                const isRejected = mySub?.status === 'rejected';
                const isDeadlinePassed = new Date(a.dueDate) < new Date();

                // Count if: 
                // 1. Never submitted AND deadline not passed
                // 2. OR Submitted but REJECTED (needs action regardless of deadline usually)
                return (!isSubmitted && !isDeadlinePassed) || isRejected;
            }).length;

            setPendingCount(count);
        } catch (error) {
            console.error('Error fetching pending assignments for sidebar:', error);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    // Menu items based on role
    const getMenuItems = () => {
        const baseItems = {
            admin: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
                { id: 'courses', label: 'Courses', icon: BookOpen, path: '/admin/courses' },
                { id: 'paid-tasks', label: 'Paid Tasks', icon: Briefcase, path: '/admin/paid-tasks' },
                { id: 'certificates', label: 'Certificates', icon: Award, path: '/admin/certificates' },
                { id: 'students', label: 'Students', icon: Users, path: '/admin/students', badge: adminPendingCounts.student },
                { id: 'teachers', label: 'Teachers', icon: GraduationCap, path: '/admin/teachers', badge: adminPendingCounts.teacher },
                { id: 'interns', label: 'Interns', icon: Users, path: '/admin/interns', badge: adminPendingCounts.intern },
                { id: 'jobs', label: 'Freelancers', icon: Briefcase, path: '/admin/jobs', badge: adminPendingCounts.job },
                { id: 'notifications', label: 'Notifications', icon: Bell, path: '/admin/notifications' },
                { id: 'fees', label: 'Fee Verification', icon: CreditCard, path: '/admin/fees', badge: adminPendingCounts.fees },
            ],
            teacher: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/teacher/dashboard' },
                { id: 'profile', label: 'My Profile', icon: User, path: '/teacher/profile' },
                { id: 'attendance', label: 'My Courses', icon: BookOpen, path: '/teacher/attendance' },
            ],
            student: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
                { id: 'profile', label: 'My Profile', icon: User, path: '/student/profile' },
                { id: 'courses', label: 'Courses', icon: BookOpen, path: '/student/courses' },
                { id: 'fees', label: 'Fee Payment', icon: CreditCard, path: '/student/fees' },
                { id: 'assignments', label: 'Assignments', icon: ClipboardList, path: '/student/assignments' },
                { id: 'marks', label: 'Marks Sheet', icon: FileText, path: '/student/marks' },
                { id: 'attendance', label: 'My Attendance', icon: Calendar, path: '/student/attendance' },
            ],
            intern: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/intern/dashboard' },
                { id: 'profile', label: 'My Profile', icon: User, path: '/intern/profile' },
                { id: 'courses', label: 'Browse Courses', icon: BookOpen, path: '/intern/courses' },
                { id: 'fees', label: 'Fee Management', icon: CreditCard, path: '/intern/fees' },
                { id: 'assignments', label: 'Assignments', icon: ClipboardList, path: '/intern/assignments' },
                { id: 'daily-tasks', label: 'Daily Tasks', icon: Calendar, path: '/intern/assignments', state: { tab: 'daily_tasks' } },
                { id: 'marks', label: 'Marks Sheet', icon: FileText, path: '/intern/marks' },
                { id: 'attendance', label: 'My Attendance', icon: Calendar, path: '/intern/attendance' },
            ],
            job: [
                { id: 'tasks', label: 'Paid Tasks', icon: Briefcase, path: '/job/tasks' },
                { id: 'profile', label: 'My Profile', icon: User, path: '/job/profile' },
            ],
        };

        return baseItems[role] || baseItems.student;
    };

    const menuItems = getMenuItems();

    // Get role display name
    const getRoleDisplayName = () => {
        const names = {
            admin: 'Administrator',
            teacher: 'Teacher',
            student: 'Student',
            intern: 'Intern',
            job: 'Freelancer'
        };
        return names[role] || 'User';
    };

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed lg:static top-0 left-0 z-50 h-screen w-[280px] bg-[#222d38] flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div
                    className="p-6 border-b border-white/10 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => {
                        const defaultPages = {
                            admin: '/admin/dashboard',
                            teacher: '/teacher/dashboard',
                            student: '/student/dashboard',
                            intern: '/intern/dashboard',
                            job: '/job/tasks'
                        };
                        navigate(defaultPages[role] || '/');
                        setIsOpen(false);
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#ff8e01] to-[#ffab40] rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-orange-900/20">
                                <img
                                    src="/logo.png"
                                    alt="Logo"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <GraduationCap className="w-6 h-6 text-white hidden" />
                            </div>
                            <div>
                                <h1 className="text-white font-bold text-lg tracking-tight">AdeebTechLab</h1>
                                <p className="text-[#ff8e01]/70 text-[10px] font-black uppercase tracking-[0.2em]">{getRoleDisplayName()} Portal</p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="lg:hidden text-white/60 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* User Info */}
                <div className="p-4 mx-4 mt-4 bg-white/5 rounded-xl border border-white/5 shadow-inner">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#394251] to-[#222d38] flex items-center justify-center text-white font-semibold border border-white/10">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-white/40 text-xs truncate">
                                {user?.email || 'user@example.com'}
                            </p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-white/30" />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <ul className="space-y-1">
                        {menuItems.map((item) => (
                            <li key={item.id}>
                                <NavLink
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'bg-[#394251] text-white border-l-4 border-[#ff8e01] shadow-lg shadow-black/20'
                                            : 'text-white/60 hover:text-white hover:bg-[#394251]/50'
                                        }`
                                    }
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium flex-1">{item.label}</span>
                                    {item.id === 'assignments' && pendingCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-[#ff8e01] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-[#ff8e01]/20"
                                        >
                                            {pendingCount}
                                        </motion.span>
                                    )}
                                    {item.badge > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-[#ff8e01] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-[#ff8e01]/20"
                                        >
                                            {item.badge}
                                        </motion.span>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-white/10">
                    <NavLink
                        to={`/${role}/settings`}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 mt-1"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
