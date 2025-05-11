import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

interface DishUpdate {
  id: string;
  [key: string]: any;
}

interface UpdateResult {
  success: boolean;
  message: string;
  id?: string;
  dish?: any;
  data?: any;
}

/**
 * 批量更新菜品API
 * POST /api/dishes/batch-update
 */
export async function POST(request: NextRequest) {
  try {
    const { dishes } = await request.json();
    
    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供有效的菜品数据数组' },
        { status: 400 }
      );
    }
    
    // 日志记录
    logger.info(`开始批量更新${dishes.length}个菜品`, {
      dishIds: dishes.map(d => d.id)
    });
    
    // 存储更新结果
    const results: UpdateResult[] = [];
    
    // 逐个更新菜品（Supabase不支持批量upsert）
    for (const dish of dishes) {
      if (!dish.id) {
        results.push({
          success: false,
          message: '缺少菜品ID',
          dish
        });
        continue;
      }
      
      // 过滤掉不需要的字段
      const { id, ...updateData } = dish;
      
      // 更新菜品
      const { data, error } = await supabase
        .from('dishes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        logger.error(`更新菜品 ${id} 失败`, error);
        results.push({
          success: false,
          message: error.message,
          id
        });
      } else {
        results.push({
          success: true,
          message: '更新成功',
          id,
          data
        });
      }
    }
    
    // 统计成功和失败的数量
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info(`菜品批量更新完成: ${successCount}成功, ${failureCount}失败`);
    
    return NextResponse.json({
      success: true,
      message: `成功更新${successCount}个菜品，${failureCount}个失败`,
      results
    });
    
  } catch (error) {
    logger.error('批量更新菜品失败', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
      error
    }, { status: 500 });
  }
} 