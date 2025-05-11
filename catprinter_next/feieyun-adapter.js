/**
 * 飞鹅云打印适配器
 * 用于将订单格式化为飞鹅云打印格式
 */

/**
 * 将普通文本格式化为飞鹅云标签内容
 * @param {string[]} lines - 原始文本行数组
 * @returns {string} - 添加了飞鹅云标签的文本
 */
export function formatToFeieyunContent(lines) {
  const taggedLines = [];
  
  // 处理每一行
  lines.forEach((line, index) => {
    // 处理时间戳（右对齐）
    if (index === 0 && line.trim().match(/\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}/)) {
      // 确保时间戳使用普通字体（无加粗）
      taggedLines.push(`${line}`);
      return;
    }
    
    // 处理订单号和订单ID（左对齐，轻微加粗 - 比时间戳稍微粗一点）
    if (line.startsWith('Bestellungsnummer:') || line.startsWith('Bestellung-ID:')) {
      // 使用飞鹅云支持的标签 - 必须使用官方支持的标签
      // 飞鹅云标签: <BR>换行, <L>左对齐, <C>居中, <R>右对齐, <N>正常, <HB>大字体, <BOLD>粗体, <CB>居中大字体
      taggedLines.push(`<BOLD>${line}</BOLD>`); // bold font标签
      return;
    }
    // 处理空行
    if (line.trim() === '') {
      taggedLines.push('<BR>');
      return;
    }
    
    // 处理Tisch（居中）
    if (line.trim().startsWith('Tisch:')) {
      taggedLines.push(`${line.trim()}`);
      return;
    }
    
    // 处理分隔线（左对齐）
    if (line.startsWith('-') && line.indexOf(' ') === -1) {
      taggedLines.push(line);
      return;
    }
    
    // 处理缩进行（备注或子项）
    if (line.startsWith('  ')) {
      taggedLines.push(line);
      return;
    }
    
    // 普通菜品行（左对齐）
    taggedLines.push(line);
  });
  
  
  // 使用飞鹅云的行分隔符连接
  return taggedLines.join('<BR>');
}