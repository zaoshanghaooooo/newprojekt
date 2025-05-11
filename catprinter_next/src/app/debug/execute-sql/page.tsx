'use client';

import { useState } from 'react';
import { Button, Textarea, VStack, Heading, Box, useToast, Code, Text, Link } from '@chakra-ui/react';
import NextLink from 'next/link';

export default function ExecuteSqlPage() {
  const [sql, setSql] = useState<string>(`DO $$
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
NOTIFY pgrst, 'reload schema';`);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const executeSql = async () => {
    if (!sql.trim()) {
      toast({
        title: '错误',
        description: '请输入SQL语句',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/debug/execute-direct-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: '成功',
          description: data.message || 'SQL语句执行成功',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: '错误',
          description: `执行SQL失败: ${data.error?.message || data.message || '未知错误'}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('执行SQL时出错:', error);
      toast({
        title: '错误',
        description: '执行SQL时发生错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // 执行第二个SQL，创建RPC函数
  const createRpcFunctions = async () => {
    const rpcSql = `
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
    `;

    setLoading(true);
    try {
      const response = await fetch('/api/debug/execute-direct-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: rpcSql }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '成功',
          description: data.message || 'RPC函数创建成功',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: '错误',
          description: `创建RPC函数失败: ${data.error?.message || data.message || '未知错误'}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('创建RPC函数时出错:', error);
      toast({
        title: '错误',
        description: '创建RPC函数时发生错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // 修复system_settings表的重复键问题
  const fixDuplicateSettings = async () => {
    const fixSql = `
-- 删除重复键，保留一个
DELETE FROM system_settings
WHERE id IN (
    SELECT id FROM (
        SELECT id, key, ROW_NUMBER() OVER (PARTITION BY key ORDER BY id) AS rn
        FROM system_settings
    ) t
    WHERE t.rn > 1
);
    `;

    setLoading(true);
    try {
      const response = await fetch('/api/debug/execute-direct-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: fixSql }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '成功',
          description: data.message || '已修复系统设置表的重复键问题',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: '错误',
          description: `修复重复键问题失败: ${data.error?.message || data.message || '未知错误'}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('修复重复键问题时出错:', error);
      toast({
        title: '错误',
        description: '修复重复键问题时发生错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // 添加isDefault列并刷新缓存
  const addIsDefaultColumn = async () => {
    const addColumnSql = `
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
    `;

    setLoading(true);
    try {
      const response = await fetch('/api/debug/execute-direct-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: addColumnSql }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: '成功',
          description: data.message || 'isDefault列已成功添加',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: '错误',
          description: `添加isDefault列失败: ${data.error?.message || data.message || '未知错误'}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('添加isDefault列时出错:', error);
      toast({
        title: '错误',
        description: '添加isDefault列时发生错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Heading as="h1" size="xl">SQL执行工具</Heading>
      
      <Box p={4} borderWidth="1px" borderRadius="md" bg="yellow.50">
        <Text mb={2} fontWeight="bold">提示：</Text>
        <Text>
          如果自动修复不成功，请使用
          <NextLink href="/debug/manual-fix" passHref>
            <Link color="blue.500" ml={1} mr={1}>手动修复指南</Link>
          </NextLink>
          进行手动修复。
        </Text>
      </Box>
      
      <Box>
        <Text mb={2}>SQL语句:</Text>
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="输入SQL语句..."
          size="lg"
          height="200px"
          fontFamily="mono"
        />
      </Box>
      
      <Button 
        colorScheme="blue" 
        onClick={executeSql} 
        isLoading={loading}
        loadingText="执行中..."
        mb={2}
      >
        执行自定义SQL
      </Button>
      
      <Button 
        colorScheme="green" 
        onClick={createRpcFunctions} 
        isLoading={loading}
        loadingText="创建中..."
        mb={2}
      >
        创建RPC函数
      </Button>
      
      <Button 
        colorScheme="purple" 
        onClick={addIsDefaultColumn} 
        isLoading={loading}
        loadingText="添加中..."
        mb={2}
      >
        添加isDefault列
      </Button>
      
      <Button 
        colorScheme="orange" 
        onClick={fixDuplicateSettings} 
        isLoading={loading}
        loadingText="修复中..."
      >
        修复系统设置表重复键
      </Button>
      
      {result && (
        <Box mt={4}>
          <Text mb={2}>执行结果:</Text>
          <Code p={4} borderRadius="md" whiteSpace="pre-wrap" display="block">
            {JSON.stringify(result, null, 2)}
          </Code>
        </Box>
      )}

      <Box mt={6} p={4} borderWidth="1px" borderRadius="md">
        <Heading as="h2" size="md" mb={4}>问题修复步骤</Heading>
        <VStack align="start" spacing={2}>
          <Text>1. 点击 "创建RPC函数" 按钮，创建必要的数据库函数</Text>
          <Text>2. 点击 "添加isDefault列" 按钮，添加isDefault列到printers表</Text>
          <Text>3. 点击 "修复系统设置表重复键" 按钮，解决重复键错误</Text>
          <Text>4. 完成后，可以使用 "执行自定义SQL" 按钮执行其他SQL语句</Text>
        </VStack>
      </Box>
    </VStack>
  );
} 