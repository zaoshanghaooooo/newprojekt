'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Table, Button, message, Popconfirm, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import styles from './orders.module.css';

// 导入API
import { fetchOrders, deleteOrder, printOrder } from '@/lib/api';

// 订单类型定义
interface OrderItem {
  id: string;
  qty: number;
  name: string;
}

interface Order {
  id: string;
  orderNo: string;
  dateTime: string;
  status: string;
  printCount: number;
  lastPrintTime: string | null;
  totalPrice: number;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('default');

  // 获取订单数据
  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      
      // 确保日期格式正确且字段映射正确
      const formattedData = data.map((order: any) => { // 使用any类型以接受任意字段名
        // 检查dateTime是否为有效的日期字符串
        const dateTimeValue = order.dateTime || order.date_time;
        let formattedDateTime: string = typeof dateTimeValue === 'string' 
          ? dateTimeValue 
          : new Date().toISOString();
          
        try {
          // 尝试创建日期对象并检查其有效性
          const dateObj = new Date(formattedDateTime);
          if (isNaN(dateObj.getTime())) {
            // 无效日期用当前时间替代
            formattedDateTime = new Date().toISOString();
          }
        } catch (error) {
          console.error('日期解析错误:', error);
          // 如果解析失败，使用当前时间
          formattedDateTime = new Date().toISOString();
        }
        
        // 同样处理lastPrintTime
        const lastPrintTimeValue = order.lastPrintTime || order.last_print_time;
        let formattedLastPrintTime: string | null = null;
        if (lastPrintTimeValue) {
          try {
            const lastPrintDate = new Date(lastPrintTimeValue);
            if (!isNaN(lastPrintDate.getTime())) {
              formattedLastPrintTime = lastPrintDate.toISOString();
            }
          } catch (error) {
            console.error('最后打印时间解析错误:', error);
          }
        }
        
        // 确保正确映射数据库字段到前端字段
        return {
          id: order.id,
          // 使用驼峰或下划线命名，优先使用下划线（数据库命名）
          orderNo: order.order_no || order.orderNo || '',
          tableNo: order.table_no || order.tableNo || '',
          dateTime: formattedDateTime,
          // 默认状态为'未知'
          status: order.status || '未知',
          // 打印次数，默认为0
          printCount: typeof order.print_count === 'number' ? order.print_count : 
                     (typeof order.printCount === 'number' ? order.printCount : 0),
          lastPrintTime: formattedLastPrintTime,
          // 总价，确保为数字
          totalPrice: typeof order.total_price === 'number' ? order.total_price :
                     (typeof order.totalPrice === 'number' ? order.totalPrice : 0),
          // 确保items属性存在，默认为空数组
          items: order.items || []
        } as Order;
      });
      
      // 按日期降序排序确保最新订单在前
      const sortedData = formattedData.sort((a, b) => {
        return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
      });
      
      setOrders(sortedData);
    } catch (error) {
      console.error('加载订单失败', error);
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    setHasMounted(true);
    loadOrders();
    return () => {
      message.destroy();
    };
  }, []);

  // 删除订单
  const handleDelete = async (id: string) => {
    try {
      await deleteOrder(id);
      message.success('订单已成功删除');
      setOrders(prev => prev.filter(order => order.id !== id)); // 使用filter创建新数组
    } catch (error) {
      console.error('删除订单失败', error);
      message.error('删除订单失败');
    }
  };

  // 打印订单
  const handlePrint = async (orderId: string) => {
    try {
      message.loading({
        content: '正在发送打印命令...',
        key: 'print-message',
        duration: 0
      });
      
      await printOrder(orderId, selectedPrinter);
      
      message.success({
        content: '打印命令已发送',
        key: 'print-message',
        duration: 3000
      });
      
      loadOrders(); // 重新加载以更新打印次数
    } catch (error) {
      console.error('打印订单失败', error);
      message.error({
        content: '打印失败，请检查打印机连接',
        key: 'print-message'
      });
    }
  };

  // 表格列定义
  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text, record) => (
        <Link href={`/orders/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: '桌号',
      dataIndex: 'tableNo',
      key: 'tableNo',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        // 定义状态映射
        const statusMap = {
          'pending': '待处理',
          'processing': '处理中',
          'completed': '已完成',
          'cancelled': '已取消',
          '待处理': '待处理',
          '处理中': '处理中',
          '已打印': '已打印',
          '已完成': '已完成',
          '已取消': '已取消'
        };
        
        // 定义状态颜色映射
        const colorMap = {
          '待处理': 'orange',
          '处理中': 'processing',
          '已打印': 'blue',
          '已完成': 'success',
          '已取消': 'error',
          'pending': 'orange',
          'processing': 'processing',
          'completed': 'success',
          'cancelled': 'error'
        };
        
        // 获取中文状态文本
        const statusText = statusMap[status] || status || '未知';
        // 获取状态颜色
        const color = colorMap[status] || 'default';
        
        return <Tag color={color}>{statusText}</Tag>;
      },
    },
    {
      title: '下单时间',
      dataIndex: 'dateTime',
      key: 'dateTime',
      sorter: (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
      render: (dateTime) => {
        // 添加验证检查确保日期有效
        if (!dateTime) return <div>-</div>;
        
        let date;
        try {
          date = new Date(dateTime);
          // 检查是否为有效日期（无效日期会返回NaN）
          if (isNaN(date.getTime())) {
            return <div>无效日期</div>;
          }
        } catch (error) {
          console.error('日期解析错误:', error);
          return <div>日期错误</div>;
        }
        
        return (
          <>
            {hasMounted && (
            <>
              <div>{date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}</div>
              <div className={styles.timeAgo}>
                {formatDistanceToNow(date, { addSuffix: true, locale: zhCN })}
              </div>
            </>
          )}
          </>
        );
      },
    },
    {
      title: '打印次数',
      dataIndex: 'printCount',
      key: 'printCount',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => handlePrint(record.id)}
          >
            打印
          </Button>
          <Link href={`/orders/${record.id}/edit`} passHref>
            <Button size="small">编辑</Button>
          </Link>
          <Popconfirm
            title="确定要删除这个订单吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>订单管理</h1>
        <Link href="/orders/new" passHref>
          <Button type="primary">新建订单</Button>
        </Link>
      </div>
      
      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}