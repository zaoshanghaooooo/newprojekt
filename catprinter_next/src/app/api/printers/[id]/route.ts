import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * 获取单个打印机
 * GET /api/printers/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '打印机ID是必需的' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('printers')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      logger.error(`获取打印机错误: ${error.message}`, error);
      
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data
    });
    
  } catch (error) {
    logger.error('获取打印机时出错', error);
    
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新打印机
 * PATCH /api/printers/:id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '打印机ID是必需的' },
        { status: 400 }
      );
    }
    
    const updateData = await request.json();
    
    // 验证更新数据
    const allowedFields = [
      'name', 
      'sn', 
      'type', 
      'address', 
      'status',
      'key',
      'category',  // 允许更新打印机类别
      'isDefault'
    ];
    
    const filteredData: any = {};
    
    // 过滤只允许更新的字段
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }
    
    // 记录更新操作
    logger.info(`更新打印机 ${id}:`, filteredData);
    
    // 执行更新
    const { data, error } = await supabase
      .from('printers')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      logger.error(`更新打印机错误: ${error.message}`, error);
      
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '打印机已更新',
      data
    });
    
  } catch (error) {
    logger.error('更新打印机时出错', error);
    
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

/**
 * 删除打印机
 * DELETE /api/printers/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '打印机ID是必需的' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('printers')
      .delete()
      .eq('id', id);
      
    if (error) {
      logger.error(`删除打印机错误: ${error.message}`, error);
      
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '打印机已删除'
    });
    
  } catch (error) {
    logger.error('删除打印机时出错', error);
    
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}