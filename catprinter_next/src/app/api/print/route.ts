import { NextRequest, NextResponse } from 'next/server';
import { db, supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-server';
import logger from '@/utils/logger';
import PrintService from '@/utils/print-service';
import { FeieyunService } from '@/utils/feieyun-service';

/**
 * 执行打印任务
 * POST /api/print
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, printerId, priority } = body;
    
    // 处理优先级参数
    const isPriorityHigh = priority === 'high';
    if (isPriorityHigh) {
      logger.info(`接收到高优先级打印请求: 订单ID=${orderId}`, 'PrintAPI');
    } else {
      logger.info(`接收到打印请求: 订单ID=${orderId}, 打印机ID=${printerId || '默认打印机'}`, 'PrintAPI');
    }

    if (!orderId) {
      return NextResponse.json(
        { error: '订单ID不能为空' },
        { status: 400 }
      );
    }

    // 检查重复打印：查询最近30秒内是否已经成功打印过同一订单
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: recentPrints, error: recentPrintsError } = await supabase
      .from('print_logs')
      .select('id, created_at, status, priority')
      .eq('order_id', orderId)
      .eq('status', 'success') // 只检查成功的打印记录
      .gte('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: false });
    
    if (!recentPrintsError && recentPrints && recentPrints.length > 0) {
      // 新的重复打印判断逻辑：
      // 1. 无论是普通优先级还是高优先级打印，如果在15秒内有成功打印记录，都跳过
      // 2. 15-30秒内，高优先级可以覆盖普通优先级打印，但高优先级不能再次打印
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000).toISOString();
      
      // 检查是否有15秒内的任何打印记录
      const veryRecentPrints = recentPrints.filter(p => 
        new Date(p.created_at) >= new Date(fifteenSecondsAgo)
      );
      
      // 如果15秒内有任何打印记录，则跳过本次打印
      if (veryRecentPrints.length > 0) {
        logger.warn(`检测到重复打印请求：订单 ${orderId} 在最近15秒内已经打印过，强制跳过`, {
          latestPrint: veryRecentPrints[0].created_at,
          printCount: veryRecentPrints.length,
          currentPriority: isPriorityHigh ? 'high' : 'normal'
        });
        
        return NextResponse.json({
          success: true,
          message: '订单近期已打印，已跳过重复打印',
          duplicatePrint: true,
          previousPrintTime: veryRecentPrints[0].created_at,
          currentPriority: isPriorityHigh ? 'high' : 'normal'
        });
      }
      
      // 15-30秒内的打印记录逻辑 
      const shouldSkip = isPriorityHigh
        ? recentPrints.some(p => p.priority === 'high') // 高优先级请求只有之前有高优先级打印才跳过
        : true; // 普通优先级请求总是跳过
      
      if (shouldSkip) {
        // 发现相应的打印记录，记录警告日志并跳过打印
        logger.warn(`检测到重复打印请求：订单 ${orderId} 在15-30秒内已经打印过 ${recentPrints.length} 次`, {
          latestPrint: recentPrints[0].created_at,
          printCount: recentPrints.length,
          currentPriority: isPriorityHigh ? 'high' : 'normal',
          previousPriorities: recentPrints.map(p => p.priority)
        });
        
        return NextResponse.json({
          success: true,
          message: '订单近期已打印，已跳过重复打印',
          duplicatePrint: true,
          previousPrintTime: recentPrints[0].created_at,
          currentPriority: isPriorityHigh ? 'high' : 'normal'
        });
      } else {
        logger.info(`虽有近期打印记录(15-30秒内)，但当前为高优先级请求覆盖普通优先级，将继续执行打印`, {
          orderId,
          recentPrintCount: recentPrints.length
        });
      }
    }

    // 记录开始处理时间（对高优先级打印）
    const startTime = isPriorityHigh ? Date.now() : null;

    // 查询订单信息
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, order_no, table_no, status, date_time, total_price, print_count, 
        order_items (
          id, name, code, qty, price, detail, food_type
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.error(`未找到订单: ${orderId}`, orderError);
      return NextResponse.json(
        { error: '未找到订单' },
        { status: 404 }
      );
    }

    // 查询打印机信息
    let printer;
    // 只有当printerId存在且不等于"default"时才查询指定打印机
    if (printerId && printerId !== 'default') {
      // 检查是否为有效的UUID格式
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(printerId);
      
      if (isValidUUID) {
        const { data, error: printerError } = await supabase
          .from('printers')
          .select('*')
          .eq('id', printerId)
          .single();

        if (printerError || !data) {
          logger.error(`未找到指定打印机: ${printerId}`, printerError);
          return NextResponse.json(
            { error: '未找到指定打印机' },
            { status: 404 }
          );
        }
        
        printer = data;
      } else {
        logger.warn(`无效的打印机ID格式: ${printerId}，将使用默认打印机`);
        // 继续使用默认打印机
      }
    }
    
    // 如果没有指定打印机或者指定的是"default"或者ID格式无效，则查找默认打印机
    if (!printer) {
      // 查找默认打印机
      const { data, error: printerError } = await supabase
        .from('printers')
        .select('*')
        .eq('isDefault', true)
        .single();
        
      if (printerError || !data) {
        logger.error('未找到默认打印机', printerError);
        return NextResponse.json(
          { error: '未找到默认打印机，请先设置默认打印机' },
          { status: 404 }
        );
      }
      
      printer = data;
    }

    logger.info(`准备打印订单 ${order.order_no} 到打印机 ${printer.name}`, 'PrintAPI');

    // 直接使用FeieyunService进行同步打印
    if (printer.type === 'feieyun' || printer.type === 'network') {
      try {
        // 获取飞鹅云配置
        let feieyunUser = process.env.FEIEYUN_USER || '';
        let feieyunKey = process.env.FEIEYUN_UKEY || '';
        
        // 如果环境变量中没有配置，尝试从系统设置获取
        if (!feieyunUser || !feieyunKey) {
          const { data: settings } = await supabase
            .from('system_settings')
            .select('*')
            .in('key', ['feieyun_user', 'feieyun_key']);
          
          feieyunUser = settings?.find(s => s.key === 'feieyun_user')?.value || '';
          feieyunKey = settings?.find(s => s.key === 'feieyun_key')?.value || '';
        }
        
        // 创建飞鹅云服务实例
        const feieyunService = new FeieyunService({
          printerSn: printer.sn,
          user: feieyunUser,
          key: feieyunKey,
          debug: true
        });
        
        // 添加详细调试日志
        logger.info('打印请求配置信息:', { 
          printerSn: printer.sn,
          printerType: printer.type,
          feieyunUser: feieyunUser ? '已设置' : '未设置', 
          feieyunKey: feieyunKey ? '已设置' : '未设置',
          orderId: orderId,
          isPriorityHigh: isPriorityHigh,
          isConfigured: feieyunService.isConfigured()
        });
        
        // 检查配置是否有效
        if (!feieyunService.isConfigured()) {
          logger.error('飞鹅云配置不完整', { 
            hasPrinterSn: !!printer.sn,
            hasFeieyunUser: !!feieyunUser,
            hasFeieyunKey: !!feieyunKey
          });
          
          return NextResponse.json(
            { success: false, message: '打印机配置不完整，请检查飞鹅云配置参数' },
            { status: 400 }
          );
        }
        
        // 构建打印订单数据
        const printOrderData = {
          id: order.id,
          orderNo: order.order_no,
          tableNo: order.table_no,
          status: order.status,
          dateTime: new Date(order.date_time),
          printCount: order.print_count || 0,
          totalPrice: order.total_price || 0,
          items: order.order_items.map(item => ({
            id: item.id,
            name: item.name,
            code: item.code,
            qty: item.qty,
            price: item.price,
            notes: item.detail
          }))
        };
        
        // 直接调用飞鹅云服务打印
        logger.info('开始发送飞鹅云打印请求', { orderId, isPriorityHigh });
        const printResult = await feieyunService.printOrder(printOrderData as any, {
          priority: isPriorityHigh ? 'high' : 'normal'
        });
        
        // 记录高优先级打印完成时间和耗时
        if (isPriorityHigh && startTime) {
          const duration = Date.now() - startTime;
          logger.info(`高优先级打印完成，订单ID: ${orderId}, 耗时: ${duration}ms`, {
            success: printResult.success
          });
        }
        
        // 记录打印日志
        await supabaseAdmin
          .from('print_logs')
          .insert({
            order_id: orderId,
            printer_id: printer.id,
            status: printResult.success ? 'success' : 'failed',
            message: printResult.message,
            content: JSON.stringify(printOrderData),
            created_at: new Date().toISOString(),
            priority: isPriorityHigh ? 'high' : 'normal' // 记录优先级
          });
        
        // 更新订单打印状态
        if (printResult.success) {
          await supabaseAdmin
            .from('orders')
            .update({ 
              print_count: supabase.rpc('increment', { x: 1 }),
              last_print_time: new Date().toISOString()
            })
            .eq('id', orderId);
        }
        
        logger.info(`打印结果: ${printResult.success ? '成功' : '失败'} - ${printResult.message}`, printResult);
        
        return NextResponse.json({
          success: printResult.success,
          message: printResult.message,
          data: printResult.data
        });
      } catch (error) {
        logger.error('直接打印失败', error);
        // 如果直接打印失败，继续尝试使用PrintService
      }
    }
    
    // 使用PrintService作为备用方案
    logger.info('使用PrintService打印订单', { orderId, printerId: printer.id, isPriorityHigh });
    const result = await PrintService.printOrder(orderId, printer.id, {
      priority: isPriorityHigh ? 'high' : 'normal'
    });

    // 确保即使使用PrintService也记录打印日志，用于后续的重复检测
    if (!recentPrintsError) {  // 如果前面查询打印日志没有错误，说明print_logs表存在
      try {
        await supabaseAdmin
          .from('print_logs')
          .insert({
            order_id: orderId,
            printer_id: printer.id || 'default',
            status: result.success ? 'success' : 'failed',
            message: result.message,
            content: JSON.stringify({ service: 'PrintService' }),
            created_at: new Date().toISOString(),
            priority: isPriorityHigh ? 'high' : 'normal'
          });
        logger.info('成功记录PrintService打印结果到print_logs表');
      } catch (logError) {
        logger.error('记录PrintService打印日志失败:', logError);
      }
    }

    return NextResponse.json({
      success: result.success,
      message: result.success ? '打印成功' : '打印失败',
      details: result.message
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error('打印请求处理失败:', error);
    
    return NextResponse.json(
      { 
        success: false,
        message: '打印失败',
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * Druckerstatus abrufen
 * GET /api/print/status
 */
export async function GET() {
  try {
    // Drucker Status abrufen
    const { data: printers, error: printersError } = await supabase
      .from('printers')
      .select('*');
    
    if (printersError) throw printersError;

    // Druckprotokolle der letzten 24 Stunden abrufen
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const { count: totalPrints } = await supabase
      .from('print_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString());
    
    const { count: successPrints } = await supabase
      .from('print_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString())
      .eq('status', 'success');
    
    const { count: failedPrints } = await supabase
      .from('print_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h.toISOString())
      .eq('status', 'failed');
    
    // Erfolgsrate berechnen
    const successRate = totalPrints ? ((successPrints || 0) / totalPrints * 100) : 0;

    // Feieyun Konfiguration prüfen
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['feieyun_user', 'feieyun_key']);
    
    const feieyunUser = settings?.find(s => s.key === 'feieyun_user')?.value;
    const feieyunKey = settings?.find(s => s.key === 'feieyun_key')?.value;
    
    return NextResponse.json({
      success: true,
      printers: printers?.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        type: p.type,
        isDefault: p.isDefault || false
      })) || [],
      print_stats: {
        total: totalPrints || 0,
        success: successPrints || 0,
        failed: failedPrints || 0,
        success_rate: Math.round(successRate * 100) / 100
      },
      config: {
        feieyun_configured: !!(feieyunUser && feieyunKey)
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unbekannter Fehler beim Abrufen des Druckerstatus';
    
    logger.error(`Fehler beim Abrufen des Druckerstatus: ${errorMessage}`, error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}