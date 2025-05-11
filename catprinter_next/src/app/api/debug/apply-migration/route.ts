import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import fs from 'fs';
import path from 'path';

// 定义结果类型
interface SqlExecutionResult {
  success: boolean;
  statement: string;
  error?: string;
}

/**
 * 应用数据库迁移
 * POST /api/debug/apply-migration
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('开始应用数据库迁移...');
    
    // 读取迁移文件
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250511_fix_rls_and_isdefault_column.sql');
    
    if (!fs.existsSync(migrationPath)) {
      logger.error('迁移文件不存在', { path: migrationPath });
      return NextResponse.json(
        { success: false, message: '迁移文件不存在' },
        { status: 404 }
      );
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    logger.info('读取到SQL迁移文件', {
      fileSize: sqlContent.length,
      path: migrationPath
    });
    
    // 分割SQL语句
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    logger.info(`SQL文件包含 ${sqlStatements.length} 条语句`);
    
    // 执行每条SQL语句
    const results: SqlExecutionResult[] = [];
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const stmt = sqlStatements[i];
      logger.info(`执行SQL语句 ${i + 1}/${sqlStatements.length}`);
      
      try {
        // 使用 exec_sql RPC 函数执行SQL
        // 注意：这需要先在Supabase中创建此函数
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });
        
        if (error) {
          logger.error(`执行SQL语句 ${i + 1} 失败`, error);
          results.push({
            success: false,
            statement: stmt.substring(0, 100) + '...',
            error: error.message
          });
        } else {
          results.push({
            success: true,
            statement: stmt.substring(0, 100) + '...'
          });
        }
      } catch (error) {
        logger.error(`执行SQL语句 ${i + 1} 异常`, error);
        results.push({
          success: false,
          statement: stmt.substring(0, 100) + '...',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: successCount > 0,
      message: `迁移已应用，成功执行 ${successCount}/${sqlStatements.length} 条SQL语句`,
      details: results
    });
  } catch (error) {
    logger.error('应用数据库迁移失败', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '应用数据库迁移失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 