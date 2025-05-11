import { PrintStyle } from './styles';
import { EscPosFormatter } from './escpos';
import { FeieyunFormatter } from './feieyun';
import { FoodItem, FormattedOrder, Order, OrderItem } from './types';
import { supabase } from '@/lib/supabase';

export enum PrinterType {
  ESCPOS = 'escpos',
  FEIEYUN = 'feieyun'
}

/**
 * Formatierungsdienst für Bestellungen
 */
export class FormatService {
  private static instance: FormatService;
  private formatters: Map<string, EscPosFormatter | FeieyunFormatter>;

  private constructor() {
    this.formatters = new Map();
    this.formatters.set(PrinterType.ESCPOS, new EscPosFormatter());
    this.formatters.set(PrinterType.FEIEYUN, new FeieyunFormatter());
  }

  public static getInstance(): FormatService {
    if (!FormatService.instance) {
      FormatService.instance = new FormatService();
    }
    return FormatService.instance;
  }

  /**
   * Bestellung für den Druck formatieren
   */
  public async formatOrder(
    order: Order,
    items: OrderItem[],
    printerType: string,
    style?: PrintStyle
  ): Promise<string> {
    // 扩展订单信息，确保包含是否外卖等信息
    const enhancedOrder = await this.enhanceOrderInfo(order);

    // Bestellung in das interne Format konvertieren
    const formattedOrder = this.convertToFormattedOrder(enhancedOrder, items);

    // Formatierer abrufen
    const formatter = this.formatters.get(printerType.toLowerCase());
    if (!formatter) {
      throw new Error(`Unbekannter Druckertyp: ${printerType}`);
    }

    // Wenn ein Stil angegeben wurde, einen neuen Formatierer mit diesem Stil erstellen
    const formatterWithStyle = style ? 
      (printerType === PrinterType.ESCPOS ? 
        new EscPosFormatter(style) : 
        new FeieyunFormatter(style)
      ) : 
      formatter;

    // Bestellung formatieren
    return formatterWithStyle.format(formattedOrder);
  }

  /**
   * 扩展订单信息，添加额外所需数据
   */
  private async enhanceOrderInfo(order: Order): Promise<Order> {
    try {
      // 检查是否有订单类型信息
      if (order.id && (order.is_takeaway === undefined)) {
        // 从数据库获取完整订单信息
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_type')
          .eq('id', order.id)
          .single();
          
        if (!error && data) {
          // 根据订单类型设置外卖标志
          return {
            ...order,
            is_takeaway: data.order_type === 'takeaway'
          };
        }
      }
      
      return order;
    } catch (error) {
      console.error('获取订单信息错误:', error);
      return order;
    }
  }

  /**
   * Supabase-Bestellung in das interne Format konvertieren
   */
  private convertToFormattedOrder(order: Order, items: OrderItem[]): FormattedOrder {
    const formattedItems: FoodItem[] = items.map(item => {
      // 如果有dish信息，使用dish中的字段
      const name = item.dish?.name || item.name || `Item ${item.id}`;
      const code = item.dish?.code || item.code;
      const foodType = item.dish?.food_type || item.food_type;
      const volume = item.dish?.volume || item.volume;
      
      // 获取子项目数据，可能存储在 notes 字段中作为 JSON
      const subItemsData = item.notes ? 
        (this.tryParseJson(item.notes) || undefined) : 
        undefined;
      
      return {
        ...item,
        qty: item.quantity,
        name,
        code,
        food_type: foodType,
        volume,
        sub_items: subItemsData
      };
    });

    return {
      ...order,
      items: formattedItems
    };
  }
  
  /**
   * 尝试解析 JSON 字符串，如果失败则返回 null
   */
  private tryParseJson(jsonString: string): any | null {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('解析 JSON 字符串失败:', e);
      return null;
    }
  }
} 