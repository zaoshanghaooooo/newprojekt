'use client';

import { formatOrderPreview } from '@/utils/formatter';
import { useEffect, useState } from 'react';

interface OrderPrintProps {
  order: {
    date_time?: Date | string | number;
    order_id?: string;
    table_no?: string | number;
    items?: Array<{
      qty: number;
      code?: string;
      name: string;
      is_custom_dumpling?: boolean;
      sub_items?: Record<string, number>;
    }>;
  };
}

export default function OrderPrint({ order }: OrderPrintProps) {
  const [printLines, setPrintLines] = useState<string[]>([]);

  useEffect(() => {
    if (order) {
      const lines = formatOrderPreview(order);
      setPrintLines(lines);
    }
  }, [order]);

  return (
    <div className="font-mono whitespace-pre-wrap bg-white p-4 rounded-lg shadow">
      {printLines.map((line, index) => (
        <div 
          key={index} 
          className={`${line === '' ? 'h-4' : ''} ${
            line.startsWith('--') ? 'border-t border-gray-300 my-2' : ''
          }`}
        >
          {!line.startsWith('--') && line}
        </div>
      ))}
    </div>
  );
} 