import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
console.log('Supabase URL:', supabaseUrl);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Loaded' : 'NOT Loaded');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Supabase Client erstellen
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Typen für bessere TypeScript-Unterstützung
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Hilfsfunktionen für Datenbankzugriff
export const db = {
  dishes: {
    list: () => supabase.from('dishes').select('*'),
    getById: (id: string) => supabase.from('dishes').select('*').eq('id', id).single(),
    create: (data: any) => {
      // 确保data对象的字段名与数据库一致
      const sanitizedData = {
        ...data,
        // 确保使用下划线命名法而不是驼峰命名法
        image_url: data.image_url || data.imageUrl,
        is_active: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
        food_type: data.food_type || data.foodType || data.type
      };
      return supabase.from('dishes').insert(sanitizedData).select();
    },
    update: (id: string, data: any) => {
      // 同样确保data对象的字段名与数据库一致
      const sanitizedData = {
        ...data,
        // 确保使用下划线命名法而不是驼峰命名法
        image_url: data.image_url || data.imageUrl,
        is_active: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : data.is_active),
        food_type: data.food_type || data.foodType || data.type
      };
      return supabase.from('dishes').update(sanitizedData).eq('id', id).select();
    },
    delete: (id: string) => supabase.from('dishes').delete().eq('id', id),
  },
  orders: {
    list: () => supabase.from('orders').select('*').order('date_time', { ascending: false }),
    getById: (id: string) => supabase.from('orders').select('*').eq('id', id).single(),
    create: (data: any) => supabase.from('orders').insert(data),
    update: (id: string, data: any) => supabase.from('orders').update(data).eq('id', id),
    delete: (id: string) => supabase.from('orders').delete().eq('id', id),
  },
  printers: {
    list: () => supabase.from('printers').select('*'),
    getById: (id: string) => supabase.from('printers').select('*').eq('id', id).single(),
    create: (data: any) => supabase.from('printers').insert(data),
    update: (id: string, data: any) => supabase.from('printers').update(data).eq('id', id),
    delete: (id: string) => supabase.from('printers').delete().eq('id', id),
    clearDefaultStatus: async () => {
      const { error } = await supabase
        .from('printers')
        .update({ isDefault: false })
        .is('isDefault', true);
      if (error) throw error;
    },
    setAsDefault: async (id: string) => {
      const { error } = await supabase
        .from('printers')
        .update({ isDefault: true })
        .eq('id', id);
      if (error) throw error;
    },
  },
  printLogs: {
    list: () => supabase.from('print_logs').select('*'),
    create: (data: any) => supabase.from('print_logs').insert(data),
  },
  settings: {
    async getAll() {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');
      if (error) throw error;
      return data;
    },
    
    async getByKey(key: string) {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .single();
      if (error) throw error;
      return data;
    },
    
    async set(key: string, value: string) {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({ key, value })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }
};

// 为了方便使用，导出一些常用的表名
export const Tables = {
  PRINTERS: 'printers',
  PRINT_LOGS: 'print_logs',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  DISHES: 'dishes',
  FOOD_DEFAULT_ITEMS: 'food_default_items',
  DUMPLING_ITEMS: 'dumpling_items',
  DRINK_ITEMS: 'drink_items',
  SYSTEM_SETTINGS: 'system_settings'
} as const;