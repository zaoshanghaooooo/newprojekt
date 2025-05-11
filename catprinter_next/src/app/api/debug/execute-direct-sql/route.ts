import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // 检查列是否已存在
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'printers')
      .eq('column_name', 'isDefault');

    if (columnsError) {
      console.error('检查列是否存在失败:', columnsError);
      return NextResponse.json({ success: false, error: columnsError }, { status: 500 });
    }

    if (columns && columns.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'isDefault列已存在',
        exists: true
      });
    }

    // 添加列
    const { error: addColumnError } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
          ALTER TABLE printers
          ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
        `
      }
    );

    if (addColumnError) {
      console.error('添加isDefault列失败:', addColumnError);
      return NextResponse.json({ success: false, error: addColumnError }, { status: 500 });
    }

    // 检查是否存在旧的is_default列
    const { data: oldColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'printers')
      .eq('column_name', 'is_default');

    if (oldColumns && oldColumns.length > 0) {
      // 将旧列值复制到新列
      await supabase.rpc(
        'exec_sql',
        {
          sql_query: `
            UPDATE printers
            SET "isDefault" = is_default
            WHERE is_default IS NOT NULL;
          `
        }
      );
    }

    // 确保至少有一个默认打印机
    const { data: defaultCount } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
          SELECT COUNT(*) as count
          FROM printers
          WHERE "isDefault" = true;
        `
      }
    );

    if (defaultCount && defaultCount[0] && defaultCount[0].count === '0') {
      // 设置第一个打印机为默认
      await supabase.rpc(
        'exec_sql',
        {
          sql_query: `
            UPDATE printers
            SET "isDefault" = true
            WHERE id = (SELECT id FROM printers LIMIT 1);
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

export async function POST(request: NextRequest) {
  return GET(request);
} 