/**
 * Security utility functions
 */

/**
 * Mask order ID for privacy
 * @param {string} orderId - The original order ID
 * @returns {string} - Masked order ID
 */
export function maskOrderId(orderId) {
  if (!orderId) {
    return '';
  }
  
  // 如果订单ID长度小于等于4，直接返回
  if (orderId.length <= 4) {
    return orderId;
  }
  
  // 保留前两位和后两位，中间用星号替代
  const start = orderId.substring(0, 2);
  const end = orderId.substring(orderId.length - 2);
  const masked = start + '*'.repeat(orderId.length - 4) + end;
  
  return masked;
} 