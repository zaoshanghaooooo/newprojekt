import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 修复打印机默认设置
 * 确保只有一个打印机被设置为默认
 */
export async function GET() {
  try {
    console.log('开始修复打印机默认设置...');
    
    // 首先查询所有设置为默认的打印机
    const { data: defaultPrinters, error } = await supabase
      .from('printers')
      .select('*')
      .eq('isDefault', true);
      
    if (error) {
      console.error('查询默认打印机错误:', error);
      return NextResponse.json({
        success: false,
        message: '查询默认打印机错误',
        error: error.message
      }, { status: 500 });
    }
    
    console.log(`找到 ${defaultPrinters.length} 台设置为默认的打印机`);
    
    // 如果没有默认打印机，将第一台打印机设置为默认
    if (defaultPrinters.length === 0) {
      const { data: allPrinters, error: allPrintersError } = await supabase
        .from('printers')
        .select('*')
        .limit(1);
        
      if (allPrintersError || !allPrinters || allPrinters.length === 0) {
        console.error('没有找到任何打印机');
        return NextResponse.json({
          success: false,
          message: '没有找到任何打印机',
          error: allPrintersError?.message
        }, { status: 404 });
      }
      
      // 将第一台打印机设置为默认
      const { data: updatedPrinter, error: updateError } = await supabase
        .from('printers')
        .update({ isDefault: true })
        .eq('id', allPrinters[0].id)
        .select();
        
      if (updateError) {
        console.error('设置默认打印机错误:', updateError);
        return NextResponse.json({
          success: false,
          message: '设置默认打印机错误',
          error: updateError.message
        }, { status: 500 });
      }
      
      console.log(`已将打印机 ${allPrinters[0].name} 设置为默认`);
      
      return NextResponse.json({
        success: true,
        message: `已将打印机 ${allPrinters[0].name} 设置为默认`,
        printer: updatedPrinter
      });
    }
    
    // 如果有多个默认打印机，保留第一个，取消其他的默认设置
    if (defaultPrinters.length > 1) {
      console.log(`保留 ${defaultPrinters[0].name} 为默认打印机，取消其他 ${defaultPrinters.length - 1} 台打印机的默认设置`);
      
      const idsToReset = defaultPrinters.slice(1).map(p => p.id);
      
      const { data, error: resetError } = await supabase
        .from('printers')
        .update({ isDefault: false })
        .in('id', idsToReset)
        .select();
        
      if (resetError) {
        console.error('重置默认打印机设置错误:', resetError);
        return NextResponse.json({
          success: false,
          message: '重置默认打印机设置错误',
          error: resetError.message
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: `已将 ${defaultPrinters[0].name} 保留为默认打印机，已重置 ${idsToReset.length} 台打印机的默认设置`,
        defaultPrinter: defaultPrinters[0],
        resetPrinters: data
      });
    }
    
    // 只有一个默认打印机，不需要做任何更改
    return NextResponse.json({
      success: true,
      message: `已确认 ${defaultPrinters[0].name} 为唯一的默认打印机`,
      printer: defaultPrinters[0]
    });
  } catch (error) {
    console.error('修复打印机默认设置错误:', error);
    return NextResponse.json({
      success: false,
      message: '修复打印机默认设置错误',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 