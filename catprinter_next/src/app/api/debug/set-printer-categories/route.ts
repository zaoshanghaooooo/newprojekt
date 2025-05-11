import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 设置打印机类别
 * 确保有专门的饮料打印机和食物打印机
 */
export async function GET() {
  try {
    console.log('开始设置打印机类别...');
    
    // 首先查询所有打印机
    const { data: printers, error } = await supabase
      .from('printers')
      .select('*');
      
    if (error || !printers || printers.length === 0) {
      console.error('查询打印机错误:', error);
      return NextResponse.json({
        success: false,
        message: error ? '查询打印机错误' : '没有找到任何打印机',
        error: error?.message
      }, { status: error ? 500 : 404 });
    }
    
    console.log(`找到 ${printers.length} 台打印机`);
    
    // 找到默认打印机
    const defaultPrinter = printers.find(p => p.isDefault === true);
    if (!defaultPrinter) {
      console.log('没有找到默认打印机，请先设置默认打印机');
      return NextResponse.json({
        success: false,
        message: '没有找到默认打印机，请先设置默认打印机',
      }, { status: 400 });
    }
    
    // 找到除默认打印机之外的其他打印机
    const otherPrinters = printers.filter(p => p.id !== defaultPrinter.id);
    
    // 如果只有一台打印机，将其设置为食物和饮料打印机
    if (printers.length === 1) {
      const { data, error: updateError } = await supabase
        .from('printers')
        .update({ 
          isDefault: true,
          category: 'all'
        })
        .eq('id', defaultPrinter.id)
        .select();
        
      if (updateError) {
        console.error('更新打印机类别错误:', updateError);
        return NextResponse.json({
          success: false,
          message: '更新打印机类别错误',
          error: updateError.message
        }, { status: 500 });
      }
      
      console.log(`已将打印机 ${defaultPrinter.name} 设置为所有类别的默认打印机`);
      
      return NextResponse.json({
        success: true,
        message: `已将打印机 ${defaultPrinter.name} 设置为所有类别的默认打印机`,
        printer: data
      });
    }
    
    // 如果有两台或更多打印机，将其中一台设置为饮料打印机，一台设置为食物打印机
    let drinkPrinter = printers.find(p => p.category === 'drink' || p.category === 'beverage');
    let foodPrinter = printers.find(p => p.category === 'food');
    
    // 定义更新数组的类型
    interface PrinterUpdate {
      id: string;
      category: string;
    }
    
    const updates: PrinterUpdate[] = [];
    
    // 如果没有饮料打印机，将默认打印机设置为饮料打印机
    if (!drinkPrinter) {
      drinkPrinter = defaultPrinter;
      updates.push({
        id: defaultPrinter.id,
        category: 'drink'
      });
    }
    
    // 如果没有食物打印机，将其他打印机中的第一台设置为食物打印机
    if (!foodPrinter && otherPrinters.length > 0) {
      foodPrinter = otherPrinters[0];
      updates.push({
        id: otherPrinters[0].id,
        category: 'food'
      });
    } else if (!foodPrinter && updates.length > 0) {
      // 如果没有其他打印机，将默认打印机同时设置为食物打印机
      updates[0].category = 'all';
    }
    
    // 执行更新
    const results: any[] = [];
    for (const update of updates) {
      const { data, error: updateError } = await supabase
        .from('printers')
        .update({ category: update.category })
        .eq('id', update.id)
        .select();
        
      if (updateError) {
        console.error(`更新打印机 ${update.id} 类别错误:`, updateError);
      } else {
        console.log(`已将打印机 ${data[0].name} 设置为 ${update.category} 类别`);
        results.push(data[0]);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `已设置打印机类别`,
      drinkPrinter: drinkPrinter?.name,
      foodPrinter: foodPrinter?.name,
      updates: results
    });
  } catch (error) {
    console.error('设置打印机类别错误:', error);
    return NextResponse.json({
      success: false,
      message: '设置打印机类别错误',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 