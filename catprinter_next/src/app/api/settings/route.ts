import { NextRequest, NextResponse } from 'next/server';
import { db, supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * 获取所有系统设置
 * GET /api/settings
 */
export async function GET() {
  try {
    const settings = await db.settings.getAll();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '获取设置失败';
    
    logger.error('获取系统设置失败', error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 数据验证
    if (!data.key || !data.value) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 更新设置
    const updatedSetting = await db.settings.set(data.key, data.value);

    return NextResponse.json({ success: true, data: updatedSetting });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '更新设置失败';
    
    logger.error('更新系统设置失败', error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 更新系统设置
 * POST /api/settings
 * 
 * 接受单个设置对象或设置对象数组
 * { key: string, value: string } 或 Array<{ key: string, value: string }>
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 如果是单个设置对象，转换为数组
    const settingsToUpdate = Array.isArray(data) ? data : [data];
    
    if (settingsToUpdate.length === 0) {
      return NextResponse.json(
        { success: false, message: '未提供有效的设置数据' },
        { status: 400 }
      );
    }
    
    // 批量更新或创建设置（非事务方式）
    const promises = settingsToUpdate.map(setting => {
      // 验证设置数据
      if (!setting.key || !setting.value) {
        throw new Error('设置必须包含key和value属性');
      }
      
      return db.settings.set(setting.key, setting.value);
    });
    
    const results = await Promise.all(promises);
    
    return NextResponse.json({
      success: true,
      message: '设置已更新',
      data: results
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '更新设置失败';
    
    logger.error('更新系统设置失败', error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 删除系统设置
 * DELETE /api/settings
 * 
 * 接受单个键名或键名数组
 * { key: string } 或 Array<{ key: string }>
 */
export async function DELETE(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 如果是单个键名，转换为数组
    const keysToDelete = Array.isArray(data) 
      ? data.map(item => item.key) 
      : [data.key];
    
    if (keysToDelete.length === 0) {
      return NextResponse.json(
        { success: false, message: '未提供有效的键名' },
        { status: 400 }
      );
    }
    
    // 批量删除设置（非事务方式）
    const promises = keysToDelete.map(async key => {
      // 注意：当前 db.settings 接口没有直接的删除方法
      // 使用 supabase 直接操作
      try {
        const { data } = await supabase
          .from('system_settings')
          .delete()
          .eq('key', key);
        return data;
      } catch {
        // 忽略不存在的设置
        return null;
      }
    });
    
    const results = await Promise.all(promises);
    const validResults = results.filter(r => r !== null);
    
    return NextResponse.json({
      success: true,
      message: `成功删除 ${validResults.length} 个设置`,
      data: validResults
    });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '删除设置失败';
    
    logger.error('删除系统设置失败', error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}