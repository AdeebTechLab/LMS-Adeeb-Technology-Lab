import { useEffect, useMemo, useState } from 'react';
import {
    Wallet, TrendingUp, TrendingDown, Landmark, Plus, Pencil, Trash2, X,
    BriefcaseBusiness, Users, CircleDollarSign, Clock3, CheckCircle2, AlertTriangle,
    ChevronDown, ChevronUp, UserRoundPlus
} from 'lucide-react';
import { financeAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';

const categories = ['Rent', 'Salaries', 'Bills', 'Marketing', 'Equipment', 'Internet', 'Maintenance', 'Transport', 'Food', 'Pocket Money', 'Guest', 'Sim Balance', 'Shopping', 'Project', 'Other'];
const categoryIcons = { 'Office Rent': '🏢', Salaries: '👥', Utilities: '💡', Marketing: '📣', Equipment: '💻', Internet: '🌐', Maintenance: '🛠️', Transport: '🚗', Food: '🍽️', Refreshment: '☕', 'Pocket Money': '👛', Guest: '🤝', Clean: '🧹', 'Sim Balance': '📶', Shopping: '🛍️', 'Course Income': '🎓', 'IOT Project': '📡', 'Website Project': '🌐', 'App Project': '📱', Other: '📦' };
const newCategoryIcons = {
    Rent: '🏢',
    Salaries: '💵',
    Bills: '🧾',
    Project: '📁',
    Video: '🎬',
    Audio: '🎧',
    Graphics: '🎨',
    AI: '🤖'
};
const getCategoryIcon = category => newCategoryIcons[category] || categoryIcons[category] || '🏷️';
const money = value => `Rs ${Number(value || 0).toLocaleString()}`;
const parseAmount = value => Number(String(value || '').replace(/,/g, ''));
const formatAmountInput = value => {
    const digits = String(value || '').replace(/[^\d]/g, '');
    return digits ? Number(digits).toLocaleString() : '';
};
const fieldClass = 'w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white outline-none focus:border-primary';
const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);
const monthRange = month => {
    const [year, monthNumber] = month.split('-').map(Number);
    return { startDate: `${month}-01`, endDate: `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}` };
};
const emptyForm = { type: 'expense', title: '', amount: '', category: 'Rent', customCategory: '', project: '', description: '', transactionDate: today };
const emptyDeveloper = () => ({ name: '', designation: '', totalPayable: '', paidAmount: '' });
const emptyProject = () => ({ name: '', clientName: '', clientTotal: '', clientReceived: '', developers: [emptyDeveloper()], status: 'processing', startDate: today, completionDate: '', description: '' });

const Metric = ({ label, value, tone = 'text-gray-900 dark:text-white' }) => (
    <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-3">
        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">{label}</p>
        <p className={`mt-1 text-sm font-black ${tone}`}>{money(value)}</p>
    </div>
);

const ExpenseManagement = () => {
    const [entries, setEntries] = useState([]);
    const [projects, setProjects] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showProjectForm, setShowProjectForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [filter, setFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [projectFilter, setProjectFilter] = useState('all');
    const [expandedProject, setExpandedProject] = useState(null);
    const [periodMode, setPeriodMode] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [startDate, setStartDate] = useState(`${currentMonth}-01`);
    const [endDate, setEndDate] = useState(today);
    const [form, setForm] = useState(emptyForm);
    const [projectForm, setProjectForm] = useState(emptyProject());

    const loadData = async () => {
        try {
            let params = {};
            if (periodMode === 'month') params = monthRange(selectedMonth);
            if (periodMode === 'custom') params = { startDate, endDate };
            const [financeRes, projectsRes] = await Promise.all([financeAPI.getAll(params), financeAPI.getProjects()]);
            setEntries(financeRes.data.data || []);
            setSummary(financeRes.data.summary || {});
            setProjects(projectsRes.data.data || []);
        } catch (error) {
            alert(error.response?.data?.message || 'Finance data load nahi ho saka.');
        } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [periodMode, selectedMonth, startDate, endDate]);

    const availableCategories = useMemo(() => [...new Set([...categories, ...entries.map(entry => entry.category)])].sort(), [entries]);
    const filteredEntries = useMemo(() => entries.filter(entry =>
        (filter === 'all' || entry.type === filter) &&
        (categoryFilter === 'all' || entry.category === categoryFilter)
    ), [entries, filter, categoryFilter]);
    const filteredProjects = useMemo(() => projects.filter(project => {
        if (projectFilter === 'all') return true;
        return project.status === projectFilter;
    }), [projects, projectFilter]);
    const topCategories = useMemo(() => Object.entries(summary.categoryTotals || {}).sort((a, b) => b[1] - a[1]).slice(0, 5), [summary]);

    const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = entry => {
        const standard = categories.includes(entry.category);
        setEditingId(entry._id);
        setForm({ type: entry.type, title: entry.title, amount: formatAmountInput(entry.amount), category: standard ? entry.category : 'Other', customCategory: standard ? '' : entry.category, project: entry.project?._id || entry.project || '', description: entry.description || '', transactionDate: new Date(entry.transactionDate).toISOString().slice(0, 10) });
        setShowForm(true);
    };
    const saveEntry = async event => {
        event.preventDefault(); setSaving(true);
        try {
            const payload = { ...form, category: form.category === 'Other' ? form.customCategory.trim() : form.category, amount: parseAmount(form.amount) };
            delete payload.customCategory;
            payload.project = payload.project || null;
            if (!payload.category) return alert('Custom category name enter karein.');
            editingId ? await financeAPI.update(editingId, payload) : await financeAPI.create(payload);
            setShowForm(false); await loadData();
        } catch (error) { alert(error.response?.data?.message || 'Record save nahi ho saka.'); }
        finally { setSaving(false); }
    };
    const removeEntry = async id => {
        if (!window.confirm('Is finance record ko delete karna hai?')) return;
        await financeAPI.delete(id); await loadData();
    };

    const openNewProject = () => { setEditingProjectId(null); setProjectForm(emptyProject()); setShowProjectForm(true); };
    const openEditProject = project => {
        setEditingProjectId(project._id);
        setProjectForm({
            name: project.name, clientName: project.clientName,
            clientTotal: formatAmountInput(project.clientTotal), clientReceived: formatAmountInput(project.clientReceived),
            developers: (project.developers || []).length ? project.developers.map(developer => ({ name: developer.name, designation: developer.designation || '', totalPayable: formatAmountInput(developer.totalPayable), paidAmount: formatAmountInput(developer.paidAmount) })) : [emptyDeveloper()],
            status: project.status, startDate: new Date(project.startDate).toISOString().slice(0, 10),
            completionDate: project.completionDate ? new Date(project.completionDate).toISOString().slice(0, 10) : '', description: project.description || ''
        });
        setShowProjectForm(true);
    };
    const updateDeveloper = (index, key, value) => setProjectForm(previous => ({ ...previous, developers: previous.developers.map((developer, developerIndex) => developerIndex === index ? { ...developer, [key]: value } : developer) }));
    const saveProject = async event => {
        event.preventDefault(); setSaving(true);
        try {
            const payload = {
                ...projectForm,
                clientTotal: parseAmount(projectForm.clientTotal), clientReceived: parseAmount(projectForm.clientReceived),
                developers: projectForm.developers.filter(developer => developer.name.trim()).map(developer => ({ name: developer.name.trim(), designation: developer.designation.trim(), totalPayable: parseAmount(developer.totalPayable), paidAmount: parseAmount(developer.paidAmount) }))
            };
            editingProjectId ? await financeAPI.updateProject(editingProjectId, payload) : await financeAPI.createProject(payload);
            setShowProjectForm(false); await loadData();
        } catch (error) { alert(error.response?.data?.message || 'Project save nahi ho saka.'); }
        finally { setSaving(false); }
    };
    const removeProject = async id => {
        if (!window.confirm('Is project ko permanently delete karna hai?')) return;
        await financeAPI.deleteProject(id); await loadData();
    };

    if (loading) return <Loader message="Loading finance overview..." />;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div><h1 className="text-2xl font-black text-gray-900 dark:text-white">Income, Expense & Projects</h1><p className="text-sm text-gray-500 dark:text-slate-400">Cash flow, project profitability and pending clearances in one place.</p></div>
                <div className="flex flex-col sm:flex-row gap-2"><button onClick={openNewProject} className="px-4 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"><BriefcaseBusiness className="w-4 h-4" /> Create Project</button><button onClick={openNew} className="px-4 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Record</button></div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-end gap-3">
                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">View Data By</label><select value={periodMode} onChange={event => setPeriodMode(event.target.value)} className={fieldClass}><option value="month">Monthly</option><option value="custom">Custom Date Range</option><option value="all">All Time</option></select></div>
                {periodMode === 'month' && <div className="flex-1 max-w-sm"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Select Month</label><input type="month" value={selectedMonth} max={currentMonth} onChange={event => setSelectedMonth(event.target.value)} className={fieldClass} /></div>}
                {periodMode === 'custom' && <><div className="flex-1"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Start Date</label><input type="date" value={startDate} max={endDate || today} onChange={event => setStartDate(event.target.value)} className={fieldClass} /></div><div className="flex-1"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">End Date</label><input type="date" value={endDate} min={startDate} max={today} onChange={event => setEndDate(event.target.value)} className={fieldClass} /></div></>}
                <div className="lg:ml-auto px-4 py-3 rounded-xl bg-primary/10 text-primary text-xs font-black">{periodMode === 'all' ? 'All Time Data' : periodMode === 'month' ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `${startDate} to ${endDate}`}</div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                {[{ label: 'Total Income', value: summary.totalIncome, icon: TrendingUp, tone: 'text-emerald-500' }, { label: 'Total Expenses', value: summary.totalExpenses, icon: TrendingDown, tone: 'text-rose-500' }, { label: 'Available Balance', value: summary.balance, icon: Wallet, tone: 'text-blue-500' }, { label: 'Verified Fee Income', value: summary.feeIncome, icon: Landmark, tone: 'text-amber-500' }, { label: 'Project Cash Profit', value: (summary.projectIncome || 0) - (summary.projectExpenses || 0), icon: BriefcaseBusiness, tone: 'text-violet-500' }].map(card => <div key={card.label} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm"><card.icon className={`w-5 h-5 ${card.tone} mb-3`} /><p className="text-[10px] uppercase tracking-wider font-black text-gray-400">{card.label}</p><p className="text-xl font-black text-gray-900 dark:text-white mt-1">{money(card.value)}</p></div>)}
            </div>

            <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><h2 className="text-lg font-black text-gray-900 dark:text-white">Project Portfolio</h2><p className="text-xs text-gray-400">Expected profit, collections and team clearance.</p></div><select value={projectFilter} onChange={event => setProjectFilter(event.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 text-xs font-bold"><option value="all">All Projects</option><option value="processing">Processing</option><option value="completed">Completed</option></select></div>
                <div className="grid lg:grid-cols-2 gap-4">
                    {filteredProjects.map(project => {
                        const metrics = project.metrics || {};
                        const clientProgress = project.clientTotal ? Math.min(100, Math.round(project.clientReceived / project.clientTotal * 100)) : 0;
                        const developerProgress = metrics.developerTotal ? Math.min(100, Math.round(metrics.developerPaid / metrics.developerTotal * 100)) : 100;
                        const expanded = expandedProject === project._id;
                        return <article key={project._id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2 mb-2"><span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{project.status === 'completed' ? 'Completed' : 'Processing'}</span></div><h3 className="text-lg font-black text-gray-900 dark:text-white">{project.name}</h3><p className="text-xs text-gray-400 mt-1">Client: <span className="font-bold text-gray-600 dark:text-slate-300">{project.clientName}</span></p></div><div className="flex gap-1"><button onClick={() => openEditProject(project)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><Pencil className="w-4 h-4" /></button><button onClick={() => removeProject(project._id)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button></div></div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4"><Metric label="Total Cost" value={project.clientTotal} /><Metric label="Team Cost" value={metrics.developerTotal} /><Metric label="Expected Profit" value={metrics.expectedProfit} tone={metrics.expectedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} /><Metric label="Current Cash" value={metrics.currentCash} tone={metrics.currentCash >= 0 ? 'text-blue-600' : 'text-rose-600'} /></div>
                            <div className="mt-4 space-y-3"><div><div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-gray-500">Client received {money(project.clientReceived)}</span><span className="text-red-600">Client pending {money(metrics.clientDue)}</span></div><div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${clientProgress}%` }} /></div></div><div><div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-gray-500">Team paid {money(metrics.developerPaid)}</span><span className="text-red-600">Team pending {money(metrics.developerDue)}</span></div><div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${developerProgress}%` }} /></div></div></div>
                            <button onClick={() => setExpandedProject(expanded ? null : project._id)} className="mt-4 w-full flex items-center justify-between text-xs font-black text-gray-500 hover:text-primary"><span className="flex items-center gap-2"><Users className="w-4 h-4" /> {project.developers?.length || 0} Team Member(s)</span>{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                            {expanded && <div className="mt-3 space-y-2">{(project.developers || []).map(developer => <div key={developer._id || developer.name} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-slate-800 p-3"><div><p className="text-sm font-bold dark:text-white">{developer.name}</p>{developer.designation && <p className="text-[10px] font-bold text-primary">{developer.designation}</p>}<p className="text-[10px] text-gray-400">Payable {money(developer.totalPayable)}</p></div><div className="text-right"><p className="text-xs font-black text-emerald-600">Paid {money(developer.paidAmount)}</p><p className="text-[10px] text-amber-600">Due {money(Math.max(0, developer.totalPayable - developer.paidAmount))}</p></div></div>)}</div>}
                        </article>;
                    })}
                </div>
                {!filteredProjects.length && <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-10 text-center"><BriefcaseBusiness className="w-8 h-8 mx-auto text-gray-300 mb-2" /><p className="text-sm font-bold text-gray-400">No projects in this view.</p><button onClick={openNewProject} className="mt-3 text-xs font-black text-primary">Create first project</button></div>}
            </section>

            <div className="grid xl:grid-cols-[1fr_300px] gap-5">
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden"><div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3"><h2 className="font-black text-gray-900 dark:text-white">Transaction History</h2><div className="flex gap-2"><select value={filter} onChange={event => setFilter(event.target.value)} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-600 text-xs font-bold"><option value="all">All Records</option><option value="income">Income</option><option value="expense">Expenses</option></select><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-600 text-xs font-bold"><option value="all">All Categories</option>{availableCategories.map(category => <option key={category} value={category}>{category}</option>)}</select></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-slate-800 text-gray-500"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Details</th><th className="p-3 text-left">Category</th><th className="p-3 text-right">Amount</th><th className="p-3" /></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{filteredEntries.map(entry => <tr key={entry._id} className="dark:text-slate-200"><td className="p-3 whitespace-nowrap">{new Date(entry.transactionDate).toLocaleDateString('en-GB')}</td><td className="p-3"><p className="font-bold">{entry.title}</p><p className="text-xs text-gray-400">{entry.description || 'No description'}</p></td><td className="p-3"><span className="inline-flex items-center gap-2"><span>{getCategoryIcon(entry.category)}</span>{entry.category}</span></td><td className={`p-3 text-right font-black ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.type === 'income' ? '+' : '-'} {money(entry.amount)}</td><td className="p-3"><div className="flex justify-end gap-1"><button onClick={() => openEdit(entry)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button><button onClick={() => removeEntry(entry._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table>{!filteredEntries.length && <p className="p-10 text-center text-gray-400">No records match these filters.</p>}</div></div>
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 h-fit"><h2 className="font-black text-gray-900 dark:text-white mb-4">Where Money Was Used</h2><div className="space-y-4">{topCategories.map(([category, amount]) => { const width = summary.totalExpenses ? Math.round(amount / summary.totalExpenses * 100) : 0; return <div key={category}><div className="flex justify-between text-xs mb-1"><span className="font-bold dark:text-slate-200">{getCategoryIcon(category)} {category}</span><span className="text-gray-500">{money(amount)}</span></div><div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${width}%` }} /></div></div>; })}{!topCategories.length && <p className="text-sm text-gray-400">Expense categories will appear here.</p>}</div></div>
            </div>

            {showForm && <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"><form onSubmit={saveEntry} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl"><div className="flex justify-between"><h2 className="text-lg font-black dark:text-white">{editingId ? 'Edit Record' : 'Add Finance Record'}</h2><button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 dark:text-white" /></button></div><div className="grid grid-cols-2 gap-3"><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className={fieldClass}><option value="expense">📤 Expense</option><option value="income">📥 Income</option></select><input required inputMode="numeric" placeholder="Amount" value={form.amount} onChange={event => setForm({ ...form, amount: formatAmountInput(event.target.value) })} className={fieldClass} /></div><input required placeholder="Record title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className={fieldClass} /><div className="grid grid-cols-2 gap-3"><select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className={fieldClass}>{categories.map(category => <option key={category} value={category}>{getCategoryIcon(category)} {category}</option>)}</select><input type="date" required value={form.transactionDate} onChange={event => setForm({ ...form, transactionDate: event.target.value })} className={fieldClass} /></div><select value={form.project} onChange={event => setForm({ ...form, project: event.target.value })} className={fieldClass}><option value="">No project / General record</option>{projects.map(project => <option key={project._id} value={project._id}>📁 {project.name}</option>)}</select>{form.category === 'Other' && <input required placeholder="Custom category name" value={form.customCategory} onChange={event => setForm({ ...form, customCategory: event.target.value })} className={fieldClass} />}<textarea rows="3" placeholder="Description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className={fieldClass} /><button disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-black disabled:opacity-50">{saving ? 'Saving...' : 'Save Record'}</button></form></div>}

            {showProjectForm && <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4"><form onSubmit={saveProject} className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl"><div className="flex justify-between"><div><h2 className="text-lg font-black dark:text-white">{editingProjectId ? 'Edit Project' : 'Create Project'}</h2><p className="text-xs text-gray-400">Track project value, team cost and your expected profit.</p></div><button type="button" onClick={() => setShowProjectForm(false)}><X className="w-5 h-5 dark:text-white" /></button></div><div className="grid md:grid-cols-2 gap-3"><input required placeholder="Project name" value={projectForm.name} onChange={event => setProjectForm({ ...projectForm, name: event.target.value })} className={fieldClass} /><input required placeholder="Client name" value={projectForm.clientName} onChange={event => setProjectForm({ ...projectForm, clientName: event.target.value })} className={fieldClass} /><input required inputMode="numeric" placeholder="Client total amount" value={projectForm.clientTotal} onChange={event => setProjectForm({ ...projectForm, clientTotal: formatAmountInput(event.target.value) })} className={fieldClass} /><input type="date" required value={projectForm.startDate} onChange={event => setProjectForm({ ...projectForm, startDate: event.target.value })} className={fieldClass} /><select value={projectForm.status} onChange={event => setProjectForm({ ...projectForm, status: event.target.value })} className={fieldClass}><option value="processing">Processing</option><option value="completed">Completed</option></select>{projectForm.status === 'completed' && <input type="date" value={projectForm.completionDate} onChange={event => setProjectForm({ ...projectForm, completionDate: event.target.value })} className={fieldClass} />}</div><div className="rounded-2xl border border-gray-100 dark:border-slate-700 p-4"><div className="flex items-center justify-between mb-3"><div><h3 className="font-black dark:text-white">Team Members</h3><p className="text-[10px] text-gray-400">Add one or more team members and their total cost.</p></div><button type="button" onClick={() => setProjectForm(previous => ({ ...previous, developers: [...previous.developers, emptyDeveloper()] }))} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black flex items-center gap-2"><UserRoundPlus className="w-4 h-4" /> Add Team Member</button></div><div className="space-y-2">{projectForm.developers.map((developer, index) => <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2"><input required placeholder="Name" value={developer.name} onChange={event => updateDeveloper(index, 'name', event.target.value)} className={fieldClass} /><input required placeholder="Designation" value={developer.designation} onChange={event => updateDeveloper(index, 'designation', event.target.value)} className={fieldClass} /><input required inputMode="numeric" placeholder="Total payable" value={developer.totalPayable} onChange={event => updateDeveloper(index, 'totalPayable', formatAmountInput(event.target.value))} className={fieldClass} /><button type="button" disabled={projectForm.developers.length === 1} onClick={() => setProjectForm(previous => ({ ...previous, developers: previous.developers.filter((_, developerIndex) => developerIndex !== index) }))} className="p-3 text-rose-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></div>)}</div></div><textarea rows="3" placeholder="Project notes / scope" value={projectForm.description} onChange={event => setProjectForm({ ...projectForm, description: event.target.value })} className={fieldClass} /><button disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-black disabled:opacity-50">{saving ? 'Saving...' : editingProjectId ? 'Update Project' : 'Create Project'}</button></form></div>}
        </div>
    );
};

export default ExpenseManagement;
