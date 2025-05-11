import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 引入初始化函数
import initPrinter from './utils/init-printer';

// 标记是否已经初始化
let initialized = false;

export async function middleware(request: NextRequest) {
  // 只在应用启动后第一次请求时执行初始化
  if (!initialized) {
    console.log('初始化打印机配置...');
    try {
      // 异步初始化，不阻塞请求
      initPrinter().catch(err => {
        console.error('打印机初始化失败:', err);
      });
    } catch (error) {
      console.error('启动打印机初始化时发生错误:', error);
    } finally {
      // 无论成功失败都标记为已初始化，避免重复初始化
      initialized = true;
    }
  }

  return NextResponse.next();
}

// 配置仅匹配特定路由
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - 静态文件 (_next/*)
     * - 图片文件 (*.png/jpg/jpeg/svg/webp)
     * - API路由除了状态检查路由 (/api/*, 但不包含/api/status)
     */
    '/((?!_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$|api/(?!status)).*)',
  ],
}; 