// 这是一个兼容层，将所有prisma相关请求重定向到supabase
import { supabase } from './supabase';

// 创建一个假的prisma接口，实际调用supabase
const prisma = {
  // 通过代理转发所有表操作到supabase
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  
  // 添加你需要支持的表
  dish: {
    findMany: () => supabase.from('dishes').select('*').then(res => res.data || []),
    findUnique: (args: any) => supabase.from('dishes').select('*').eq('id', args.where.id).single().then(res => res.data),
    create: (args: any) => supabase.from('dishes').insert(args.data).select().then(res => res.data?.[0]),
    update: (args: any) => supabase.from('dishes').update(args.data).eq('id', args.where.id).select().then(res => res.data?.[0]),
    delete: (args: any) => supabase.from('dishes').delete().eq('id', args.where.id).then(() => ({}))
  },
  
  order: {
    findMany: () => supabase.from('orders').select('*').then(res => res.data || []),
    findUnique: (args: any) => supabase.from('orders').select('*').eq('id', args.where.id).single().then(res => res.data),
    create: (args: any) => supabase.from('orders').insert(args.data).select().then(res => res.data?.[0]),
    update: (args: any) => supabase.from('orders').update(args.data).eq('id', args.where.id).select().then(res => res.data?.[0]),
    delete: (args: any) => supabase.from('orders').delete().eq('id', args.where.id).then(() => ({}))
  },
  
  printer: {
    findMany: () => supabase.from('printers').select('*').then(res => res.data || []),
    findUnique: (args: any) => supabase.from('printers').select('*').eq('id', args.where.id).single().then(res => res.data),
    create: (args: any) => supabase.from('printers').insert(args.data).select().then(res => res.data?.[0]),
    update: (args: any) => supabase.from('printers').update(args.data).eq('id', args.where.id).select().then(res => res.data?.[0]),
    delete: (args: any) => supabase.from('printers').delete().eq('id', args.where.id).then(() => ({}))
  }
};

export { prisma };
export default prisma; 