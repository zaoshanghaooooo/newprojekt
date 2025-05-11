import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('开始执行dishes表添加capacity字段...');
    
    // 1. 检查capacity列是否已存在
    const { data: checkColumnData, error: checkColumnError } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'dishes' AND column_name = 'capacity'
        `
      }
    );

    // 检查列是否已存在
    if (checkColumnData && checkColumnData.length > 0) {
      logger.info('capacity列已存在，无需添加');
      return NextResponse.json({ 
        success: true, 
        message: 'capacity列已存在，无需添加' 
      });
    }

    // 2. 添加capacity列
    const { error: addColumnError } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
          ALTER TABLE dishes 
          ADD COLUMN capacity TEXT
        `
      }
    );
    
    if (addColumnError) {
      logger.error('添加capacity列失败:', addColumnError);
      return NextResponse.json({ success: false, error: addColumnError }, { status: 500 });
    }

    // 3. 对饮料类型的菜品设置默认值
    const { error: updateDefaultError } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
          UPDATE dishes
          SET capacity = '标准'
          WHERE food_type = 'drink'
        `
      }
    );

    if (updateDefaultError) {
      logger.error('更新饮料菜品capacity默认值失败:', updateDefaultError);
      return NextResponse.json({ success: false, error: updateDefaultError }, { status: 500 });
    }

    logger.info('dishes表capacity字段添加成功');
    return NextResponse.json({
      success: true,
      message: '菜品capacity列已成功添加'
    });
  } catch (error) {
    logger.error('处理请求时出错:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// 支持POST方法
export async function POST(request: NextRequest) {
  return GET(request);
} 