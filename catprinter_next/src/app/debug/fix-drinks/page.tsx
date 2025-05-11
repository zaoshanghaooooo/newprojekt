'use client';

import { useState } from 'react';
import { Button, Card, Alert, Descriptions, Spin, List, Typography } from 'antd';

export default function FixDrinksPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFix = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/fix-drinks');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '修复失败');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行修复过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <Card title="饮品数据修复工具" className="shadow-md">
        <div className="mb-6">
          <p className="mb-4">
            此工具用于修复数据库中的饮品类型。将检测所有潜在的饮品，并确保它们具有正确的字段设置：
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>设置 <code>food_type</code> 为 "drink"</li>
            <li>设置 <code>type</code> 为 "drink"</li>
            <li>设置 <code>category</code> 为 "drink"</li>
            <li>确保 <code>volume</code> 字段有值(默认为"标准")</li>
          </ul>
          
          <div className="mb-6">
            <Button 
              type="primary" 
              size="large" 
              onClick={handleFix}
              loading={loading}
              disabled={loading}
            >
              开始修复饮品数据
            </Button>
          </div>
        </div>
        
        {error && (
          <Alert
            message="错误"
            description={error}
            type="error"
            showIcon
            className="mb-6"
          />
        )}
        
        {loading && (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" tip="正在修复饮品数据..." />
          </div>
        )}
        
        {result && (
          <div className="mt-6">
            <Alert
              message="操作完成"
              description={result.message}
              type="success"
              showIcon
              className="mb-6"
            />
            
            <Descriptions title="修复统计" bordered>
              <Descriptions.Item label="检查饮品数量">{result.results.total}</Descriptions.Item>
              <Descriptions.Item label="更新数量">{result.results.updated}</Descriptions.Item>
              <Descriptions.Item label="跳过数量">{result.results.skipped}</Descriptions.Item>
              <Descriptions.Item label="失败数量">{result.results.failed}</Descriptions.Item>
            </Descriptions>
            
            {result.results.errors && result.results.errors.length > 0 && (
              <div className="mt-6">
                <Typography.Title level={5}>错误详情</Typography.Title>
                <List
                  bordered
                  dataSource={result.results.errors}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Typography.Text type="danger">
                        {item.drink.name} (ID: {item.drink.id}) - {item.error}
                      </Typography.Text>
                    </List.Item>
                  )}
                />
              </div>
            )}
            
            <div className="mt-6">
              <Button type="primary" onClick={() => window.location.href = '/dishes'}>
                返回菜品管理
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 