import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sql } = body;

    if (!sql) {
      return NextResponse.json(
        { success: false, error: '未提供SQL语句' }, 
        { status: 400 }
      );
    }

    // 直接执行SQL查询
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('执行SQL失败:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('处理请求时出错:', error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
} 