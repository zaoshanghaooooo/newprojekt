import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Serverseite Supabase-Client mit Service-Rolle-Schlüssel
 * 服务器端Supabase客户端，使用服务角色密钥
 * 使用服务角色可以绕过RLS策略，但只能在服务器端API路由中使用
 */

// Initialisierung von Umgebungsvariablen
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Erforderliche Supabase-Umgebungsvariablen fehlen. Bitte NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY definieren.');
}

// Server-Supabase-Client mit Service-Rolle erstellen
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Hilfsfunktionen für Datenbankzugriff über Admin-Client
export const dbAdmin = {
  dishes: {
    list: () => supabaseAdmin.from('dishes').select('*'),
    getById: (id: string) => supabaseAdmin.from('dishes').select('*').eq('id', id).single(),
    create: (data: any) => {
      // 确保data对象的字段名与数据库一致
      const sanitizedData = {
        ...data,
        // 确保使用下划线命名法而不是驼峰命名法
        image_url: data.image_url || data.imageUrl,
        is_active: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true),
        food_type: data.food_type || data.foodType || data.type
      };
      return supabaseAdmin.from('dishes').insert(sanitizedData).select();
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
      return supabaseAdmin.from('dishes').update(sanitizedData).eq('id', id).select();
    },
    delete: (id: string) => supabaseAdmin.from('dishes').delete().eq('id', id),
  },
  
  // 添加订单相关操作
  orders: {
    list: () => supabaseAdmin.from('orders').select('*').order('date_time', { ascending: false }),
    getById: (id: string) => supabaseAdmin.from('orders').select('*').eq('id', id).single(),
    create: (data: any) => {
      // 处理字段名转换，确保与数据库字段一致
      const sanitizedData = {
        ...data,
        // 驼峰命名转换为下划线命名
        order_no: data.order_no || data.orderNo,
        table_no: data.table_no || data.tableNo,
        date_time: data.date_time || data.dateTime || new Date().toISOString(),
        total_price: data.total_price || data.totalPrice,
        print_count: data.print_count || data.printCount || 0,
        last_print_time: data.last_print_time || data.lastPrintTime,
        print_retries: data.print_retries || data.printRetries || 0,
        queued_at: data.queued_at || data.queuedAt
      };
      return supabaseAdmin.from('orders').insert(sanitizedData).select();
    },
    update: (id: string, data: any) => {
      // 处理字段名转换，确保与数据库字段一致
      const sanitizedData = {
        ...data,
        // 驼峰命名转换为下划线命名
        order_no: data.order_no || data.orderNo,
        table_no: data.table_no || data.tableNo,
        date_time: data.date_time || data.dateTime,
        total_price: data.total_price || data.totalPrice,
        print_count: data.print_count || data.printCount,
        last_print_time: data.last_print_time || data.lastPrintTime,
        print_retries: data.print_retries || data.printRetries,
        queued_at: data.queued_at || data.queuedAt
      };
      return supabaseAdmin.from('orders').update(sanitizedData).eq('id', id).select();
    },
    delete: (id: string) => supabaseAdmin.from('orders').delete().eq('id', id),
  },
  
  // 可以根据需要添加其他表的操作
}; 