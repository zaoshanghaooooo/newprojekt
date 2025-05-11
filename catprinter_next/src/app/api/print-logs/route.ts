import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * 获取打印日志列表
 * GET /api/print-logs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const order_id = searchParams.get('order_id');
    const printer_id = searchParams.get('printer_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;
    
    // 构建查询
    let query = supabase
      .from('print_logs')
      .select(`
        *,
        order:orders(order_no, table_no),
        printer:printers(name, type)
      `);
    
    // 添加过滤条件
    if (order_id) {
      query = query.eq('order_id', order_id);
    }
    
    if (printer_id) {
      query = query.eq('printer_id', printer_id);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // 获取总数
    const { count: totalCount } = await supabase
      .from('print_logs')
      .select('*', { count: 'exact', head: true });
    
    // 获取分页数据
    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total: totalCount || 0,
        page,
        limit,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '获取打印日志时发生未知错误';
    
    logger.error(`获取打印日志失败: ${errorMessage}`, error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 创建打印日志
 * POST /api/print-logs
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.order_id || !data.printer_id || !data.status) {
      return NextResponse.json(
        { success: false, message: '订单ID、打印机ID和状态为必填项' },
        { status: 400 }
      );
    }
    
    // 创建打印日志
    const { data: printLog, error: printLogError } = await supabase
      .from('print_logs')
      .insert({
        status: data.status,
        content: data.content,
        order_id: data.order_id,
        printer_id: data.printer_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (printLogError) throw printLogError;
    
    // 如果打印成功，更新订单打印次数和最后打印时间
    if (data.status === 'success') {
      const { data: order } = await supabase
        .from('orders')
        .select('print_count')
        .eq('id', data.order_id)
        .single();
      
      if (order) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            print_count: (order.print_count || 0) + 1,
            last_print_time: new Date().toISOString()
          })
          .eq('id', data.order_id);
        
        if (updateError) throw updateError;
      }
    }
    
    return NextResponse.json({
      success: true,
      data: printLog
    }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '创建打印日志时发生未知错误';
    
    logger.error(`创建打印日志失败: ${errorMessage}`, error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
} 