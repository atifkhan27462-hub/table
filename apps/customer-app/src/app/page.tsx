'use client';

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Sparkles,
  Gamepad2,
  BellRing,
  ShoppingBag,
  Clock,
  ChevronRight,
  Flame,
  Minus,
  Plus,
  Wine,
  HelpCircle,
  Volume2,
  Droplets,
  CreditCard,
  RotateCcw,
  RotateCw,
  Star,
  X,
  Search,
  Check,
  QrCode,
  Globe,
  Wifi,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ChefHat,
  ArrowRight,
  ShieldCheck,
  Sparkle,
  MessageSquare,
  Palette,
  Send,
  Trash2,
} from 'lucide-react';
import {
  fetchMenuCatalog,
  fetchGamesCatalog,
  openTableSession,
  calculateOrderBackend,
  submitOrderBackend,
  getTableActiveOrders,
  deleteOrder,
  clearTableOrders,
  requestAiSommelier,
  chatWithAiConcierge,
  requestPersonalizedAmbiance,
  requestStaffService,
  resolveStaffService,
  DEFAULT_TABLE_ID,
} from '@/lib/api';
import { tableSocket } from '@/lib/socket';
import {
  Category,
  Product,
  CartItem,
  BackendOrderCalculation,
  OrderOut,
  Game,
} from '@/lib/types';
import dynamic from 'next/dynamic';
import KioskGuard from '@/components/KioskGuard';

const GameLauncher = dynamic(
  () => import('@/games/GameLauncher').then((m) => m.GameLauncher),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <p className="font-bold tracking-wider text-amber-700">Loading Interactive Table Entertainment...</p>
      </div>
    ),
  }
);

export default function CustomerTableApp() {
  // Screen state for 12 screens:
  // 1: welcome, 2: menu, 3: categories, 4: details, 5: customize, 6: cart, 7: checkout, 8: confirmation, 9: tracking, 10: games, 11: ai, 12: help
  const [screen, setScreen] = useState<
    | 'welcome'
    | 'menu'
    | 'categories'
    | 'product-details'
    | 'customize'
    | 'cart'
    | 'checkout'
    | 'confirmation'
    | 'tracking'
    | 'games'
    | 'ai'
    | 'help'
  >('welcome');

  // Backend state & Catalog
  const [tableNumber, setTableNumber] = useState<string>('Table 08');
  const [tableId, setTableId] = useState<string>(DEFAULT_TABLE_ID);
  const [allRegisteredTables, setAllRegisteredTables] = useState<any[]>([]);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [selectedTipPercent, setSelectedTipPercent] = useState<number>(18);
  const [customTipAmount, setCustomTipAmount] = useState<string>('0');

  // Backend Calculation & Order Placement state
  const [backendCalculation, setBackendCalculation] = useState<BackendOrderCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<OrderOut | null>(null);
  const [activeTableOrders, setActiveTableOrders] = useState<OrderOut[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CARD_READER' | 'APPLE_PAY' | 'CASH'>('CARD_READER');
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);

  // Order deletion and tracker management state
  const [orderToDelete, setOrderToDelete] = useState<OrderOut | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState<boolean>(false);
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState<boolean>(false);

  // Product Customization Modal/Screen state
  const [customDoneness, setCustomDoneness] = useState<string>('Medium Rare');
  const [customSide, setCustomSide] = useState<string>('Truffle Parmesan Fries');
  const [customSpice, setCustomSpice] = useState<number>(2);
  const [customItemQuantity, setCustomItemQuantity] = useState<number>(1);
  const [customItemNotes, setCustomItemNotes] = useState<string>('');

  // Table Service Call state (Help & Call Waiter)
  const [waiterCalled, setWaiterCalled] = useState<boolean>(false);
  const [activeServiceCallType, setActiveServiceCallType] = useState<string | null>(null);

  // 32-inch Smart Dining Table Orientation (0 = Seats 1 & 2 / Side A, 180 = Seats 3 & 4 / Side B)
  const [tableRotation, setTableRotation] = useState<0 | 180>(0);

  // AI Experience Engine (Phase 10) state
  const [aiSubTab, setAiSubTab] = useState<'sommelier' | 'concierge' | 'ambiance'>('sommelier');
  const [aiPrompt, setAiPrompt] = useState<string>('I am having a rich steak, what wine pairs best?');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [conciergeQuery, setConciergeQuery] = useState<string>('');
  const [conciergeHistory, setConciergeHistory] = useState<{ role: string; content: string }[]>([
    {
      role: 'assistant',
      content:
        'Hello and welcome to your interactive dining table! I am your AI Dining Concierge. Ask me about ingredient details, dietary pairings, wine recommendations, or tabletop games.',
    },
  ]);
  const [isConciergeLoading, setIsConciergeLoading] = useState<boolean>(false);
  const [conciergeSuggestedItems, setConciergeSuggestedItems] = useState<string[]>([]);
  const [conciergeDietaryFlags, setConciergeDietaryFlags] = useState<string[]>([]);
  const [ambianceTheme, setAmbianceTheme] = useState<string>('Midnight Starlight');
  const [isAmbianceApplying, setIsAmbianceApplying] = useState<boolean>(false);
  const [ambianceSuccessMessage, setAmbianceSuccessMessage] = useState<string | null>(null);

  // Games state
  const [games, setGames] = useState<Game[]>([]);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [triviaIndex, setTriviaIndex] = useState<number>(0);
  const [triviaScore, setTriviaScore] = useState<number>(0);
  const [selectedTriviaAnswer, setSelectedTriviaAnswer] = useState<number | null>(null);

  // Language & Table info
  const [currentLanguage, setCurrentLanguage] = useState<'EN' | 'ES' | 'FR' | 'ZH'>('EN');

  // 1. Initial Load: Open Session, Load Menu & Games from Backend
  useEffect(() => {
    async function init() {
      setIsLoadingMenu(true);
      try {
        let activeTblId = DEFAULT_TABLE_ID;
        let activeTblNum = 'Table 08';

        try {
          const res = await fetch('/api/v1/tables');
          const json = await res.json();
          const tblList = json.data || json;
          if (Array.isArray(tblList) && tblList.length > 0) {
            setAllRegisteredTables(tblList);
            const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const tableParam = params ? (params.get('table') || params.get('table_id') || params.get('t')) : null;
            const savedTbl = typeof window !== 'undefined' ? localStorage.getItem('smart_table_preference') : null;
            const target = tableParam || savedTbl;

            let matched = null;
            if (target) {
              matched = tblList.find((t: any) =>
                t.id === target ||
                t.table_number.toLowerCase() === target.toLowerCase() ||
                t.table_number.toLowerCase() === `table ${target.padStart(2, '0').toLowerCase()}` ||
                t.table_number.toLowerCase().includes(target.toLowerCase())
              );
            }
            if (!matched) {
              matched = tblList.find((t: any) => t.table_number === 'Table 08') || tblList[0];
            }
            if (matched) {
              activeTblId = matched.id;
              activeTblNum = matched.table_number;
              setTableId(matched.id);
              setTableNumber(matched.table_number);
              if (typeof window !== 'undefined') {
                localStorage.setItem('smart_table_preference', matched.table_number);
              }
            }
          }
        } catch (tblErr) {
          console.warn('Table dynamic lookup note:', tblErr);
        }

        // Immediately initialize WebSocket connection for this table
        tableSocket.init(activeTblId);
        setIsWsConnected(tableSocket.isConnected);

        const sess = await openTableSession(activeTblId);
        if (sess && sess.id) setSessionId(sess.id);

        const catalog = await fetchMenuCatalog();
        if (catalog && catalog.categories) {
          setCategories(catalog.categories);
        }

        const gamesList = await fetchGamesCatalog();
        setGames(gamesList);

        // Load active orders for table tracking
        const orders = await getTableActiveOrders(activeTblId);
        if (orders && orders.length > 0) {
          setActiveTableOrders(orders);
          setLastPlacedOrder(orders[0]);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setIsOfflineMode(true);
      } finally {
        setIsLoadingMenu(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const unsubAck = tableSocket.subscribe('ACK', () => setIsWsConnected(true));
    if (tableSocket.isConnected) {
      setIsWsConnected(true);
    }

    const unsubStatus = tableSocket.subscribe('*', (evt) => {
      const data = evt.data;
      if (!data) return;

      if (
        [
          'ORDER_CREATED',
          'ORDER_ACCEPTED',
          'ORDER_PREPARING',
          'ORDER_READY',
          'ORDER_SERVED',
          'ORDER_COMPLETED',
          'ORDER_CANCELLED',
        ].includes(evt.type)
      ) {
        const orderId = data.order_id;
        const newStatus = data.status || evt.type.replace('ORDER_', '');

        if (evt.type === 'ORDER_READY') {
          setRealtimeNotification(
            '🍽️ Kitchen Announcement: Your dishes are prepared and being served to your table!'
          );
          setTimeout(() => setRealtimeNotification(null), 8000);
        } else if (evt.type === 'ORDER_PREPARING') {
          setRealtimeNotification('🔥 The culinary line is currently preparing your order.');
          setTimeout(() => setRealtimeNotification(null), 6000);
        }

        if (orderId) {
          if (data.deleted || newStatus === 'DELETED' || evt.type === 'ORDER_CANCELLED') {
            setActiveTableOrders((prev) => prev.filter((o) => o.id !== orderId));
            setLastPlacedOrder((prev) => (prev && prev.id === orderId ? null : prev));
          } else {
            setLastPlacedOrder((prev) =>
              prev && prev.id === orderId ? { ...prev, status: newStatus } : prev
            );
            setActiveTableOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            );
          }
        }
      }

      if (evt.type === 'AI_GENERATION_COMPLETED') {
        if (data.result_content) {
          setAiResult(data.result_content);
          setIsAiGenerating(false);
        }
      }
    });

    return () => {
      unsubAck();
      unsubStatus();
    };
  }, []);

  // Recalculate Backend totals whenever cart or tip changes (Debounced 250ms to prevent request spamming)
  useEffect(() => {
    if (cart.length === 0) {
      setBackendCalculation(null);
      return;
    }

    let tipVal = 0;
    const subtotalLocal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    if (selectedTipPercent > 0) {
      tipVal = (subtotalLocal * selectedTipPercent) / 100;
    } else if (parseFloat(customTipAmount) > 0) {
      tipVal = parseFloat(customTipAmount);
    }

    setIsCalculating(true);
    const debounceTimer = setTimeout(() => {
      calculateOrderBackend(tableId, cart, tipVal)
        .then((calc) => {
          setBackendCalculation(calc);
          setIsOfflineMode(false);
        })
        .catch((err) => {
          console.warn('Backend calculation fallback:', err);
          const taxVal = subtotalLocal * 0.085;
          setBackendCalculation({
            subtotal: subtotalLocal.toFixed(2),
            tax_rate: '8.50',
            tax_amount: taxVal.toFixed(2),
            service_fee: '0.00',
            tip_amount: tipVal.toFixed(2),
            total_amount: (subtotalLocal + taxVal + tipVal).toFixed(2),
            item_count: cart.reduce((s, i) => s + i.quantity, 0),
          });
        })
        .finally(() => setIsCalculating(false));
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [cart, selectedTipPercent, customTipAmount, tableId]);

  // Handler: Open Product Details / Customization
  const handleOpenProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setCustomDoneness('Medium Rare');
    setCustomSide('Truffle Parmesan Fries');
    setCustomSpice(2);
    setCustomItemQuantity(1);
    setCustomItemNotes('');
    setScreen('product-details');
  };

  const handleOpenCustomize = (product: Product) => {
    setSelectedProduct(product);
    setCustomDoneness('Medium Rare');
    setCustomSide('Truffle Parmesan Fries');
    setCustomSpice(2);
    setCustomItemQuantity(1);
    setCustomItemNotes('');
    setScreen('customize');
  };

  // Handler: Add Item to Cart
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    let extraPrice = 0;
    const optionsList = [];

    if (selectedProduct.name.toLowerCase().includes('ribeye') || selectedProduct.name.toLowerCase().includes('steak')) {
      optionsList.push({ option_name: 'Doneness', value_name: customDoneness, price_modifier: 0 });
      optionsList.push({ option_name: 'Side Dish', value_name: customSide, price_modifier: 0 });
    }

    const newItem: CartItem = {
      id: 'cart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      base_price: Number(selectedProduct.base_price),
      unit_price: Number(selectedProduct.base_price) + extraPrice,
      quantity: customItemQuantity,
      doneness: customDoneness,
      side: customSide,
      spice_level: customSpice,
      notes: customItemNotes,
      options: optionsList,
    };

    setCart((prev) => [...prev, newItem]);
    setScreen('cart');
  };

  // Handler: Modify Cart Quantity
  const handleUpdateCartQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Handler: Submit Real Order to Backend
  const handlePlaceBackendOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);

    let tipVal = 0;
    const subtotalLocal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    if (selectedTipPercent > 0) {
      tipVal = (subtotalLocal * selectedTipPercent) / 100;
    } else if (parseFloat(customTipAmount) > 0) {
      tipVal = parseFloat(customTipAmount);
    }

    const idempotencyKey = `table08_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const order = await submitOrderBackend(
        tableId,
        cart,
        specialInstructions,
        tipVal,
        idempotencyKey
      );
      setLastPlacedOrder(order);
      setActiveTableOrders((prev) => [order, ...prev]);
      setCart([]);
      setSpecialInstructions('');
      setScreen('confirmation');
    } catch (err: any) {
      alert('Order placement error: ' + (err.message || 'Server error'));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Handler: Trigger Service Call (Dispatched in real-time to Kitchen & Admin)
  const handleTriggerServiceCall = (callType: string) => {
    setActiveServiceCallType(callType);
    setWaiterCalled(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}

    // 1. Instant REST API dispatch (persists to DB and broadcasts to KDS & Admin)
    requestStaffService(tableId, callType).catch((err) =>
      console.warn('REST service call error:', err)
    );

    // 2. Direct real-time WebSocket frame dispatch
    try {
      tableSocket.send({
        type: 'STAFF_CALL',
        data: {
          table_id: tableId,
          table_number: tableNumber,
          call_type: callType,
        },
      });
    } catch (wsErr) {
      console.warn('Socket alert error:', wsErr);
    }

    setRealtimeNotification(`🔔 Floor staff & kitchen notified: "${callType}" dispatched for ${tableNumber}!`);
    setTimeout(() => setRealtimeNotification(null), 5000);
  };

  const handleDismissServiceCall = () => {
    setWaiterCalled(false);
    resolveStaffService(tableId).catch(() => {});
    try {
      tableSocket.send({
        type: 'STAFF_ASSISTANCE_RESOLVED',
        data: {
          table_id: tableId,
          table_number: tableNumber,
          call_type: activeServiceCallType,
        },
      });
    } catch {}
  };

  // Handler: AI Sommelier Query
  const handleAiPairingSubmit = async (queryText?: string) => {
    const textToSubmit = queryText || aiPrompt;
    setIsAiGenerating(true);
    setAiResult(null);
    try {
      const res = await requestAiSommelier(textToSubmit);
      setAiResult(res.recommendation);
    } catch (err) {
      setAiResult('🍷 Sommelier recommendation: 2019 Caymus Cabernet Sauvignon pairs exquisitely with our wood-fired steaks.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Handler: AI Dining Concierge Live Chat
  const handleSendConciergeMessage = async (customQuery?: string) => {
    const q = (customQuery || conciergeQuery).trim();
    if (!q) return;

    const newHistory = [...conciergeHistory, { role: 'user', content: q }];
    setConciergeHistory(newHistory);
    setConciergeQuery('');
    setIsConciergeLoading(true);

    try {
      const cartItemNames = cart.map((i) => i.name);
      const res = await chatWithAiConcierge(q, newHistory, cartItemNames, tableId);
      setConciergeHistory([...newHistory, { role: 'assistant', content: res.reply }]);
      if (res.suggested_items?.length) setConciergeSuggestedItems(res.suggested_items);
      if (res.dietary_flags?.length) setConciergeDietaryFlags(res.dietary_flags);
    } catch {
      setConciergeHistory([
        ...newHistory,
        {
          role: 'assistant',
          content: 'Our chefs accommodate all dietary requests. Please ask your server for immediate custom kitchen preparations.',
        },
      ]);
    } finally {
      setIsConciergeLoading(false);
    }
  };

  // Handler: Personalized Visual Table Ambiance
  const handleApplyAmbiance = async (themeName: string, themePrompt: string) => {
    setAmbianceTheme(themeName);
    setIsAmbianceApplying(true);
    setAmbianceSuccessMessage(null);
    try {
      const res = await requestPersonalizedAmbiance(`Theme: ${themeName} - ${themePrompt}`, tableId);
      setAmbianceSuccessMessage(res.result_content || `✨ ${themeName} Ambiance activated!`);
    } catch {
      setAmbianceSuccessMessage(`✨ ${themeName} Ambiance preset activated on table surface!`);
    } finally {
      setIsAmbianceApplying(false);
    }
  };

  // Handler: Delete single order from tracker & cancel in kitchen
  const handleDeleteOrder = async (order: OrderOut) => {
    try {
      setDeletingOrderId(order.id);
      try {
        await deleteOrder(order.id);
      } catch (err) {
        console.warn('Backend delete order note:', err);
      }
      setActiveTableOrders((prev) => prev.filter((o) => o.id !== order.id));
      setLastPlacedOrder((prev) => (prev && prev.id === order.id ? null : prev));
      setRealtimeNotification(`Order #${order.order_number} has been deleted.`);
      setTimeout(() => setRealtimeNotification(null), 5000);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert('Could not delete order. Please try again.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Handler: Clear all orders for this table
  const handleClearAllOrders = async () => {
    try {
      setIsClearingAll(true);
      try {
        await clearTableOrders(tableId);
      } catch (err) {
        console.warn('Backend clear table orders note:', err);
      }
      setActiveTableOrders([]);
      setLastPlacedOrder(null);
      setRealtimeNotification('All orders cleared from this table.');
      setTimeout(() => setRealtimeNotification(null), 5000);
      setIsConfirmingClearAll(false);
    } catch (err) {
      console.error('Failed to clear orders:', err);
      alert('Could not clear orders. Please try again.');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Flattened products list for "all" category
  const allProducts: Product[] = categories.flatMap((c) => c.products || []);
  const filteredProducts = allProducts.filter((p) => {
    const matchesCat =
      activeCategoryId === 'all' || p.category_id === activeCategoryId;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const cartTotalItemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#FAF8F5]">
      {/* ======================================================== */}
      {/* 32-INCH HORIZONTAL DINING TABLE ROTATION CANVAS */}
      {/* Smoothly rotates 180° so diners on either side have upright viewing */}
      {/* ======================================================== */}
      <div
        style={{
          transform: `rotate(${tableRotation}deg)`,
          transition: 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: 'center center',
        }}
        className="flex flex-col h-full w-full bg-[#FAF8F5] text-stone-800 font-sans select-none overflow-hidden antialiased relative"
      >
        {/* OPPOSITE-SIDE DINERS DEDICATED TOP EDGE STRIP (Non-overlapping) */}
        {/* Facing the opposite diners directly across the table so they can read and tap it upright! */}
        <div className="h-9 w-full bg-stone-900 border-b border-stone-800 flex items-center justify-center px-4 shrink-0 z-40 select-none">
          <button
            type="button"
            onClick={() => {
              const nextRot = tableRotation === 0 ? 180 : 0;
              setTableRotation(nextRot);
              setRealtimeNotification(
                nextRot === 180
                  ? '🔄 Screen flipped towards Seats 3 & 4 (Side B)'
                  : '🔄 Screen flipped towards Seats 1 & 2 (Side A)'
              );
              setTimeout(() => setRealtimeNotification(null), 3500);
            }}
            style={{ transform: 'rotate(180deg)' }}
            className="flex items-center gap-2 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-white rounded-full text-[11px] font-black border border-amber-500/40 active:scale-95 transition-all group cursor-pointer shadow-xs"
            title="Tap to flip 32-inch table screen to your side"
          >
            <RotateCw className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
            <span>
              Tap to Flip Screen to Us ({tableRotation === 0 ? 'Seats 3 & 4' : 'Seats 1 & 2'})
            </span>
          </button>
        </div>
      {/* ======================================================== */}
      {/* REAL-TIME WEBSOCKET NOTIFICATION BANNER */}
      {/* ======================================================== */}
      {realtimeNotification && (
        <div className="bg-emerald-50 text-emerald-900 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs font-black tracking-wide shadow-xs z-50 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 animate-spin" />
            <span>{realtimeNotification}</span>
          </div>
          <button
            onClick={() => setRealtimeNotification(null)}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors shadow-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* RECONNECTION / OFFLINE BANNER */}
      {/* ======================================================== */}
      {isOfflineMode && (
        <div className="bg-amber-50 text-amber-900 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs font-extrabold tracking-wide shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 animate-bounce" />
            <span>CONNECTIVITY NOTICE: Operating in Local Cache Mode. Reconnecting to live backend...</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-1 text-[11px] font-bold shadow-xs transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Retry Connection
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 32-INCH TOUCH OPTIMIZED TOP HEADER */}
      {/* ======================================================== */}
      <header className="h-20 px-8 bg-white/95 backdrop-blur-md border-b border-stone-200/80 flex items-center justify-between shrink-0 shadow-xs z-30">
        <div
          className="flex items-center gap-4 cursor-pointer group active:scale-95 transition-transform"
          onClick={() => setScreen('welcome')}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsTableModalOpen(true);
            }}
            title="Click to Switch Table"
            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-500/20 border border-orange-300 hover:ring-2 hover:ring-orange-400 transition-all"
          >
            {tableNumber.replace(/[^0-9]/g, '') || 'T'}
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-stone-900 flex items-center gap-2">
              ATIF &amp; ABDULLAH FOODS
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTableModalOpen(true);
                }}
                title="Click to switch physical table kiosk"
                className={`text-[11px] px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${
                  isWsConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isWsConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                {tableNumber} • {isWsConnected ? '⚡ LIVE' : '32" TOUCH'} ▾
              </button>
            </h1>
            <p className="text-xs text-stone-500 font-medium">Fine Dining Smart Table Experience</p>
          </div>
        </div>

        {/* Navigation Bar / Quick Tabs */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/70">
          <button
            onClick={() => setScreen('menu')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 min-h-[44px] ${
              screen === 'menu'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>Menu</span>
          </button>

          <button
            onClick={() => setScreen('categories')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 min-h-[44px] ${
              screen === 'categories'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
            }`}
          >
            <ChefHat className="h-4 w-4" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setScreen('cart')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 min-h-[44px] relative ${
              screen === 'cart' || screen === 'checkout'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            {cartTotalItemCount > 0 && (
              <span className="ml-1 font-black text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                {cartTotalItemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setScreen('tracking')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 min-h-[44px] ${
              screen === 'tracking' || screen === 'confirmation'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
            }`}
          >
            <Clock className="h-4 w-4 text-emerald-500" />
            <span>Tracker</span>
          </button>

          <button
            onClick={() => setScreen('games')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 min-h-[44px] ${
              screen === 'games'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
            }`}
          >
            <Gamepad2 className="h-4 w-4 text-indigo-500" />
            <span>Games</span>
          </button>

          <button
            onClick={() => setScreen('ai')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 min-h-[44px] ${
              screen === 'ai'
                ? 'bg-amber-700 text-white shadow-md shadow-amber-700/20'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>AI Sommelier</span>
          </button>

          <button
            onClick={() => setScreen('help')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 min-h-[44px] ${
              screen === 'help'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-orange-700 hover:bg-orange-50'
            }`}
          >
            <BellRing className="h-4 w-4" />
            <span>Call Staff</span>
          </button>
        </div>

        {/* Right side of Header: 180° Flip Toggle & Waiter Alert */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const nextRot = tableRotation === 0 ? 180 : 0;
              setTableRotation(nextRot);
              setRealtimeNotification(
                nextRot === 180
                  ? '🔄 Screen flipped towards Seats 3 & 4 (Side B)'
                  : '🔄 Screen flipped towards Seats 1 & 2 (Side A)'
              );
              setTimeout(() => setRealtimeNotification(null), 3500);
            }}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-200/80 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Rotate screen 180° for diners across the table"
          >
            <RotateCw
              className="h-4 w-4 text-amber-600 transition-transform duration-500"
              style={{ transform: tableRotation === 180 ? 'rotate(180deg)' : 'none' }}
            />
            <div className="flex flex-col text-left leading-tight">
              <span className="font-extrabold text-[11px] text-amber-950 flex items-center gap-1">
                Flip 180° ↻
              </span>
              <span className="text-[9px] text-amber-700 font-bold">
                Facing {tableRotation === 0 ? 'Seats 1 & 2' : 'Seats 3 & 4'}
              </span>
            </div>
          </button>

          {waiterCalled && (
            <div className="bg-amber-50 text-amber-900 border border-amber-300 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs animate-pulse">
              <BellRing className="h-4 w-4 text-amber-600" />
              <span>Staff Notified ({activeServiceCallType})</span>
            </div>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* SCREEN CONTAINER (12 SCREENS) */}
      {/* ======================================================== */}
      <main className="flex-1 overflow-y-auto relative p-6 bg-[#FAF8F5]">
        {/* SCREEN 1: WELCOME */}
        {screen === 'welcome' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div className="h-28 w-28 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-orange-500/25 border-2 border-orange-300/40">
              {tableNumber.replace(/[^0-9]/g, '') || 'T8'}
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-800 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-200">
                Welcome to {tableNumber} • Main Dining Room
              </span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 mt-4">
                ATIF &amp; ABDULLAH FOODS
              </h2>
              <p className="text-stone-600 text-base max-w-xl mx-auto mt-3 leading-relaxed">
                Explore our signature wood-fired steaks, artisanal mains, handcrafted mocktails, and interactive 32-inch table entertainment.
              </p>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <button
                onClick={() => setScreen('menu')}
                className="px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-3 min-h-[64px]"
              >
                <UtensilsCrossed className="h-6 w-6" />
                <span>Tap Screen to Start Dining</span>
                <ArrowRight className="h-6 w-6" />
              </button>

              <button
                onClick={() => setScreen('categories')}
                className="px-8 py-5 bg-white hover:bg-stone-50 text-stone-800 font-bold text-base rounded-2xl border border-stone-200/80 active:scale-95 transition-all flex items-center gap-2 min-h-[64px] shadow-xs"
              >
                <ChefHat className="h-5 w-5 text-amber-600" />
                <span>Browse Categories</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 w-full pt-8 border-t border-stone-200/80">
              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-4 text-left">
                <QrCode className="h-10 w-10 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-stone-900">Mobile Ordering</h4>
                  <p className="text-xs text-stone-500">Scan QR on table to order on phone</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-4 text-left">
                <Wifi className="h-10 w-10 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-stone-900">Complimentary Wi-Fi</h4>
                  <p className="text-xs text-stone-500">SSID: AtifAbdullah-Guest</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-4 text-left">
                <Globe className="h-10 w-10 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-stone-900">Multi-Language Menu</h4>
                  <p className="text-xs text-stone-500">English • Urdu • Arabic</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: MENU & CATALOG */}
        {screen === 'menu' && (
          <div className="space-y-6">
            {/* Search & Category Filter Bar */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategoryId('all')}
                  className={`px-5 py-3 rounded-xl font-extrabold text-xs shrink-0 transition-all active:scale-95 min-h-[48px] ${
                    activeCategoryId === 'all'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                      : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700'
                  }`}
                >
                  All Specialties ({allProducts.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategoryId(c.id)}
                    className={`px-5 py-3 rounded-xl font-extrabold text-xs shrink-0 transition-all active:scale-95 min-h-[48px] ${
                      activeCategoryId === c.id
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                        : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700'
                    }`}
                  >
                    {c.name} ({(c.products || []).length})
                  </button>
                ))}
              </div>

              <div className="relative shrink-0 w-72">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search steaks, burger, drinks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-11 pr-4 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:bg-white min-h-[48px] transition-colors"
                />
              </div>
            </div>

            {/* Menu Grid */}
            {isLoadingMenu ? (
              <div className="text-center py-24 space-y-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
                <p className="text-stone-500 font-bold text-sm">Fetching culinary catalog from kitchen backend...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-stone-200/80 space-y-3 shadow-xs">
                <UtensilsCrossed className="h-12 w-12 text-stone-300 mx-auto" />
                <h3 className="text-lg font-bold text-stone-900">No dishes found</h3>
                <p className="text-xs text-stone-500">Try selecting another category or clear search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden flex flex-col justify-between hover:border-amber-300 hover:shadow-xl hover:shadow-stone-200/60 transition-all group shadow-xs"
                  >
                    <div>
                      {/* High-Resolution Crystal Clear Dish Photo */}
                      <div
                        className="relative w-full h-52 sm:h-56 bg-stone-100 overflow-hidden cursor-pointer"
                        onClick={() => handleOpenProductDetails(product)}
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 text-stone-700 p-4">
                            <span className="text-5xl mb-2 filter drop-shadow">
                              {product.name.toLowerCase().includes('ribeye') || product.name.toLowerCase().includes('steak')
                                ? '🥩'
                                : product.name.toLowerCase().includes('burger')
                                ? '🍔'
                                : product.name.toLowerCase().includes('pizza')
                                ? '🍕'
                                : product.name.toLowerCase().includes('pasta')
                                ? '🍝'
                                : product.name.toLowerCase().includes('bass') || product.name.toLowerCase().includes('fish')
                                ? '🐟'
                                : product.name.toLowerCase().includes('biryani') || product.name.toLowerCase().includes('rice')
                                ? '🍚'
                                : product.name.toLowerCase().includes('drink') || product.name.toLowerCase().includes('shake') || product.name.toLowerCase().includes('juice')
                                ? '🍹'
                                : product.name.toLowerCase().includes('dessert') || product.name.toLowerCase().includes('cake')
                                ? '🍰'
                                : '🍽️'}
                            </span>
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Atif &amp; Abdullah Foods</span>
                          </div>
                        )}

                        {/* Top Overlay Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                          {product.prep_time_minutes ? (
                            <span className="text-[11px] font-bold text-stone-700 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-stone-200 flex items-center gap-1 shadow-xs">
                              <Clock className="h-3 w-3 text-amber-600" /> {product.prep_time_minutes}m
                            </span>
                          ) : <span />}

                          <span className="text-sm font-black text-emerald-800 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                            Rs. {Number(product.base_price).toLocaleString()}
                          </span>
                        </div>

                        {/* Bottom subtle shadow for transition */}
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            onClick={() => handleOpenProductDetails(product)}
                            className="text-lg font-bold text-stone-900 group-hover:text-amber-700 transition-colors cursor-pointer line-clamp-1"
                          >
                            {product.name}
                          </h3>
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                          {product.description || 'Freshly prepared with authentic ingredients by our master culinary chefs.'}
                        </p>

                        {product.tags && product.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {product.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                        <button
                          onClick={() => handleOpenProductDetails(product)}
                          className="flex-1 py-3 bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-bold text-xs rounded-xl active:scale-95 transition-all min-h-[44px]"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleOpenCustomize(product)}
                          className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1 min-h-[44px]"
                        >
                          <span>Add to Table</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 3: CATEGORIES */}
        {screen === 'categories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-stone-900">Culinary Categories</h2>
                <p className="text-xs text-stone-500">Select a section to filter menu dishes</p>
              </div>
              <button
                onClick={() => setScreen('menu')}
                className="px-5 py-2.5 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 shadow-xs"
              >
                Back to Full Menu
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveCategoryId(c.id);
                    setScreen('menu');
                  }}
                  className="bg-white border border-stone-200/80 rounded-3xl p-6 cursor-pointer hover:border-amber-400 hover:shadow-xl transition-all shadow-xs group active:scale-95"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl p-3 bg-amber-50 rounded-2xl border border-amber-100">
                      {c.name.toLowerCase().includes('steak')
                        ? '🥩'
                        : c.name.toLowerCase().includes('starter')
                        ? '🥗'
                        : c.name.toLowerCase().includes('main')
                        ? '🍝'
                        : c.name.toLowerCase().includes('drink')
                        ? '🍸'
                        : '🍫'}
                    </span>
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      {(c.products || []).length} Items
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-stone-900 group-hover:text-amber-700 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    {c.description || 'Explore our chef prepared selections in ' + c.name}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mt-4">
                    <span>Explore Category</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCREEN 4: PRODUCT DETAILS */}
        {screen === 'product-details' && selectedProduct && (
          <div className="max-w-3xl mx-auto bg-white border border-stone-200/80 rounded-3xl p-8 space-y-6 shadow-xl animate-fadeIn">
            {/* Hero Dish Image */}
            {selectedProduct.image_url ? (
              <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-stone-100">
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-white/90 border border-amber-200 px-3 py-1 rounded-full backdrop-blur-md">
                      Station: {selectedProduct.prep_station_code || 'GRILL'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 drop-shadow-md">{selectedProduct.name}</h2>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-800 bg-white/95 border border-emerald-200 px-4 py-1.5 rounded-2xl backdrop-blur-md shadow-sm">
                    Rs. {Number(selectedProduct.base_price).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between border-b border-stone-100 pb-6">
                <div className="flex items-center gap-4">
                  <span className="text-5xl p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    🍽️
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-stone-900">{selectedProduct.name}</h2>
                    <p className="text-xs text-stone-500 mt-1">Station: {selectedProduct.prep_station_code || 'GRILL'}</p>
                  </div>
                </div>
                <span className="text-3xl font-black text-emerald-700">
                  Rs. {Number(selectedProduct.base_price).toLocaleString()}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">Description</h4>
              <p className="text-sm text-stone-600 leading-relaxed">{selectedProduct.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-extrabold">Prep Time</span>
                <p className="text-base font-black text-stone-900 mt-0.5">{selectedProduct.prep_time_minutes || 15} mins</p>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-extrabold">Calories</span>
                <p className="text-base font-black text-stone-900 mt-0.5">{selectedProduct.calories || '750 kcal'}</p>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-extrabold">Dietary</span>
                <p className="text-base font-black text-emerald-700 mt-0.5">Chef Gourmet</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={() => setScreen('menu')}
                className="px-6 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl border border-stone-200"
              >
                Back to Menu
              </button>
              <button
                onClick={() => handleOpenCustomize(selectedProduct)}
                className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 min-h-[56px]"
              >
                <span>Proceed to Customization</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 5: CUSTOMIZATION */}
        {screen === 'customize' && selectedProduct && (
          <div className="max-w-3xl mx-auto bg-white border border-stone-200/80 rounded-3xl p-8 space-y-6 shadow-xl animate-fadeIn">
            <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
              {selectedProduct.image_url ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs shrink-0">
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                </div>
              ) : null}
              <div className="flex-1">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Customize Dish</span>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900">{selectedProduct.name}</h2>
              </div>
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                Rs. {(Number(selectedProduct.base_price) * customItemQuantity).toLocaleString()}
              </span>
            </div>

            {/* Doneness Selector */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Doneness Preference</label>
              <div className="grid grid-cols-5 gap-2">
                {['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setCustomDoneness(level)}
                    className={`py-3 px-2 rounded-xl text-xs font-extrabold transition-all min-h-[48px] ${
                      customDoneness === level
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md ring-2 ring-amber-300'
                        : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Side Dish Selector */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Gourmet Side Choice</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Truffle Parmesan Fries',
                  'Garlic Mashed Potatoes',
                  'Charred Asparagus',
                  'Creamed Spinach',
                ].map((side) => (
                  <button
                    key={side}
                    onClick={() => setCustomSide(side)}
                    className={`p-3 rounded-xl text-xs font-bold text-left transition-all min-h-[48px] flex items-center justify-between ${
                      customSide === side
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md border-amber-500'
                        : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    <span>{side}</span>
                    {customSide === side && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <span className="text-xs font-extrabold uppercase text-stone-700">Quantity</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCustomItemQuantity(Math.max(1, customItemQuantity - 1))}
                  className="h-10 w-10 bg-white border border-stone-200 hover:bg-stone-100 rounded-xl flex items-center justify-center text-stone-800 font-bold shadow-xs"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-black text-stone-900 w-6 text-center">{customItemQuantity}</span>
                <button
                  onClick={() => setCustomItemQuantity(customItemQuantity + 1)}
                  className="h-10 w-10 bg-white border border-stone-200 hover:bg-stone-100 rounded-xl flex items-center justify-center text-stone-800 font-bold shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Special Notes */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Kitchen / Allergen Note</label>
              <input
                type="text"
                placeholder="e.g. Extra sauce on side, less spicy..."
                value={customItemNotes}
                onChange={(e) => setCustomItemNotes(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t border-stone-100">
              <button
                onClick={() => setScreen('menu')}
                className="px-6 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl border border-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 min-h-[56px]"
              >
                <ShoppingBag className="h-5 w-5" />
                <span>Add to Cart (Rs. {(Number(selectedProduct.base_price) * customItemQuantity).toLocaleString()})</span>
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 6: CART */}
        {screen === 'cart' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-stone-900">Your Dining Table Cart</h2>
                <p className="text-xs text-stone-500">Review selected dishes before backend calculation &amp; checkout</p>
              </div>
              <button
                onClick={() => setScreen('menu')}
                className="px-5 py-2.5 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 shadow-xs"
              >
                + Add More Dishes
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-stone-200/80 space-y-4 shadow-xs">
                <ShoppingBag className="h-14 w-14 text-stone-300 mx-auto" />
                <h3 className="text-lg font-bold text-stone-900">Your cart is empty</h3>
                <p className="text-xs text-stone-500">Browse our menu to select delicious steaks, mains, and drinks.</p>
                <button
                  onClick={() => setScreen('menu')}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20"
                >
                  Browse Menu Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-stone-200/80 rounded-2xl p-5 flex items-center justify-between shadow-xs"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-stone-900">{item.name}</h4>
                        <div className="text-xs text-stone-500 flex flex-wrap gap-2">
                          {item.doneness && (
                            <span className="bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                              Doneness: {item.doneness}
                            </span>
                          )}
                          {item.side && (
                            <span className="bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                              Side: {item.side}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Note: {item.notes}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-700 font-bold mt-1">
                          Rs. {(item.unit_price * item.quantity).toLocaleString()} (Rs. {item.unit_price.toLocaleString()} each)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpdateCartQty(item.id, -1)}
                          className="h-9 w-9 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center text-stone-800 font-bold"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-black text-stone-900 w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateCartQty(item.id, 1)}
                          className="h-9 w-9 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center justify-center text-stone-800 font-bold"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Special Table Instructions Input */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200/80 space-y-2 shadow-xs">
                    <label className="text-xs font-extrabold text-stone-700 uppercase">Special Table Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Please bring appetizers first, celebrate birthday dessert..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Cart Order Summary Sidebar */}
                <div className="bg-white border border-stone-200/80 rounded-3xl p-6 space-y-6 h-fit shadow-lg">
                  <h3 className="text-base font-black text-stone-900 border-b border-stone-100 pb-3">
                    Order Summary
                  </h3>

                  {/* Tip Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-stone-500 uppercase">Staff Tip Gratitude</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[15, 18, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => {
                            setSelectedTipPercent(pct);
                            setCustomTipAmount('0');
                          }}
                          className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                            selectedTipPercent === pct
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Financial Breakdown Preview */}
                  {backendCalculation && (
                    <div className="space-y-2.5 text-xs border-t border-b border-stone-100 py-4">
                      <div className="flex justify-between text-stone-500">
                        <span>Items Subtotal ({backendCalculation.item_count} items)</span>
                        <span className="text-stone-900 font-bold">${Number(backendCalculation.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>Estimated Sales Tax ({backendCalculation.tax_rate}%)</span>
                        <span className="text-stone-900 font-bold">${Number(backendCalculation.tax_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-500">
                        <span>Gratitude Tip</span>
                        <span className="text-stone-900 font-bold">${Number(backendCalculation.tip_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-emerald-700 pt-2 border-t border-stone-100">
                        <span>Estimated Total</span>
                        <span>${Number(backendCalculation.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setScreen('checkout')}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 min-h-[56px]"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 7: CHECKOUT */}
        {screen === 'checkout' && (
          <div className="max-w-3xl mx-auto bg-white border border-stone-200/80 rounded-3xl p-8 space-y-6 shadow-xl animate-fadeIn">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-extrabold text-amber-700 uppercase tracking-widest">Step 7 • Final Review &amp; Payment</span>
              <h2 className="text-2xl font-black text-stone-900 mt-1">Order Checkout</h2>
            </div>

            {/* Backend Calculation Display Box */}
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between text-xs text-amber-800 font-extrabold uppercase">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> Live Backend Calculation Verified
                </span>
                <span>{tableNumber}</span>
              </div>

              {isCalculating ? (
                <div className="text-center py-4 text-xs text-stone-500">Calculating order totals on FastAPI backend...</div>
              ) : backendCalculation ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-stone-900">${Number(backendCalculation.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Tax ({backendCalculation.tax_rate}%)</span>
                    <span className="font-bold text-stone-900">${Number(backendCalculation.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Staff Tip</span>
                    <span className="font-bold text-stone-900">${Number(backendCalculation.tip_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-emerald-700 pt-2 border-t border-stone-200">
                    <span>Grand Total Due</span>
                    <span>${Number(backendCalculation.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setPaymentMethod('CARD_READER')}
                  className={`p-4 rounded-2xl text-xs font-extrabold flex flex-col items-center gap-2 border transition-all min-h-[64px] ${
                    paymentMethod === 'CARD_READER'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-500 shadow-md'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <CreditCard className="h-6 w-6" />
                  <span>Table Card Terminal</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('APPLE_PAY')}
                  className={`p-4 rounded-2xl text-xs font-extrabold flex flex-col items-center gap-2 border transition-all min-h-[64px] ${
                    paymentMethod === 'APPLE_PAY'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-500 shadow-md'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Sparkle className="h-6 w-6" />
                  <span>NFC / Apple Pay</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-4 rounded-2xl text-xs font-extrabold flex flex-col items-center gap-2 border transition-all min-h-[64px] ${
                    paymentMethod === 'CASH'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-500 shadow-md'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <UtensilsCrossed className="h-6 w-6" />
                  <span>Pay Cash to Server</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t border-stone-100">
              <button
                onClick={() => setScreen('cart')}
                className="px-6 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl border border-stone-200"
              >
                Back to Cart
              </button>
              <button
                onClick={handlePlaceBackendOrder}
                disabled={isSubmittingOrder}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 min-h-[56px] disabled:opacity-50"
              >
                {isSubmittingOrder ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Submitting Order to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-6 w-6" />
                    <span>Send Order to Kitchen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 8: ORDER CONFIRMATION */}
        {screen === 'confirmation' && lastPlacedOrder && (
          <div className="max-w-2xl mx-auto bg-white border border-stone-200/80 rounded-3xl p-8 text-center space-y-6 shadow-xl animate-fadeIn">
            <div className="h-20 w-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200">
                Order Confirmed &amp; Sent to Kitchen
              </span>
              <h2 className="text-3xl font-black text-stone-900 mt-3">
                Order #{lastPlacedOrder.order_number}
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Your order is currently queued and routed to the kitchen KDS display.
              </p>
            </div>

            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 text-left space-y-3 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Table ID</span>
                <span className="text-stone-900 font-bold">{tableNumber} (Main Dining)</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Placed At</span>
                <span className="text-stone-900 font-bold">{new Date(lastPlacedOrder.placed_at).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Estimated Prep Time</span>
                <span className="text-emerald-700 font-black">15 Minutes</span>
              </div>
              <div className="flex justify-between text-stone-500 pt-2 border-t border-stone-200 text-sm">
                <span>Total Amount Charged</span>
                <span className="text-stone-900 font-black">${Number(lastPlacedOrder.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => setScreen('menu')}
                className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-2xl border border-stone-200 min-h-[52px]"
              >
                Return to Menu
              </button>
              <button
                onClick={() => setScreen('tracking')}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-600/25 min-h-[52px]"
              >
                Track Live Order Status
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 9: ORDER TRACKING */}
        {screen === 'tracking' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-stone-900">Live Kitchen Order Tracker</h2>
                <p className="text-xs text-stone-500">Real-time status updates directly from kitchen KDS system</p>
              </div>
              <div className="flex items-center gap-2">
                {activeTableOrders.length > 0 && (
                  <button
                    onClick={() => setIsConfirmingClearAll(true)}
                    disabled={isClearingAll}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold text-xs rounded-xl border border-red-200/80 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Clear all orders for this table"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Tracker</span>
                  </button>
                )}
                <button
                  onClick={async () => {
                    setIsRefreshingOrders(true);
                    try {
                      const orders = await getTableActiveOrders(tableId);
                      setActiveTableOrders(orders || []);
                    } catch (e) {
                      console.warn('Refresh error:', e);
                    } finally {
                      setIsRefreshingOrders(false);
                    }
                  }}
                  disabled={isRefreshingOrders}
                  className="px-4 py-2 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshingOrders ? 'animate-spin text-amber-600' : ''}`} />
                  <span>{isRefreshingOrders ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {activeTableOrders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-stone-200/80 space-y-3 shadow-xs">
                <Clock className="h-12 w-12 text-stone-300 mx-auto" />
                <h3 className="text-lg font-bold text-stone-900">No active orders placed yet</h3>
                <p className="text-xs text-stone-500">Place an order from the menu to track kitchen preparation status.</p>
                <button
                  onClick={() => setScreen('menu')}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Go to Menu
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTableOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white border border-stone-200/80 rounded-3xl p-6 space-y-6 shadow-sm relative group hover:border-stone-300 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                      <div>
                        <h3 className="text-xl font-black text-stone-900">Order #{ord.order_number}</h3>
                        <p className="text-xs text-stone-500">Placed at {new Date(ord.placed_at).toLocaleTimeString()}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={`px-4 py-1.5 rounded-full font-black text-xs border ${
                          ord.status.toUpperCase() === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : ord.status.toUpperCase() === 'READY'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : ord.status.toUpperCase() === 'PREPARING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-stone-100 text-stone-800 border-stone-300'
                        }`}>
                          STATUS: {ord.status}
                        </span>
                        <button
                          onClick={() => setOrderToDelete(ord)}
                          disabled={deletingOrderId === ord.id}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold text-xs rounded-xl border border-red-200/80 flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                          title={`Delete Order #${ord.order_number}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar Timeline */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2">
                      {['PENDING', 'PREPARING', 'READY', 'SERVED'].map((step, idx) => {
                        const statuses = ['PENDING', 'PREPARING', 'READY', 'SERVED'];
                        const currentIdx = statuses.indexOf(ord.status.toUpperCase());
                        const isDone = currentIdx >= idx;
                        return (
                          <div key={step} className="space-y-2">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                isDone ? 'bg-emerald-500 shadow-sm shadow-emerald-500/25' : 'bg-stone-200'
                              }`}
                            />
                            <span className={`font-bold ${isDone ? 'text-emerald-700' : 'text-stone-400'}`}>
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Items List */}
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <span className="font-extrabold text-stone-500 uppercase">Ordered Dishes</span>
                      {ord.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-stone-900 font-medium">
                          <span>{it.quantity}x {it.product_name} ({it.notes || 'Standard'})</span>
                          <span className="text-emerald-700 font-bold">${Number(it.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 10: MODULAR GAME SYSTEM */}
        {screen === 'games' && (
          <GameLauncher onBackToMenu={() => setScreen('menu')} />
        )}

        {/* SCREEN 11: AI EXPERIENCE ENGINE */}
        {screen === 'ai' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-amber-600" />
                  AI Culinary Experience Engine
                </h2>
                <p className="text-xs text-stone-500">
                  Powered by Google Gemini culinary intelligence &amp; interactive smart surface design
                </p>
              </div>

              {/* Navigation Sub-Tabs */}
              <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 p-1.5 rounded-2xl">
                <button
                  onClick={() => setAiSubTab('sommelier')}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    aiSubTab === 'sommelier'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Wine className="h-3.5 w-3.5" />
                  <span>Sommelier</span>
                </button>
                <button
                  onClick={() => setAiSubTab('concierge')}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    aiSubTab === 'concierge'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Dining Concierge</span>
                </button>
                <button
                  onClick={() => setAiSubTab('ambiance')}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    aiSubTab === 'ambiance'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span>Table Ambiance</span>
                </button>
              </div>
            </div>

            {/* TAB 1: AI SOMMELIER */}
            {aiSubTab === 'sommelier' && (
              <div className="space-y-6">
                <div className="bg-white border border-stone-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                  <label className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                    What dish or flavor profile are you pairing today?
                  </label>
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. I am ordering the Prime Ribeye with truffle fries, recommend a bold dark fruit wine..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      'Pair with Prime Ribeye Steak',
                      'Light seafood pairing for Sea Bass',
                      'Vegetarian Risotto wine pairing',
                      'Artisanal mocktail for dessert',
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAiPrompt(preset);
                          handleAiPairingSubmit(preset);
                        }}
                        className="text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg border border-stone-200"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleAiPairingSubmit()}
                    disabled={isAiGenerating}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 min-h-[52px] disabled:opacity-50"
                  >
                    {isAiGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        <span>Analyzing Tannins &amp; Flavor Profiles...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span>Generate Sommelier Pairing</span>
                      </>
                    )}
                  </button>
                </div>

                {aiResult && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200 rounded-3xl p-6 space-y-3 shadow-sm animate-fadeIn">
                    <span className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Wine className="h-4 w-4 text-amber-600" /> Sommelier Pairing Note
                    </span>
                    <p className="text-sm text-stone-800 leading-relaxed font-medium whitespace-pre-line">
                      {aiResult}
                    </p>
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={() => setScreen('menu')}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        Browse Cellar Reserve Drinks
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DINING CONCIERGE & DIETARY ASSISTANT */}
            {aiSubTab === 'concierge' && (
              <div className="bg-white border border-stone-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                      Concierge Online — {tableNumber}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500">Dietary &amp; Allergen Aware</span>
                </div>

                {/* Dietary Badges */}
                {conciergeDietaryFlags.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-stone-500 font-bold">Detected Flags:</span>
                    {conciergeDietaryFlags.map((flag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        ✓ {flag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Chat Scroll Area */}
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  {conciergeHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-br-none shadow-sm'
                            : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-xs whitespace-pre-line'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {isConciergeLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-stone-200 p-3 rounded-2xl rounded-bl-none flex items-center gap-2 text-xs text-stone-500 shadow-xs">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Concierge is typing...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Prompts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  {[
                    'Which dishes are gluten-free?',
                    'Are there nuts or dairy in the desserts?',
                    'What pairs best with the Ribeye?',
                    'How do multiplayer table games work?',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendConciergeMessage(preset)}
                      className="text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1 rounded-lg border border-stone-200"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={conciergeQuery}
                    onChange={(e) => setConciergeQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendConciergeMessage()}
                    placeholder="Ask concierge about ingredients, allergens, or dishes..."
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                  <button
                    onClick={() => handleSendConciergeMessage()}
                    disabled={isConciergeLoading || !conciergeQuery.trim()}
                    className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-2xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PERSONALIZED VISUAL AMBIANCE */}
            {aiSubTab === 'ambiance' && (
              <div className="space-y-6">
                <div className="bg-white border border-stone-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                  <div>
                    <h3 className="text-base font-black text-stone-900">Smart Table Surface Ambiance</h3>
                    <p className="text-xs text-stone-500">
                      Personalize the 32-inch interactive table graphics &amp; ambient lighting
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        title: 'Golden Sunset Terrace',
                        desc: 'Warm golden candlelight ambiance with gentle honey glow and acoustic bistro tones.',
                        palette: 'Amber & Gold',
                        accent: 'border-amber-300',
                      },
                      {
                        title: 'Mediterranean Riviera Breeze',
                        desc: 'Crisp coastal azure ripples reacting to glassware with clean coastal serenity.',
                        palette: 'Aquamarine & Sky',
                        accent: 'border-sky-300',
                      },
                      {
                        title: 'Rose Garden Romance',
                        desc: 'Soft blush floral velvet visuals for intimate celebratory dining occasions.',
                        palette: 'Blush & Coral',
                        accent: 'border-rose-300',
                      },
                      {
                        title: 'Artisanal Vineyard Estate',
                        desc: 'Rustic olive and rich grape textures evoking classic European wine cellars.',
                        palette: 'Burgundy & Olive',
                        accent: 'border-emerald-300',
                      },
                    ].map((theme, idx) => (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl bg-stone-50 border ${
                          ambianceTheme === theme.title ? 'border-amber-500 shadow-md ring-2 ring-amber-300/50 bg-amber-50/20' : theme.accent
                        } space-y-3 flex flex-col justify-between`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-sm text-stone-900">{theme.title}</h4>
                            <span className="text-[10px] font-bold text-stone-500">{theme.palette}</span>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed mt-1.5">{theme.desc}</p>
                        </div>
                        <button
                          onClick={() => handleApplyAmbiance(theme.title, theme.desc)}
                          disabled={isAmbianceApplying}
                          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all"
                        >
                          {ambianceTheme === theme.title ? 'Active on Table' : 'Apply Theme'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {ambianceSuccessMessage && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span>{ambianceSuccessMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 12: HELP & TABLE SERVICES */}
        {screen === 'help' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black text-stone-900">Help &amp; Table Staff Assistance</h2>
              <p className="text-xs text-stone-500">One-touch service alerts dispatched directly to floor server</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTriggerServiceCall('Server Call')}
                className="p-6 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-3xl text-left space-y-3 active:scale-95 transition-all shadow-xs hover:shadow-md hover:border-amber-300"
              >
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <BellRing className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-stone-900">Call Waiter / Server</h3>
                <p className="text-xs text-stone-500">Alert your assigned server to visit {tableNumber}</p>
              </button>

              <button
                onClick={() => handleTriggerServiceCall('Water Refill')}
                className="p-6 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-3xl text-left space-y-3 active:scale-95 transition-all shadow-xs hover:shadow-md hover:border-sky-300"
              >
                <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                  <Droplets className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-stone-900">Request Water Refill</h3>
                <p className="text-xs text-stone-500">Bring complimentary sparkling or still water</p>
              </button>

              <button
                onClick={() => handleTriggerServiceCall('Utensils Request')}
                className="p-6 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-3xl text-left space-y-3 active:scale-95 transition-all shadow-xs hover:shadow-md hover:border-emerald-300"
              >
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-stone-900">Extra Cutlery / Napkins</h3>
                <p className="text-xs text-stone-500">Request steak knives, extra plates or napkins</p>
              </button>

              <button
                onClick={() => handleTriggerServiceCall('Bill Requested')}
                className="p-6 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-3xl text-left space-y-3 active:scale-95 transition-all shadow-xs hover:shadow-md hover:border-purple-300"
              >
                <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-stone-900">Request Final Bill</h3>
                <p className="text-xs text-stone-500">Bring printed receipt or wireless payment terminal</p>
              </button>
            </div>

            {waiterCalled && (
              <div className="bg-amber-50 border border-amber-300 rounded-3xl p-6 flex items-center justify-between text-amber-900 shadow-xs">
                <div className="flex items-center gap-3">
                  <BellRing className="h-6 w-6 text-amber-600 animate-bounce" />
                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900">Alert Sent to Floor Staff</h4>
                    <p className="text-xs text-amber-800">Request type: {activeServiceCallType}</p>
                  </div>
                </div>
                <button
                  onClick={handleDismissServiceCall}
                  className="px-4 py-2 bg-white text-stone-800 border border-stone-200 font-bold text-xs rounded-xl hover:bg-stone-50 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Dismiss Alert
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TABLE SELECTOR / HARDWARE BINDING MODAL */}
        {/* ======================================================== */}
        {isTableModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5 text-amber-600" />
                    Select Physical Table Kiosk
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Bind this table screen to any registered restaurant table.
                  </p>
                </div>
                <button
                  onClick={() => setIsTableModalOpen(false)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {allRegisteredTables.map((tbl) => {
                  const isSelected = tbl.id === tableId || tbl.table_number === tableNumber;
                  return (
                    <button
                      key={tbl.id}
                      onClick={() => {
                        setTableId(tbl.id);
                        setTableNumber(tbl.table_number);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('smart_table_preference', tbl.table_number);
                          const url = new URL(window.location.href);
                          url.searchParams.set('table', tbl.table_number);
                          window.location.href = url.toString();
                        }
                      }}
                      className={`p-4 rounded-2xl border text-center transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-500 text-white shadow-md shadow-orange-500/25 ring-2 ring-amber-300'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="text-lg font-black">{tbl.table_number}</div>
                      <div className={`text-[11px] mt-1 ${isSelected ? 'text-white/80' : 'text-stone-500'}`}>Capacity: {tbl.capacity || 4} seats</div>
                      <div className={`text-[10px] uppercase font-bold tracking-wider mt-2 px-2 py-0.5 rounded-full inline-block ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-stone-200/70 text-stone-700'
                      }`}>
                        {tbl.status || 'AVAILABLE'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-2">
                <p className="font-bold text-stone-800">💡 Direct URL Table Access:</p>
                <p className="font-mono text-amber-800 bg-white p-2 rounded-lg border border-stone-200">
                  http://localhost:3001?table=1 &nbsp;|&nbsp; ?table=2 &nbsp;|&nbsp; ?table=8
                </p>
                <p className="text-[11px] text-stone-500">
                  URL parameter automatically binds the table screen and stores the preference.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: CONFIRM DELETE INDIVIDUAL ORDER */}
        {/* ======================================================== */}
        {orderToDelete && (
          <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Delete Order?</h3>
                  <p className="text-xs text-stone-500">Order #{orderToDelete.order_number}</p>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2 text-xs">
                <p className="text-stone-600">
                  Are you sure you want to delete this order? It will be removed from your active tracker and cancelled in the kitchen.
                </p>
                <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-700">
                  <span>Total Amount:</span>
                  <span className="text-emerald-700 font-extrabold">${Number(orderToDelete.total_amount).toFixed(2)}</span>
                </div>
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
        {/* MODAL: CONFIRM CLEAR ALL TABLE ORDERS */}
        {/* ======================================================== */}
        {isConfirmingClearAll && (
          <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Clear All Orders?</h3>
                  <p className="text-xs text-stone-500">{activeTableOrders.length} order(s) currently tracked</p>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-600 space-y-1">
                <p>
                  This will remove all active and completed orders for <strong className="text-stone-900">{tableNumber}</strong> from the live tracker.
                </p>
                <p className="text-stone-500 text-[11px]">
                  This action will dismiss all tickets for this table.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingClearAll(false)}
                  disabled={isClearingAll}
                  className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllOrders}
                  disabled={isClearingAll}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isClearingAll ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Yes, Clear All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Hardware Kiosk & Staff Diagnostics Pill (Dynamically synced with active table) */}
      <KioskGuard
        tableNumber={tableNumber}
        deviceId={`dev-${tableNumber.replace(/[^0-9]/g, '').padStart(3, '0') || '001'}`}
      />
    </div>
  );
}
