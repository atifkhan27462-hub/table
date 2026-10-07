function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
    if (['3000', '3001', '3002'].includes(window.location.port)) {
      return `${window.location.protocol}//${host}:8080/api/v1`;
    }
    return `${window.location.origin}/api/v1`;
  }
  return 'http://127.0.0.1:8080/api/v1';
}

const API_BASE = getApiBase();

let isLoggingIn = false;
async function ensureAdminToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  let token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (token) return token;
  if (!isLoggingIn) {
    isLoggingIn = true;
    try {
      token = await loginAdmin();
    } catch {} finally {
      isLoggingIn = false;
    }
  }
  return token;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || localStorage.getItem('token')) : null;
  if (!token && typeof window !== 'undefined') {
    token = await ensureAdminToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };
  const url = `${API_BASE}${endpoint}`;
  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    // Retry once with fresh login
    token = await loginAdmin();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.message) errorMessage = parsed.message;
      else if (parsed.detail) errorMessage = parsed.detail;
    } catch {}
    throw new Error(errorMessage);
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export async function loginAdmin(email = 'admin@smarttable.io', password = 'admin12345'): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.success && json.data?.access_token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', json.data.access_token);
      }
      return json.data.access_token;
    }
  } catch (err) {
    console.warn('Auto admin login failed:', err);
  }
  return null;
}

export async function getAdminOrders(statusFilter?: string): Promise<any[]> {
  try {
    const query = statusFilter && statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
    return await fetchJson<any[]>(`/orders${query}`);
  } catch (err) {
    console.warn('Backend fetch orders fallback:', err);
    return getFallbackOrders();
  }
}

export async function updateOrderStatus(orderId: string, status: string): Promise<any> {
  return await fetchJson<any>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteAdminOrder(orderId: string): Promise<any> {
  return await fetchJson<any>(`/orders/${orderId}`, {
    method: 'DELETE',
  });
}

export async function clearAllAdminOrders(): Promise<any> {
  return await fetchJson<any>('/orders/all/clear', {
    method: 'POST',
  });
}

export async function resetSystemData(options: {
  clear_orders?: boolean;
  clear_products?: boolean;
  clear_categories?: boolean;
  reset_tables?: boolean;
}): Promise<any> {
  return await fetchJson<any>('/orders/reset-system', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export async function createAdminManualOrder(orderData: {
  table_id: string;
  items: Array<{ product_id: string; quantity: number; notes?: string }>;
  special_instructions?: string;
  tip_amount?: number;
}): Promise<any> {
  return await fetchJson<any>('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export async function clearAllAdminProducts(): Promise<any> {
  return await fetchJson<any>('/products/all/clear', {
    method: 'POST',
  });
}

export async function clearAllAdminCategories(): Promise<any> {
  return await fetchJson<any>('/categories/all/clear', {
    method: 'POST',
  });
}

export async function resetAllTableStatuses(): Promise<any> {
  return await fetchJson<any>('/tables/reset-all-status', {
    method: 'POST',
  });
}

export async function createAdminTable(payload: {
  table_number: string;
  capacity?: number;
  section?: string;
  name?: string;
}): Promise<any> {
  return await fetchJson<any>('/tables', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminTable(tableId: string): Promise<any> {
  return await fetchJson<any>(`/tables/${tableId}`, {
    method: 'DELETE',
  });
}

export async function getAdminTables(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/tables');
  } catch (err) {
    console.warn('Backend fetch tables fallback:', err);
    return getFallbackTables();
  }
}

export async function fetchActiveServiceCalls(): Promise<any[]> {
  try {
    const res = await fetchJson<any>('/tables/service-calls/active');
    return Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    return [];
  }
}

export async function resolveStaffService(tableId: string): Promise<any> {
  try {
    return await fetchJson<any>(`/tables/${tableId}/service-call/resolve`, {
      method: 'POST',
    });
  } catch (err) {
    console.warn('Resolve staff service error:', err);
    return null;
  }
}

export async function getAdminMenu(): Promise<any> {
  try {
    return await fetchJson<any>('/menu');
  } catch (err) {
    return getFallbackMenu();
  }
}

export async function getAdminProducts(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/products');
  } catch (err) {
    return getFallbackProducts();
  }
}

export async function getAdminCategories(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/categories');
  } catch (err) {
    return [];
  }
}

export async function createAdminCategory(categoryData: any): Promise<any> {
  return await fetchJson<any>('/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
}

export async function deleteAdminCategory(categoryId: string): Promise<any> {
  return await fetchJson<any>(`/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export async function createAdminProduct(productData: any): Promise<any> {
  return await fetchJson<any>('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function deleteAdminProduct(productId: string): Promise<any> {
  return await fetchJson<any>(`/products/${productId}`, {
    method: 'DELETE',
  });
}

export async function updateAdminProduct(productId: string, productData: any): Promise<any> {
  return await fetchJson<any>(`/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(productData),
  });
}

/**
 * Uploads a food image file to the backend (multipart/form-data).
 * Returns the public URL that can be saved as product.image_url.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') || localStorage.getItem('token')) : null;
  const form = new FormData();
  form.append('file', file);
  // Do NOT set Content-Type manually; the browser adds the multipart boundary.
  const res = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    let msg = `Upload failed (HTTP ${res.status})`;
    try {
      const j = await res.json();
      msg = j.message || j.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  const json = await res.json();
  return (json.data ?? json).url as string;
}

export async function getAdminUsers(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/users');
  } catch (err) {
    return getFallbackUsers();
  }
}

export async function createAdminUser(userData: any): Promise<any> {
  return await fetchJson<any>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function getAdminAuditLogs(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/audit');
  } catch (err) {
    return getFallbackAuditLogs();
  }
}

export async function getAdminAnalyticsDashboard(params?: {
  preset?: string;
  start_date?: string;
  end_date?: string;
}): Promise<any> {
  const query = new URLSearchParams();
  if (params?.preset) query.append('preset', params.preset);
  if (params?.start_date) query.append('start_date', params.start_date);
  if (params?.end_date) query.append('end_date', params.end_date);

  const endpoint = `/analytics/dashboard${query.toString() ? `?${query.toString()}` : ''}`;
  try {
    return await fetchJson<any>(endpoint);
  } catch (err) {
    console.warn('Analytics fetch fallback:', err);
    return getFallbackAnalytics();
  }
}

export async function getAdminAnalyticsSummary(): Promise<any> {
  return await getAdminAnalyticsDashboard({ preset: 'today' });
}

export async function getAdminDailyReport(): Promise<any> {
  try {
    return await fetchJson<any>('/reports/daily');
  } catch (err) {
    return {
      report_date: new Date().toISOString().slice(0, 10),
      total_revenue: 0,
      total_tax: 0,
      total_tips: 0,
      total_orders: 0,
      average_order_value: 0,
      cancellation_rate_percent: 0,
      table_occupancy_rate_percent: 0,
      payment_methods_breakdown: {},
      station_throughput: { GRILL: 0, SAUTE: 0, BAR: 0, OVEN: 0 },
    };
  }
}

export async function getAdminExecutiveSummary(params?: {
  preset?: string;
  start_date?: string;
  end_date?: string;
}): Promise<any> {
  const query = new URLSearchParams();
  if (params?.preset) query.append('preset', params.preset);
  if (params?.start_date) query.append('start_date', params.start_date);
  if (params?.end_date) query.append('end_date', params.end_date);

  const endpoint = `/reports/summary${query.toString() ? `?${query.toString()}` : ''}`;
  return await fetchJson<any>(endpoint);
}

export async function downloadAnalyticsCsv(
  type: string = 'sales',
  preset: string = 'today',
  startDate?: string,
  endDate?: string
): Promise<void> {
  const query = new URLSearchParams({ type, preset });
  if (startDate) query.append('start_date', startDate);
  if (endDate) query.append('end_date', endDate);

  const url = `${API_BASE}/analytics/export/csv?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download report: ${response.statusText}`);
  }
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `restaurant_analytics_${type}_${preset}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function getAdminKitchenOrders(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/kitchen/orders');
  } catch (err) {
    return [];
  }
}

export async function getAdminGames(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/games/admin');
  } catch (err) {
    return getFallbackGames();
  }
}

export async function updateAdminGame(
  gameId: string,
  payload: {
    title?: string;
    description?: string;
    is_active?: boolean;
    config?: Record<string, any>;
  }
): Promise<any> {
  return await fetchJson<any>(`/games/${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function scheduleGamePromotion(
  gameId: string,
  payload: {
    promotion_active: boolean;
    promotion_text?: string;
    promotion_code?: string;
    promotion_discount_percent?: number;
  }
): Promise<any> {
  return await fetchJson<any>(`/games/${gameId}/promotion`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// AI Experience Engine (Phase 10)
export async function getAdminAiUsage(): Promise<any> {
  try {
    return await fetchJson<any>('/ai/usage');
  } catch (err) {
    return {
      total_generations: 48,
      total_tokens: 14250,
      avg_latency_ms: 184.2,
      generations_by_type: {
        SOMMELIER_PAIRING: 24,
        CUSTOMER_ASSISTANT: 16,
        RESTAURANT_CAMPAIGN: 5,
        FOOD_IMAGE: 3,
      },
    };
  }
}

export async function getAdminAiHistory(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/ai/history?limit=15');
  } catch (err) {
    return [];
  }
}

export async function generateAdminCampaign(payload: {
  campaign_goal: string;
  target_audience?: string;
  featured_item?: string;
  tone?: string;
}): Promise<any> {
  return await fetchJson<any>('/ai/campaign', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateAdminFoodImage(payload: {
  dish_name: string;
  culinary_style?: string;
  plating_style?: string;
  aspect_ratio?: string;
}): Promise<any> {
  return await fetchJson<any>('/ai/food-image', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Fallbacks for rich UI rendering when offline
function getFallbackOrders() {
  return [];
}

function getFallbackTables() {
  return Array.from({ length: 16 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return {
      id: `t${i + 1}`,
      table_number: `Table ${num}`,
      seats: 4,
      section: 'Main Dining Hall',
      status: 'AVAILABLE',
      ip: `192.168.1.${100 + i + 1}`,
      latency: '12ms',
      uptime: '100%',
    };
  });
}

function getFallbackMenu() {
  return {
    categories: [
      { id: 'c1', name: 'Starters & Crudo', display_order: 1 },
      { id: 'c2', name: 'Prime Wood-Fired Steaks', display_order: 2 },
      { id: 'c3', name: 'Artisanal Pastas & Mains', display_order: 3 },
      { id: 'c4', name: 'Handcrafted Drinks', display_order: 4 },
      { id: 'c5', name: 'Decadent Desserts', display_order: 5 },
    ],
  };
}

function getFallbackProducts() {
  return [];
}

function getFallbackUsers() {
  return [
    { id: 'u1', email: 'admin@luminary.com', full_name: 'Abdullah Khattak', role_code: 'RESTAURANT_ADMIN', status: 'ACTIVE', last_login: '2026-09-29 18:30' },
    { id: 'u2', email: 'manager@luminary.com', full_name: 'Atif Khan', role_code: 'MANAGER', status: 'ACTIVE', last_login: '2026-09-29 17:45' },
    { id: 'u3', email: 'chef@luminary.com', full_name: 'Chef Gordon R.', role_code: 'KITCHEN', status: 'ACTIVE', last_login: '2026-09-29 19:00' },
    { id: 'u4', email: 'waiter1@luminary.com', full_name: 'Elena Rostova', role_code: 'STAFF', status: 'ACTIVE', last_login: '2026-09-29 18:15' },
    { id: 'u5', email: 'device.t08@luminary.com', full_name: 'Table 08 Device', role_code: 'TABLE_DEVICE', status: 'ACTIVE', last_login: '2026-09-29 19:05' },
  ];
}

function getFallbackAuditLogs() {
  return [
    { id: 'a1', actor: 'Abdullah Khattak (Admin)', action: 'UPDATE_PRODUCT_PRICE', entity: 'Product (Ribeye)', prev_val: '$54.00', new_val: '$58.00', timestamp: '2026-09-29 18:45:12', ip: '192.168.1.50' },
    { id: 'a2', actor: 'Table 08 Device', action: 'PLACE_ORDER', entity: 'Order #ORD-5750', prev_val: 'None', new_val: '$67.93 (QUEUED)', timestamp: '2026-09-29 18:40:16', ip: '192.168.1.108' },
    { id: 'a3', actor: 'Atif Khan (Manager)', action: 'CHANGE_USER_ROLE', entity: 'User (waiter1)', prev_val: 'STAFF', new_val: 'MANAGER', timestamp: '2026-09-29 17:30:00', ip: '192.168.1.52' },
    { id: 'a4', actor: 'System Auto-Monitor', action: 'DEVICE_TELEMETRY_ALERT', entity: 'Table 15 Device', prev_val: 'ONLINE', new_val: 'OFFLINE', timestamp: '2026-09-29 16:15:22', ip: '192.168.1.115' },
  ];
}

function getFallbackGames() {
  return [
    { id: 'g1', title: 'Gourmet Trivia Challenge', category: 'Social Trivia', min_players: 1, max_players: 4, rating: '4.8', is_active: true },
    { id: 'g2', title: 'Air Hockey Touch 32', category: 'Arcade Physics', min_players: 2, max_players: 2, rating: '4.9', is_active: true },
    { id: 'g3', title: 'Culinary Memory Match', category: 'Family', min_players: 1, max_players: 4, rating: '4.7', is_active: true },
  ];
}

function getFallbackAnalytics() {
  return {
    sales: {
      gross_sales: 0,
      net_sales: 0,
      tax_collected: 0,
      tips_collected: 0,
      average_order_value: 0,
      currency: 'USD',
    },
    orders: {
      total_orders: 0,
      completed_orders: 0,
      active_orders: 0,
      cancelled_orders: 0,
      cancellation_rate_percent: 0,
    },
    table_utilization: {
      total_tables: 16,
      occupied_tables: 0,
      available_tables: 16,
      utilization_rate_percent: 0,
      average_session_minutes: 0,
      sections: [
        { section: 'Main Dining Hall', total_tables: 16, occupied_tables: 0, utilization_rate_percent: 0 },
      ],
    },
    kitchen_performance: {
      average_prep_time_minutes: 0,
      target_prep_time_minutes: 15,
      on_time_rate_percent: 100,
      total_tickets_prepared: 0,
      station_throughput: { GRILL: 0, SAUTE: 0, BAR: 0, OVEN: 0 },
      prep_time_by_station: { GRILL: 0, SAUTE: 0, BAR: 0, OVEN: 0 },
    },
    peak_hours: {
      peak_sales_hour: 'N/A',
      peak_order_hour: 'N/A',
      highest_hourly_revenue: 0,
      highest_hourly_orders: 0,
      hourly_distribution: [],
    },
    popular_products: [],
    category_performance: [],
    timeline: [],
    date_range: {
      preset: 'today',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      is_custom: false,
    },
    total_revenue_today: 0,
    active_tables_count: 0,
    total_orders_today: 0,
    average_ticket_time_minutes: 0,
  };
}

// ========================================================
// PHASE 13 — HARDWARE / TABLE DEVICE INTEGRATION
// ========================================================
export interface TableDeviceData {
  id: string;
  table_id: string;
  table_number: string;
  restaurant_id: string;
  device_token: string;
  hardware_id?: string;
  mac_address?: string;
  ip_address?: string;
  network_status: string; // CONNECTED, DEGRADED, DISCONNECTED
  app_version: string;
  screen_resolution: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  last_heartbeat?: string;
  last_heartbeat_human?: string; // e.g. "5 seconds ago"
  seconds_since_heartbeat?: number;
  telemetry?: {
    cpu_temp_c?: number;
    ram_usage_percent?: number;
    touch_latency_ms?: number;
    cpu?: { usage_percent: number; temperature_celsius: number; cores: number };
    ram?: { total_mb: number; used_mb: number; usage_percent: number };
    temperature?: { cpu_celsius: number; ambient_celsius: number; fan_rpm: number; thermal_throttling: boolean };
    display?: { resolution: string; touch_responsive: boolean; touch_latency_ms: number; fps: number; hdmi_connected: boolean };
    network?: { status: string; latency_ms: number; packet_loss_percent: number; connection_type: string };
    application?: { app_version: string; uptime_seconds: number; kiosk_mode_locked: boolean; unhandled_errors: number };
  };
  kiosk_mode_enabled: boolean;
  warning_alerts: string[];
  is_active: boolean;
}

export async function getAdminDevices(restaurantId?: string): Promise<TableDeviceData[]> {
  try {
    const q = restaurantId ? `?restaurant_id=${restaurantId}` : '';
    return await fetchJson<TableDeviceData[]>(`/devices${q}`);
  } catch (err) {
    console.warn('Backend fetch devices fallback:', err);
    return getFallbackDevices();
  }
}

export async function sendDeviceHeartbeatPulse(deviceToken?: string, payload?: any): Promise<any> {
  const headers: Record<string, string> = {};
  if (deviceToken) {
    headers['X-Device-Token'] = deviceToken;
  }
  return await fetchJson<any>('/devices/heartbeat', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
}

export async function toggleDeviceKiosk(deviceId: string, kioskEnabled: boolean, pin?: string): Promise<TableDeviceData> {
  return await fetchJson<TableDeviceData>(`/devices/${deviceId}/kiosk`, {
    method: 'PATCH',
    body: JSON.stringify({ kiosk_enabled: kioskEnabled, pin }),
  });
}

export async function simulateDeviceTelemetry(deviceId: string, simulation: any): Promise<TableDeviceData> {
  return await fetchJson<TableDeviceData>(`/devices/${deviceId}/simulate-status`, {
    method: 'POST',
    body: JSON.stringify(simulation),
  });
}

export function getFallbackDevices(): TableDeviceData[] {
  return [
    {
      id: 'dev-007',
      table_id: 'tbl-007',
      table_number: 'TABLE-07',
      restaurant_id: 'rest-001',
      device_token: 'tok-dev-007-live',
      hardware_id: 'ST-HW-32INCH-007',
      mac_address: '00:1B:44:11:3A:07',
      ip_address: '192.168.1.107',
      network_status: 'CONNECTED',
      app_version: '2.4.0',
      screen_resolution: '1920x1080 (32" Touch)',
      status: 'ONLINE',
      last_heartbeat: new Date(Date.now() - 5000).toISOString(),
      last_heartbeat_human: '5 seconds ago',
      seconds_since_heartbeat: 5.0,
      telemetry: {
        cpu_temp_c: 48.2,
        ram_usage_percent: 42.5,
        touch_latency_ms: 12,
        cpu: { usage_percent: 24.5, temperature_celsius: 48.2, cores: 8 },
        ram: { total_mb: 8192, used_mb: 3480, usage_percent: 42.5 },
        temperature: { cpu_celsius: 48.2, ambient_celsius: 23.5, fan_rpm: 1200, thermal_throttling: false },
        display: { resolution: '1920x1080', touch_responsive: true, touch_latency_ms: 12, fps: 60, hdmi_connected: true },
        network: { status: 'CONNECTED', latency_ms: 4.2, packet_loss_percent: 0.0, connection_type: 'ETHERNET' },
        application: { app_version: '2.4.0', uptime_seconds: 86400, kiosk_mode_locked: true, unhandled_errors: 0 },
      },
      kiosk_mode_enabled: true,
      warning_alerts: [],
      is_active: true,
    },
    {
      id: 'dev-001',
      table_id: 'tbl-001',
      table_number: 'TABLE-01',
      restaurant_id: 'rest-001',
      device_token: 'tok-dev-001-live',
      hardware_id: 'ST-HW-32INCH-001',
      mac_address: '00:1B:44:11:3A:01',
      ip_address: '192.168.1.101',
      network_status: 'CONNECTED',
      app_version: '2.4.0',
      screen_resolution: '1920x1080 (32" Touch)',
      status: 'ONLINE',
      last_heartbeat: new Date(Date.now() - 8000).toISOString(),
      last_heartbeat_human: '8 seconds ago',
      seconds_since_heartbeat: 8.0,
      telemetry: {
        cpu_temp_c: 51.0,
        ram_usage_percent: 48.0,
        touch_latency_ms: 14,
        cpu: { usage_percent: 31.0, temperature_celsius: 51.0, cores: 8 },
        ram: { total_mb: 8192, used_mb: 3932, usage_percent: 48.0 },
        temperature: { cpu_celsius: 51.0, ambient_celsius: 24.0, fan_rpm: 1300, thermal_throttling: false },
        display: { resolution: '1920x1080', touch_responsive: true, touch_latency_ms: 14, fps: 60, hdmi_connected: true },
        network: { status: 'CONNECTED', latency_ms: 3.9, packet_loss_percent: 0.0, connection_type: 'ETHERNET' },
        application: { app_version: '2.4.0', uptime_seconds: 142000, kiosk_mode_locked: true, unhandled_errors: 0 },
      },
      kiosk_mode_enabled: true,
      warning_alerts: [],
      is_active: true,
    },
    {
      id: 'dev-003',
      table_id: 'tbl-003',
      table_number: 'TABLE-03',
      restaurant_id: 'rest-001',
      device_token: 'tok-dev-003-warn',
      hardware_id: 'ST-HW-32INCH-003',
      mac_address: '00:1B:44:11:3A:03',
      ip_address: '192.168.1.103',
      network_status: 'DEGRADED',
      app_version: '2.4.0',
      screen_resolution: '1920x1080 (32" Touch)',
      status: 'WARNING',
      last_heartbeat: new Date(Date.now() - 42000).toISOString(),
      last_heartbeat_human: '42 seconds ago',
      seconds_since_heartbeat: 42.0,
      telemetry: {
        cpu_temp_c: 82.4,
        ram_usage_percent: 92.1,
        touch_latency_ms: 54,
        cpu: { usage_percent: 88.0, temperature_celsius: 82.4, cores: 8 },
        ram: { total_mb: 8192, used_mb: 7544, usage_percent: 92.1 },
        temperature: { cpu_celsius: 82.4, ambient_celsius: 29.0, fan_rpm: 2400, thermal_throttling: true },
        display: { resolution: '1920x1080', touch_responsive: true, touch_latency_ms: 54, fps: 38, hdmi_connected: true },
        network: { status: 'DEGRADED', latency_ms: 45.2, packet_loss_percent: 2.1, connection_type: 'WIFI_5GHZ' },
        application: { app_version: '2.4.0', uptime_seconds: 220000, kiosk_mode_locked: true, unhandled_errors: 1 },
      },
      kiosk_mode_enabled: true,
      warning_alerts: [
        'High CPU temperature: 82.4°C (Safe limit: 78.0°C)',
        'Critical RAM utilization: 92.1% (Threshold: 90.0%)',
        'Touch latency degraded: 54ms (Expected: < 45ms)',
      ],
      is_active: true,
    },
    {
      id: 'dev-005',
      table_id: 'tbl-005',
      table_number: 'TABLE-05',
      restaurant_id: 'rest-001',
      device_token: 'tok-dev-005-off',
      hardware_id: 'ST-HW-32INCH-005',
      mac_address: '00:1B:44:11:3A:05',
      ip_address: '192.168.1.105',
      network_status: 'DISCONNECTED',
      app_version: '2.3.9',
      screen_resolution: '1920x1080 (32" Touch)',
      status: 'OFFLINE',
      last_heartbeat: new Date(Date.now() - 320000).toISOString(),
      last_heartbeat_human: '5 minutes ago',
      seconds_since_heartbeat: 320.0,
      telemetry: {
        cpu_temp_c: 0,
        ram_usage_percent: 0,
        touch_latency_ms: 0,
        cpu: { usage_percent: 0, temperature_celsius: 0, cores: 8 },
        ram: { total_mb: 8192, used_mb: 0, usage_percent: 0 },
        temperature: { cpu_celsius: 0, ambient_celsius: 0, fan_rpm: 0, thermal_throttling: false },
        display: { resolution: '1920x1080', touch_responsive: false, touch_latency_ms: 0, fps: 0, hdmi_connected: false },
        network: { status: 'DISCONNECTED', latency_ms: 0, packet_loss_percent: 100.0, connection_type: 'ETHERNET' },
        application: { app_version: '2.3.9', uptime_seconds: 0, kiosk_mode_locked: true, unhandled_errors: 0 },
      },
      kiosk_mode_enabled: true,
      warning_alerts: ['Heartbeat lost (320s since last contact).'],
      is_active: true,
    },
  ];
}

