import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * 临时修复API
 * GET /api/debug-fix
 */
export async function GET() {
  try {
    logger.info('开始执行临时修复...');
    
    // 1. 修复system_settings表RLS问题 - 添加测试设置
    try {
      const { data: existingSetting, error: checkError } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'TEST_SETTING')
        .maybeSingle();
      
      if (checkError) {
        logger.error('查询TEST_SETTING设置失败', checkError);
      }

      // 如果设置不存在，尝试插入
      if (!existingSetting) {
        // 使用原始SQL命令，绕过RLS策略
        const { error: insertError } = await supabase.rpc('admin_insert_system_setting', {
          setting_key: 'TEST_SETTING',
          setting_value: 'true'
        });

        if (insertError) {
          logger.error('使用RPC插入TEST_SETTING设置失败', insertError);
          
          // 如果RPC不存在，尝试创建它
          const createRpcQuery = `
            CREATE OR REPLACE FUNCTION admin_insert_system_setting(setting_key TEXT, setting_value TEXT)
            RETURNS void AS $$
            BEGIN
              INSERT INTO system_settings (key, value)
              VALUES (setting_key, setting_value)
              ON CONFLICT (key) DO UPDATE SET value = setting_value;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
          `;
          
          // 执行SQL创建RPC函数
          try {
            await supabase.rpc('exec_sql', { sql: createRpcQuery });
          } catch (e) {
            logger.error('创建RPC函数失败', e);
          }
        }
      }
    } catch (error) {
      logger.error('修复system_settings表RLS问题失败', error);
    }
    
    // 2. 检查并修复printers表的isDefault列
    try {
      // 创建列检查RPC函数
      const createColumnCheckRpc = `
        CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
        RETURNS TABLE(exists boolean) AS $$
        BEGIN
          RETURN QUERY EXECUTE format('
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = %L AND column_name = %L
            )
          ', table_name, column_name);
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      try {
        await supabase.rpc('exec_sql', { sql: createColumnCheckRpc });
      } catch (e) {
        logger.error('创建column_exists RPC函数失败', e);
      }

      // 使用一个更简单的方法检查列是否存在
      const { data: columnsData, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'printers');
      
      if (columnsError) {
        logger.error('检查printers表列失败', columnsError);
      } else {
        const columnNames = columnsData?.map(col => col.column_name) || [];
        logger.info('printers表列名:', columnNames);
        
        const hasIsDefault = columnNames.includes('is_default');
        const hasIsDefaultCamel = columnNames.includes('isDefault');
        
        logger.info('列检查结果:', { 
          has_is_default: hasIsDefault,
          has_isDefault: hasIsDefaultCamel
        });
      }
    } catch (error) {
      logger.error('检查列存在性失败', error);
    }
    
    return NextResponse.json({
      success: true,
      message: '临时修复已执行，请查看服务器日志获取详细信息'
    });
  } catch (error) {
    logger.error('临时修复失败', error);
    
    return NextResponse.json(
      { success: false, message: '临时修复失败，请查看服务器日志' },
      { status: 500 }
    );
  }
} 