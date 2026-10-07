'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Award,
  Search,
  Download,
  Edit2,
  Trash2,
  Calendar,
  Utensils,
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  CreditCard,
  Heart,
  LayoutGrid,
  Table as TableIcon,
  Plus,
} from 'lucide-react';

export interface CustomerRecord {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  vip_tier: 'Regular' | 'Silver VIP' | 'Gold VIP' | 'Platinum VIP' | string;
  total_visits: number;
  lifetime_spent: number;
  loyalty_points: number;
  favorite_dish?: string;
  dietary_notes?: string;
  table_preferences?: string;
  last_visit_at?: string;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = 'smart_table_crm_customers';

export const CustomerCrmView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'spent' | 'visits' | 'points' | 'name'>('spent');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState<boolean>(false);
  const [activeCustomer, setActiveCustomer] = useState<CustomerRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vip_tier: 'Regular',
    favorite_dish: '',
    dietary_notes: '',
    table_preferences: '',
    total_visits: 1,
    lifetime_spent: 0,
    loyalty_points: 0,
  });

  const [visitSpendAmount, setVisitSpendAmount] = useState<string>('2500');
  const [visitDish, setVisitDish] = useState<string>('');

  // Show Toast
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Customers from Backend or LocalStorage fallback (ZERO dummy data!)
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/customers');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setCustomers(data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      } else {
        // Fallback to local storage
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          setCustomers(JSON.parse(saved));
        } else {
          setCustomers([]);
        }
      }
    } catch {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setCustomers(JSON.parse(saved));
      } else {
        setCustomers([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Save changes to localStorage helper
  const syncLocal = (updated: CustomerRecord[]) => {
    setCustomers(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  // 2. Add New Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      vip_tier: formData.vip_tier,
      favorite_dish: formData.favorite_dish.trim() || undefined,
      dietary_notes: formData.dietary_notes.trim() || undefined,
      table_preferences: formData.table_preferences.trim() || undefined,
      total_visits: Number(formData.total_visits) || 1,
      lifetime_spent: Number(formData.lifetime_spent) || 0,
      loyalty_points: Number(formData.loyalty_points) || Math.floor((Number(formData.lifetime_spent) || 0) * 0.1),
    };

    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        const created: CustomerRecord = json.data;
        syncLocal([created, ...customers]);
      } else {
        // Local fallback
        const mockNew: CustomerRecord = {
          ...payload,
          id: `cust_${Date.now()}`,
          created_at: new Date().toISOString(),
          last_visit_at: 'Just now',
        };
        syncLocal([mockNew, ...customers]);
      }
      showToast(`Customer "${formData.name}" registered successfully!`);
      setIsAddModalOpen(false);
      resetForm();
    } catch {
      const mockNew: CustomerRecord = {
        ...payload,
        id: `cust_${Date.now()}`,
        created_at: new Date().toISOString(),
        last_visit_at: 'Just now',
      };
      syncLocal([mockNew, ...customers]);
      showToast(`Customer "${formData.name}" registered successfully!`);
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  // 3. Update Customer
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      vip_tier: formData.vip_tier,
      favorite_dish: formData.favorite_dish.trim() || undefined,
      dietary_notes: formData.dietary_notes.trim() || undefined,
      table_preferences: formData.table_preferences.trim() || undefined,
      total_visits: Number(formData.total_visits),
      lifetime_spent: Number(formData.lifetime_spent),
      loyalty_points: Number(formData.loyalty_points),
    };

    try {
      await fetch(`/api/v1/customers/${activeCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}

    const updated = customers.map((c) => (c.id === activeCustomer.id ? { ...c, ...payload } : c));
    syncLocal(updated);
    showToast(`Updated profile for "${formData.name}"`);
    setIsEditModalOpen(false);
    setActiveCustomer(null);
  };

  // 4. Delete Customer
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove customer "${name}" from CRM?`)) return;

    try {
      await fetch(`/api/v1/customers/${id}`, { method: 'DELETE' });
    } catch {}

    const updated = customers.filter((c) => c.id !== id);
    syncLocal(updated);
    showToast(`Removed "${name}" from CRM records.`);
  };

  // 5. Record Visit & Bill Spend
  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const spend = parseFloat(visitSpendAmount) || 0;
    const dish = visitDish.trim();

    try {
      await fetch(`/api/v1/customers/${activeCustomer.id}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spend_amount: spend, favorite_dish: dish || undefined }),
      });
    } catch {}

    const updated = customers.map((c) => {
      if (c.id === activeCustomer.id) {
        const newVisits = c.total_visits + 1;
        const newSpent = c.lifetime_spent + spend;
        const newPoints = c.loyalty_points + Math.floor(spend * 0.1);
        let newTier = c.vip_tier;
        if (newSpent >= 50000 || newVisits >= 20) newTier = 'Platinum VIP';
        else if (newSpent >= 25000 || newVisits >= 10) newTier = 'Gold VIP';
        else if (newSpent >= 10000 || newVisits >= 5) newTier = 'Silver VIP';

        return {
          ...c,
          total_visits: newVisits,
          lifetime_spent: newSpent,
          loyalty_points: newPoints,
          vip_tier: newTier,
          favorite_dish: dish || c.favorite_dish,
          last_visit_at: 'Today',
        };
      }
      return c;
    });

    syncLocal(updated);
    showToast(`Recorded visit of Rs. ${spend.toLocaleString()} for ${activeCustomer.name}!`);
    setIsVisitModalOpen(false);
    setActiveCustomer(null);
    setVisitSpendAmount('2500');
    setVisitDish('');
  };

  // Open Edit Modal
  const openEditModal = (cust: CustomerRecord) => {
    setActiveCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone || '',
      email: cust.email || '',
      vip_tier: cust.vip_tier,
      favorite_dish: cust.favorite_dish || '',
      dietary_notes: cust.dietary_notes || '',
      table_preferences: cust.table_preferences || '',
      total_visits: cust.total_visits,
      lifetime_spent: cust.lifetime_spent,
      loyalty_points: cust.loyalty_points,
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      vip_tier: 'Regular',
      favorite_dish: '',
      dietary_notes: '',
      table_preferences: '',
      total_visits: 1,
      lifetime_spent: 0,
      loyalty_points: 0,
    });
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (customers.length === 0) {
      showToast('No customer records to export', 'error');
      return;
    }
    const headers = ['ID', 'Name', 'Phone', 'Email', 'VIP Tier', 'Visits', 'Lifetime Spent (PKR)', 'Loyalty Points', 'Favorite Dish', 'Preferences'];
    const rows = customers.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.vip_tier}"`,
      c.total_visits,
      c.lifetime_spent,
      c.loyalty_points,
      `"${c.favorite_dish || ''}"`,
      `"${c.table_preferences || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atif_abdullah_customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Customer CRM directory exported to CSV!');
  };

  // Filter & Sort Logic
  const filteredCustomers = customers
    .filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchTier = selectedTier === 'All' || c.vip_tier === selectedTier;
      return matchSearch && matchTier;
    })
    .sort((a, b) => {
      if (sortBy === 'spent') return (b.lifetime_spent || 0) - (a.lifetime_spent || 0);
      if (sortBy === 'visits') return (b.total_visits || 0) - (a.total_visits || 0);
      if (sortBy === 'points') return (b.loyalty_points || 0) - (a.loyalty_points || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  // Calculate Metrics
  const totalGuests = customers.length;
  const vipCount = customers.filter((c) => c.vip_tier !== 'Regular').length;
  const totalPoints = customers.reduce((acc, c) => acc + (c.loyalty_points || 0), 0);
  const totalRevenue = customers.reduce((acc, c) => acc + Number(c.lifetime_spent || 0), 0);

  // VIP Badge Color Helper
  const getVipBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'Platinum VIP':
        return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
      case 'Gold VIP':
        return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      case 'Silver VIP':
        return 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-slideUp ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100'
              : 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950 dark:border-rose-700 dark:text-rose-100'
          }`}
        >
          {toastMessage.type === 'success' ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. TOP HEADER & BRANDING */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Customer CRM & Loyalty Engine
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                  Atif & Abdullah Foods
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track guest profiles, dining history, VIP tiers, and dietary preferences
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCustomers}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition-all shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Guests</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{totalGuests}</span>
            <span className="text-[10px] text-slate-500">Registered diners</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">VIP Diners</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 block">{vipCount}</span>
            <span className="text-[10px] text-slate-500">Silver, Gold & Platinum</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Loyalty Points</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
              {totalPoints.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">Active rewards balance</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Lifetime Spend</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              Rs. {totalRevenue.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">Total customer revenue</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. SEARCH, FILTERS & VIEW TOGGLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* VIP Tier Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1 gap-1 text-[11px]">
            {['All', 'Regular', 'Silver VIP', 'Gold VIP', 'Platinum VIP'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedTier === tier
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="spent">Sort: Highest Spent</option>
            <option value="visits">Sort: Most Visits</option>
            <option value="points">Sort: Most Points</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'
              }`}
              title="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. CUSTOMER CONTENT (GRID / TABLE OR CLEAN EMPTY STATE) */}
      {filteredCustomers.length === 0 ? (
        /* ELEGANT EMPTY STATE (ZERO DUMMY DATA) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="h-16 w-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
            <Users className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {searchQuery || selectedTier !== 'All' ? 'No Matching Customers Found' : 'No Customers in CRM Yet'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery || selectedTier !== 'All'
                ? 'Try clearing your search query or adjusting the VIP tier filter.'
                : 'All dummy records have been cleared. Add your first loyal guest or let customers register directly from dining tables.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-600/20 inline-flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Register First Customer</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const initials = cust.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={cust.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {cust.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {cust.phone || cust.email || 'Walk-in guest'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-sm ${getVipBadgeStyle(
                        cust.vip_tier
                      )}`}
                    >
                      {cust.vip_tier}
                    </span>
                  </div>

                  {/* Dining Stats */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-2.5 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Visits</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {cust.total_visits} Dinings
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Spend</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        Rs. {Number(cust.lifetime_spent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Points</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {cust.loyalty_points || 0} pts
                      </span>
                    </div>
                  </div>

                  {/* Favorite Dish & Preferences */}
                  <div className="space-y-1 text-xs">
                    {cust.favorite_dish && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Utensils className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">Fav: {cust.favorite_dish}</span>
                      </div>
                    )}
                    {cust.table_preferences && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        <Heart className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="truncate">{cust.table_preferences}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setActiveCustomer(cust);
                      setIsVisitModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Log Visit
                  </button>

                  <button
                    onClick={() => openEditModal(cust)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                    title="Edit Customer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-all"
                    title="Delete Customer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DETAILED TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">VIP Tier</th>
                  <th className="py-3 px-4">Visits</th>
                  <th className="py-3 px-4">Lifetime Spend</th>
                  <th className="py-3 px-4">Loyalty Points</th>
                  <th className="py-3 px-4">Preferences</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{cust.name}</div>
                      <div className="text-[11px] text-slate-400">{cust.phone || cust.email || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getVipBadgeStyle(cust.vip_tier)}`}>
                        {cust.vip_tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{cust.total_visits} Dinings</td>
                    <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">
                      Rs. {Number(cust.lifetime_spent || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">{cust.loyalty_points || 0} pts</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                      {cust.table_preferences || cust.favorite_dish || 'Standard'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveCustomer(cust);
                            setIsVisitModalOpen(true);
                          }}
                          className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold"
                        >
                          + Visit
                        </button>
                        <button
                          onClick={() => openEditModal(cust)}
                          className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ADD CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Register New Customer</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +92 300 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. tariq@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">VIP Tier</label>
                  <select
                    value={formData.vip_tier}
                    onChange={(e) => setFormData({ ...formData, vip_tier: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Silver VIP">Silver VIP</option>
                    <option value="Gold VIP">Gold VIP</option>
                    <option value="Platinum VIP">Platinum VIP</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Favorite Dish</label>
                  <input
                    type="text"
                    placeholder="e.g. Mutton Shinwari Karahi"
                    value={formData.favorite_dish}
                    onChange={(e) => setFormData({ ...formData, favorite_dish: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial Dinings / Visits</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.total_visits}
                    onChange={(e) => setFormData({ ...formData, total_visits: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Initial Spent (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lifetime_spent}
                    onChange={(e) => setFormData({ ...formData, lifetime_spent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Table Preferences & Dietary Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Prefers Window Seat, Less Spicy, Halal"
                  value={formData.table_preferences}
                  onChange={(e) => setFormData({ ...formData, table_preferences: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-md shadow-blue-600/20"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT CUSTOMER MODAL */}
      {isEditModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Customer Profile</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">VIP Tier</label>
                  <select
                    value={formData.vip_tier}
                    onChange={(e) => setFormData({ ...formData, vip_tier: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Silver VIP">Silver VIP</option>
                    <option value="Gold VIP">Gold VIP</option>
                    <option value="Platinum VIP">Platinum VIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Visits</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.total_visits}
                    onChange={(e) => setFormData({ ...formData, total_visits: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Lifetime Spent (PKR)</label>
                  <input
                    type="number"
                    value={formData.lifetime_spent}
                    onChange={(e) => setFormData({ ...formData, lifetime_spent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Table Preferences</label>
                <input
                  type="text"
                  value={formData.table_preferences}
                  onChange={(e) => setFormData({ ...formData, table_preferences: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. LOG DINING VISIT MODAL */}
      {isVisitModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Record Dining Visit</h3>
              </div>
              <button onClick={() => setIsVisitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Add a completed meal for <strong className="text-slate-900 dark:text-white">{activeCustomer.name}</strong> to update visits, spend, and loyalty points.
            </p>

            <form onSubmit={handleRecordVisit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Order Spend Amount (PKR)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 3500"
                  value={visitSpendAmount}
                  onChange={(e) => setVisitSpendAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-600 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Dish Ordered (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Special Chicken Karahi & Garlic Naan"
                  value={visitDish}
                  onChange={(e) => setVisitDish(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                ⭐ Adds <strong>{Math.floor((parseFloat(visitSpendAmount) || 0) * 0.1)} loyalty points</strong> to guest balance.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md"
                >
                  Record Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
