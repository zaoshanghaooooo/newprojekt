import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import logger from '@/utils/logger';
import { FeieyunService } from '@/utils/feieyun-service';
import { Order, OrderItem } from '@/lib/api';

/**
 * 打印测试
 * POST /api/print/test
 */
export async function POST(request: NextRequest) {
  try {
    const { printerId, content, orderId } = await request.json();
    
    // 查找打印机
    let printer;
    
    if (printerId && printerId !== 'default') {
      // 尝试通过ID查找打印机，需要检查ID是否是有效的UUID格式
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(printerId);
      
      if (isValidUUID) {
        const { data, error } = await supabaseAdmin
          .from('printers')
          .select('*')
          .eq('id', printerId)
          .single();
        
        if (error) {
          logger.error(`Error fetching printer by ID ${printerId}:`, error);
          // 不抛出错误，继续尝试查找默认打印机
        } else {
          printer = data;
        }
      } else {
        logger.warn(`无效的打印机ID格式: ${printerId}，将使用默认打印机`);
      }
    }
    
    // 如果通过ID没有找到打印机，则查找默认打印机
    if (!printer) {
      // printerId 不存在，或者是 "default"，或者ID无效，都查找默认打印机
      logger.info('Fetching default printer for print test.', printerId ? `(printerId was "${printerId}")` : '');
      const { data, error } = await supabaseAdmin
        .from('printers')
        .select('*')
        .eq('isDefault', true)
        .maybeSingle();
      
      if (error) {
        logger.error('Error fetching default printer:', error);
        throw error;
      }
      printer = data;
    }
    
    if (!printer) {
      return NextResponse.json(
        { success: false, message: '没有可用的打印机 (请检查是否已设置默认打印机)' },
        { status: 400 }
      );
    }
    
    // 记录日志
    logger.info(`执行打印测试到打印机: ${printer.name}`, 'PrintTest');
    
    // 获取飞鹅云配置
    let feieyunUser = process.env.FEIEYUN_USER || '';
    let feieyunKey = process.env.FEIEYUN_UKEY || '';
    
    // 如果环境变量中没有配置，尝试从系统设置获取
    if (!feieyunUser || !feieyunKey) {
      try {
        // 尝试从系统设置表获取飞鹅云配置
        const { data: userSetting } = await supabaseAdmin
          .from('system_settings')
          .select('value')
          .eq('key', 'feieyun_user')
          .maybeSingle();
        
        const { data: keySetting } = await supabaseAdmin
          .from('system_settings')
          .select('value')
          .eq('key', 'feieyun_key')
          .maybeSingle();
        
        if (userSetting?.value) {
          feieyunUser = userSetting.value;
        }
        
        if (keySetting?.value) {
          feieyunKey = keySetting.value;
        }
      } catch (settingError) {
        logger.error('获取飞鹅云配置失败:', settingError);
        // 继续处理，使用默认值
      }
    }
    
    // 创建飞鹅云服务实例
    const feieyunService = new FeieyunService({
      printerSn: printer.sn,
      user: feieyunUser,
      key: feieyunKey
    });
    
    // 记录当前配置状态
    logger.info('飞鹅云配置状态:', {
      isConfigured: feieyunService.isConfigured(),
      hasPrinterSn: !!printer.sn,
      hasFeieyunUser: !!feieyunUser,
      hasFeieyunKey: !!feieyunKey
    });
    
    // 检查打印机配置是否完整
    if (!feieyunService.isConfigured()) {
      return NextResponse.json(
        { success: false, message: '打印机配置不完整，请检查飞鹅云配置参数 (FEIEYUN_USER, FEIEYUN_UKEY)' },
        { status: 400 }
      );
    }
    
    // 获取实际订单数据
    let orderToUse;
    let actualOrderId;
    
    if (orderId) {
      // 如果提供了订单ID，获取该订单
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          order_no,
          table_no,
          date_time,
          status,
          print_count,
          total_price,
          order_items (
            id,
            name,
            code,
            qty,
            price,
            detail,
            is_custom_dumpling,
            sub_items
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (orderError) {
        logger.error(`获取订单数据失败: ${orderError.message}`, orderError);
        throw new Error(`获取订单数据失败: ${orderError.message}`);
      }
      
      if (!orderData) {
        throw new Error(`未找到ID为 ${orderId} 的订单`);
      }
      
      orderToUse = {
        id: orderData.id,
        orderNo: orderData.order_no,
        tableNo: orderData.table_no,
        dateTime: new Date(orderData.date_time),
        status: orderData.status,
        printCount: orderData.print_count,
        totalPrice: orderData.total_price,
        items: orderData.order_items.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          qty: item.qty,
          price: item.price,
          detail: item.detail,
          isCustomDumpling: item.is_custom_dumpling,
          subItems: item.sub_items
        }))
      };
      
      actualOrderId = orderId;
    } else {
      // 如果没有提供订单ID，获取最近的一个订单
      const { data: recentOrders, error: recentError } = await supabaseAdmin
        .from('orders')
        .select(`
          id,
          order_no,
          table_no,
          date_time,
          status,
          print_count,
          total_price,
          order_items (
            id,
            name,
            code,
            qty,
            price,
            detail,
            is_custom_dumpling,
            sub_items
          )
        `)
        .order('date_time', { ascending: false })
        .limit(1);
      
      if (recentError) {
        logger.error(`获取最近订单失败: ${recentError.message}`, recentError);
        throw new Error(`获取最近订单失败: ${recentError.message}`);
      }
      
      if (!recentOrders || recentOrders.length === 0) {
        // 如果没有找到任何订单，返回错误
        return NextResponse.json(
          { success: false, message: '没有找到任何订单，请先创建订单' },
          { status: 400 }
        );
      }
      
      const recentOrder = recentOrders[0];
      orderToUse = {
        id: recentOrder.id,
        orderNo: recentOrder.order_no,
        tableNo: recentOrder.table_no,
        dateTime: new Date(recentOrder.date_time),
        status: recentOrder.status,
        printCount: recentOrder.print_count,
        totalPrice: recentOrder.total_price,
        items: recentOrder.order_items.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          qty: item.qty,
          price: item.price,
          detail: item.detail,
          isCustomDumpling: item.is_custom_dumpling,
          subItems: item.sub_items
        }))
      };
      
      actualOrderId = recentOrder.id;
    }
    
    // 执行实际打印
    const printResult = await feieyunService.printOrder(orderToUse);
    
    if (!printResult.success) {
      throw new Error(printResult.message);
    }
    
    // 更新订单的打印计数
    try {
      // 获取订单当前信息
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('print_count')
        .eq('id', actualOrderId)
        .single();
      
      if (!orderError && orderData) {
        // 增加打印次数
        const newPrintCount = (orderData.print_count || 0) + 1;
        
        // 更新订单
        await supabaseAdmin
          .from('orders')
          .update({
            print_count: newPrintCount,
            last_print_time: new Date().toISOString()
          })
          .eq('id', actualOrderId);
      }
    } catch (updateError) {
      logger.error(`更新订单打印计数错误: ${updateError}`, updateError);
      // 继续处理，不影响主流程
    }
    
    // 记录打印日志
    const { error: logError } = await supabaseAdmin
      .from('print_logs')
      .insert({
        status: 'success',
        message: printResult.message || '打印成功',
        order_id: actualOrderId,
        printer_id: printer.id,
        created_at: new Date().toISOString()
      });

    if (logError) throw logError;
    
    return NextResponse.json({
      success: true,
      message: printResult.message || '打印命令已发送',
      printerId: printer.id,
      orderId: actualOrderId,
      data: printResult.data
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '打印测试时发生未知错误';
    
    logger.error(`打印测试失败: ${errorMessage}`, error);
    
    // 记录打印失败的日志
    try {
      await supabaseAdmin
        .from('print_logs')
        .insert({
          status: 'failed',
          message: errorMessage,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      logger.error('记录打印失败日志出错', logError);
    }
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
} 