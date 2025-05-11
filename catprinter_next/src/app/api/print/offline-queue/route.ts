import { NextRequest, NextResponse } from 'next/server';
import { db, supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

const MAX_RETRY_COUNT = parseInt(process.env.PRINT_RETRY_COUNT || '3', 10);

/**
 * 处理离线打印队列
 * POST /api/print/offline-queue/process
 */
export async function POST() {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // 查询所有离线队列中的订单
    const { data: queuedOrders, error: queueError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'offline_queue')
      .lt('printRetries', MAX_RETRY_COUNT)
      .order('queuedAt', { ascending: true })
      .order('created_at', { ascending: true });

    if (queueError) throw queueError;

    if (!queuedOrders || queuedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: '离线队列为空',
        processed: 0,
        succeeded: 0,
        failed: 0
      });
    }

    logger.info(`开始处理离线打印队列，共 ${queuedOrders.length} 个订单`, 'OfflineQueue');

    // 获取默认打印机
    const { data: printer, error: printerError } = await supabase
      .from('printers')
      .select('*')
      .eq('isDefault', true)
      .single();

    if (printerError || !printer) {
      return NextResponse.json({
        success: false,
        message: '没有可用的打印机',
        processed: 0,
        succeeded: 0,
        failed: 0
      });
    }

    // 逐个处理队列中的订单
    for (const order of queuedOrders) {
      processed++;
      
      try {
        // 模拟打印过程
        logger.info(`打印队列订单: ${order.orderNo}`, 'OfflineQueue');
        
        // 在实际实现中，这里将调用打印服务
        const success = Math.random() > 0.3; // 模拟70%的成功率
        
        if (success) {
          // 打印成功，更新订单状态
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: '已打印',
              printRetries: 0,
              printCount: (order.printCount || 0) + 1,
              lastPrintTime: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) throw updateError;
          
          // 记录打印日志
          const { error: logError } = await supabase
            .from('print_logs')
            .insert({
              status: 'success',
              message: '队列打印成功',
              orderId: order.id,
              printerId: printer.id,
              printTime: new Date().toISOString()
            });

          if (logError) throw logError;
          
          succeeded++;
        } else {
          // 打印失败
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: '打印失败'
            })
            .eq('id', order.id);

          if (updateError) throw updateError;
          
          // 记录打印日志
          const { error: logError } = await supabase
            .from('print_logs')
            .insert({
              status: 'failed',
              message: '队列打印失败',
              orderId: order.id,
              printerId: printer.id,
              printTime: new Date().toISOString()
            });

          if (logError) throw logError;
          
          failed++;
        }
      } catch (error) {
        // 处理单个订单时出错
        logger.error(`处理离线队列订单 ${order.id} 失败`, error);
        
        failed++;
        
        // 记录打印日志
        const { error: logError } = await supabase
          .from('print_logs')
          .insert({
            status: 'failed',
            message: `处理错误: ${error instanceof Error ? error.message : '未知错误'}`,
            orderId: order.id,
            printerId: printer.id,
            printTime: new Date().toISOString()
          });

        if (logError) {
          logger.error(`记录打印日志失败: ${logError.message}`, logError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `离线队列处理完成: ${succeeded}/${processed} 成功`,
      processed,
      succeeded,
      failed
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '处理离线打印队列失败: 发生未知错误';
    
    logger.error(`处理离线打印队列失败: ${errorMessage}`, error);
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      processed,
      succeeded,
      failed
    }, { status: 500 });
  }
}

/**
 * 获取离线队列状态
 * GET /api/print/offline-queue
 */
export async function GET() {
  try {
    // 查询所有离线队列中的订单
    const { data: queuedOrders, error } = await supabase
      .from('orders')
      .select('id, orderNo, tableNo, created_at')
      .eq('status', 'offline_queue')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      count: queuedOrders?.length || 0,
      orders: queuedOrders?.map(order => ({
        id: order.id,
        orderNo: order.orderNo,
        tableNo: order.tableNo,
        createdAt: order.created_at
      })) || []
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '获取离线队列状态失败: 发生未知错误';
    
    logger.error(`获取离线队列状态失败: ${errorMessage}`, error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}