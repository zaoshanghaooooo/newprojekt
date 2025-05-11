'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OrderPrintPreview from '../../../components/OrderPrintPreview';

// 创建一个单独的组件获取和使用searchParams
function OrderContent() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        let url = '/api/orders';
        
        // 如果有指定订单ID，则获取该订单
        if (orderId) {
          url = `/api/orders/${orderId}`;
        } else {
          // 否则获取最近的订单
          url = '/api/orders?limit=1';
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`获取订单数据失败: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 如果使用列表API，取第一个订单
        const orderData = orderId ? data : (data.length > 0 ? data[0] : null);
        
        if (!orderData) {
          throw new Error('没有找到订单数据');
        }
        
        setOrder(orderData);
      } catch (err) {
        console.error('获取订单数据错误:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="text-xl font-bold">加载订单数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-xl font-bold text-red-500">错误：{error}</div>
        <p className="mt-2">请确保系统中存在订单数据</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-xl font-bold">没有可用的订单数据</div>
        <p className="mt-2">请先创建一个订单</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">订单打印预览</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">打印预览</h2>
          <OrderPrintPreview order={order} />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">订单数据</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(order, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

// Suspense fallback
function LoadingOrder() {
  return (
    <div className="container mx-auto p-4 text-center">
      <div className="text-xl font-bold">加载订单中...</div>
    </div>
  );
}

export default function PrintPreviewPage() {
  return (
    <Suspense fallback={<LoadingOrder />}>
      <OrderContent />
    </Suspense>
  );
} 