import {
  Category,
  Product,
  CartItem,
  BackendOrderCalculation,
  OrderOut,
  Game,
  AiSommelierResponse,
} from './types';

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

// Default table fallback for demonstration (Table 08 from database seed)
export const DEFAULT_TABLE_ID = '8a45db00-eb87-4e64-b097-a8ddc3085462';
export const DEFAULT_RESTAURANT_ID = 'b13713fa-b009-4f0f-9d1a-bf64e247bed2';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const { headers: customHeaders, ...restOptions } = options || {};
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...restOptions,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      } else if (parsed.message) {
        errorMessage = parsed.message;
      } else if (Array.isArray(parsed.detail)) {
        errorMessage = parsed.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      } else if (typeof parsed.detail === 'string') {
        errorMessage = parsed.detail;
      }
    } catch {}
    throw new Error(errorMessage);
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export async function fetchMenuCatalog(): Promise<{
  restaurant_id: string;
  restaurant_name: string;
  currency: string;
  categories: Category[];
}> {
  try {
    return await fetchJson<{
      restaurant_id: string;
      restaurant_name: string;
      currency: string;
      categories: Category[];
    }>('/menu');
  } catch (err) {
    console.warn('API fetch menu failed, using fallback offline menu:', err);
    return getOfflineMenu();
  }
}

export async function fetchGamesCatalog(): Promise<Game[]> {
  try {
    return await fetchJson<Game[]>('/games');
  } catch (err) {
    console.warn('API fetch games failed, using offline games:', err);
    return [
      {
        id: 'g1',
        title: 'Gourmet Trivia Challenge',
        slug: 'gourmet-trivia',
        description: 'Multiplayer culinary and wine trivia designed for 32-inch table play.',
        category: 'Social Trivia',
        min_players: 1,
        max_players: 4,
        rating: '4.8',
        is_active: true,
      },
      {
        id: 'g2',
        title: 'Air Hockey Touch 32',
        slug: 'air-hockey-touch',
        description: 'Fast-paced head-to-head touch arcade air hockey.',
        category: 'Arcade Physics',
        min_players: 2,
        max_players: 2,
        rating: '4.9',
        is_active: true,
      },
      {
        id: 'g3',
        title: 'Culinary Memory Match',
        slug: 'memory-match',
        description: 'Fun card matching game testing memory of gourmet ingredients.',
        category: 'Family',
        min_players: 1,
        max_players: 4,
        rating: '4.7',
        is_active: true,
      },
    ];
  }
}

export async function openTableSession(tableId: string = DEFAULT_TABLE_ID): Promise<any> {
  try {
    return await fetchJson('/sessions/open', {
      method: 'POST',
      body: JSON.stringify({
        table_id: tableId,
        party_size: 4,
      }),
    });
  } catch (err) {
    console.warn('Session open API failed:', err);
    return { id: 'sess_demo', status: 'ACTIVE', table_id: tableId };
  }
}

export async function calculateOrderBackend(
  tableId: string,
  cartItems: CartItem[],
  tipAmount: number
): Promise<BackendOrderCalculation> {
  const payload = {
    table_id: tableId || DEFAULT_TABLE_ID,
    items: cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      notes: [item.doneness, item.side, item.notes].filter(Boolean).join(', '),
      options: item.options.map((opt) => ({
        option_name: opt.option_name,
        value_name: opt.value_name,
        price_modifier: opt.price_modifier,
      })),
    })),
    tip_amount: tipAmount,
  };

  return await fetchJson<BackendOrderCalculation>('/orders/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitOrderBackend(
  tableId: string,
  cartItems: CartItem[],
  specialInstructions: string,
  tipAmount: number,
  idempotencyKey?: string
): Promise<OrderOut> {
  // Generate robust client idempotency key if not supplied
  const key =
    idempotencyKey ||
    `idem_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const payload = {
    table_id: tableId || DEFAULT_TABLE_ID,
    items: cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      notes: [item.doneness, item.side, item.notes].filter(Boolean).join(', '),
      options: item.options.map((opt) => ({
        option_name: opt.option_name,
        value_name: opt.value_name,
        price_modifier: opt.price_modifier,
      })),
    })),
    special_instructions: specialInstructions || undefined,
    tip_amount: tipAmount,
    idempotency_key: key,
  };

  return await fetchJson<OrderOut>('/orders', {
    method: 'POST',
    headers: {
      'Idempotency-Key': key,
      'X-Idempotency-Key': key,
    },
    body: JSON.stringify(payload),
  });
}

export async function getOrderDetails(orderId: string): Promise<OrderOut> {
  return await fetchJson<OrderOut>(`/orders/${orderId}`);
}

export async function getTableActiveOrders(tableId: string = DEFAULT_TABLE_ID): Promise<OrderOut[]> {
  try {
    return await fetchJson<OrderOut[]>(`/orders?table_id=${tableId}`);
  } catch (err) {
    return [];
  }
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  try {
    await fetchJson<{ order_id: string; deleted: boolean }>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err) {
    console.error('Failed to delete order:', err);
    throw err;
  }
}

export async function clearTableOrders(
  tableId: string = DEFAULT_TABLE_ID,
  onlyCompleted: boolean = false
): Promise<number> {
  try {
    const res = await fetchJson<{ table_id: string; cleared_count: number }>(
      `/orders/table/${tableId}/clear?only_completed=${onlyCompleted}`,
      {
        method: 'DELETE',
      }
    );
    return res.cleared_count;
  } catch (err) {
    console.error('Failed to clear table orders:', err);
    throw err;
  }
}

export async function requestAiSommelier(prompt: string): Promise<AiSommelierResponse> {
  try {
    const res = await fetchJson<{ result_content?: string; prompt?: string }>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, generation_type: 'SOMMELIER_PAIRING' }),
    });
    return {
      recommendation: res.result_content || 'Sommelier recommendation generated.',
      suggested_wine: '2019 Caymus Cabernet Sauvignon',
      pairing_notes: 'Blackberry, cassis, French oak, structured tannins',
    };
  } catch (err) {
    return {
      recommendation:
        '🍷 Sommelier Recommendation: Pair your steak with a bold Napa Valley Cabernet Sauvignon (2019). Its structure, dark cherry notes, and refined tannins cut through rich compound butter perfectly.',
      suggested_wine: '2019 Caymus Cabernet Sauvignon',
      pairing_notes: 'Plum, cassis, charred oak, velvety tannins',
    };
  }
}

export async function chatWithAiConcierge(
  query: string,
  conversationHistory: { role: string; content: string }[] = [],
  cartItems: string[] = [],
  tableId: string = DEFAULT_TABLE_ID
) {
  try {
    return await fetchJson<{
      id: string;
      reply: string;
      suggested_items: string[];
      dietary_flags: string[];
      tokens_used: number;
      latency_ms: number;
    }>('/ai/concierge', {
      method: 'POST',
      body: JSON.stringify({
        table_id: tableId,
        query,
        conversation_history: conversationHistory,
        current_cart_items: cartItems,
      }),
    });
  } catch (err: any) {
    return {
      id: 'local-fallback',
      reply: `Our culinary team specializes in artisanal preparations. Regarding "${query}", our Pan-Seared Sea Bass is gluten-free, while our Prime Ribeye pairs beautifully with vintage Cabernet.`,
      suggested_items: ['Prime Dry-Aged Ribeye (14oz)', 'Pan-Seared Chilean Sea Bass'],
      dietary_flags: ['Gluten-Free', 'Chef Signature'],
      tokens_used: 65,
      latency_ms: 12,
    };
  }
}

export async function requestPersonalizedAmbiance(themePrompt: string, tableId: string = DEFAULT_TABLE_ID) {
  try {
    return await fetchJson<{
      id: string;
      generation_type: string;
      result_content: string;
    }>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        table_id: tableId,
        prompt: themePrompt,
        generation_type: 'PERSONALIZED_VISUAL',
      }),
    });
  } catch (err) {
    return {
      id: 'ambiance-fallback',
      generation_type: 'PERSONALIZED_VISUAL',
      result_content: '✨ Table Ambiance Activated: Midnight Starlight with warm amber candlelight accents.',
    };
  }
}

function getOfflineMenu() {
  return {
    restaurant_id: DEFAULT_RESTAURANT_ID,
    restaurant_name: 'The Luminary Fine Dining',
    currency: 'USD',
    categories: [
      {
        id: 'cat-steaks',
        name: 'Prime Wood-Fired Steaks',
        slug: 'steaks',
        display_order: 1,
        products: [
          {
            id: '42348fb0-b73b-4bea-8479-37b0fcaf145f',
            category_id: 'cat-steaks',
            name: 'Prime Dry-Aged Ribeye (14oz)',
            description:
              '45-day dry aged USDA Prime, grilled over white oak with black truffle compound butter and roasted garlic.',
            base_price: 58.0,
            calories: '890 kcal',
            prep_time_minutes: 18,
            prep_station_code: 'GRILL',
            tags: ['Chef Signature', 'Gluten-Free'],
            is_available: true,
            is_featured: true,
          },
        ],
      },
      {
        id: 'cat-mains',
        name: 'Artisanal Mains',
        slug: 'mains',
        display_order: 2,
        products: [
          {
            id: '00bb246e-b1eb-4909-bd5f-9807c2a73662',
            category_id: 'cat-mains',
            name: 'Pan-Seared Chilean Sea Bass',
            description:
              'Wild-caught sea bass with saffron velouté, charred broccolini, and sweet corn purée.',
            base_price: 46.0,
            calories: '620 kcal',
            prep_time_minutes: 15,
            prep_station_code: 'SAUTE',
            tags: ['Seafood', 'Gluten-Free'],
            is_available: true,
            is_featured: true,
          },
          {
            id: 'c3677e9a-7f16-4d19-b84b-2681bf633f3c',
            category_id: 'cat-mains',
            name: 'Truffle Wild Mushroom Risotto',
            description:
              'Acquerello carnaroli rice, foraged chanterelles, black summer truffle carpaccio, and 24-month Parmigiano.',
            base_price: 34.0,
            calories: '740 kcal',
            prep_time_minutes: 12,
            prep_station_code: 'SAUTE',
            tags: ['Vegetarian'],
            is_available: true,
            is_featured: false,
          },
        ],
      },
      {
        id: 'cat-drinks',
        name: 'Handcrafted Drinks',
        slug: 'cocktails',
        display_order: 3,
        products: [
          {
            id: '6d04406b-cdd6-47ac-bae3-2c6cb03a1ab0',
            category_id: 'cat-drinks',
            name: 'Smoked Bourbon Old Fashioned',
            description:
              'Woodford Reserve bourbon, smoked maple syrup, angostura bitters, presented under a cloche with charred rosemary smoke.',
            base_price: 18.0,
            calories: '210 kcal',
            prep_time_minutes: 4,
            prep_station_code: 'BAR',
            tags: ['Signature Drink'],
            is_available: true,
            is_featured: true,
          },
        ],
      },
    ],
  };
}

export async function requestStaffService(tableId: string, callType: string): Promise<any> {
  try {
    return await fetchJson<any>(`/tables/${tableId}/service-call`, {
      method: 'POST',
      body: JSON.stringify({ call_type: callType }),
    });
  } catch (err) {
    console.warn('REST requestStaffService error:', err);
    return { success: false };
  }
}

export async function resolveStaffService(tableId: string): Promise<any> {
  try {
    return await fetchJson<any>(`/tables/${tableId}/service-call/resolve`, {
      method: 'POST',
    });
  } catch (err) {
    console.warn('REST resolveStaffService error:', err);
    return { success: false };
  }
}
