'use client';

import { useState, useEffect } from 'react';
import { formatOrderPreview } from '../lib/formatter';

/**
 * 订单打印预览组件
 * 
 * @param {Object} props
 * @param {Object} props.order - 订单对象
 */
export default function OrderPrintPreview({ order }) {
  const [printLines, setPrintLines] = useState([]);

  useEffect(() => {
    if (order) {
      const formattedLines = formatOrderPreview(order);
      setPrintLines(formattedLines);
    }
  }, [order]);

  if (!order) {
    return <div className="p-4 border rounded bg-gray-50">无订单数据</div>;
  }

  return (
    <div className="font-mono p-4 border rounded bg-gray-50 whitespace-pre-wrap">
      {printLines.map((line, index) => (
        <div key={index} className="text-sm">
          {line}
        </div>
      ))}
    </div>
  );
} 