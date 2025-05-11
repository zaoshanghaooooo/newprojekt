import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { dbAdmin, supabaseAdmin } from '@/lib/supabase-server';
import type { Database } from '@/types/supabase';

type OrderItem = Database['public']['Tables']['order_items']['Insert'];
type Order = Database['public']['Tables']['orders']['Insert'];

// 获取所有订单
export async function GET() {
  try {
    const { data, error } = await db.orders.list();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('获取订单失败:', error);
    return NextResponse.json(
      { error: '获取订单失败' },
      { status: 500 }
    );
  }
}

// 创建新订单
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.tableNo || !data.items || !data.items.length) {
      return NextResponse.json(
        { error: '桌号和订单项为必填项' },
        { status: 400 }
      );
    }
    
    // 检查打印优先级
    const printPriority = data.printPriority || 'normal';
    const isHighPriority = printPriority === 'high';
    
    // 打印优先级高时，记录日志
    if (isHighPriority) {
      console.log('收到高优先级打印订单请求');
    }
    
    // 生成订单号：桌号+日期+时间+单品编号组合
    const now = new Date();
    
    // 日期格式：MMDD (月日)
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = month + day;
    
    // 时间格式：HHMM (时分)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = hours + minutes;
    
    // 处理桌号，移除空格和特殊字符
    const cleanTableNo = data.tableNo.toString().replace(/[^\w\d]/g, '');
    
    // 获取订单中第一个菜品的编号作为单品编号（如果有）
    let itemCode = 'ITEM';
    if (data.items && data.items.length > 0) {
      // 如果有菜品编号，获取第一个菜品编号并清理
      if (data.items[0].code) {
        // 移除特殊字符和空格，只保留字母、数字
        itemCode = data.items[0].code.toString().trim().replace(/[^\w\d]/g, '');
        // 如果清理后为空，使用默认值
        if (!itemCode) {
          itemCode = 'ITEM';
        }
      }
    }
    
    // 限制itemCode长度，避免订单号过长
    if (itemCode.length > 8) {
      itemCode = itemCode.substring(0, 8);
    }
    
    // 生成最终订单号格式：桌号-日期-时间-单品编号
    const orderNo = `${cleanTableNo}-${dateStr}-${timeStr}-${itemCode}`;
    
    console.log('生成新订单号:', orderNo); // 记录日志方便调试
    
    // 计算总价 - 优先使用客户端传递的total_price或totalPrice
    let totalPrice = data.total_price || data.totalPrice;
    
    // 如果客户端没有传递总价，则在服务器端计算
    if (totalPrice === undefined || totalPrice === null) {
      totalPrice = data.items.reduce((sum: number, item: any) => {
        return sum + (item.price || 0) * item.qty;
      }, 0);
    }
    
    // 确保totalPrice不为null，至少为0
    totalPrice = totalPrice || 0;
    
    // 创建订单 - 使用dbAdmin客户端创建
    const { data: newOrder, error: orderError } = await dbAdmin.orders.create({
      order_no: orderNo,
      table_no: data.tableNo,
      date_time: data.dateTime || new Date().toISOString(),
      status: data.status || '待处理',
      total_price: totalPrice,
      print_count: 0,
      print_retries: 0
    });

    if (orderError) {
      console.error('订单创建错误:', orderError);
      throw orderError;
    }
    
    // 获取新创建的订单ID（可能在数组中）
    const orderId = newOrder && newOrder.length > 0 ? newOrder[0].id : null;
    
    if (!orderId) {
      throw new Error('创建订单后未返回有效的订单ID');
    }
    
    // 创建订单项
    const orderItems = data.items.map(item => ({
      order_id: orderId, // 使用下划线命名法
      qty: item.qty,
      name: item.name,
      code: item.code || null,
      detail: item.detail || null,
      is_custom_dumpling: item.isCustomDumpling || false, // 使用下划线命名法
      food_type: item.foodType || null, // 使用下划线命名法
      volume: item.volume || null,
      dumpling_type: item.dumplingType || null, // 使用下划线命名法
      price: item.price || null,
      sub_items: item.subItems || null, // 使用下划线命名法
      dish_id: item.dishId || null // 使用下划线命名法
    }));

    // 批量创建订单项
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('创建订单项错误:', itemsError);
      throw itemsError;
    }

    // 所有数据创建成功后，尝试打印订单
    // 如果创建订单时没有指定要打印，则直接返回订单数据
    if (!data.shouldPrint && !isHighPriority) {
      console.log(`订单 ${orderId} 不需要打印，直接返回数据`);
      return NextResponse.json({
        id: orderId,
        orderNo,
        tableNo: data.tableNo,
        status: '待处理',
        items: orderItems,
        printResult: null
      });
    }

    // 获取默认打印机
    let printResult = { success: false, message: '未找到可用打印机' };
    
    console.log(`开始为订单 ${orderId} 准备打印`);
    
    // 新增：添加订单打印防重检测
    // 检查最近30秒是否已经有针对该订单的打印请求，避免重复创建打印请求
    const halfMinuteAgo = new Date(Date.now() - 30000).toISOString();
    const { data: recentPrintLogs } = await supabaseAdmin
      .from('print_logs')
      .select('id, created_at')
      .eq('order_id', orderId)
      .gte('created_at', halfMinuteAgo);
      
    if (recentPrintLogs && recentPrintLogs.length > 0) {
      console.warn(`检测到可能的重复打印请求，订单 ${orderId} 在最近30秒内已有 ${recentPrintLogs.length} 次打印记录`);
      // 记录日志但不阻止继续流程，防重复的责任交给打印API处理
    }
    
    const { data: printers, error: printersError } = await supabaseAdmin
      .from('printers')
      .select('*')
      .eq('isDefault', true)
      .limit(1);
    
    if (printersError) {
      console.error('查询默认打印机错误:', printersError);
    } else if (printers && printers.length > 0) {
      const printer = printers[0];
      console.log(`将使用默认打印机 ${printer.name} (ID: ${printer.id}) 打印订单 ${orderId}`);
      
      // 优先级高时，记录打印开始时间
      const printStartTime = isHighPriority ? new Date() : null;
      if (isHighPriority) {
        console.log(`高优先级打印开始，订单ID: ${orderId}, 时间: ${printStartTime?.toISOString()}`);
      }
      
      // 先查询订单详情连同订单项
      const { data: orderWithItems, error: orderQueryError } = await supabaseAdmin
        .from('orders')
        .select(`
          id, order_no, table_no, status, date_time, total_price,
          order_items (
            id, name, code, qty, price, detail, food_type
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderQueryError || !orderWithItems) {
        console.error('获取订单详情失败:', orderQueryError);
      } else {
        try {
          // 使用统一的PrintService进行打印，传递优先级参数
          const PrintService = (await import('@/utils/print-service')).default;
          
          // 在调用打印服务前添加日志
          console.log(`即将调用PrintService.printOrder(${orderId}, ${printer.id}, ${JSON.stringify({ priority: isHighPriority ? 'high' : 'normal' })})`);
          
          // 调用打印服务，统一传递优先级
          printResult = await PrintService.printOrder(orderId, printer.id, { 
            priority: isHighPriority ? 'high' : 'normal' 
          });
          
          console.log(`订单 ${orderId} 打印结果:`, printResult);
          
          // 更新订单打印状态
          if (printResult.success) {
            await supabaseAdmin
              .from('orders')
              .update({
                status: '已打印',
                print_count: 1,
                last_print_time: new Date().toISOString()
              })
              .eq('id', orderId);
          }
        } catch (error) {
          console.error('调用打印服务失败:', error);
          printResult = { 
            success: false, 
            message: error instanceof Error ? error.message : '打印服务调用失败' 
          };
        }
      }
    }
    
    // 在打印机选择后，检查是否有重复打印风险
    // 在打印前检查是否有重复打印风险
    const { data: recentPrints, error: recentPrintsError } = await supabaseAdmin
      .from('print_logs')
      .select('id, created_at')
      .eq('order_id', orderId)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // 最近1分钟内
      .order('created_at', { ascending: false });
      
    if (!recentPrintsError && recentPrints && recentPrints.length > 0) {
      console.warn(`警告: 订单 ${orderId} 在过去1分钟内已经打印过 ${recentPrints.length} 次`);
    }
    
    // 返回创建的订单信息和打印结果
    return NextResponse.json({
      id: orderId,
      orderNo,
      tableNo: data.tableNo,
      status: printResult.success ? '已打印' : '待处理',
      items: orderItems,
      printResult
    });
  } catch (error) {
    console.error('处理订单创建请求时出错:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建订单失败' },
      { status: 500 }
    );
  }
}