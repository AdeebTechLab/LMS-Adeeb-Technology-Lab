import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    Users,
    BookOpen,
    GraduationCap,
    TrendingUp,
    ArrowUpRight,
    MoreHorizontal,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    RefreshCw
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { BarChart, DoughnutChart } from '../../components/charts/Charts';
import { courseAPI, feeAPI, userAPI } from '../../services/api';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [selectedPeriod, setSelectedPeriod] = useState('weekly');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState([]);
    const [recentFees, setRecentFees] = useState([]);
    const [feeStats, setFeeStats] = useState({ verified: 0, pending: 0, rejected: 0 });

    useEffect(() => {
        fetchDashboardData();
    }, [selectedPeriod]); // Re-fetch or re-filter when period changes

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const [coursesRes, studentsRes, feesRes] = await Promise.all([
                courseAPI.getAll().catch(() => ({ data: { data: [] } })),
                userAPI.getByRole('student').catch(() => ({ data: { data: [] } })),
                feeAPI.getAll().catch(() => ({ data: { data: [] } }))
            ]);

            const totalCourses = coursesRes.data.data?.length || 0;
            const totalStudents = studentsRes.data.data?.length || 0;
            const fees = feesRes.data.data || [];

            // Revenue calculation logic based on periods
            const now = new Date();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYear = new Date(now.getFullYear(), 0, 1);

            let totalRevenue = 0;
            let pendingFees = 0;
            let verifiedCount = 0;
            let pendingCount = 0;
            let rejectedCount = 0;
            let feeSubmissions = [];

            // Period-specific revenue
            let weeklyRevenue = 0;
            let monthlyRevenue = 0;
            let yearlyRevenue = 0;

            fees.forEach(fee => {
                fee.installments?.forEach(inst => {
                    const paidDate = inst.paidAt || inst.verifiedAt || fee.createdAt;
                    const amount = inst.amount || 0;
                    const dateObj = new Date(paidDate);

                    if (inst.status === 'verified') {
                        totalRevenue += amount;
                        verifiedCount++;

                        // Aggregate by period
                        if (dateObj >= startOfWeek) weeklyRevenue += amount;
                        if (dateObj >= startOfMonth) monthlyRevenue += amount;
                        if (dateObj >= startOfYear) yearlyRevenue += amount;
                    } else if (inst.status === 'pending' || inst.status === 'under_review' || inst.status === 'submitted') {
                        pendingFees += amount;
                        pendingCount++;
                    } else if (inst.status === 'rejected') {
                        rejectedCount++;
                    }

                    // Collect recent submissions for the table
                    if (inst.receiptUrl || inst.status === 'submitted') {
                        feeSubmissions.push({
                            id: inst._id || `${fee._id}-${inst.installmentNumber}`,
                            student: fee.user?.name || 'Unknown', // FIXED: user instead of student
                            course: fee.course?.title || 'Unknown Course',
                            amount: `Rs ${amount.toLocaleString()}`,
                            date: new Date(paidDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
                            status: inst.status === 'under_review' ? 'pending' : (inst.status === 'submitted' ? 'pending' : inst.status),
                            paidAt: dateObj
                        });
                    }
                });
            });

            // Sort submissions by date
            feeSubmissions.sort((a, b) => b.paidAt - a.paidAt);

            const displayRevenue = selectedPeriod === 'weekly' ? weeklyRevenue :
                selectedPeriod === 'monthly' ? monthlyRevenue : yearlyRevenue;

            setStats([
                {
                    title: `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Revenue`,
                    value: `Rs ${displayRevenue.toLocaleString()}`,
                    change: '',
                    changeType: 'positive',
                    icon: DollarSign,
                    iconBg: 'bg-orange-100', // Matches theme
                    iconColor: 'text-[#ff8e01]',
                },
                {
                    title: 'Verification Needed',
                    value: pendingCount.toString(),
                    change: '',
                    changeType: pendingCount > 0 ? 'negative' : 'positive',
                    icon: Clock,
                    iconBg: 'bg-amber-100',
                    iconColor: 'text-amber-600',
                },
                {
                    title: 'Total Students',
                    value: totalStudents.toString(),
                    change: '',
                    changeType: 'positive',
                    icon: Users,
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                },
                {
                    title: 'Active Courses',
                    value: totalCourses.toString(),
                    change: '',
                    changeType: 'positive',
                    icon: BookOpen,
                    iconBg: 'bg-purple-100',
                    iconColor: 'text-purple-600',
                },
            ]);

            setRecentFees(feeSubmissions.slice(0, 5));
            setFeeStats({
                verified: verifiedCount,
                pending: pendingCount,
                rejected: rejectedCount,
                weekly: weeklyRevenue,
                monthly: monthlyRevenue,
                yearly: yearlyRevenue
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Table columns
    const columns = [
        {
            header: 'Status',
            accessor: 'status',
            render: (row) => {
                const statusConfig = {
                    pending: { variant: 'warning', icon: Clock },
                    verified: { variant: 'success', icon: CheckCircle },
                    rejected: { variant: 'error', icon: XCircle },
                };
                const config = statusConfig[row.status] || statusConfig.pending;
                return (
                    <Badge variant={config.variant}>
                        <config.icon className="w-3 h-3 mr-1" />
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </Badge>
                );
            },
        },
        {
            header: 'Student',
            accessor: 'student',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#394251] to-[#222d38] flex items-center justify-center text-white text-[10px] font-black border border-white/10 uppercase italic">
                        {row.student.charAt(0)}
                    </div>
                    <span className="font-bold text-gray-900 text-sm uppercase italic tracking-tighter">{row.student}</span>
                </div>
            ),
        },
        {
            header: 'Course',
            accessor: 'course',
            render: (row) => <span className="text-gray-600">{row.course}</span>,
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (row) => <span className="font-medium text-gray-900">{row.amount}</span>,
        },
        {
            header: 'Date',
            accessor: 'date',
            render: (row) => <span className="text-gray-500">{row.date}</span>,
        },
        {
            header: 'Action',
            render: (row) => (
                <button
                    onClick={() => navigate('/admin/fee-verification')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Eye className="w-4 h-4 text-gray-500" />
                </button>
            ),
        },
    ];

    // Dynamic bar chart data
    const barChartData = {
        labels: selectedPeriod === 'weekly' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
            selectedPeriod === 'monthly' ? ['Week 1', 'Week 2', 'Week 3', 'Week 4'] :
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                data: selectedPeriod === 'weekly' ? [0, 0, 0, 0, 0, 0, feeStats.weekly || 0] :
                    selectedPeriod === 'monthly' ? [0, 0, 0, feeStats.monthly || 0] :
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, feeStats.yearly || 0],
                backgroundColor: '#ff8e01', // Slate/Orange Theme
                borderRadius: 6,
                barThickness: 20,
            },
        ],
    };

    // Doughnut chart data for fee status
    const doughnutChartData = {
        labels: ['Verified', 'Pending', 'Rejected'],
        datasets: [
            {
                data: [feeStats.verified || 1, feeStats.pending || 0, feeStats.rejected || 0],
                backgroundColor: ['#ff8e01', '#394251', '#EF4444'], // Theme-aligned
                borderWidth: 0,
            },
        ],
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[#ff8e01]" />
                <span className="ml-2 text-gray-600">Loading dashboard...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#222d38] to-[#394251] rounded-2xl p-6 text-white shadow-xl shadow-slate-900/10"
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Welcome back, Admin!</h2>
                        <p className="text-white/70">
                            Here's what's happening with your AdeebTechLab portal today.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchDashboardData} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 backdrop-blur-sm border border-white/20">
                            View Reports
                            <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <StatCard {...stat} />
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Revenue Overview</h3>
                            <p className="text-sm text-gray-500">Monthly revenue from all courses</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {['weekly', 'monthly', 'yearly'].map((period) => (
                                <button
                                    key={period}
                                    onClick={() => setSelectedPeriod(period)}
                                    className={`px-3 py-1.5 text-sm font-black uppercase tracking-widest rounded-lg transition-all ${selectedPeriod === period
                                        ? 'bg-[#ff8e01] text-white shadow-lg shadow-orange-900/20'
                                        : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {period.charAt(0).toUpperCase() + period.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <BarChart data={barChartData} height={280} />
                </motion.div>

                {/* Fee Status Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Fee Status</h3>
                            <p className="text-sm text-gray-500">Payment verification status</p>
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreHorizontal className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                    <DoughnutChart data={doughnutChartData} height={220} />
                </motion.div>
            </div>

            {/* Recent Fee Submissions Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Recent Fee Submissions</h3>
                        <p className="text-sm text-gray-500">Latest payment receipts pending verification</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/fee-verification')}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff8e01] hover:text-[#e67e00] transition-colors"
                    >
                        View All Portal →
                    </button>
                </div>
                {recentFees.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No fee submissions yet</p>
                    </div>
                ) : (
                    <DataTable columns={columns} data={recentFees} />
                )}
            </motion.div>
            {/* Announcements Popup - Only on Main Dashboard */}
        </div>
    );
};

export default AdminDashboard;

