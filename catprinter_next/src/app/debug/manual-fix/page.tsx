'use client';

import { Box, Heading, Text, VStack, Code, Button, Link, useClipboard } from '@chakra-ui/react';

export default function ManualFixPage() {
  const sqlContent = `-- 创建RPC函数和添加isDefault列
DO $$
BEGIN
    -- 如果isDefault列不存在，则添加它
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'printers' AND column_name = 'isDefault'
    ) THEN
        ALTER TABLE printers ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 刷新视图和模式缓存
NOTIFY pgrst, 'reload schema';

-- 创建存储过程以添加isDefault列
CREATE OR REPLACE FUNCTION add_isdefault_column()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 如果isDefault列不存在，则添加它
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'printers' AND column_name = 'isDefault'
    ) THEN
        ALTER TABLE printers ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 创建用于刷新视图和模式缓存的函数
CREATE OR REPLACE FUNCTION reload_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 刷新视图和模式缓存
    NOTIFY pgrst, 'reload schema';
END $$;

-- 创建执行SQL的函数
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    EXECUTE sql_query;
    result := '{"message": "SQL executed successfully"}'::JSONB;
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE
    );
    RETURN result;
END $$;

-- 删除重复键，保留一个
DELETE FROM system_settings
WHERE id IN (
    SELECT id FROM (
        SELECT id, key, ROW_NUMBER() OVER (PARTITION BY key ORDER BY id) AS rn
        FROM system_settings
    ) t
    WHERE t.rn > 1
);`;
  
  const { hasCopied, onCopy } = useClipboard(sqlContent);
  
  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Heading as="h1" size="xl">手动修复指南</Heading>
      
      <Box>
        <Heading as="h2" size="md" mb={4}>问题概述</Heading>
        <Text mb={2}>
          您的应用程序有两个主要问题需要修复：
        </Text>
        <VStack align="start" spacing={2} pl={4} mb={4}>
          <Text>1. `printers`表缺少`isDefault`列，导致设置默认打印机失败</Text>
          <Text>2. `system_settings`表中有重复键，导致更新系统设置失败</Text>
        </VStack>
      </Box>
      
      <Box>
        <Heading as="h2" size="md" mb={4}>如何手动修复</Heading>
        <VStack align="start" spacing={4} pl={4}>
          <Text>1. 登录您的Supabase账户：<Link href="https://app.supabase.io" isExternal color="blue.500">https://app.supabase.io</Link></Text>
          <Text>2. 进入您的项目：udfmwgbfhcqgkihmsfhp</Text>
          <Text>3. 在左侧菜单中点击 "SQL Editor" 或 "SQL"</Text>
          <Text>4. 创建一个新的SQL查询</Text>
          <Text>5. 将下面的SQL粘贴到查询编辑器中</Text>
          <Text>6. 点击 "Run" 或 "执行" 按钮</Text>
        </VStack>
      </Box>
      
      <Box>
        <Heading as="h2" size="md" mb={4}>SQL修复脚本</Heading>
        <Button onClick={onCopy} mb={2}>
          {hasCopied ? '已复制!' : '复制SQL'}
        </Button>
        <Code p={4} borderRadius="md" whiteSpace="pre-wrap" display="block" maxH="400px" overflowY="auto">
          {sqlContent}
        </Code>
      </Box>
      
      <Box>
        <Heading as="h2" size="md" mb={4}>修复后验证</Heading>
        <Text>
          执行SQL后，重新启动您的应用程序，您应该能够正常设置默认打印机和更新系统设置了。
        </Text>
      </Box>
    </VStack>
  );
} 