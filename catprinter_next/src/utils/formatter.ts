/**
 * Print Formatting Utility
 */
import { DIVIDER, LINE_WIDTH } from '../constants';
import { maskOrderId } from './security';

/**
 * Format timestamp, aligned to the left, precise to the minute
 * @param {Date} timestamp - Time object
 * @returns {string} - Formatted time string
 */
export function formatTimestamp(timestamp: Date | string | number): string {
  if (!timestamp) {
    return '';
  }
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  // 日月年小时分钟格式
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  const formattedDate = `${day}-${month}-${year} ${hours}:${minutes}`;
  
  return formattedDate;
}

/**
 * Format dish name for printing
 * @param {string} name - Dish name
 * @param {string} [code] - Dish code (optional)
 * @returns {string} - Formatted name
 */
export function translateDishName(name: string, code: string = ''): string {
  if (!name) {
    return '';
  }
  
  // 返回原始菜品名称，不添加Special后缀
  return name;
}

/**
 * Format custom dumpling special layout
 * @param {Object} item - Dumpling item object
 * @returns {string[]} - Formatted line array
 */
export function formatCustomDumpling(item: {
  qty: number;
  code?: string;
  name: string;
  sub_items?: Record<string, number>;
}): string[] {
  const lines: string[] = [];
  
  // Add main line
  lines.push(`${item.qty} x ${item.code} Dumplings`);
  
  // Sub-items (fillings)
  if (item.sub_items && Object.keys(item.sub_items).length > 0) {
    for (const [subName, subQty] of Object.entries(item.sub_items)) {
      lines.push(`  ${subQty} x ${subName}`);
    }
  }
  
  return lines;
}

interface OrderItem {
  qty: number;
  code?: string;
  name: string;
  is_custom_dumpling?: boolean;
  sub_items?: Record<string, number>;
}

interface Order {
  date_time?: Date | string | number;
  order_id?: string;
  table_no?: string | number;
  items?: OrderItem[];
}

/**
 * Convert order to preview format
 * @param {Object} order - Order object
 * @returns {string[]} - Formatted line array
 */
export function formatOrderPreview(order: Order): string[] {
  const lines: string[] = [];
  
  // Add time
  if (order.date_time) {
    lines.push(formatTimestamp(order.date_time));
  } else {
    lines.push(formatTimestamp(new Date()));
  }
  
  // Add order ID
  if (order.order_id) {
    const masked = maskOrderId(order.order_id);
    lines.push(`Bestellung-ID: ${masked}`);
  }
  
  // Add empty line
  lines.push('');
  
  // Add table number
  if (order.table_no) {
    lines.push(`Tisch: ${order.table_no}`);
  }
  
  // Add divider
  lines.push(DIVIDER);
  
  // Add dish details
  if (order.items && order.items.length > 0) {
    // 记录上一个项目，用于判断是否添加空行
    let previousItem: OrderItem | null = null;
    
    for (const item of order.items) {
      // 如果不是第一个项目，添加空行作为间距
      if (previousItem) {
        lines.push(''); // 添加空行作为项目间的间距
      }
      
      if (item.is_custom_dumpling) {
        // Special layout for dumplings
        const dumplingLines = formatCustomDumpling(item);
        lines.push(...dumplingLines);
      } else {
        // Standard format for other dishes
        if (item.code) {
          lines.push(`${item.qty} x ${item.code}`);
        } else {
          lines.push(`${item.qty} x ${item.name}`);
        }
      }
      
      previousItem = item;
    }
  }
  
  // Add total line
  lines.push(DIVIDER);
  lines.push(`Summe: ${order.items?.length || 0} Artikel`);
  
  return lines;
}

/**
 * Convert order to print format (for kitchen printing)
 * @param {Object} order - Order object
 * @returns {string[]} - Formatted line array
 */
export function formatOrderForKitchen(order: Order): string[] {
  return formatOrderPreview(order);
} 