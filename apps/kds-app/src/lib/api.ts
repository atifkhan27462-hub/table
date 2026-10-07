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

export async function fetchKitchenOrders(): Promise<any[]> {
  try {
    return await fetchJson<any[]>('/orders');
  } catch (err) {
    console.warn('Backend fetch orders fallback for KDS:', err);
    return getFallbackKitchenOrders();
  }
}

export async function fetchTables(): Promise<any[]> {
  try {
    const res = await fetchJson<any>('/tables');
    return Array.isArray(res) ? res : res.data || [];
  } catch (err) {
    console.warn('Backend fetch tables fallback for KDS:', err);
    return [];
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

export async function resolveKitchenServiceCall(tableId: string): Promise<any> {
  try {
    return await fetchJson<any>(`/tables/${tableId}/service-call/resolve`, {
      method: 'POST',
    });
  } catch (err) {
    console.warn('Backend resolve service call error:', err);
    return null;
  }
}

export async function updateKitchenOrderStatus(orderId: string, status: string): Promise<any> {
  try {
    return await fetchJson<any>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (err) {
    console.warn('Backend status update fallback:', err);
    return { id: orderId, status };
  }
}

export async function deleteKitchenOrder(orderId: string): Promise<any> {
  try {
    return await fetchJson<any>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Backend delete order fallback:', err);
    return { id: orderId, deleted: true };
  }
}

function getFallbackKitchenOrders() {
  const now = Date.now();
  return [
    {
      id: '27e3a8ee-9681-4235-8003-d9e162d6df7c',
      order_number: 'ORD-5750',
      table_id: 'Table 08',
      status: 'PENDING',
      placed_at: new Date(now - 180000).toISOString(), // 3 mins ago
      priority: 'HIGH',
      special_instructions: 'No salt on butter, extra sear on crust',
      items: [
        {
          id: 'i1',
          product_name: 'Prime Dry-Aged Ribeye (14oz)',
          quantity: 2,
          unit_price: 58.0,
          status: 'QUEUED',
          notes: 'Medium Rare, Truffle Parmesan Fries',
          prep_station_code: 'GRILL',
        },
        {
          id: 'i2',
          product_name: 'Smoked Bourbon Old Fashioned',
          quantity: 2,
          unit_price: 18.0,
          status: 'QUEUED',
          notes: 'Rosemary Smoke',
          prep_station_code: 'BAR',
        },
      ],
    },
    {
      id: 'ORD-9021',
      order_number: 'ORD-9021',
      table_id: 'Table 04',
      status: 'PREPARING',
      placed_at: new Date(now - 720000).toISOString(), // 12 mins ago
      priority: 'NORMAL',
      special_instructions: 'Bring appetizers first',
      items: [
        {
          id: 'i3',
          product_name: 'Pan-Seared Chilean Sea Bass',
          quantity: 1,
          unit_price: 46.0,
          status: 'PREPARING',
          notes: 'Gluten-Free, Charred Broccolini',
          prep_station_code: 'SAUTE',
        },
        {
          id: 'i4',
          product_name: 'Truffle Wild Mushroom Risotto',
          quantity: 1,
          unit_price: 34.0,
          status: 'PREPARING',
          notes: 'Extra Parmigiano',
          prep_station_code: 'SAUTE',
        },
      ],
    },
    {
      id: 'ORD-9020',
      order_number: 'ORD-9020',
      table_id: 'Table 09',
      status: 'READY',
      placed_at: new Date(now - 960000).toISOString(), // 16 mins ago
      priority: 'NORMAL',
      special_instructions: '',
      items: [
        {
          id: 'i5',
          product_name: 'Heirloom Burrata Caprese',
          quantity: 2,
          unit_price: 19.0,
          status: 'READY',
          notes: 'Balsamic reduction',
          prep_station_code: 'COLD_PREP',
        },
      ],
    },
    {
      id: 'ORD-9018',
      order_number: 'ORD-9018',
      table_id: 'Table 02',
      status: 'PREPARING',
      placed_at: new Date(now - 1320000).toISOString(), // 22 mins ago (Overdue)
      priority: 'RUSH',
      special_instructions: 'Celebration dinner - RUSH order',
      items: [
        {
          id: 'i6',
          product_name: 'Molten Valrhona Chocolate Sphere',
          quantity: 2,
          unit_price: 15.0,
          status: 'PREPARING',
          notes: 'Warm caramel pour-over',
          prep_station_code: 'OVEN',
        },
      ],
    },
  ];
}
