/**
 * 对订单ID进行掩码处理
 * @param orderId 原始订单ID
 * @returns 掩码后的订单ID
 */
export function maskOrderId(orderId: string): string {
  if (!orderId) return '';
  
  // 保留前两位和后两位，中间用星号代替
  const length = orderId.length;
  if (length <= 4) return orderId;
  
  const prefix = orderId.slice(0, 2);
  const suffix = orderId.slice(-2);
  const maskLength = length - 4;
  const mask = '*'.repeat(maskLength);
  
  return `${prefix}${mask}${suffix}`;
} 