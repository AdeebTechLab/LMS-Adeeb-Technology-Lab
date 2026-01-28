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
import AnnouncementsPopup from '../../components/ui/AnnouncementsPopup';
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
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch courses count
            let totalCourses = 0;
            try {
                const coursesRes = await courseAPI.getAll();
                totalCourses = coursesRes.data.data?.length || 0;
            } catch (e) { console.log('Courses API error'); }

            // Fetch students count
            let totalStudents = 0;
            try {
                const studentsRes = await userAPI.getByRole('student');
                totalStudents = studentsRes.data.data?.length || 0;
            } catch (e) { console.log('Students API error'); }

            // Fetch fees data
            let totalRevenue = 0;
            let pendingFees = 0;
            let verifiedCount = 0;
            let pendingCount = 0;
            let rejectedCount = 0;
            let feeSubmissions = [];

            try {
                const feesRes = await feeAPI.getAll();
                const fees = feesRes.data.data || [];

                fees.forEach(fee => {
                    fee.installments?.forEach(inst => {
                        if (inst.status === 'verified') {
                            totalRevenue += inst.amount || 0;
                            verifiedCount++;
                        } else if (inst.status === 'pending' || inst.status === 'under_review') {
                            pendingFees += inst.amount || 0;
                            pendingCount++;
                        } else if (inst.status === 'rejected') {
                            rejectedCount++;
                        }

                        // Collect recent submissions for the table
                        if (inst.receiptUrl) {
                            feeSubmissions.push({
                                id: `${fee._id}-${inst.installmentNumber}`,
                                student: fee.student?.name || 'Unknown',
                                course: fee.course?.title || 'Unknown Course',
                                amount: `Rs ${(inst.amount || 0).toLocaleString()}`,
                                date: new Date(inst.uploadedAt || fee.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
                                status: inst.status === 'under_review' ? 'pending' : inst.status
                            });
                        }
                    });
                });
            } catch (e) { console.log('Fee API error:', e); }

            setStats([
                {
                    title: 'Total Revenue',
                    value: `Rs ${totalRevenue.toLocaleString()}`,
                    change: '',
                    changeType: 'positive',
                    icon: DollarSign,
                    iconBg: 'bg-emerald-100',
                    iconColor: 'text-emerald-600',
                },
                {
                    title: 'Pending Fees',
                    value: `Rs ${pendingFees.toLocaleString()}`,
                    change: '',
                    changeType: pendingFees > 0 ? 'negative' : 'positive',
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
            setFeeStats({ verified: verifiedCount, pending: pendingCount, rejected: rejectedCount });

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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                        {row.student.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{row.student}</span>
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

    // Bar chart data for monthly revenue (placeholder - would need time-series data from backend)
    const barChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, stats[0]?.value ? parseInt(stats[0].value.replace(/[^\d]/g, '')) || 0 : 0],
                backgroundColor: '#22C55E',
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
                backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
                borderWidth: 0,
            },
        ],
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
                className="bg-gradient-to-r from-[#0D2818] to-[#1A5D3A] rounded-2xl p-6 text-white"
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
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${selectedPeriod === period
                                        ? 'bg-[#0D2818] text-white'
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
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                        View All →
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
        </div>
    );
};

export default AdminDashboard;

