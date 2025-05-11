// Supabase订单类型定义
export type Order = {
  id: string;
  order_no: string;
  table_no: string;
  date_time: Date | string;
  status: string;
  total_price: number;
  print_count: number;
  last_print_time?: Date | string | null;
  print_retries: number;
  queued_at?: Date | string | null;
  created_at?: Date;
  updated_at?: Date;
};

export type OrderItem = {
  id: string;
  order_id: string;
  name: string;
  code?: string | null;
  qty: number;
  price?: number | null;
  detail?: string | null;
  food_type?: string | null;
  volume?: string | null;
  is_custom_dumpling?: boolean;
  dumpling_type?: string | null;
  sub_items?: any | null;
  dish_id?: string | null;
  created_at?: Date;
};

// 提供类型转换帮助函数
export function createOrder(data: any): any {
  return {
    order_no: data.order_no || data.orderNo,
    table_no: data.table_no || data.tableNo,
    date_time: data.date_time || data.dateTime || new Date().toISOString(),
    status: data.status || '待处理',
    total_price: data.total_price || data.totalPrice || 0,
    print_count: data.print_count || data.printCount || 0,
    last_print_time: data.last_print_time || data.lastPrintTime || null,
    print_retries: data.print_retries || data.printRetries || 0,
    queued_at: data.queued_at || data.queuedAt || null
  };
}

export function createOrderItem(data: any, orderId: string): any {
  return {
    order_id: orderId,
    name: data.name,
    code: data.code || null,
    qty: data.qty || 1,
    price: data.price || null,
    detail: data.detail || null,
    food_type: data.food_type || data.foodType || null,
    volume: data.volume || null,
    is_custom_dumpling: data.is_custom_dumpling || data.isCustomDumpling || false,
    dumpling_type: data.dumpling_type || data.dumplingType || null,
    sub_items: data.sub_items || data.subItems || null,
    dish_id: data.dish_id || data.dishId || null
  };
} 