import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * 设置默认打印机
 * PATCH /api/printers/:id/default
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
    
    // 首先检查打印机是否存在
    const { data: printer, error: checkError } = await supabase
      .from('printers')
      .select('id, name')
      .eq('id', id)
      .single();
      
    if (checkError) {
      logger.error(`查找打印机出错: ${checkError.message}`, checkError);
      
      return NextResponse.json(
        { success: false, message: '打印机不存在或无法访问' },
        { status: 404 }
      );
    }
    
    // 开始事务处理：先清除所有打印机的默认标志，然后设置当前打印机为默认
    
    // 1. 清除所有打印机的默认标志
    const { error: clearError } = await supabase
      .from('printers')
      .update({ isDefault: false })
      .neq('id', 'none'); // 更新所有打印机
      
    if (clearError) {
      logger.error(`清除默认打印机标志时出错: ${clearError.message}`, clearError);
      
      return NextResponse.json(
        { success: false, message: '无法更新打印机默认状态' },
        { status: 500 }
      );
    }
    
    // 2. 设置当前打印机为默认
    const { data: updatedPrinter, error: updateError } = await supabase
      .from('printers')
      .update({ isDefault: true })
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) {
      logger.error(`设置默认打印机时出错: ${updateError.message}`, updateError);
      
      return NextResponse.json(
        { success: false, message: '无法设置默认打印机' },
        { status: 500 }
      );
    }
    
    logger.info(`默认打印机已设置为: ${printer.name} (${id})`);
    
    return NextResponse.json({
      success: true,
      message: `打印机 ${printer.name} 已设为默认`,
      data: updatedPrinter
    });
    
  } catch (error) {
    logger.error('设置默认打印机时出错', error);
    
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}