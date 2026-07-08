import { useEffect, useMemo, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Landmark, Plus, Pencil, Trash2, X } from 'lucide-react';
import { financeAPI } from '../../services/api';
import Loader from '../../components/ui/Loader';

const categories = ['Office Rent', 'Salaries', 'Utilities', 'Marketing', 'Equipment', 'Internet', 'Maintenance', 'Transport', 'Food', 'Refreshment', 'Pocket Money', 'Guest', 'Clean', 'Course Income', 'IOT Project', 'Website Project', 'App Project', 'Other'];
const categoryIcons = {
    'Office Rent': '🏢',
    Salaries: '👥',
    Utilities: '💡',
    Marketing: '📣',
    Equipment: '💻',
    Internet: '🌐',
    Maintenance: '🛠️',
    Transport: '🚗',
    Food: '🍽️',
    Refreshment: '☕',
    Pocket: '👛',
    Guest: '🤝',
    'Course Income': '🎓',
    Other: '📦'
};
const getCategoryIcon = category => {
    if (category === 'Pocket Money') return '👛';
    if (category === 'Clean') return '🧹';
    if (category === 'IOT Project') return '📡';
    if (category === 'Website Project') return '🌐';
    if (category === 'App Project') return '📱';
    return categoryIcons[category] || '🏷️';
};
const emptyForm = { type: 'expense', title: '', amount: '', category: 'Office Rent', customCategory: '', description: '', transactionDate: new Date().toISOString().slice(0, 10) };
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
    const lastDay = String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0');
    return {
        startDate: `${month}-01`,
        endDate: `${month}-${lastDay}`
    };
};

const ExpenseManagement = () => {
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState({ feeIncome: 0, manualIncome: 0, totalIncome: 0, totalExpenses: 0, balance: 0, categoryTotals: {} });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [filter, setFilter] = useState('all');
    const [periodMode, setPeriodMode] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [startDate, setStartDate] = useState(`${currentMonth}-01`);
    const [endDate, setEndDate] = useState(today);
    const [form, setForm] = useState(emptyForm);

    const loadData = async () => {
        try {
            let params = {};
            if (periodMode === 'month') params = monthRange(selectedMonth);
            if (periodMode === 'custom') params = { startDate, endDate };
            const res = await financeAPI.getAll(params);
            setEntries(res.data.data || []);
            setSummary(res.data.summary || {});
        } catch (error) {
            alert(error.response?.data?.message || 'Finance records load nahi ho sakay.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [periodMode, selectedMonth, startDate, endDate]);

    const filteredEntries = useMemo(() => filter === 'all' ? entries : entries.filter(e => e.type === filter), [entries, filter]);
    const topCategories = useMemo(() => Object.entries(summary.categoryTotals || {}).sort((a, b) => b[1] - a[1]).slice(0, 5), [summary]);

    const openNew = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = entry => {
        setEditingId(entry._id);
        const isStandardCategory = categories.includes(entry.category);
        setForm({ type: entry.type, title: entry.title, amount: formatAmountInput(entry.amount), category: isStandardCategory ? entry.category : 'Other', customCategory: isStandardCategory ? '' : entry.category, description: entry.description || '', transactionDate: new Date(entry.transactionDate).toISOString().slice(0, 10) });
        setShowForm(true);
    };
    const saveEntry = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, category: form.category === 'Other' ? form.customCategory.trim() : form.category, amount: parseAmount(form.amount) };
            delete payload.customCategory;
            if (!payload.category) {
                alert('Custom category name enter karein.');
                setSaving(false);
                return;
            }
            if (editingId) await financeAPI.update(editingId, payload);
            else await financeAPI.create(payload);
            setShowForm(false);
            await loadData();
        } catch (error) {
            alert(error.response?.data?.message || 'Record save nahi ho saka.');
        } finally { setSaving(false); }
    };
    const removeEntry = async id => {
        if (!window.confirm('Is finance record ko delete karna hai?')) return;
        await financeAPI.delete(id);
        loadData();
    };

    if (loading) return <Loader message="Loading finance overview..." />;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Income & Expense</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Track earnings, spending and available balance.</p>
                </div>
                <button onClick={openNew} className="px-4 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Record</button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-end gap-3">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">View Data By</label>
                    <select value={periodMode} onChange={e => setPeriodMode(e.target.value)} className={fieldClass}>
                        <option value="month">Monthly</option>
                        <option value="custom">Custom Date Range</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
                {periodMode === 'month' && <div className="flex-1 max-w-sm">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Select Month</label>
                    <input type="month" value={selectedMonth} max={currentMonth} onChange={e => setSelectedMonth(e.target.value)} className={fieldClass} />
                </div>}
                {periodMode === 'custom' && <>
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Start Date</label>
                        <input type="date" value={startDate} max={endDate || today} onChange={e => setStartDate(e.target.value)} className={fieldClass} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">End Date</label>
                        <input type="date" value={endDate} min={startDate} max={today} onChange={e => setEndDate(e.target.value)} className={fieldClass} />
                    </div>
                </>}
                <div className="lg:ml-auto px-4 py-3 rounded-xl bg-primary/10 text-primary text-xs font-black">
                    {periodMode === 'all' ? 'All Time Data' : periodMode === 'month' ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `${startDate} to ${endDate}`}
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                    { label: 'Total Income', value: summary.totalIncome, icon: TrendingUp, iconClass: 'text-emerald-500' },
                    { label: 'Total Expenses', value: summary.totalExpenses, icon: TrendingDown, iconClass: 'text-rose-500' },
                    { label: 'Available Balance', value: summary.balance, icon: Wallet, iconClass: 'text-blue-500' },
                    { label: 'Verified Fee Income', value: summary.feeIncome, icon: Landmark, iconClass: 'text-amber-500' }
                ].map(card => <div key={card.label} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm"><card.icon className={`w-5 h-5 ${card.iconClass} mb-3`} /><p className="text-[10px] uppercase tracking-wider font-black text-gray-400">{card.label}</p><p className="text-xl font-black text-gray-900 dark:text-white mt-1">{money(card.value)}</p></div>)}
            </div>

            <div className="grid xl:grid-cols-[1fr_300px] gap-5">
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3">
                        <h2 className="font-black text-gray-900 dark:text-white">Transaction History</h2>
                        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-slate-600 text-xs font-bold"><option value="all">All Records</option><option value="income">Income</option><option value="expense">Expenses</option></select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-slate-800 text-gray-500"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Details</th><th className="p-3 text-left">Category</th><th className="p-3 text-right">Amount</th><th className="p-3"></th></tr></thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">{filteredEntries.map(entry => <tr key={entry._id} className="dark:text-slate-200"><td className="p-3 whitespace-nowrap">{new Date(entry.transactionDate).toLocaleDateString('en-GB')}</td><td className="p-3"><p className="font-bold">{entry.title}</p><p className="text-xs text-gray-400">{entry.description || 'No description'}</p></td><td className="p-3"><span className="inline-flex items-center gap-2"><span aria-hidden="true">{getCategoryIcon(entry.category)}</span>{entry.category}</span></td><td className={`p-3 text-right font-black ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.type === 'income' ? '+' : '-'} {money(entry.amount)}</td><td className="p-3"><div className="flex justify-end gap-1"><button onClick={() => openEdit(entry)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4" /></button><button onClick={() => removeEntry(entry._id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody>
                        </table>
                        {!filteredEntries.length && <p className="p-10 text-center text-gray-400">No manual finance records yet.</p>}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 h-fit">
                    <h2 className="font-black text-gray-900 dark:text-white mb-4">Where Money Was Used</h2>
                    <div className="space-y-4">{topCategories.map(([category, amount]) => { const width = summary.totalExpenses ? Math.round(amount / summary.totalExpenses * 100) : 0; return <div key={category}><div className="flex justify-between text-xs mb-1"><span className="font-bold dark:text-slate-200 inline-flex items-center gap-2"><span aria-hidden="true">{getCategoryIcon(category)}</span>{category}</span><span className="text-gray-500">{money(amount)}</span></div><div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${width}%` }} /></div></div>; })}{!topCategories.length && <p className="text-sm text-gray-400">Expense add karne par category summary yahan show hogi.</p>}</div>
                </div>
            </div>

            {showForm && <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"><form onSubmit={saveEntry} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl"><div className="flex justify-between"><h2 className="text-lg font-black dark:text-white">{editingId ? 'Edit Record' : 'Add Finance Record'}</h2><button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 dark:text-white" /></button></div><div className="grid grid-cols-2 gap-3"><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, customCategory: form.category === 'Other' ? form.customCategory : '' })} className={fieldClass}><option value="expense">📤 Expense</option><option value="income">📥 Income</option></select><input type="text" inputMode="numeric" required placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: formatAmountInput(e.target.value) })} className={fieldClass} /></div><input required placeholder="Record title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={fieldClass} /><div className="grid grid-cols-2 gap-3"><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, customCategory: e.target.value === 'Other' ? form.customCategory : '' })} className={fieldClass}>{categories.map(c => <option key={c} value={c}>{getCategoryIcon(c)} {c}</option>)}</select><input type="date" required value={form.transactionDate} onChange={e => setForm({ ...form, transactionDate: e.target.value })} className={fieldClass} /></div>{form.category === 'Other' && <input autoFocus required placeholder="Custom category name type karein..." value={form.customCategory} onChange={e => setForm({ ...form, customCategory: e.target.value })} className={fieldClass} />}<textarea rows="3" placeholder="Description / money kahan use hua" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={fieldClass} /><button disabled={saving} className="w-full py-3 bg-primary text-white rounded-xl font-black disabled:opacity-50">{saving ? 'Saving...' : 'Save Record'}</button></form></div>}
        </div>
    );
};

export default ExpenseManagement;
