import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    Users,
    GraduationCap,
    TrendingUp,
    ArrowUpRight,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    Calendar,
    ChevronRight,
    Search,
    Filter,
    ArrowRight,
    Download,
    BookOpen,
    Trash2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { BarChart, DoughnutChart } from '../../components/charts/Charts';
import { statsAPI, feeAPI } from '../../services/api';
import HolidaySettings from './components/HolidaySettings';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        startDate: '',
        endDate: ''
    });
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const dashboardRef = useRef(null);

    useEffect(() => {
        fetchStats();
    }, [filters.month, filters.startDate, filters.endDate]);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (filters.startDate && filters.endDate) {
                params.startDate = filters.startDate;
                params.endDate = filters.endDate;
            } else if (filters.month) {
                params.month = filters.month;
            }

            const res = await statsAPI.getAdminDashboard(params);
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!dashboardRef.current) return;
        setIsDownloading(true);
        try {
            // Show PDF-only header
            const pdfHeader = dashboardRef.current.querySelector('.show-in-pdf');
            if (pdfHeader) pdfHeader.style.display = 'block';

            // Use visibility: hidden for interactive elements
            const elementsToHide = dashboardRef.current.querySelectorAll('.no-pdf');
            elementsToHide.forEach(el => el.style.visibility = 'hidden');

            const canvas = await html2canvas(dashboardRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
            });

            // Restore
            elementsToHide.forEach(el => el.style.visibility = 'visible');
            if (pdfHeader) pdfHeader.style.display = 'none';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Handle multi-page if needed, but for dashboard usually one page scaled is fine
            // or we just put it on one scrollable-like page in PDF
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
            pdf.save(`LMS-Dashboard-${filters.month || 'report'}.pdf`);
        } catch (error) {
            console.error('PDF generation failed:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value,
            // Clear other filter type if one is set
            ...(name === 'month' ? { startDate: '', endDate: '' } : {}),
            ...(name === 'startDate' || name === 'endDate' ? { month: '' } : {})
        }));
    };

    const handleDeleteSubmission = async (row) => {
        if (!window.confirm(`Are you sure you want to delete this submission for ${row.student}? This involves money and cannot be undone.`)) {
            return;
        }

        try {
            // Optimistic update (optional, but let's stick to refetch for accuracy on totals)
            // But we can show loading state if needed.
            await feeAPI.deleteInstallment(row.feeId, row.id);
            // Refetch to update list and total revenue
            fetchStats();
        } catch (error) {
            console.error('Failed to delete submission:', error);
            alert('Failed to delete submission');
        }
    };

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
                    <div className="w-8 h-8 rounded-full bg-[#ff8e01] flex items-center justify-center text-white text-[10px] font-black italic">
                        {row.student.charAt(0)}
                    </div>
                    <span className="font-bold text-gray-900 text-xs uppercase tracking-tighter">{row.student}</span>
                </div>
            ),
        },
        {
            header: 'Course',
            accessor: 'course',
            render: (row) => <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">{row.course}</span>,
        },
        {
            header: 'Amount',
            accessor: 'amount',
            render: (row) => <span className="font-black text-gray-900">Rs {row.amount.toLocaleString()}</span>,
        },
        {
            header: 'Date',
            accessor: 'date',
            render: (row) => <span className="text-[10px] font-bold text-gray-500">{new Date(row.date).toLocaleDateString()}</span>,
        },
        {
            header: 'Action',
            headerClassName: 'no-pdf',
            className: 'no-pdf',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/admin/fee-verification')}
                        className="p-2.5 bg-orange-50 hover:bg-[#ff8e01] rounded-xl transition-all group shadow-sm active:scale-90"
                        title="View Details"
                    >
                        <Eye className="w-5 h-5 text-[#ff8e01] group-hover:text-white" />
                    </button>
                    <button
                        onClick={() => handleDeleteSubmission(row)}
                        className="p-2.5 bg-red-50 hover:bg-red-500 rounded-xl transition-all group shadow-sm active:scale-90"
                        title="Delete Submission"
                    >
                        <Trash2 className="w-5 h-5 text-red-500 group-hover:text-white" />
                    </button>
                </div>
            ),
        },
    ];

    const doughnutChartData = {
        labels: ['Verified', 'Pending', 'Rejected'],
        datasets: [
            {
                data: data ? [data.feeStatus.verified, data.feeStatus.pending, data.feeStatus.rejected] : [1, 0, 0],
                backgroundColor: ['#10B981', '#ff8e01', '#EF4444'],
                borderWidth: 0,
            },
        ],
    };

    if (isLoading && !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#ff8e01]" />
                <span className="text-gray-500 font-black uppercase tracking-widest text-xs animate-pulse">Syncing Portal Data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 bg-slate-50 min-h-screen" ref={dashboardRef}>
            {/* PDF-only Header (Visible only during capture or if we use specific CSS) */}
            <div className="hidden show-in-pdf mb-8 border-b-4 border-[#ff8e01] pb-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">LMS Performance Report</h1>
                        <p className="text-[#ff8e01] font-black uppercase tracking-[0.4em] text-sm mt-2">Adeeb Tech Lab • Management Portal</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Report Generated</p>
                        <p className="text-lg font-black text-gray-900 uppercase tracking-tighter">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Dashboard Analytics</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Real-time system overview</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/admin/directory')}
                        className="flex items-center gap-3 bg-white text-gray-700 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs border border-gray-200 shadow-sm hover:border-[#ff8e01] hover:text-[#ff8e01] transition-all active:scale-95 no-pdf"
                    >
                        <BookOpen className="w-4 h-4" />
                        Student Directory
                    </button>
                    <button
                        onClick={() => window.open('/verify', '_blank')}
                        className="flex items-center gap-3 bg-white text-gray-700 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs border border-gray-200 shadow-sm hover:border-[#ff8e01] hover:text-[#ff8e01] transition-all active:scale-95 no-pdf"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Verify Certificate
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex items-center gap-3 bg-[#ff8e01] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all active:scale-95 disabled:opacity-50 no-pdf"
                    >
                        {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        {isDownloading ? 'Generating PDF...' : 'Download Report'}
                    </button>
                </div>
            </div>
            {/* Header & Main Stats */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    {/* Revenue Section */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                <div>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-1">Financial Intelligence</h2>
                                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">Total Revenue</h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border-2 border-orange-100 shadow-sm hover:border-orange-300 transition-colors">
                                        <Calendar className="w-5 h-5 text-orange-500 ml-2" />
                                        <input
                                            type="month"
                                            name="month"
                                            value={filters.month}
                                            onChange={handleFilterChange}
                                            className="bg-transparent border-none text-sm font-black uppercase tracking-widest focus:ring-0 cursor-pointer px-3"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border-2 border-orange-100 shadow-sm hover:border-orange-300 transition-colors">
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest pl-2">Custom Range</span>
                                        <input
                                            type="date"
                                            name="startDate"
                                            value={filters.startDate}
                                            onChange={handleFilterChange}
                                            className="bg-transparent border-none text-xs font-black focus:ring-0 cursor-pointer w-32"
                                        />
                                        <ArrowRight className="w-4 h-4 text-orange-300" />
                                        <input
                                            type="date"
                                            name="endDate"
                                            value={filters.endDate}
                                            onChange={handleFilterChange}
                                            className="bg-transparent border-none text-xs font-black focus:ring-0 cursor-pointer w-32"
                                        />
                                    </div>
                                    {isLoading && <Loader2 className="w-6 h-6 animate-spin text-[#ff8e01]" />}
                                </div>
                            </div>

                            <div className="flex items-baseline gap-6 mb-2">
                                <span className="text-7xl font-black text-gray-900 tracking-tighter drop-shadow-sm">
                                    Rs {data?.totalRevenue.toLocaleString()}
                                </span>
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-2xl border-2 border-emerald-200 shadow-sm">
                                    <TrendingUp className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase tracking-widest">Growth Plan Active</span>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 ml-1">
                                Verified Installments from {filters.startDate ? `${filters.startDate} to ${filters.endDate}` : `Month: ${filters.month}`}
                            </p>
                        </div>
                    </div>

                    {/* Student Stats Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm group hover:border-indigo-100 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Global Database</h4>
                            <div className="text-3xl font-black text-gray-900 tracking-tighter">{data?.studentStats.total}</div>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Total Students</p>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm group hover:border-emerald-100 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Active Learning</h4>
                            <div className="text-3xl font-black text-gray-900 tracking-tighter">{data?.studentStats.registered}</div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Registered (Active)</p>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm group hover:border-orange-100 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Alumni Network</h4>
                            <div className="text-3xl font-black text-gray-900 tracking-tighter">{data?.studentStats.passout}</div>
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">Passout Graduates</p>
                        </div>
                    </div>

                    {/* Weekly Off Days Settings */}
                    <HolidaySettings />
                </div>

                {/* Fee Status Graph (Sidebar-like) */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-1">Verification Helix</h2>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">Fee Distribution</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                            <Filter className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>
                    <div className="relative h-64 mb-8">
                        <DoughnutChart data={doughnutChartData} height={256} />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Verified</span>
                            <span className="font-black text-emerald-800">{data?.feeStatus.verified}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100/50">
                            <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Submissions</span>
                            <span className="font-black text-orange-800">{data?.feeStatus.pending}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100/50">
                            <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Rejected</span>
                            <span className="font-black text-red-800">{data?.feeStatus.rejected}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Fee Submissions Table */}
            <div className="space-y-4 pt-4">
                <div className="flex items-end justify-between px-2">
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-1">Financial Stream</h2>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Recent Fee Submissions</h3>
                    </div>
                    <button
                        onClick={() => setShowFullHistory(!showFullHistory)}
                        className="flex items-center gap-3 group cursor-pointer bg-white px-6 py-3 rounded-2xl border-2 border-gray-100 shadow-sm hover:border-[#ff8e01] transition-all active:scale-95 no-pdf"
                    >
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-[#ff8e01] transition-colors">
                            {showFullHistory ? 'Collapse History' : 'Execute View All'}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#ff8e01] group-hover:text-white group-hover:rotate-45 transition-all duration-500">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={showFullHistory ? (data?.recentSubmissions || []) : (data?.recentSubmissions.slice(0, 5) || [])}
                    />
                    {data?.recentSubmissions.length === 0 && (
                        <div className="p-20 text-center">
                            <Clock className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No Recent Activity Detected</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

