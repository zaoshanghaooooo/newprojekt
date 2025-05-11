// Supabase 数据库类型定义

export interface PrintLog {
  id: string
  order_id: string
  printer_id: string
  content: string
  status: string
  created_at: string
  updated_at: string
  order: {
    order_no: string
    table_no: string
  }
  printer: {
    name: string
    sn: string
    type: string
  }
}

export interface Printer {
  id: string
  name: string
  sn: string
  type: string
  status: string
  created_at: string
  updated_at: string
} 