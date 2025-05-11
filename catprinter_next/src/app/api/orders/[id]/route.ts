import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { dbAdmin } from '@/lib/supabase-server';

// 获取单个订单
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await dbAdmin.orders.getById(params.id);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// 更新订单
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const sanitizedData = {
      ...body,
      order_no: body.order_no || body.orderNo,
      table_no: body.table_no || body.tableNo,
      date_time: body.date_time || body.dateTime,
      total_price: body.total_price || body.totalPrice,
      print_count: body.print_count || body.printCount,
      last_print_time: body.last_print_time || body.lastPrintTime,
      print_retries: body.print_retries || body.printRetries,
      queued_at: body.queued_at || body.queuedAt
    };
    
    const order = await dbAdmin.orders.update(params.id, sanitizedData);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// 删除订单
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbAdmin.orders.delete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}