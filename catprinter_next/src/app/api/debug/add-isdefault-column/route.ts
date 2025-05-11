import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 直接执行SQL添加isDefault列
    const { data: checkColumnData, error: checkColumnError } = await supabase.rpc(
      'execute_sql',
      {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'printers' AND column_name = 'isDefault'
        `
      }
    );

    // 检查列是否已存在
    if (checkColumnData && checkColumnData.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'isDefault列已存在，无需添加' 
      });
    }

    // 添加isDefault列
    const { data, error } = await supabase.rpc(
      'execute_sql',
      {
        query: `
          ALTER TABLE printers 
          ADD COLUMN "isDefault" boolean DEFAULT false;
        `
      }
    );
    
    if (error) {
      console.error('添加isDefault列失败:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    // 将is_default列的值复制到isDefault列（如果is_default列存在）
    const { data: checkOldColumnData } = await supabase.rpc(
      'execute_sql',
      {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'printers' AND column_name = 'is_default'
        `
      }
    );

    if (checkOldColumnData && checkOldColumnData.length > 0) {
      await supabase.rpc(
        'execute_sql',
        {
          query: `
            UPDATE printers 
            SET "isDefault" = is_default 
            WHERE is_default IS NOT NULL;
          `
        }
      );
    }

    // 设置至少一个打印机为默认打印机（如果没有默认打印机）
    const { data: checkDefaultData } = await supabase.rpc(
      'execute_sql',
      {
        query: `
          SELECT COUNT(*) 
          FROM printers 
          WHERE "isDefault" = true
        `
      }
    );

    if (checkDefaultData && checkDefaultData[0] && checkDefaultData[0].count === '0') {
      await supabase.rpc(
        'execute_sql',
        {
          query: `
            UPDATE printers 
            SET "isDefault" = true 
            WHERE id = (SELECT id FROM printers LIMIT 1)
          `
        }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'isDefault列已成功添加并配置' 
    });
  } catch (error) {
    console.error('处理请求时出错:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// 提供POST方法以支持多种请求方式
export async function POST(request: NextRequest) {
  return GET(request);
} 