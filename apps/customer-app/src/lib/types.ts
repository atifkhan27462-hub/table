export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  products?: Product[];
}

export interface ProductOptionValue {
  id: string;
  name: string;
  price_modifier: number;
}

export interface ProductOption {
  id: string;
  name: string;
  required: boolean;
  values: ProductOptionValue[];
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  base_price: number;
  calories?: string;
  prep_time_minutes?: number;
  prep_station_code?: string;
  tags?: string[];
  image_url?: string;
  is_available: boolean;
  is_featured: boolean;
  options?: ProductOption[];
}

export interface CartItemOption {
  option_name: string;
  value_name: string;
  price_modifier: number;
}

export interface CartItem {
  id: string; // unique cart line item id
  product_id: string;
  name: string;
  base_price: number;
  unit_price: number;
  quantity: number;
  doneness?: string;
  side?: string;
  spice_level?: number;
  notes?: string;
  options: CartItemOption[];
}

export interface BackendOrderCalculation {
  subtotal: string | number;
  tax_rate: string | number;
  tax_amount: string | number;
  service_fee: string | number;
  tip_amount: string | number;
  total_amount: string | number;
  item_count: number;
}

export interface OrderItemOut {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
  status: string;
  notes?: string;
  options: {
    id: string;
    option_name: string;
    value_name: string;
    price_modifier: string | number;
  }[];
}

export interface OrderOut {
  id: string;
  restaurant_id: string;
  table_id: string;
  order_number: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  subtotal: string | number;
  tax_amount: string | number;
  service_fee: string | number;
  tip_amount: string | number;
  total_amount: string | number;
  payment_status: string;
  special_instructions?: string;
  placed_at: string;
  accepted_at?: string;
  completed_at?: string;
  items: OrderItemOut[];
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  min_players: number;
  max_players: number;
  rating: string;
  is_active: boolean;
}

export interface AiSommelierResponse {
  recommendation: string;
  suggested_wine?: string;
  pairing_notes?: string;
  suggested_product_ids?: string[];
}
