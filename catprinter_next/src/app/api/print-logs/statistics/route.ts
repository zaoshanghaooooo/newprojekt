import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * 获取打印日志统计信息
 * GET /api/print-logs/statistics
 */
export const dynamic = 'force-dynamic';

// 验证日期格式是否有效
function isValidDateFormat(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateStr);
}

// 获取当前日期字符串 YYYY-MM-DD
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    
    // 解析日期范围参数
    let startDate = searchParams.get('startDate') || '';
    let endDate = searchParams.get('endDate') || '';
    
    const currentDate = getCurrentDateString();
    
    // 验证日期格式，如果无效则使用当前日期
    if (!isValidDateFormat(startDate) || new Date(startDate).toString() === 'Invalid Date') {
      logger.warn(`无效的开始日期: ${startDate}，使用当前日期`);
      startDate = currentDate;
    }
    
    if (!isValidDateFormat(endDate) || new Date(endDate).toString() === 'Invalid Date') {
      logger.warn(`无效的结束日期: ${endDate}，使用当前日期`);
      endDate = currentDate;
    }
    
    // 检查日期是否为未来日期，如果是则使用当前日期
    if (startDate > currentDate) {
      logger.warn(`开始日期 ${startDate} 是未来日期，使用当前日期`);
      startDate = currentDate;
    }
    
    if (endDate > currentDate) {
      logger.warn(`结束日期 ${endDate} 是未来日期，使用当前日期`);
      endDate = currentDate;
    }
    
    logger.info(`获取统计数据，日期范围: ${startDate} 至 ${endDate}`);
    
    // 构建日期范围（包含结束日期的整天）
    const startDateTime = `${startDate}T00:00:00`;
    const endDateTime = `${endDate}T23:59:59`;
    
    // 查询订单统计信息
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_price, created_at')
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime);
    
    if (ordersError) {
      logger.error('获取订单统计数据失败:', ordersError);
      throw ordersError;
    }
    
    // 查询打印日志统计信息
    const { data: printLogs, error: printLogsError } = await supabase
      .from('print_logs')
      .select('id, status, created_at')
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime);
    
    if (printLogsError) {
      logger.error('获取打印日志统计数据失败:', printLogsError);
      throw printLogsError;
    }
    
    // 计算统计结果
    const totalOrders = orders?.length || 0;
    const totalAmount = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
    
    // 打印状态统计
    const printSuccess = printLogs?.filter(log => log.status === '成功').length || 0;
    const printFailed = printLogs?.filter(log => log.status === '失败').length || 0;
    const printWaiting = printLogs?.filter(log => log.status === '等待中').length || 0;
    
    // 按小时分布统计
    const hourlyDistribution = Array(24).fill(0);
    orders?.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourlyDistribution[hour]++;
    });
    
    return NextResponse.json({
      success: true,
      data: {
        dateRange: {
          startDate,
          endDate
        },
        summary: {
          totalOrders,
          totalAmount,
          averageOrderAmount: totalOrders ? (totalAmount / totalOrders) : 0
        },
        printing: {
          totalPrints: printLogs?.length || 0,
          successCount: printSuccess,
          failedCount: printFailed,
          waitingCount: printWaiting,
          successRate: printLogs?.length ? (printSuccess / printLogs.length * 100) : 0
        },
        hourlyDistribution
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '获取打印日志统计信息时发生未知错误';
    
    logger.error(`获取打印日志统计信息失败: ${errorMessage}`, error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
} 