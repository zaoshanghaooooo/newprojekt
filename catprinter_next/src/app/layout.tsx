import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import Navigation from './navigation';
import Script from 'next/script';
import { checkDatabaseHealth } from '@/lib/healthcheck';

// 字体配置
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// 视口配置
export function generateViewport() {
  return {
    themeColor: '#3182CE',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  }
}

// 元数据生成函数
export async function generateMetadata(): Promise<Metadata> {
  // 在服务器端启动时执行健康检查
  if (process.env.NODE_ENV !== 'development') {
    try {
      const healthResult = await checkDatabaseHealth();
      console.log('数据库健康检查结果:', healthResult.isHealthy ? '健康' : '不健康');
      if (!healthResult.isHealthy) {
        console.error('数据库健康检查失败:', healthResult.details.message);
      }
    } catch (error) {
      console.error('执行健康检查时出错:', error);
    }
  }

  // 返回元数据
  return {
    title: '猫咪打印系统',
    description: '高效的餐饮管理和打印系统',
    manifest: '/manifest.json',
    icons: {
      icon: '/favicon.ico', // Link to favicon.ico in public folder
    },
    appleWebApp: {
      capable: true, // Generates <meta name="apple-mobile-web-app-capable" content="yes">
      statusBarStyle: 'default',
      title: '猫咪打印',
    },
    other: {
      'mobile-web-app-capable': 'yes', // Adds <meta name="mobile-web-app-capable" content="yes">
    }
  };
}

// 根布局组件
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <Navigation />
          <main className="pt-16 pb-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
