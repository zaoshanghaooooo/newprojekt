import { supabase } from '@/lib/db';

// 数据库健康检查表名
const HEALTH_CHECK_TABLE = 'health_checks';

/**
 * 数据库健康检查服务
 */
export class DatabaseHealthCheck {
  /**
   * 执行数据库连接和读写检查
   * @returns 包含健康状态和详细信息的对象
   */
  static async checkConnection(): Promise<{
    isHealthy: boolean;
    details: {
      connection: boolean;
      read: boolean;
      write: boolean;
      message: string;
    };
  }> {
    try {
      // 检查连接
      const connectionCheck = await this.checkDatabaseConnection();
      if (!connectionCheck) {
        return {
          isHealthy: false,
          details: {
            connection: false,
            read: false,
            write: false,
            message: '数据库连接失败'
          }
        };
      }

      // 检查表是否存在，如果不存在则创建
      await this.ensureHealthCheckTable();

      // 检查写入能力
      const writeCheck = await this.checkWriteAccess();
      if (!writeCheck.success) {
        return {
          isHealthy: false,
          details: {
            connection: true,
            read: false,
            write: false,
            message: `写入检查失败: ${writeCheck.error}`
          }
        };
      }

      // 检查读取能力
      const readCheck = await this.checkReadAccess(writeCheck.id);
      if (!readCheck.success) {
        return {
          isHealthy: false,
          details: {
            connection: true,
            read: false,
            write: true,
            message: `读取检查失败: ${readCheck.error}`
          }
        };
      }

      // 清理测试数据
      await this.cleanupTestEntry(writeCheck.id);

      return {
        isHealthy: true,
        details: {
          connection: true,
          read: true,
          write: true,
          message: '数据库连接和读写检查成功'
        }
      };
    } catch (error) {
      console.error('健康检查过程中发生错误:', error);
      return {
        isHealthy: false,
        details: {
          connection: false,
          read: false,
          write: false,
          message: `健康检查失败: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }

  /**
   * 检查数据库连接
   */
  private static async checkDatabaseConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('health_checks').select('count').limit(1);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('数据库连接检查失败:', error);
      return false;
    }
  }

  /**
   * 确保健康检查表存在
   */
  private static async ensureHealthCheckTable(): Promise<void> {
    try {
      // 使用RPC调用或原始SQL确认表是否存在，不存在则创建
      // 这里简化处理，假设表已经存在或会自动创建
      const { error } = await supabase.from(HEALTH_CHECK_TABLE).select('count').limit(1);
      
      if (error && error.code === '42P01') { // 表不存在的PostgreSQL错误码
        // 在实际项目中，应该使用迁移工具或管理面板创建表
        console.warn('健康检查表不存在，请使用适当的迁移工具创建');
      }
    } catch (error) {
      console.error('确认健康检查表时出错:', error);
      throw error;
    }
  }

  /**
   * 检查写入访问权限
   */
  private static async checkWriteAccess(): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const testData = {
        test_key: `test-${new Date().toISOString()}`,
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(HEALTH_CHECK_TABLE)
        .insert(testData)
        .select()
        .single();

      if (error) throw error;
      
      return {
        success: true,
        id: data.id
      };
    } catch (error) {
      console.error('写入访问检查失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 检查读取访问权限
   */
  private static async checkReadAccess(id: string | undefined): Promise<{ success: boolean; error?: string }> {
    if (!id) {
      return {
        success: false,
        error: '缺少测试数据ID，无法完成读取检查'
      };
    }

    try {
      const { data, error } = await supabase
        .from(HEALTH_CHECK_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('未找到测试数据');

      return { success: true };
    } catch (error) {
      console.error('读取访问检查失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 清理测试数据
   */
  private static async cleanupTestEntry(id: string | undefined): Promise<void> {
    if (!id) return;

    try {
      const { error } = await supabase
        .from(HEALTH_CHECK_TABLE)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('清理测试数据失败:', error);
      // 不抛出错误，因为这只是清理操作
    }
  }
}

// 导出简化的检查函数
export const checkDatabaseHealth = DatabaseHealthCheck.checkConnection.bind(DatabaseHealthCheck); 