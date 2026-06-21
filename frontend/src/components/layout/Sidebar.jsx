import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { assignmentAPI, courseAPI, dailyTaskAPI } from '../../services/api';
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
    FolderOpen,
    Zap,
} from 'lucide-react';
import { logout, loginSuccess } from '../../features/auth/authSlice';
import { userAPI, authAPI } from '../../services/api';
import { useTranslation } from 'react-i18next';
import ProfileAvatar from '../ui/ProfileAvatar';
import Loader, { ButtonLoader } from '../ui/Loader';
import SocialLinks from '../shared/SocialLinks';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const { user, role } = useSelector((state) => state.auth);
    const [pendingCount, setPendingCount] = useState(0);
    const [adminPendingCounts, setAdminPendingCounts] = useState({});
    const [teacherSubmissionCount, setTeacherSubmissionCount] = useState(0);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowRoleMenu(false);
            }
        };

        if (showRoleMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showRoleMenu]);

    useEffect(() => {
        if (role === 'student' || role === 'intern') {
            fetchPendingCount();
            const interval = setInterval(fetchPendingCount, 5 * 60 * 1000);
            return () => clearInterval(interval);
        } else if (role === 'admin') {
            fetchAdminPendingCounts();
            const interval = setInterval(fetchAdminPendingCounts, 2 * 60 * 1000); // Admin refresh more frequent
            return () => clearInterval(interval);
        } else if (role === 'teacher') {
            fetchTeacherSubmissionCount();
            const interval = setInterval(fetchTeacherSubmissionCount, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [role, user]);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await authAPI.getAvailableRoles();
                if (res.data.success) {
                    const roleOrder = { 'job': 1, 'teacher': 2, 'intern': 3, 'student': 4, 'admin': 5 };
                    const sortedRoles = res.data.roles.sort((a, b) => (roleOrder[a] || 99) - (roleOrder[b] || 99));
                    setAvailableRoles(sortedRoles);
                }
            } catch (err) {
                console.error('Error fetching available roles:', err);
            }
        };
        if (user) {
            fetchRoles();
        }
    }, [user, role]);

    const handleSwitchRole = async (targetRole) => {
        if (targetRole === role) return;
        setIsSwitchingRole(true);
        try {
            const rememberMe = localStorage.getItem('rememberMe') === 'true';
            const res = await authAPI.switchRole({ targetRole, rememberMe });
            if (res.data.success) {
                dispatch(loginSuccess({
                    user: res.data.user,
                    token: res.data.token,
                    rememberMe
                }));
                navigate('/');
                setShowRoleMenu(false);
                setIsOpen(false);
            }
        } catch (err) {
            console.error('Role switch error:', err);
            alert(err.response?.data?.message || t('auth.switchRoleFailed'));
        } finally {
            setIsSwitchingRole(false);
        }
    };

    const fetchTeacherSubmissionCount = async () => {
        try {
            const teacherId = (user?.id || user?._id)?.toString();
            if (!teacherId) return;

            // Get all courses
            const coursesRes = await courseAPI.getAll();
            const allCourses = coursesRes.data.data || [];

            // Filter teacher's courses (same logic as TeacherCourses.jsx)
            const teacherCourses = allCourses.filter(c => {
                if (!c.teachers || c.teachers.length === 0) return false;
                return c.teachers.some(t => {
                    const tId = String(t._id || t.id || t);
                    return tId === teacherId;
                });
            });

            // Count pending (ungraded) submissions across all teacher's courses
            let pendingSubmissions = 0;
            for (const course of teacherCourses) {
                try {
                    const assignmentsRes = await assignmentAPI.getByCourse(course._id);
                    const assignments = assignmentsRes.data.assignments || [];
                    assignments.forEach(a => {
                        (a.submissions || []).forEach(s => {
                            // Count ungraded: marks is null, undefined, or not a number
                            const isUngraded = s.marks === undefined || s.marks === null || (typeof s.marks !== 'number');
                            if (isUngraded) {
                                pendingSubmissions++;
                            }
                        });
                    });
                } catch (e) {
                    // Skip courses with no assignments
                }
            }

            setTeacherSubmissionCount(pendingSubmissions);
        } catch (error) {
            console.error('Error fetching teacher submission count:', error);
        }
    };

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
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
                { id: 'directory', labelKey: 'nav.directory', icon: FolderOpen, path: '/admin/directory' },
                { id: 'courses', labelKey: 'nav.courses', icon: BookOpen, path: '/admin/courses' },
                { id: 'paid-tasks', labelKey: 'nav.paidTasks', icon: Briefcase, path: '/admin/paid-tasks' },
                { id: 'certificates', labelKey: 'nav.certificates', icon: Award, path: '/admin/certificates' },
                { id: 'students', labelKey: 'nav.students', icon: Users, path: '/admin/students', badge: adminPendingCounts.studentRegisteredNew },
                { id: 'teachers', labelKey: 'nav.teachers', icon: GraduationCap, path: '/admin/teachers', badge: adminPendingCounts.teacherRegisteredNew },
                { id: 'interns', labelKey: 'nav.interns', icon: Users, path: '/admin/interns', badge: adminPendingCounts.internRegisteredNew },
                { id: 'jobs', labelKey: 'nav.freelancers', icon: Briefcase, path: '/admin/jobs', badge: adminPendingCounts.job },
                { id: 'notifications', labelKey: 'nav.notifications', icon: Bell, path: '/admin/notifications' },
                { id: 'fees', labelKey: 'nav.feeVerification', icon: CreditCard, path: '/admin/fees', badge: adminPendingCounts.fees },
            ],
            teacher: [
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/teacher/dashboard', submissionBadge: teacherSubmissionCount },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/teacher/profile' },
                { id: 'courses', labelKey: 'nav.myCourses', icon: BookOpen, path: '/teacher/courses' },
                { id: 'attendance', labelKey: 'nav.attendance', icon: Calendar, path: '/teacher/quick-attendance' },
                { id: 'certificates', labelKey: 'nav.certificates', icon: Award, path: '/teacher/certificates' },
            ],
            student: [
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/student/profile' },
                { id: 'courses', labelKey: 'nav.myCourses', icon: BookOpen, path: '/student/courses' },
                { id: 'fees', labelKey: 'nav.feePayment', icon: CreditCard, path: '/student/fees' },
                { id: 'attendance', labelKey: 'nav.myAttendance', icon: Calendar, path: '/student/assignments', state: { tab: 'attendance' } },
                { id: 'class-logs', labelKey: 'nav.classLogs', icon: ClipboardList, path: '/student/assignments', state: { tab: 'daily_tasks' } },
                { id: 'assignments', labelKey: 'nav.assignments', icon: FileText, path: '/student/assignments', state: { tab: 'assignments' } },
                { id: 'tests', labelKey: 'nav.myTests', icon: Zap, path: '/student/assignments', state: { tab: 'tests' } },
                { id: 'marks', labelKey: 'nav.marksSheet', icon: BarChart3, path: '/student/marks' },
            ],
            intern: [
                { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/intern/dashboard' },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/intern/profile' },
                { id: 'courses', labelKey: 'nav.mySkills', icon: BookOpen, path: '/intern/courses' },
                { id: 'fees', labelKey: 'nav.feePayment', icon: CreditCard, path: '/intern/fees' },
                { id: 'attendance', labelKey: 'nav.myAttendance', icon: Calendar, path: '/intern/assignments', state: { tab: 'attendance' } },
                { id: 'class-logs', labelKey: 'nav.classLogs', icon: ClipboardList, path: '/intern/assignments', state: { tab: 'daily_tasks' } },
                { id: 'assignments', labelKey: 'nav.dailyTask', icon: FileText, path: '/intern/assignments', state: { tab: 'assignments' } },
                { id: 'tests', labelKey: 'nav.myTests', icon: Zap, path: '/intern/assignments', state: { tab: 'tests' } },
                { id: 'marks', labelKey: 'nav.marksSheet', icon: BarChart3, path: '/intern/marks' },
            ],
            job: [
                { id: 'tasks', labelKey: 'nav.paidTasks', icon: Briefcase, path: '/job/tasks' },
                { id: 'profile', labelKey: 'nav.myProfile', icon: User, path: '/job/profile' },
            ],
        };

        return baseItems[role] || baseItems.student;
    };

    const menuItems = getMenuItems();

    // Get role display name
    const getRoleDisplayName = () => t(`roles.${role}`, { defaultValue: t('roles.user') });

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
                        className="fixed inset-0 bg-black/50 z-[990] lg:hidden"
                    />
                )}
            </AnimatePresence>

            <aside
                className={`fixed lg:relative top-0 left-0 z-[999] h-screen w-[280px] bg-[var(--bg-sidebar)] flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div
                    className="p-6 border-b border-[var(--border-sidebar)] cursor-pointer hover:bg-white/[0.02] transition-colors"
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
                            <div className="w-12 h-12 border-2 border-primary rounded-full flex items-center justify-center overflow-hidden">
                                <img
                                    src="/logo.png"
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <GraduationCap className="w-6 h-6 text-white hidden" />
                            </div>
                            <div>
                                <h1 className="text-[var(--text-sidebar)] font-bold text-lg tracking-tight">{t('app.name')}</h1>
                                <p className="text-primary text-[8px] font-black uppercase tracking-wider whitespace-nowrap">
                                    digital tech software house
                                </p>
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

                <div className="relative mx-4 mt-4" ref={dropdownRef}>
                    <div 
                        className={`p-4 bg-[var(--bg-sidebar-light)]/40 rounded-xl border border-[var(--border-sidebar)] shadow-inner transition-colors ${availableRoles.length > 1 ? 'cursor-pointer hover:bg-[var(--bg-sidebar-light)]/60' : ''}`}
                        onClick={() => {
                            if (availableRoles.length > 1) setShowRoleMenu(!showRoleMenu);
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <ProfileAvatar src={role === 'admin' ? "https://res.cloudinary.com/adeeb-tech-lab/image/upload/v1780787310/Company%20Logo/LMS_admin.jpg" : user?.photo} name={user?.name} size="md" border="border border-[var(--border-sidebar)]" fallbackColor="bg-gradient-to-br from-[var(--bg-sidebar-light)] to-[var(--bg-sidebar)]" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[var(--text-sidebar)] font-medium text-sm truncate">
                                    {user?.name || t('roles.user')}
                                </p>
                                <p className="text-primary text-[10px] font-black uppercase tracking-widest truncate mt-0.5">
                                    {getRoleDisplayName()}
                                </p>
                            </div>
                            {availableRoles.length > 1 && (
                                <ChevronDown className={`w-4 h-4 text-[var(--text-sidebar-muted)] transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
                            )}
                        </div>
                    </div>

                    <AnimatePresence>
                        {showRoleMenu && availableRoles.length > 1 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-sidebar-dark)] border border-[var(--border-sidebar)] rounded-xl overflow-hidden shadow-xl z-50 py-2"
                            >
                                <div className="px-4 py-2 border-b border-[var(--border-sidebar)] mb-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-[var(--text-sidebar-muted)] uppercase tracking-widest">{t('layout.switchProfile')}</span>
                                </div>
                                        {availableRoles.map(r => (
                                            <button
                                                key={r}
                                                disabled={isSwitchingRole}
                                                onClick={() => handleSwitchRole(r)}
                                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                                    r === role 
                                                        ? 'bg-primary/10 text-primary font-bold border-l-2 border-primary' 
                                                        : 'text-[var(--text-sidebar-muted)] hover:bg-white/5 hover:text-[var(--text-sidebar)] font-medium border-l-2 border-transparent'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="capitalize">{t(`roles.${r}`, { defaultValue: r })} {t('nav.dashboard')}</span>
                                                    {isSwitchingRole && r === role && <ButtonLoader className="w-3 h-3" />}
                                                </div>
                                                {r === role && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                                            </button>
                                        ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <ul className="space-y-1">
                        {menuItems.map((item) => (
                            <li key={item.id}>
                                <NavLink
                                    to={item.path}
                                    state={item.state}
                                    onClick={() => setIsOpen(false)}
                                    className={() => {
                                        const isPathActive = location.pathname === item.path;
                                        const isStateActive = !item.state || location.state?.tab === item.state.tab;
                                        const isActive = isPathActive && isStateActive;

                                        return `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'bg-[var(--bg-sidebar-light)] text-[var(--text-sidebar)] border-l-4 border-primary shadow-lg shadow-black/20'
                                            : 'text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-light)]/50'
                                        }`;
                                    }}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium flex-1">{t(item.labelKey)}</span>
                                    {item.id === 'assignments' && pendingCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-primary/20"
                                        >
                                            {pendingCount}
                                        </motion.span>
                                    )}
                                    {/* Badge for Registered (New) users (orange) */}
                                    {item.badge > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-primary/20"
                                            title="Registered (New)"
                                        >
                                            {item.badge}
                                        </motion.span>
                                    )}
                                    {/* Badge for teacher pending (ungraded) submissions (red) */}
                                    {item.submissionBadge > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-red-500 text-white text-[10px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20"
                                            title="Pending Submissions to Grade"
                                        >
                                            {item.submissionBadge > 99 ? '99+' : item.submissionBadge}
                                        </motion.span>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-[var(--border-sidebar)] space-y-3">
                    <SocialLinks className="px-1" />

                    <NavLink
                        to={`/${role}/settings`}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-sidebar-muted)] hover:text-[var(--text-sidebar)] hover:bg-white/5 transition-all duration-200"
                    >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">{t('layout.settings')}</span>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 mt-1"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">{t('layout.logout')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;


