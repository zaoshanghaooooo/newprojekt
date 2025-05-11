import { db } from '@/db';

export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface LogEntry {
  level: LogLevel;
  source?: string;
  message: string;
  details?: string;
}

/**
 * 简单的日志工具
 */
export const logger = {
  info: (...args: any[]) => {
    console.log(new Date().toISOString(), '[INFO]', ...args);
  },
  
  error: (...args: any[]) => {
    console.error(new Date().toISOString(), '[ERROR]', ...args);
  },
  
  warn: (...args: any[]) => {
    console.warn(new Date().toISOString(), '[WARN]', ...args);
  },
  
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(new Date().toISOString(), '[DEBUG]', ...args);
    }
  }
};

/**
 * 简单的日志工具
 */
class Logger {
  /**
   * 记录信息日志
   * @param message 日志消息
   * @param data 附加数据
   */
  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param data 附加数据
   */
  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param error 错误对象
   */
  error(message: string, error?: any): void {
    this.log('ERROR', message, error);

    // 如果是在服务器环境，还可以将错误记录到数据库
    if (typeof window === 'undefined') {
      this.saveErrorToDatabase(message, error);
    }
  }

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param data 附加数据
   */
  debug(message: string, data?: any): void {
    // 只在非生产环境记录调试日志
    if (process.env.NODE_ENV !== 'production') {
      this.log('DEBUG', message, data);
    }
  }

  /**
   * 记录日志的内部方法
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  private log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    // 根据日志级别使用不同的控制台方法
    switch (level) {
      case 'ERROR':
        console.error(logMessage, data || '');
        break;
      case 'WARN':
        console.warn(logMessage, data || '');
        break;
      case 'DEBUG':
        console.debug(logMessage, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }
  }

  /**
   * 将错误保存到数据库（在服务器端执行）
   * @param message 错误消息
   * @param error 错误对象
   */
  private async saveErrorToDatabase(message: string, error?: any): Promise<void> {
    try {
      // 在实际应用中，这里会调用数据库API保存错误日志
      // 例如使用 prisma client 将错误保存到 SystemLog 表
      // await db.systemLog.create({
      //   data: {
      //     level: 'error',
      //     source: 'app',
      //     message,
      //     details: error ? JSON.stringify(error) : undefined
      //   }
      // });
    } catch (dbError) {
      console.error('无法保存错误日志到数据库:', dbError);
    }
  }
}

// 创建单例实例
const loggerInstance = new Logger();

export default loggerInstance; 