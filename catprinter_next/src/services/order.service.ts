import { supabase } from '@/lib/supabase-client';
import type { Tables } from '@/lib/supabase-client';

type Order = Tables['orders']['Row'];
type OrderItem = Tables['order_items']['Row'];

/**
 * Service-Klasse für Order-Operationen
 * 订单服务类
 */
export class OrderService {
  /**
   * Erstellt eine neue Bestellung
   * 创建新订单
   */
  async create(data: {
    tableNo: string;
    totalPrice: number;
    items: Array<Omit<OrderItem, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>>;
  }): Promise<(Order & { items: OrderItem[] }) | null> {
    const orderNo = this.generateOrderNo();
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        orderNo,
        tableNo: data.tableNo,
        totalPrice: data.totalPrice,
        status: 'pending',
        printCount: 0,
        printRetries: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) throw orderError;
    if (!order) return null;

    // Create order items
    const orderItems = data.items.map(item => ({
      ...item,
      orderId: order.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (itemsError) throw itemsError;
    return { ...order, items: items || [] };
  }

  /**
   * Findet eine Bestellung anhand der ID
   * 根据 ID 查找订单
   */
  async findById(id: string): Promise<(Order & { items: OrderItem[] }) | null> {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select()
      .eq('id', id)
      .single();

    if (orderError) throw orderError;
    if (!order) return null;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select()
      .eq('orderId', id);

    if (itemsError) throw itemsError;
    return { ...order, items: items || [] };
  }

  /**
   * Aktualisiert eine Bestellung
   * 更新订单
   */
  async update(
    id: string,
    data: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<(Order & { items: OrderItem[] }) | null> {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        ...data,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (orderError) throw orderError;
    if (!order) return null;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select()
      .eq('orderId', id);

    if (itemsError) throw itemsError;
    return { ...order, items: items || [] };
  }

  /**
   * Löscht eine Bestellung
   * 删除订单
   */
  async delete(id: string): Promise<(Order & { items: OrderItem[] }) | null> {
    // First get the order and items for return value
    const orderWithItems = await this.findById(id);
    if (!orderWithItems) return null;

    // Delete order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('orderId', id);

    if (itemsError) throw itemsError;

    // Delete order
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (orderError) throw orderError;

    return orderWithItems;
  }

  /**
   * Findet alle Bestellungen
   * 查找所有订单
   */
  async findAll(options: {
    skip?: number;
    take?: number;
    where?: Partial<Order>;
    orderBy?: { column: keyof Order; ascending?: boolean };
  } = {}): Promise<(Order & { items: OrderItem[] })[]> {
    let query = supabase
      .from('orders')
      .select();

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column as string, {
        ascending: options.orderBy.ascending ?? true
      });
    }

    if (options.skip !== undefined) {
      query = query.range(options.skip, (options.skip + (options.take || 10)) - 1);
    }

    const { data: orders, error: ordersError } = await query;
    if (ordersError) throw ordersError;
    if (!orders) return [];

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select()
          .eq('orderId', order.id);

        if (itemsError) throw itemsError;
        return { ...order, items: items || [] };
      })
    );

    return ordersWithItems;
  }

  /**
   * Findet Bestellungen nach Status
   * 根据状态查找订单
   */
  async findByStatus(status: string): Promise<(Order & { items: OrderItem[] })[]> {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select()
      .eq('status', status);

    if (ordersError) throw ordersError;
    if (!orders) return [];

    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select()
          .eq('orderId', order.id);

        if (itemsError) throw itemsError;
        return { ...order, items: items || [] };
      })
    );

    return ordersWithItems;
  }

  /**
   * Aktualisiert den Bestellungsstatus
   * 更新订单状态
   */
  async updateStatus(id: string, status: string): Promise<(Order & { items: OrderItem[] }) | null> {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (orderError) throw orderError;
    if (!order) return null;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select()
      .eq('orderId', id);

    if (itemsError) throw itemsError;
    return { ...order, items: items || [] };
  }

  /**
   * Generiert eine Bestellnummer
   * 生成订单号
   */
  private generateOrderNo(): string {
    const date = new Date();
    const timestamp = date.getTime();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
  }

  /**
   * Zählt die Anzahl der Bestellungen
   * 统计订单数量
   */
  async count(where: Partial<Order> = {}): Promise<number> {
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }
} 