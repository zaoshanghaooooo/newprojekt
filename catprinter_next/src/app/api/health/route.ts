import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/healthcheck';

/**
 * 健康检查API端点
 * GET /api/health
 */
export async function GET() {
  try {
    // 执行数据库健康检查
    const dbHealth = await checkDatabaseHealth();
    
    // 构建健康状态响应
    const healthStatus = {
      status: dbHealth.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.isHealthy ? 'up' : 'down',
          details: dbHealth.details
        },
        api: {
          status: 'up'
        }
      }
    };

    // 根据健康状态设置响应状态码
    const statusCode = dbHealth.isHealthy ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    console.error('健康检查API端点错误:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 