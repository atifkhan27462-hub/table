'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/ui';
import { ImageUploader } from '@/components/ImageUploader';
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  ChefHat,
  Table as TableIcon,
  Layers,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Flame,
  Check,
  X,
  Bell,
  Sparkles,
  Image as ImageIcon,
  ShoppingCart,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import {
  getAdminOrders,
  updateOrderStatus,
  deleteAdminOrder,
  getAdminTables,
  getAdminProducts,
  getAdminCategories,
  createAdminCategory,
  deleteAdminCategory,
  createAdminProduct,
  deleteAdminProduct,
  clearAllAdminOrders,
  clearAllAdminProducts,
  clearAllAdminCategories,
  resetAllTableStatuses,
  createAdminTable,
  deleteAdminTable,
  resetSystemData,
  createAdminManualOrder,
} from '@/lib/api';
import { adminSocket } from '@/lib/socket';

export default function AdminDashboardPage() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Loading & feedback
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isWsLive, setIsWsLive] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals: Delete Order
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Modals: Add New Dish
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdPrice, setNewProdPrice] = useState<string>('24.00');
  const [newProdCategoryId, setNewProdCategoryId] = useState<string>('');
  const [newProdStation, setNewProdStation] = useState<string>('GRILL');
  const [newProdDesc, setNewProdDesc] = useState<string>('');
  const [newProdImage, setNewProdImage] = useState<string>('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState<boolean>(false);

  // Modals: Add New Food Category
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [newCatIcon, setNewCatIcon] = useState<string>('🍽️');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState<boolean>(false);

  // Modals: Add Dining Table
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState<boolean>(false);
  const [newTableNum, setNewTableNum] = useState<string>('');
  const [newTableCap, setNewTableCap] = useState<number>(4);
  const [newTableSection, setNewTableSection] = useState<string>('Main Dining Room');
  const [isSubmittingTable, setIsSubmittingTable] = useState<boolean>(false);

  // Modals: Manual Order (POS)
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState<boolean>(false);
  const [manualTableId, setManualTableId] = useState<string>('');
  const [manualProductId, setManualProductId] = useState<string>('');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualNotes, setManualNotes] = useState<string>('');
  const [isCustomItem, setIsCustomItem] = useState<boolean>(false);
  const [customDishName, setCustomDishName] = useState<string>('');
  const [customDishPrice, setCustomDishPrice] = useState<string>('15.00');
  const [customDishStation, setCustomDishStation] = useState<string>('GRILL');
  const [isSubmittingManualOrder, setIsSubmittingManualOrder] = useState<boolean>(false);

  // Modals: Delete Whole Data / Reset
  const [isResetDataModalOpen, setIsResetDataModalOpen] = useState<boolean>(false);
  const [resetScope, setResetScope] = useState<'ALL' | 'ORDERS' | 'MENU' | 'CATEGORIES'>('ALL');
  const [isSubmittingReset, setIsSubmittingReset] = useState<boolean>(false);

  // Load all primary data
  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [ordData, tblData, prodData, catData] = await Promise.all([
        getAdminOrders(),
        getAdminTables(),
        getAdminProducts(),
        getAdminCategories(),
      ]);
      setOrders(ordData || []);
      setTables(tblData || []);
      setProducts(prodData || []);
      setCategories(catData || []);
    } catch (err) {
      console.warn('Error loading dashboard data:', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup WebSocket
    adminSocket.init();
    if (adminSocket.isConnected) setIsWsLive(true);

    const unsubAck = adminSocket.subscribe('ACK', () => setIsWsLive(true));
    const unsubOrderEvents = adminSocket.subscribe('*', (evt) => {
      const data = evt.data;
      if (!data) return;

      if (evt.type === 'ORDER_CREATED') {
        setNotification(`🔔 New Order #${data.order_number || ''} placed from ${data.table_number || 'Table'}!`);
        setTimeout(() => setNotification(null), 6000);
        loadData();
      } else if (evt.type === 'ORDER_CANCELLED' || data.deleted) {
        if (data.order_id) {
          setOrders((prev) => prev.filter((o) => o.id !== data.order_id));
        }
      } else if (evt.type === 'STAFF_ASSISTANCE_REQUESTED') {
        playAdminChime();
        setNotification(`🛎️ FLOOR SERVICE CALL: ${data.table_number || 'Table'} requested "${data.call_type || 'Server Call'}"!`);
        setTimeout(() => setNotification(null), 10000);
      } else if (['ORDER_PREPARING', 'ORDER_READY', 'ORDER_SERVED', 'ORDER_COMPLETED'].includes(evt.type)) {
        const orderId = data.order_id;
        const newStatus = data.status || evt.type.replace('ORDER_', '');
        if (orderId) {
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
          );
        }
      }
    });

    const pollInterval = setInterval(loadData, 15000);

    return () => {
      unsubAck();
      unsubOrderEvents();
      clearInterval(pollInterval);
    };
  }, []);

  const playAdminChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Update order status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      await updateOrderStatus(orderId, newStatus);
      setNotification(`Order status updated to ${newStatus}`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  // Delete order
  const handleDeleteOrder = async (order: any) => {
    try {
      setDeletingOrderId(order.id);
      await deleteAdminOrder(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      setOrderToDelete(null);
      setNotification(`Order #${order.order_number || order.id} deleted.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Delete order failed:', err);
      alert('Could not delete order.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Create new dish with image
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    try {
      setIsSubmittingProduct(true);
      await createAdminProduct({
        name: newProdName.trim(),
        base_price: parseFloat(newProdPrice) || 20.0,
        category_id: newProdCategoryId || (categories[0]?.id || 'cat-1'),
        prep_station_code: newProdStation,
        description: newProdDesc.trim(),
        image_url: newProdImage || undefined,
        is_active: true,
      });
      setNewProdName('');
      setNewProdDesc('');
      setNewProdImage('');
      setIsNewProductModalOpen(false);
      setNotification('✨ New dish added to menu with photo!');
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err) {
      console.error('Failed to create product:', err);
      alert('Failed to add new dish.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Delete dish
  const handleDeleteProduct = async (prodId: string, prodName: string) => {
    if (!confirm(`Are you sure you want to remove "${prodName}" from the menu?`)) return;
    try {
      await deleteAdminProduct(prodId);
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
      setNotification(`"${prodName}" removed from menu.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Could not delete dish.');
    }
  };

  // Create new category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setIsSubmittingCategory(true);
      await createAdminCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        icon: newCatIcon || '🍽️',
        sort_order: categories.length + 1,
      });
      setNewCatName('');
      setNewCatDesc('');
      setIsNewCategoryModalOpen(false);
      setNotification('✨ New food category created!');
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err) {
      console.error('Failed to create category:', err);
      alert('Failed to add category.');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    try {
      await deleteAdminCategory(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      setNotification(`Category "${catName}" deleted.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert('Could not delete category.');
    }
  };

  // Free all tables (set status to AVAILABLE)
  const handleFreeAllTables = async () => {
    try {
      await resetAllTableStatuses();
      setTables((prev) => prev.map((t) => ({ ...t, status: 'AVAILABLE' })));
      setNotification('✅ All dining tables marked as AVAILABLE.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to reset tables:', err);
      alert('Failed to reset table statuses.');
    }
  };

  // Toggle single table status
  const handleToggleTableStatus = async (tableId: string, currentStatus: string) => {
    const newStatus = currentStatus.toUpperCase() === 'OCCUPIED' ? 'AVAILABLE' : 'OCCUPIED';
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t)));
    try {
      await fetch(`http://127.0.0.1:8080/api/v1/tables/${tableId}/status?status=${newStatus}`, { method: 'PATCH' });
      setNotification(`Table status changed to ${newStatus}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      loadData();
    }
  };

  // Create new table
  const handleCreateNewTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum.trim()) return;
    try {
      setIsSubmittingTable(true);
      await createAdminTable({
        table_number: newTableNum.trim(),
        capacity: newTableCap || 4,
        section: newTableSection || 'Main Dining Room',
        name: `${newTableNum.trim()} (${newTableSection || 'Main Dining Room'})`,
      });
      setNewTableNum('');
      setIsNewTableModalOpen(false);
      setNotification(`✨ ${newTableNum} added to dining floor!`);
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err: any) {
      console.error('Failed to create table:', err);
      alert(err.message || 'Could not add table.');
    } finally {
      setIsSubmittingTable(false);
    }
  };

  // Delete table
  const handleDeleteTable = async (tableId: string, tableNumber: string) => {
    if (!confirm(`Are you sure you want to remove ${tableNumber}?`)) return;
    try {
      await deleteAdminTable(tableId);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      setNotification(`Table ${tableNumber} removed.`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Could not remove table.');
    }
  };

  // Manual POS Order Placement
  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTableId = manualTableId || tables[0]?.id;
    if (!targetTableId) {
      alert('Please select or add a dining table first.');
      return;
    }

    try {
      setIsSubmittingManualOrder(true);
      let prodId = manualProductId;

      // Custom dish or no existing products:
      if (isCustomItem || !prodId || products.length === 0) {
        if (!customDishName.trim()) {
          alert('Please enter a dish name.');
          return;
        }
        const createdProd = await createAdminProduct({
          name: customDishName.trim(),
          base_price: parseFloat(customDishPrice) || 15.0,
          category_id: categories[0]?.id || 'cat-1',
          prep_station_code: customDishStation || 'GRILL',
          description: 'Custom walk-in order item.',
          is_active: true,
        });
        prodId = createdProd.id;
      }

      await createAdminManualOrder({
        table_id: targetTableId,
        items: [
          {
            product_id: prodId,
            quantity: Math.max(1, manualQuantity),
            notes: manualNotes.trim() || 'Manual Admin POS Order',
          },
        ],
        special_instructions: manualNotes.trim() || undefined,
        tip_amount: 0,
      });

      // Update table to OCCUPIED locally
      setTables((prev) =>
        prev.map((t) => (t.id === targetTableId ? { ...t, status: 'OCCUPIED' } : t))
      );

      playAdminChime();
      setIsManualOrderModalOpen(false);
      setManualNotes('');
      setCustomDishName('');
      setIsCustomItem(false);
      setNotification('🎉 Order placed manually! Sent to kitchen queue & revenue updated.');
      setTimeout(() => setNotification(null), 5000);
      loadData();
    } catch (err: any) {
      console.error('Manual order failed:', err);
      alert(err.message || 'Failed to place manual order.');
    } finally {
      setIsSubmittingManualOrder(false);
    }
  };

  // Execute Data Reset / Wipe
  const handleExecuteReset = async () => {
    try {
      setIsSubmittingReset(true);
      if (resetScope === 'ALL') {
        await resetSystemData({
          clear_orders: true,
          clear_products: true,
          clear_categories: true,
          reset_tables: true,
        });
        setOrders([]);
        setProducts([]);
        setCategories([]);
        setTables((prev) => prev.map((t) => ({ ...t, status: 'AVAILABLE' })));
        setNotification('🧹 Entire restaurant data wiped! System is completely fresh and clean.');
      } else if (resetScope === 'ORDERS') {
        await clearAllAdminOrders();
        setOrders([]);
        setTables((prev) => prev.map((t) => ({ ...t, status: 'AVAILABLE' })));
        setNotification('🧹 All orders cleared! Today\'s revenue reset to $0.00 and all tables freed.');
      } else if (resetScope === 'MENU') {
        await clearAllAdminProducts();
        setProducts([]);
        setNotification('🧹 All menu dishes deleted from catalog.');
      } else if (resetScope === 'CATEGORIES') {
        await clearAllAdminCategories();
        setCategories([]);
        setProducts([]);
        setNotification('🧹 All food categories and associated dishes deleted.');
      }
      setIsResetDataModalOpen(false);
      setTimeout(() => setNotification(null), 5000);
      loadData();
    } catch (err: any) {
      console.error('Reset failed:', err);
      alert(err.message || 'Failed to execute reset.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Calculations
  const totalRevenue = orders.reduce((sum, ord) => sum + (Number(ord.total_amount) || 0), 0);
  const activeOrdersCount = orders.filter((o) => !['COMPLETED', 'SERVED', 'CANCELLED'].includes((o.status || '').toUpperCase())).length;
  const occupiedTablesCount = tables.filter((t) => (t.status || '').toUpperCase() === 'OCCUPIED').length;

  // Filtered orders
  const filteredOrders = orders.filter((ord) => {
    const matchesFilter =
      orderStatusFilter === 'ALL' ||
      (ord.status || '').toUpperCase() === orderStatusFilter.toUpperCase();

    const matchesSearch =
      searchQuery === '' ||
      (ord.order_number || ord.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.table_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.items || []).some((it: any) => (it.product_name || it.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  // Filtered products
  const filteredProducts = products.filter((prod) => {
    const matchesCat =
      categoryFilter === 'ALL' || prod.category_id === categoryFilter;
    const matchesSearch =
      searchQuery === '' ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex h-screen w-full bg-[#FAF8F5] text-stone-800 font-sans select-none overflow-hidden antialiased">
      {/* ======================================================== */}
      {/* SIDEBAR NAVIGATION WITH FOOD CATEGORIES */}
      {/* ======================================================== */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setSearchQuery('');
        }}
        ordersCount={activeOrdersCount}
        tablesCount={tables.length}
      />

      {/* ======================================================== */}
      {/* MAIN WORKSPACE */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Real-time Notification Banner */}
        {notification && (
          <div
            className={`px-8 py-3 flex items-center justify-between text-xs font-black shadow-md z-50 animate-fadeIn ${
              notification.includes('FLOOR SERVICE CALL')
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-b border-orange-600'
                : 'bg-emerald-50 text-emerald-950 border-b border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles
                className={`h-4 w-4 ${
                  notification.includes('FLOOR SERVICE CALL')
                    ? 'text-amber-200 animate-bounce'
                    : 'text-emerald-600 animate-spin'
                }`}
              />
              <span className="text-sm font-black tracking-wide">{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className={
                notification.includes('FLOOR SERVICE CALL')
                  ? 'text-white font-extrabold px-3 py-1 bg-black/25 hover:bg-black/40 rounded-xl text-xs transition-colors'
                  : 'text-stone-400 hover:text-stone-700'
              }
            >
              {notification.includes('FLOOR SERVICE CALL') ? 'Acknowledge' : <X className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Top Header */}
        <header className="h-20 px-8 bg-white/95 backdrop-blur-md border-b border-stone-200/80 flex items-center justify-between shrink-0 shadow-xs z-30">
          <div>
            <h1 className="text-base font-black tracking-tight text-stone-900 flex items-center gap-2">
              {currentTab === 'dashboard' && 'Command Center'}
              {currentTab === 'orders' && 'Live Orders Queue'}
              {currentTab === 'tables' && 'Dining Floor & Table Kiosks'}
              {currentTab === 'categories' && 'Food Categories'}
              {currentTab === 'products' && 'Menu & Dish Catalog'}
              {currentTab === 'kitchen' && 'Kitchen Display System (KDS)'}
              <span className="text-[11px] px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 shadow-xs bg-emerald-50 text-emerald-800 border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                {isWsLive ? '⚡ LIVE BACKEND' : 'AUTO-POLL 8080'}
              </span>
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Atif &amp; Abdullah Foods • Smart Restaurant POS Management
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3001/?table=1"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs rounded-xl border border-stone-200 flex items-center gap-1.5 shadow-xs transition-all"
              title="Launch Customer Smart Table"
            >
              <ExternalLink className="h-3.5 w-3.5 text-amber-600" />
              <span>Table 01 (3001)</span>
            </a>

            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs rounded-xl border border-stone-200 flex items-center gap-1.5 shadow-xs transition-all"
              title="Launch Kitchen Display System"
            >
              <ExternalLink className="h-3.5 w-3.5 text-orange-600" />
              <span>Kitchen (3002)</span>
            </a>

            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* MAIN BODY PER TAB */}
        {/* ======================================================== */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#FAF8F5]">
          {/* -------------------------------------------------------- */}
          {/* TAB 1: COMMAND CENTER */}
          {/* -------------------------------------------------------- */}
          {currentTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              {/* 4 Hero KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-sm space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-stone-500">
                    <span className="text-xs font-black uppercase tracking-wider">Today&apos;s Revenue</span>
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-stone-900">
                    ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-medium">
                    {orders.length > 0 ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> Live sales from {orders.length} order{orders.length === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="text-stone-400 font-medium">No sales recorded yet ($0.00)</span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-sm space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-stone-500">
                    <span className="text-xs font-black uppercase tracking-wider">Active Orders</span>
                    <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                      <Receipt className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-stone-900">
                    {activeOrdersCount}
                  </div>
                  <p className="text-xs text-stone-500 font-medium">
                    {orders.length} total order{orders.length === 1 ? '' : 's'} recorded today
                  </p>
                </div>

                <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-sm space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-stone-500">
                    <span className="text-xs font-black uppercase tracking-wider">Occupied Tables</span>
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                      <TableIcon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-stone-900">
                    {occupiedTablesCount} / {tables.length}
                  </div>
                  <div className="text-xs text-stone-500 font-medium flex items-center justify-between">
                    <span>{Math.max(0, tables.length - occupiedTablesCount)} tables ready for guests</span>
                    {occupiedTablesCount > 0 && (
                      <button
                        onClick={handleFreeAllTables}
                        className="text-[10px] font-black text-amber-700 hover:text-amber-900 underline cursor-pointer"
                        title="Free all tables to AVAILABLE"
                      >
                        Free all
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-sm space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between text-stone-500">
                    <span className="text-xs font-black uppercase tracking-wider">Menu Dishes</span>
                    <div className="h-10 w-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200">
                      <UtensilsCrossed className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-stone-900">
                    {products.length} Items
                  </div>
                  <p className="text-xs text-stone-500 font-medium">
                    Across {categories.length} Food Categories
                  </p>
                </div>
              </div>

              {/* Quick Action Bar */}
              <div className="flex items-center gap-2.5 bg-white p-4 rounded-3xl border border-stone-200/80 shadow-xs flex-wrap">
                <span className="text-xs font-black text-stone-500 uppercase tracking-wider px-2">
                  Quick Actions:
                </span>
                <button
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Dish (Photo)
                </button>
                <button
                  onClick={() => setIsNewCategoryModalOpen(true)}
                  className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Layers className="h-4 w-4 text-amber-600" /> Add Category
                </button>
                <button
                  onClick={() => {
                    setManualTableId(tables[0]?.id || '');
                    setManualProductId(products[0]?.id || '');
                    setIsManualOrderModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <ShoppingCart className="h-4 w-4 text-emerald-600" /> + Manual Order (POS)
                </button>
                <button
                  onClick={() => {
                    setNewTableNum(`Table ${String(tables.length + 1).padStart(2, '0')}`);
                    setIsNewTableModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <TableIcon className="h-4 w-4 text-blue-600" /> + Add Table
                </button>
                <button
                  onClick={() => setCurrentTab('orders')}
                  className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Manage Live Orders ({orders.length})
                </button>
                <button
                  onClick={() => setCurrentTab('tables')}
                  className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  View Tables ({tables.length})
                </button>
                <button
                  onClick={() => {
                    setResetScope('ALL');
                    setIsResetDataModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer ml-auto transition-all shadow-xs"
                  title="Wipe or clear restaurant data"
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                  <span>Delete / Reset Data</span>
                </button>
              </div>

              {/* Recent Orders Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-stone-900">Live Active Orders Snapshot</h3>
                    <p className="text-xs text-stone-500">Orders currently in progress from dining tables</p>
                  </div>
                  <button
                    onClick={() => setCurrentTab('orders')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                  >
                    View All Orders <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center text-xs text-stone-500">
                    No orders recorded yet today.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.slice(0, 6).map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white border border-stone-200/80 rounded-3xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                          <div>
                            <span className="text-base font-black text-stone-900 block">
                              Order #{ord.order_number || ord.id}
                            </span>
                            <span className="text-xs text-stone-500">
                              {ord.table_id || 'Table 01'} • {new Date(ord.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className={`px-3 py-1 rounded-full font-black text-xs border ${
                            ord.status === 'READY'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : ord.status === 'PREPARING'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : ord.status === 'COMPLETED'
                              ? 'bg-stone-100 text-stone-700 border-stone-300'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {ord.status}
                          </span>
                        </div>

                        {/* Items */}
                        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1 text-xs">
                          {(ord.items || []).slice(0, 3).map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between font-bold text-stone-800">
                              <span>{it.quantity}x {it.product_name || it.name}</span>
                              <span className="text-emerald-700">${Number(it.subtotal || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Action row */}
                        <div className="flex items-center gap-2 pt-1">
                          {ord.status === 'PENDING' && (
                            <button
                              onClick={() => handleUpdateStatus(ord.id, 'PREPARING')}
                              className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs"
                            >
                              Start Prep
                            </button>
                          )}
                          {ord.status === 'PREPARING' && (
                            <button
                              onClick={() => handleUpdateStatus(ord.id, 'READY')}
                              className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs"
                            >
                              Mark Ready
                            </button>
                          )}
                          {ord.status === 'READY' && (
                            <button
                              onClick={() => handleUpdateStatus(ord.id, 'COMPLETED')}
                              className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-xs"
                            >
                              Mark Served
                            </button>
                          )}
                          <button
                            onClick={() => setOrderToDelete(ord)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-stone-200"
                            title="Delete order"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 2: LIVE ORDERS QUEUE */}
          {/* -------------------------------------------------------- */}
          {currentTab === 'orders' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/70">
                  {['ALL', 'PENDING', 'PREPARING', 'READY', 'COMPLETED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        orderStatusFilter === st
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search order # or table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-stone-200/80 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                  />
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-stone-200/80 space-y-3 shadow-xs">
                  <Clock className="h-12 w-12 text-stone-300 mx-auto" />
                  <h3 className="text-lg font-bold text-stone-900">No orders match filter</h3>
                  <p className="text-xs text-stone-500">Orders placed by guests will appear here in real time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => {
                    const statuses = ['PENDING', 'PREPARING', 'READY', 'SERVED'];
                    const currentIdx = statuses.indexOf((ord.status || 'PENDING').toUpperCase());

                    return (
                      <div
                        key={ord.id}
                        className="bg-white border border-stone-200/80 rounded-3xl p-6 space-y-5 shadow-sm hover:border-stone-300 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-black text-stone-900">Order #{ord.order_number || ord.id}</h3>
                              <span className="px-3 py-1 bg-amber-50 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-200">
                                {ord.table_id || 'Table 01'}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-1">
                              Placed at {new Date(ord.placed_at).toLocaleTimeString()} • Total: ${Number(ord.total_amount || 0).toFixed(2)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className={`px-4 py-1.5 rounded-full font-black text-xs border ${
                              ord.status === 'READY'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : ord.status === 'PREPARING'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : ord.status === 'COMPLETED'
                                ? 'bg-stone-100 text-stone-700 border-stone-300'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              STATUS: {ord.status}
                            </span>

                            {ord.status === 'PENDING' && (
                              <button
                                onClick={() => handleUpdateStatus(ord.id, 'PREPARING')}
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs"
                              >
                                Accept &amp; Prep
                              </button>
                            )}
                            {ord.status === 'PREPARING' && (
                              <button
                                onClick={() => handleUpdateStatus(ord.id, 'READY')}
                                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs"
                              >
                                Mark Ready
                              </button>
                            )}
                            {ord.status === 'READY' && (
                              <button
                                onClick={() => handleUpdateStatus(ord.id, 'COMPLETED')}
                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-xs"
                              >
                                Mark Served
                              </button>
                            )}

                            <button
                              onClick={() => setOrderToDelete(ord)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                              title="Delete Order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar Timeline */}
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          {statuses.map((step, idx) => {
                            const isDone = currentIdx >= idx;
                            return (
                              <div key={step} className="space-y-1.5">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${
                                    isDone ? 'bg-emerald-500 shadow-2xs' : 'bg-stone-200'
                                  }`}
                                />
                                <span className={`font-bold ${isDone ? 'text-emerald-700' : 'text-stone-400'}`}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Ordered Dishes Box */}
                        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
                          <span className="font-extrabold text-stone-500 uppercase text-[10px]">Ordered Dishes</span>
                          {(ord.items || []).map((it: any, i: number) => (
                            <div key={i} className="flex justify-between font-medium text-stone-900">
                              <span>{it.quantity}x {it.product_name || it.name} ({it.notes || 'Standard'})</span>
                              <span className="text-emerald-700 font-bold">${Number(it.subtotal || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 3: DINING FLOOR & TABLE KIOSKS */}
          {/* -------------------------------------------------------- */}
          {currentTab === 'tables' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-stone-900">Restaurant Floor Map ({tables.length} Tables)</h3>
                  <p className="text-xs text-stone-500">Live seating states with instant 1-click customer kiosk launchers</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-stone-100 font-extrabold px-3 py-2 rounded-xl border border-stone-200">
                    {occupiedTablesCount} Occupied / {tables.length} Total
                  </span>
                  <button
                    onClick={() => {
                      setNewTableNum(`Table ${String(tables.length + 1).padStart(2, '0')}`);
                      setIsNewTableModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Table
                  </button>
                  <button
                    onClick={handleFreeAllTables}
                    className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Reset all tables to AVAILABLE"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-amber-600" /> Free All Tables
                  </button>
                </div>
              </div>

              {tables.length === 0 ? (
                <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center text-xs text-stone-500 space-y-3">
                  <p>No dining tables configured yet.</p>
                  <button
                    onClick={() => {
                      setNewTableNum('Table 01');
                      setIsNewTableModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl"
                  >
                    + Add First Table
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                  {tables.map((tbl: any) => {
                    const isOccupied = (tbl.status || '').toUpperCase() === 'OCCUPIED';
                    const tableNumOnly = tbl.table_number.replace(/[^0-9]/g, '') || '1';

                    return (
                      <div
                        key={tbl.id}
                        className="bg-white border border-stone-200/80 rounded-3xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-stone-900">{tbl.table_number}</h4>
                            <span className="text-xs text-stone-500">Seats: {tbl.capacity || 4} guests</span>
                            <span className="text-[10px] text-stone-400 block">{tbl.section || 'Main Dining Room'}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            isOccupied
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {tbl.status || 'AVAILABLE'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <a
                            href={`http://localhost:3001/?table=${tableNumOnly}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2 bg-stone-50 hover:bg-amber-50 hover:text-amber-800 text-stone-700 font-bold text-xs rounded-xl border border-stone-200 hover:border-amber-200 flex items-center justify-center gap-1.5 transition-all text-center"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Open Kiosk (Port 3001)</span>
                          </a>

                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => handleToggleTableStatus(tbl.id, tbl.status || 'AVAILABLE')}
                              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                isOccupied
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {isOccupied ? 'Set Available' : 'Set Occupied'}
                            </button>
                            <button
                              onClick={() => handleDeleteTable(tbl.id, tbl.table_number)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-stone-200 cursor-pointer"
                              title="Delete Table"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 4: FOOD CATEGORIES (FEATURE RESTORED) */}
          {/* -------------------------------------------------------- */}
          {currentTab === 'categories' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-stone-900">Food &amp; Beverage Categories</h3>
                  <p className="text-xs text-stone-500">Manage menu sections shown on 32-inch dining table kiosks</p>
                </div>
                <button
                  onClick={() => setIsNewCategoryModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" /> Add Food Category
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center text-xs text-stone-500">
                  No food categories found. Click &quot;Add Food Category&quot; to create your first category.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {categories.map((cat) => {
                    const dishCount = products.filter((p) => p.category_id === cat.id).length;

                    return (
                      <div
                        key={cat.id}
                        className="bg-white border border-stone-200/80 rounded-3xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-2xl shadow-2xs">
                              {cat.icon || '🍽️'}
                            </div>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <h4 className="text-base font-black text-stone-900">{cat.name}</h4>
                          <p className="text-xs text-stone-500 line-clamp-2">
                            {cat.description || 'Appetizers, mains or signature specialty.'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                          <span className="font-extrabold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px]">
                            {dishCount} Dishes
                          </span>
                          <button
                            onClick={() => {
                              setCategoryFilter(cat.id);
                              setCurrentTab('products');
                            }}
                            className="text-stone-500 hover:text-stone-900 font-bold text-[11px] flex items-center gap-1"
                          >
                            View Dishes <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 5: MENU & DISHES WITH PICTURE UPLOAD */}
          {/* -------------------------------------------------------- */}
          {currentTab === 'products' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-stone-900">Menu &amp; Dish Catalog</h3>
                  <p className="text-xs text-stone-500">Manage dishes, uploaded photos, prices, and kitchen routing</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search dish..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-stone-200/80 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
                    />
                  </div>

                  <button
                    onClick={() => setIsNewProductModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="h-4 w-4" /> Add Dish (Photo)
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/70 scrollbar-none">
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                    categoryFilter === 'ALL'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
                  }`}
                >
                  All Categories ({products.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                      categoryFilter === c.id
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
                    }`}
                  >
                    {c.icon || ''} {c.name}
                  </button>
                ))}
              </div>

              {/* Dish Grid with Pictures */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Dish Photo or Fallback */}
                    <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden border-b border-stone-100">
                      {prod.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-1 bg-gradient-to-br from-stone-50 to-stone-100">
                          <ImageIcon className="h-8 w-8 text-stone-300" />
                          <span className="text-[10px] font-bold text-stone-400">No Image Uploaded</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-white/95 text-stone-800 font-black text-[10px] rounded-lg border border-stone-200 uppercase shadow-2xs backdrop-blur-xs">
                          {prod.prep_station_code || 'GRILL'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-black text-stone-900">{prod.name}</h4>
                          <span className="text-base font-black text-amber-700 shrink-0">
                            ${Number(prod.base_price).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 line-clamp-2">
                          {prod.description || 'Signature culinary specialty.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                        <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Active on Kiosk
                        </span>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete Dish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 6: KITCHEN DISPLAY SYSTEM */}
          {/* -------------------------------------------------------- */}
          {currentTab === 'kitchen' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md shadow-orange-500/20">
                <div className="space-y-1">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <ChefHat className="h-6 w-6 text-white" />
                    Kitchen Display Screen (KDS)
                  </h3>
                  <p className="text-xs text-white/90">
                    High-visibility ticket system running on Port 3002 with live audio chimes and real-time station routing.
                  </p>
                </div>
                <a
                  href="http://localhost:3002"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 bg-white text-stone-900 font-black text-xs rounded-2xl shadow-lg hover:bg-stone-50 flex items-center gap-2 shrink-0 transition-all"
                >
                  <ExternalLink className="h-4 w-4 text-orange-600" />
                  <span>Open Fullscreen KDS (Port 3002)</span>
                </a>
              </div>

              {/* Live Preview of Orders */}
              <div className="space-y-4">
                <h4 className="text-base font-black text-stone-900">Current Kitchen Queue</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {orders.filter((o) => ['PENDING', 'PREPARING', 'READY'].includes((o.status || '').toUpperCase())).map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white border border-stone-200/80 rounded-3xl p-5 space-y-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                        <div>
                          <span className="text-base font-black text-stone-900 block">{ord.table_id || 'Table 01'}</span>
                          <span className="text-xs text-stone-500">#{ord.order_number || ord.id}</span>
                        </div>
                        <span className="px-3 py-1 rounded-full font-black text-xs bg-amber-50 text-amber-800 border border-amber-200">
                          {ord.status}
                        </span>
                      </div>

                      <div className="space-y-1 bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
                        {(ord.items || []).map((it: any, i: number) => (
                          <div key={i} className="flex justify-between font-bold text-stone-800">
                            <span>{it.quantity}x {it.product_name || it.name}</span>
                            <span className="text-[10px] text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                              {it.prep_station_code || 'GRILL'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleUpdateStatus(ord.id, ord.status === 'PREPARING' ? 'READY' : 'COMPLETED')}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        {ord.status === 'PREPARING' ? 'Mark Ready' : 'Advance Status'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL: DELETE ORDER CONFIRMATION */}
      {/* ======================================================== */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">Delete Order?</h3>
                <p className="text-xs text-stone-500">Order #{orderToDelete.order_number || orderToDelete.id}</p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-600 space-y-1">
              <p>
                Are you sure you want to permanently delete this order? It will be removed from both the POS dashboard and the kitchen queue.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={deletingOrderId === orderToDelete.id}
                className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOrder(orderToDelete)}
                disabled={deletingOrderId === orderToDelete.id}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingOrderId === orderToDelete.id ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW DISH (WITH PICTURE UPLOAD RESTORED!) */}
      {/* ======================================================== */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900">Add New Dish to Menu</h3>
                <p className="text-xs text-stone-500">Upload dish photo and configure menu details</p>
              </div>
              <button
                onClick={() => setIsNewProductModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              {/* Dish Photo Uploader */}
              <ImageUploader
                value={newProdImage}
                onChange={setNewProdImage}
                label="Dish Photo (Upload file or drag & drop)"
              />

              <div>
                <label className="font-extrabold text-stone-700 block mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wagyu Beef Sliders"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-stone-700 block mb-1">Food Category</label>
                  <select
                    value={newProdCategoryId}
                    onChange={(e) => setNewProdCategoryId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon || ''} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-stone-700 block mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="25.00"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-stone-700 block mb-1">Kitchen Prep Station</label>
                <select
                  value={newProdStation}
                  onChange={(e) => setNewProdStation(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="GRILL">GRILL</option>
                  <option value="SAUTE">SAUTE</option>
                  <option value="COLD_PREP">COLD PREP</option>
                  <option value="BAR">BAR</option>
                  <option value="OVEN">OVEN</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-stone-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Rich, savory dish with signature house garnish."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProduct ? 'Saving...' : 'Add Dish to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD FOOD CATEGORY (FEATURE RESTORED!) */}
      {/* ======================================================== */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900">Add Food Category</h3>
                <p className="text-xs text-stone-500">Create a new section for your dining menu</p>
              </div>
              <button
                onClick={() => setIsNewCategoryModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-stone-700 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steaks &amp; BBQ, Appetizers, Beverages"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-extrabold text-stone-700 block mb-1">Category Icon (Emoji)</label>
                <input
                  type="text"
                  placeholder="e.g. 🥩, 🍔, 🍹, 🍰, 🥗"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-extrabold text-stone-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description for menu section"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MANUAL POS ORDER PLACEMENT */}
      {/* ======================================================== */}
      {isManualOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Manually Add / Place Order</h3>
                  <p className="text-xs text-stone-500">Walk-in order, phone reservation, or cashier manual bill</p>
                </div>
              </div>
              <button
                onClick={() => setIsManualOrderModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-4 text-xs">
              {/* Select Table */}
              <div>
                <label className="font-extrabold text-stone-700 block mb-1">Select Dining Table</label>
                <select
                  value={manualTableId || tables[0]?.id || ''}
                  onChange={(e) => setManualTableId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.table_number} ({t.status || 'AVAILABLE'}) • Seats: {t.capacity || 4}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle: Menu Dish vs Custom Item */}
              <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCustomItem(false)}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    !isCustomItem
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Select from Menu ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomItem(true)}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    isCustomItem
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  + Quick Custom Dish
                </button>
              </div>

              {!isCustomItem && products.length > 0 ? (
                <div>
                  <label className="font-extrabold text-stone-700 block mb-1">Select Menu Dish</label>
                  <select
                    value={manualProductId || products[0]?.id || ''}
                    onChange={(e) => setManualProductId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ${Number(p.base_price).toFixed(2)} ({p.prep_station_code || 'GRILL'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 bg-amber-50/50 border border-amber-200/70 rounded-2xl">
                  <div>
                    <label className="font-extrabold text-stone-700 block mb-1">Custom Dish / Item Name</label>
                    <input
                      type="text"
                      required={isCustomItem || products.length === 0}
                      placeholder="e.g. Special Beef Karahi, Cold Coffee, Fresh Juice"
                      value={customDishName}
                      onChange={(e) => setCustomDishName(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-extrabold text-stone-700 block mb-1">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={customDishPrice}
                        onChange={(e) => setCustomDishPrice(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-stone-700 block mb-1">Kitchen Station</label>
                      <select
                        value={customDishStation}
                        onChange={(e) => setCustomDishStation(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      >
                        <option value="GRILL">GRILL</option>
                        <option value="SAUTE">SAUTE</option>
                        <option value="BAR">BAR</option>
                        <option value="OVEN">OVEN</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-stone-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-stone-700 block mb-1">Order Tag / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Walk-in, VIP guest, Mild spice"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsManualOrderModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManualOrder}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmittingManualOrder ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Placing Order...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" /> Place &amp; Route Order
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD DINING TABLE */}
      {/* ======================================================== */}
      {isNewTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <TableIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Add Dining Table</h3>
                  <p className="text-xs text-stone-500">Add a physical dining kiosk table to your floor</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTableModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTable} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-stone-700 block mb-1">Table Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 17, VIP 01, Patio 02"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-stone-700 block mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={newTableCap}
                    onChange={(e) => setNewTableCap(parseInt(e.target.value) || 4)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-stone-700 block mb-1">Floor Section</label>
                  <select
                    value={newTableSection}
                    onChange={(e) => setNewTableSection(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="Main Dining Room">Main Dining Room</option>
                    <option value="Patio / Terrace">Patio / Terrace</option>
                    <option value="VIP Lounge">VIP Lounge</option>
                    <option value="Family Hall">Family Hall</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewTableModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTable}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTable ? 'Adding Table...' : 'Add Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE / RESET DATA (CLEAN FRESH STATE) */}
      {/* ======================================================== */}
      {isResetDataModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Delete / Reset Restaurant Data</h3>
                  <p className="text-xs text-stone-500">Wipe dummy or test data and start fresh</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetDataModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scope Selection Tabs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setResetScope('ALL')}
                className={`p-3 rounded-2xl font-black text-left border transition-all cursor-pointer ${
                  resetScope === 'ALL'
                    ? 'bg-rose-50 text-rose-900 border-rose-300 ring-2 ring-rose-400/20'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="block text-xs font-black">🔥 Entire System</span>
                <span className="text-[10px] text-stone-500 font-normal">Wipe all orders, menu &amp; categories</span>
              </button>

              <button
                type="button"
                onClick={() => setResetScope('ORDERS')}
                className={`p-3 rounded-2xl font-black text-left border transition-all cursor-pointer ${
                  resetScope === 'ORDERS'
                    ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="block text-xs font-black">🧾 All Orders &amp; Sales</span>
                <span className="text-[10px] text-stone-500 font-normal">Reset revenue to $0 &amp; free tables</span>
              </button>

              <button
                type="button"
                onClick={() => setResetScope('MENU')}
                className={`p-3 rounded-2xl font-black text-left border transition-all cursor-pointer ${
                  resetScope === 'MENU'
                    ? 'bg-orange-50 text-orange-900 border-orange-300 ring-2 ring-orange-400/20'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="block text-xs font-black">🍽️ Menu Dishes</span>
                <span className="text-[10px] text-stone-500 font-normal">Delete all dishes from catalog</span>
              </button>

              <button
                type="button"
                onClick={() => setResetScope('CATEGORIES')}
                className={`p-3 rounded-2xl font-black text-left border transition-all cursor-pointer ${
                  resetScope === 'CATEGORIES'
                    ? 'bg-purple-50 text-purple-900 border-purple-300 ring-2 ring-purple-400/20'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="block text-xs font-black">📁 Food Categories</span>
                <span className="text-[10px] text-stone-500 font-normal">Delete all categories &amp; dishes</span>
              </button>
            </div>

            {/* Description of action */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5 text-stone-700">
              <div className="font-extrabold text-stone-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>
                  {resetScope === 'ALL' && 'Action: Wipe entire restaurant data'}
                  {resetScope === 'ORDERS' && 'Action: Clear all orders and reset stats'}
                  {resetScope === 'MENU' && 'Action: Delete all menu dishes'}
                  {resetScope === 'CATEGORIES' && 'Action: Delete all food categories'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {resetScope === 'ALL' &&
                  'This will permanently delete all live and completed orders, empty kitchen display tickets, reset Today\'s Revenue to $0.00, free all dining tables to AVAILABLE, and clear all dishes & categories. You will start with a 100% clean restaurant.'}
                {resetScope === 'ORDERS' &&
                  'This will clear all orders recorded today, reset Today\'s Revenue to $0.00, empty the kitchen queue, and set all tables back to AVAILABLE.'}
                {resetScope === 'MENU' &&
                  'This will remove all food and beverage products from the catalog.'}
                {resetScope === 'CATEGORIES' &&
                  'This will delete all food categories and their associated dishes.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetDataModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isSubmittingReset}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs rounded-xl shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingReset ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Wiping Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Confirm &amp; Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
