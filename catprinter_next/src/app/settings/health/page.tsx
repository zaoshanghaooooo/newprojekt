'use client';

import { useState, useEffect } from 'react';
import { Typography, Card, Button, Alert, Spin, Descriptions, Badge, Divider, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, WarningOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down';
      details: {
        connection: boolean;
        read: boolean;
        write: boolean;
        message: string;
      }
    };
    api: {
      status: 'up' | 'down';
    }
  }
}

export default function HealthCheckPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取健康状态
  const fetchHealthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/health');
      setHealth(response.data);
    } catch (err) {
      console.error('获取健康状态失败:', err);
      setError('无法获取系统健康状态，请检查网络连接或服务器状态。');
    } finally {
      setLoading(false);
    }
  };

  // 首次加载时获取健康状态
  useEffect(() => {
    fetchHealthStatus();
  }, []);

  // 手动刷新健康状态
  const handleRefresh = () => {
    fetchHealthStatus();
  };

  // 渲染状态标签
  const renderStatusBadge = (status: 'up' | 'down' | boolean) => {
    const isUp = status === 'up' || status === true;
    return (
      <Badge 
        status={isUp ? 'success' : 'error'} 
        text={isUp ? '正常' : '异常'} 
      />
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>系统健康状态</Title>
      <Paragraph>
        此页面显示系统各组件的健康状态，包括数据库连接和API服务。
      </Paragraph>

      <div style={{ marginBottom: '20px' }}>
        <Button 
          type="primary" 
          onClick={handleRefresh} 
          loading={loading}
          icon={<SyncOutlined />}
        >
          刷新状态
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>加载健康状态...</Text>
          </div>
        </div>
      ) : error ? (
        <Alert
          message="获取健康状态失败"
          description={error}
          type="error"
          showIcon
        />
      ) : health ? (
        <Card>
          <div style={{ marginBottom: '24px' }}>
            <Space align="center">
              {health.status === 'healthy' ? (
                <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ fontSize: '24px', color: '#f5222d' }} />
              )}
              <Title level={3} style={{ margin: 0 }}>
                系统状态: {health.status === 'healthy' ? '健康' : '不健康'}
              </Title>
            </Space>
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                最后检查时间: {new Date(health.timestamp).toLocaleString()}
              </Text>
            </div>
          </div>

          <Divider orientation="left">服务状态</Divider>
          
          <Descriptions bordered>
            <Descriptions.Item label="API服务" span={3}>
              {renderStatusBadge(health.services.api.status)}
            </Descriptions.Item>
            
            <Descriptions.Item label="数据库服务" span={3}>
              {renderStatusBadge(health.services.database.status)}
              <div style={{ marginTop: '8px' }}>
                <Text type={health.services.database.status === 'up' ? 'success' : 'danger'}>
                  {health.services.database.details.message}
                </Text>
              </div>
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">数据库检查详情</Divider>
          
          <Descriptions bordered>
            <Descriptions.Item label="连接状态">
              {renderStatusBadge(health.services.database.details.connection)}
            </Descriptions.Item>
            <Descriptions.Item label="读取能力">
              {renderStatusBadge(health.services.database.details.read)}
            </Descriptions.Item>
            <Descriptions.Item label="写入能力">
              {renderStatusBadge(health.services.database.details.write)}
            </Descriptions.Item>
          </Descriptions>
          
          {health.status !== 'healthy' && (
            <Alert
              style={{ marginTop: '20px' }}
              message="系统存在问题"
              description="系统部分组件出现异常，可能会影响应用的正常运行。请联系系统管理员。"
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />
          )}
        </Card>
      ) : (
        <Alert
          message="没有健康状态数据"
          description="暂无系统健康状态数据。"
          type="info"
          showIcon
        />
      )}
    </div>
  );
} 