// 这个文件只是为了保持兼容性，实际上我们使用supabase而不是其他ORM
import { supabase, db } from '@/lib/supabase';
import { supabaseAdmin, dbAdmin } from '@/lib/supabase-server';

// 导出supabase客户端作为默认连接
export const connection = supabase;

// 导出管理员客户端
export const adminConnection = supabaseAdmin;

// 导出数据库帮助函数
export { db, dbAdmin };

// 这个类只是为了兼容性，实际没有任何功能
export class DataSource {
  static initialize() {
    // 无需实际初始化，Supabase不需要
    console.log('Supabase客户端已就绪');
    return Promise.resolve();
  }
}

export default connection; 