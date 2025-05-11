// Supabase打印日志类型定义
export type PrintLog = {
  id: string;
  print_time: Date;
  printer_id: string;
  order_id?: string | null;
  response_code: string;
  response_msg: string;
  content?: string | null;
  created_at?: Date;
};

// 提供类型转换帮助函数
export function createPrintLog(data: any): any {
  return {
    print_time: data.print_time || data.printTime || new Date(),
    printer_id: data.printer_id || data.printerId,
    order_id: data.order_id || data.orderId || null,
    response_code: data.response_code || data.responseCode || '0',
    response_msg: data.response_msg || data.responseMsg || '',
    content: data.content || null
  };
} 