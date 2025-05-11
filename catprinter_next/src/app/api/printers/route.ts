import { NextRequest, NextResponse } from 'next/server';
import { db, supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * 获取所有打印机
 * GET /api/printers
 */
export async function GET() {
  try {
    const { data: printers, error } = await db.printers.list();
    
    if (error) throw error;
    return NextResponse.json(printers);
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '获取打印机失败';
    
    logger.error('获取打印机失败', error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 添加新打印机
 * POST /api/printers
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 验证必填字段
    if (!data.name || !data.sn) {
      return NextResponse.json(
        { success: false, message: '打印机名称和SN号为必填项' },
        { status: 400 }
      );
    }
    
    // 检查SN是否已存在
    const { data: existingPrinters, error } = await supabase
      .from('printers')
      .select('*')
      .eq('sn', data.sn);
      
    if (error) throw error;
    
    const existingPrinter = existingPrinters && existingPrinters.length > 0 ? existingPrinters[0] : null;
    
    if (existingPrinter) {
      return NextResponse.json(
        { success: false, message: '该SN号的打印机已存在' },
        { status: 409 }
      );
    }
    
    // 如果设置为默认打印机，需要将其他打印机设为非默认
    if (data.isDefault) {
      await db.printers.clearDefaultStatus();
    }
    
    // 创建新打印机
    const { data: newPrinter, error: createError } = await db.printers.create({
      name: data.name,
      sn: data.sn,
      type: data.type || 'thermal',
      status: '离线', // 默认离线状态
      isDefault: data.isDefault || false,
      address: data.address
    });
    
    if (createError) throw createError;
    
    return NextResponse.json(newPrinter, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : '创建打印机失败';
    
    logger.error('创建打印机失败', error);
    
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

// 更新打印机状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body || !body.id) {
      return NextResponse.json({ error: '缺少必要的参数' }, { status: 400 });
    }
    
    // 检查打印机是否存在
    const { data: existingPrinter, error: findError } = await db.printers.getById(body.id);
    
    if (findError) throw findError;
    
    if (!existingPrinter) {
      return NextResponse.json({ error: '打印机不存在' }, { status: 404 });
    }
    
    // 更新打印机信息
    const { data: updatedPrinter, error: updateError } = await db.printers.update(body.id, {
      name: body.name !== undefined ? body.name : existingPrinter.name,
      type: body.type !== undefined ? body.type : existingPrinter.type,
      address: body.address !== undefined ? body.address : existingPrinter.address,
      status: body.status !== undefined ? body.status : existingPrinter.status,
      lastActiveTime: body.lastActiveTime !== undefined ? new Date(body.lastActiveTime) : existingPrinter.lastActiveTime
    });
    
    if (updateError) throw updateError;
    
    return NextResponse.json(updatedPrinter);
  } catch (error) {
    console.error('更新打印机错误:', error);
    return NextResponse.json({ error: '更新打印机失败' }, { status: 500 });
  }
}