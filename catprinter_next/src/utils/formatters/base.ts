import { FoodItem, Order } from './types';
import { PrintStyle } from './styles';
import { FoodItemFormatterFactory } from './food';
import { supabase } from '@/lib/supabase';

/**
 * Abstrakte Basisklasse für Bestellungsformatierer
 */
export abstract class BaseFormatter {
  protected printStyle: PrintStyle;

  constructor(style?: PrintStyle) {
    this.printStyle = style || new PrintStyle();
  }

  /**
   * Formatierung einer Bestellung
   */
  public abstract format(order: Order): Promise<string>;

  /**
   * Formatierung einer Speisenliste
   */
  protected formatFoodItems(items: FoodItem[], indent: string = ""): string[] {
    const lines: string[] = [];
    for (const item of items) {
      const formatter = FoodItemFormatterFactory.getFormatter(item);
      const itemLines = formatter.format(item, indent);
      lines.push(...itemLines);
    }
    return lines;
  }

  /**
   * Maskierung der Bestellungs-ID
   */
  protected maskOrderId(orderId: string | number): string {
    if (!orderId) {
      return "**********";
    }

    let processedId = String(orderId);
    if (processedId.length > 10) {
      processedId = processedId.slice(-10);
    } else if (processedId.length < 10) {
      processedId = processedId.padStart(10, '0');
    }

    const visiblePart = processedId.slice(-4);
    const maskedPart = "*".repeat(6);
    return maskedPart + visiblePart;
  }

  /**
   * Abrufen der Bestellanzahl des Tages
   */
  protected async getDailyOrderCount(orderId: string | number): Promise<string> {
    try {
      // 获取当前日期的起止时间
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // 查询当日订单数量
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());
        
      if (error) {
        console.error('获取当日订单数量错误:', error);
        return "001";
      }
      
      // 格式化为3位数字
      return (count || 1).toString().padStart(3, '0');
    } catch (error) {
      console.error('获取当日订单数量错误:', error);
      return "001";
    }
  }
} 