import type { Tables } from '@/lib/supabase';

// 定义基本类型
export type DbOrder = Tables<'orders'>;
export type DbOrderItem = Tables<'order_items'>;

// 扩展 OrderItem 类型，添加打印所需字段
export interface OrderItem extends DbOrderItem {
  food_type?: string;
  name?: string;
  code?: string;
  volume?: string;
  dish?: {
    name?: string;
    code?: string;
    food_type?: string;
    volume?: string;
  };
}

// 扩展 Order 类型，添加打印需要的额外字段
export interface Order extends DbOrder {
  order_id?: string;
  order_no?: string;
  table_no?: string | number;
  items: any[]; // 或更具体的类型
  is_takeaway?: boolean;
}

/**
 * Druckstil-Konfigurationstyp
 */
export interface PrintStyleConfig {
  copies?: number;
  boldTitle?: boolean;
  enlargedTable?: boolean;
  dividerChar?: string;
  lineWidth?: number;
}

/**
 * Basis-Speisenobjekt
 */
export interface FoodItem extends Omit<OrderItem, 'sub_items'> {
  qty: number;
  name: string;
  code?: string;
  food_type?: string;
  is_custom_dumpling?: boolean;
  detail?: string;
  volume?: string;
  dumpling_type?: 'fixed_10' | 'fixed_15' | 'custom';
  sub_items?: SubItem[];
}

/**
 * Unterelement für Speisen
 */
export interface SubItem {
  qty?: number;
  name: string;
}

/**
 * Getränkeobjekt
 */
export interface BeverageItem extends FoodItem {
  foodType: 'beverage';
}

/**
 * Teigtaschenobjekt
 */
export interface DumplingItem extends FoodItem {
  foodType: 'dumpling';
  dumplingType: 'fixed_10' | 'fixed_15' | 'custom';
}

/**
 * Bestellungsobjekt
 */
export interface FormattedOrder extends Omit<Order, 'items'> {
  items: FoodItem[];
}

/**
 * Formatierer-Interface
 */
export interface Formatter {
  format(item: FoodItem, prefix?: string): string[];
} 