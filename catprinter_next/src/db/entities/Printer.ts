// Supabase打印机类型定义
export type Printer = {
  id: string;
  sn: string;
  name: string;
  type: string;
  address?: string | null;
  status: string;
  isDefault: boolean;
  last_active_time?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  category?: string | null;
};

// 提供类型转换帮助函数
export function createPrinter(data: any): any {
  return {
    sn: data.sn,
    name: data.name,
    type: data.type,
    address: data.address || null,
    status: data.status || 'offline',
    isDefault: data.isDefault !== undefined ? data.isDefault : false,
    last_active_time: data.last_active_time || data.lastActiveTime || null,
    category: data.category || null
  };
} 