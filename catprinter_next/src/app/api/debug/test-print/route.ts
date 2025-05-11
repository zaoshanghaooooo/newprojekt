import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import PrintService from '@/utils/print-service';
import logger from '@/utils/logger';

/**
 * 测试打印服务
 * 可以手动触发打印并记录详细日志
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { orderId } = data;
    
    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: '请提供订单ID'
      }, { status: 400 });
    }
    
    // 获取订单信息
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (orderError || !order) {
      return NextResponse.json({
        success: false,
        message: '订单不存在',
        error: orderError?.message
      }, { status: 404 });
    }
    
    // 获取订单项目
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        dish:dish_id (
          id, name, code, food_type, type, volume
        )
      `)
      .eq('order_id', orderId);
      
    if (itemsError) {
      return NextResponse.json({
        success: false,
        message: '获取订单项目失败',
        error: itemsError.message
      }, { status: 500 });
    }
    
    logger.info(`测试打印订单 ${orderId}, 包含 ${items.length} 个项目`, 'TestPrint');
    
    // 打印前记录详细信息
    const formattedItems = items.map(item => {
      // 从菜品或直接从订单项目获取类型信息
      const foodType = item.dish?.food_type || item.food_type || null;
      const dishType = item.dish?.type || null;
      
      // 判断是否为饮品
      const isDrink = 
        foodType === 'drink' || 
        foodType === 'beverage' || 
        (foodType && foodType.toLowerCase().includes('drink')) ||
        dishType === 'drink' ||
        item.code?.startsWith('BEV') ||
        item.code?.startsWith('COC');
      
      return {
        id: item.id,
        name: item.name || item.dish?.name,
        code: item.code || item.dish?.code,
        food_type: foodType,
        dish_type: dishType,
        is_drink: isDrink,
        category: isDrink ? '饮品' : '食物'
      };
    });
    
    // 分类统计
    const drinks = formattedItems.filter(item => item.is_drink);
    const foods = formattedItems.filter(item => !item.is_drink);
    
    logger.info(`订单 ${orderId} 分类结果: 饮品=${drinks.length}项, 食物=${foods.length}项`, {
      drinks: drinks.map(d => `${d.name} (${d.food_type})`),
      foods: foods.map(f => `${f.name} (${f.food_type})`)
    });
    
    // 执行打印
    const printResult = await PrintService.printOrder(orderId, undefined, { priority: 'high' });
    
    return NextResponse.json({
      success: true,
      message: '测试打印已执行',
      orderId,
      printResult,
      itemsCount: items.length,
      classification: {
        drinks: drinks.length,
        foods: foods.length,
        items: formattedItems
      }
    });
  } catch (error) {
    logger.error(`测试打印失败: ${error instanceof Error ? error.message : String(error)}`, error);
    
    return NextResponse.json({
      success: false,
      message: '测试打印失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 