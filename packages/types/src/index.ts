/**
 * SMART INTERACTIVE DINING TABLE - SHARED DOMAIN TYPES
 * Enterprise TypeScript definitions shared between Customer App, Admin Dashboard, KDS, and API.
 */

// ==========================================
// 1. AUTHENTICATION & RBAC
// ==========================================

export type UserRole = 'SUPERADMIN' | 'MANAGER' | 'KITCHEN' | 'WAITER' | 'TABLE_DEVICE';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
}

// ==========================================
// 2. HARDWARE & TABLE DEVICE MANAGEMENT
// ==========================================

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'BILL_REQUESTED' | 'RESERVED' | 'OFFLINE';

export interface TableDevice {
  id: string;
  tableNumber: string; // e.g. "Table 04"
  seats: number;
  status: TableStatus;
  ipAddress: string;
  macAddress?: string;
  deviceToken?: string;
  latencyMs?: number;
  uptimePercentage?: number;
  currentBillTotal?: number;
  lastHeartbeat?: string;
}

export interface DeviceTelemetry {
  tableId: string;
  cpuTemperatureC: number;
  coolingFanRpm: number;
  touchLatencyMs: number;
  screenUptimeHours: number;
  networkRssi: number;
  timestamp: string;
}

// ==========================================
// 3. MENU & CATALOG
// ==========================================

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'; // 86'd
export type KitchenStation = 'GRILL' | 'SAUTE' | 'OVEN' | 'COLD' | 'BAR';

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  icon?: string;
  dishCount?: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  calories?: number;
  prepTimeMinutes?: number;
  prepStation: KitchenStation;
  stockStatus: StockStatus;
  allergens: string[];
  tags: string[];
  imageUrl?: string;
  isAvailable: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  extraPrice: number;
  isDefault?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: 'DONENESS' | 'SIDE' | 'EXTRA' | 'SPICE_LEVEL';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

// ==========================================
// 4. ORDERS & KDS
// ==========================================

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'DELAYED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  doneness?: string;
  side?: string;
  notes?: string;
  isPlated?: boolean; // Used by line cooks on KDS checklist
  prepStation?: KitchenStation;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "ORD-9021"
  tableId: string;
  tableNumber: string;
  serverId?: string;
  serverName?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  serviceCharge?: number;
  tip?: number;
  total: number;
  isPaid: boolean;
  paymentMethod?: 'CARD' | 'CASH' | 'DIGITAL_WALLET';
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. AUDIT LOGGING & SECURITY
// ==========================================

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'UPDATE_MENU_PRICE'
  | 'SET_86_ITEM'
  | 'CANCEL_ORDER'
  | 'REFUND_ORDER'
  | 'FORCE_CLEAR_TABLE'
  | 'DEVICE_HEALTH_PING';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  entityName: string;
  entityId?: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILED';
  diffBefore?: Record<string, unknown>;
  diffAfter?: Record<string, unknown>;
}

// ==========================================
// 6. STANDARDIZED API ENVELOPES
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface SystemHealthResponse {
  status: 'HEALTHY' | 'DEGRADED';
  environment: string;
  version: string;
  uptimeSeconds: number;
  dependencies: {
    database: { status: 'UP' | 'DOWN'; engine: string };
    redis: { status: 'UP' | 'DOWN'; role: string };
  };
}

// ==========================================
// 7. REAL-TIME ORDER ENGINE (PHASE 9)
// ==========================================

export type RealtimeEventType =
  | 'ORDER_CREATED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_SERVED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'TABLE_ONLINE'
  | 'TABLE_OFFLINE'
  | 'AI_GENERATION_COMPLETED'
  | 'PING'
  | 'PONG'
  | 'ERROR'
  | 'ACK';

export type RealtimeClientType = 'table' | 'kds' | 'admin';

export interface RealtimeEvent<T = any> {
  event_id: string;
  type: RealtimeEventType;
  timestamp: string;
  restaurant_id?: string;
  table_id?: string;
  data: T;
}

export interface RealtimeClientMessage {
  type: string;
  event_id?: string;
  data?: Record<string, unknown>;
  idempotency_key?: string;
}

// ==========================================
// 8. AI EXPERIENCE ENGINE (PHASE 10)
// ==========================================

export type AiGenerationType =
  | 'FOOD_IMAGE'
  | 'PROMOTIONAL_CONTENT'
  | 'PERSONALIZED_VISUAL'
  | 'RESTAURANT_CAMPAIGN'
  | 'SOMMELIER_PAIRING'
  | 'CUSTOMER_ASSISTANT';

export interface AiGenerateRequest {
  table_id?: string;
  prompt: string;
  generation_type?: AiGenerationType;
  parameters?: Record<string, unknown>;
}

export interface AiGenerateResponse {
  id: string;
  generation_type: AiGenerationType;
  prompt: string;
  result_content: string;
  image_url?: string;
  model_name: string;
  tokens_used: number;
  latency_ms?: number;
  created_at: string;
}

export interface AiCampaignRequest {
  campaign_goal: string;
  target_audience?: string;
  featured_item?: string;
  tone?: 'luxurious' | 'energetic' | 'casual' | 'celebratory';
  channels?: string[];
}

export interface AiCampaignResponse {
  id: string;
  campaign_name: string;
  headline: string;
  body_copy: string;
  social_captions: string[];
  call_to_action: string;
  suggested_hashtags: string[];
  created_at: string;
}

export interface AiFoodImageRequest {
  dish_name: string;
  culinary_style?: string;
  plating_style?: string;
  lighting?: string;
  aspect_ratio?: string;
}

export interface AiFoodImageResponse {
  id: string;
  dish_name: string;
  image_url: string;
  enhanced_prompt: string;
  photography_notes: string;
  created_at: string;
}

export interface AiConciergeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiConciergeRequest {
  table_id?: string;
  query: string;
  conversation_history?: AiConciergeMessage[];
  current_cart_items?: string[];
}

export interface AiConciergeResponse {
  id: string;
  reply: string;
  suggested_items?: string[];
  dietary_flags?: string[];
  tokens_used: number;
  latency_ms: number;
}

export interface AiUsageSummary {
  total_generations: number;
  total_tokens: number;
  avg_latency_ms: number;
  generations_by_type: Record<string, number>;
}

// ==========================================
// 9. TABLE ENTERTAINMENT ENGINE (PHASE 11)
// ==========================================

export type GameSlug =
  | 'tic-tac-toe'
  | 'memory-match'
  | 'ludo-game'
  | 'restaurant-quiz'
  | 'simple-puzzle'
  | 'chess';

export interface GameDefinition {
  id: string;
  slug: GameSlug | string;
  title: string;
  category: string;
  min_players: number;
  max_players: number;
  rating: string | number;
  description?: string;
  is_active: boolean;
  config?: Record<string, unknown>;
  promotion_active?: boolean;
  promotion_text?: string;
  promotion_code?: string;
  promotion_discount_percent?: number;
}

export interface GameUpdatePayload {
  is_active?: boolean;
  title?: string;
  description?: string;
  category?: string;
  min_players?: number;
  max_players?: number;
  config?: Record<string, unknown>;
}

export interface GamePromotionPayload {
  promotion_active: boolean;
  promotion_text?: string;
  promotion_code?: string;
  promotion_discount_percent?: number;
}


