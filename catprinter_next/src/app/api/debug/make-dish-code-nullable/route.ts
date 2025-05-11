import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('开始执行dishes表code字段修改...');
    
    // 1. 移除唯一约束
    const { error: dropConstraintError } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
          ALTER TABLE dishes
          DROP CONSTRAINT IF EXISTS dishes_code_key
        `
      }
    );

    if (dropConstraintError) {
      console.error('移除唯一约束失败:', dropConstraintError);
      return NextResponse.json({ success: false, error: dropConstraintError }, { status: 500 });
    }
    
    // 2. 修改列为可空
    const { error: alterColumnError } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
          ALTER TABLE dishes
          ALTER COLUMN code DROP NOT NULL
        `
      }
    );

    if (alterColumnError) {
      console.error('修改列为可空失败:', alterColumnError);
      return NextResponse.json({ success: false, error: alterColumnError }, { status: 500 });
    }
    
    // 3. 为非空值重新添加唯一约束
    const { error: createIndexError } = await supabase.rpc(
      'exec_sql',
      {
        sql_query: `
          CREATE UNIQUE INDEX dishes_code_unique_idx ON dishes (code)
          WHERE code IS NOT NULL AND code != ''
        `
      }
    );

    if (createIndexError) {
      console.error('创建唯一索引失败:', createIndexError);
      return NextResponse.json({ success: false, error: createIndexError }, { status: 500 });
    }

    console.log('dishes表code字段修改成功');
    return NextResponse.json({
      success: true,
      message: '菜品编码已成功修改为可选字段'
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