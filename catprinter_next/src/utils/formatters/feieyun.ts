import { Order } from './types';
import { BaseFormatter } from './base';
import { supabase } from '@/lib/supabase';

/**
 * Feieyun-Druckformatierer
 */
export class FeieyunFormatter extends BaseFormatter {
  /**
   * Formatierung einer Bestellung für Feieyun-Druck
   */
  public async format(order: Order): Promise<string> {
    // 使用与ESC/POS相同的格式化逻辑，只是控制字符不同
    const lines: string[] = [];

    // 1. 时间为日月年小时分钟排列，默认字号默认大小默认字体左对齐
    const date = new Date(order.created_at);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    const timeStr = `${day}-${month}-${year} ${hours}:${minutes}`;
    lines.push(timeStr);

    // 2. Bestellungsnummer 字体加粗，根据当天打印单数做排列，例如001,002,012等
    const todayOrderCount = await this.getDailyOrderCount(order.order_id || order.id.toString());
    // 飞鹅云使用HTML格式的控制标签
    lines.push(`<BOLD>Bestellungsnummer: ${todayOrderCount}</BOLD>`);

    // 3. Bestellung-ID，十位加密字符串，且只显示后四位
    const maskedId = this.maskOrderId(order.order_id || order.id.toString());
    lines.push(`Bestellung-ID: ${maskedId}`);
    
    // 4. Tisch：桌号，默认字体加大一号字号
    lines.push(`<B>Tisch: ${order.table_no || 'N/A'}</B>`);

    // 5. 分割线
    lines.push(this.printStyle.getDivider());

    // 6. 获取完整菜品信息并格式化
    const completeItems = await this.getCompleteOrderItems(order);
    
    // 如果是空订单，添加提示信息
    if (!completeItems.length) {
      lines.push("Keine Artikel in dieser Bestellung");
    } else {
      // 检查是否所有项目都是同一类型
      const isBeveragesOnly = completeItems.every(item => 
        item.food_type === 'drink' || item.food_type === 'beverage'
      );
      const isFoodOnly = completeItems.every(item => 
        item.food_type !== 'drink' && item.food_type !== 'beverage'
      );
      
      for (const item of completeItems) {
        // 根据要求格式化菜品项目：数字乘以单品编号和单品名称
        const qtyText = `${item.quantity}x`;
        let itemText = item.code ? `${item.code} ${item.name}` : item.name;
        
        // 如果是饮品，添加容量信息
        if (item.food_type === 'drink' && item.volume) {
          itemText += ` ${item.volume}`;
        }
        
        // 加粗显示菜品
        lines.push(`<B>${qtyText} ${itemText}</B>`);
        
        // 添加备注信息
        if (item.notes) {
          try {
            // 尝试解析JSON格式的备注
            const notesObj = JSON.parse(item.notes);
            if (typeof notesObj === 'object' && notesObj !== null) {
              // 处理特殊的备注格式
              for (const [key, value] of Object.entries(notesObj)) {
                lines.push(`  ${key}: ${value}`);
              }
            }
          } catch (e) {
            // 如果不是JSON格式，直接显示文本
            lines.push(`  ${item.notes}`);
          }
        }
        
        // 项目之间添加空行
        lines.push("");
      }
    }
    
    // 7. 如果是外卖订单，底部加上To Go字样加大字号
    if (order.is_takeaway) {
      lines.push(this.printStyle.getDivider());
      lines.push(`<FS>To Go</FS>`);
    }

    // 添加结束空行
    lines.push("");
    lines.push("");
    
    // 返回格式化后的内容
    return lines.join("\n");
  }
  
  /**
   * 获取订单中菜品的完整信息
   */
  private async getCompleteOrderItems(order: Order): Promise<any[]> {
    try {
      // 检查是否有预先过滤的项目（通过sendToPrinter方法添加的items_to_print属性）
      if ((order as any).items_to_print && (order as any).items_to_print.length > 0) {
        console.log('使用预先过滤的项目进行打印:', (order as any).items_to_print.length);
        return (order as any).items_to_print;
      }
      
      if (!order.id) {
        return [];
      }
      
      // 从数据库获取订单项目
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          dish:dish_id (name, code, food_type, volume)
        `)
        .eq('order_id', order.id);
        
      if (error || !data) {
        console.error('获取订单项目错误:', error);
        return [];
      }
      
      // 处理和转换订单项目
      return data.map(item => {
        return {
          ...item,
          // 如果有关联菜品数据，使用菜品名称，否则使用原始名称
          name: item.dish?.name || item.name || `Item ${item.id}`,
          code: item.dish?.code || item.code,
          food_type: item.dish?.food_type || item.food_type,
          volume: item.dish?.volume
        };
      });
    } catch (error) {
      console.error('获取完整订单项目错误:', error);
      return [];
    }
  }
} 