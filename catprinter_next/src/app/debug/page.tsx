'use client';

import { useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Button, 
  Alert, 
  AlertIcon, 
  AlertTitle, 
  AlertDescription,
  Text,
  Card,
  CardBody,
  Stack,
  Divider,
  Code,
  useToast
} from '@chakra-ui/react';

export default function DebugPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  const toast = useToast();

  const runFix = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debug-fix');
      const data = await response.json();
      setResult(data);

      toast({
        title: data.success ? '修复成功' : '修复失败',
        description: data.message,
        status: data.success ? 'success' : 'error',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('执行修复时出错:', error);
      setResult({
        success: false,
        message: '执行修复请求失败，请查看控制台获取详细信息'
      });

      toast({
        title: '修复失败',
        description: '请求过程中发生错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const directInsertSetting = async () => {
    try {
      setLoading(true);
      // 尝试直接插入设置
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'TEST_SETTING',
          value: 'true'
        }),
      });
      
      const data = await response.json();
      
      toast({
        title: data.success ? '设置成功' : '设置失败',
        description: data.message || JSON.stringify(data),
        status: data.success ? 'success' : 'error',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('直接插入设置时出错:', error);
      toast({
        title: '设置失败',
        description: '请求过程中发生错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyMigration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debug/apply-migration', {
        method: 'POST'
      });
      const data = await response.json();
      
      toast({
        title: data.success ? '迁移成功' : '迁移失败',
        description: data.message,
        status: data.success ? 'success' : 'error',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('执行迁移时出错:', error);
      toast({
        title: '迁移失败',
        description: '请求过程中发生错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <Heading mb={6}>系统调试与修复</Heading>
      
      <Alert status="warning" mb={6}>
        <AlertIcon />
        <Box>
          <AlertTitle>警告</AlertTitle>
          <AlertDescription>
            此页面仅供管理员使用，包含系统修复功能
          </AlertDescription>
        </Box>
      </Alert>

      <Card mb={6}>
        <CardBody>
          <Heading size="md" mb={4}>当前问题</Heading>
          <Stack spacing={3}>
            <Text>
              1. 系统设置无法保存 - 行级安全策略(RLS)问题
            </Text>
            <Code p={2} borderRadius="md">
              更新系统设置失败: new row violates row-level security policy for table "system_settings"
            </Code>
            
            <Text>
              2. 设置默认打印机失败 - 列名问题
            </Text>
            <Code p={2} borderRadius="md">
              设置默认打印机失败: Could not find the 'isDefault' column of 'printers' in the schema cache
            </Code>
          </Stack>
          
          <Divider my={4} />
          
          <Stack spacing={4}>
            <Button 
              colorScheme="blue" 
              onClick={runFix}
              isLoading={loading}
              loadingText="执行中..."
            >
              执行自动修复
            </Button>
            
            <Button 
              colorScheme="green" 
              onClick={directInsertSetting}
              isLoading={loading}
              loadingText="设置中..."
            >
              手动设置分开打印选项
            </Button>
            
            <Button 
              colorScheme="purple" 
              onClick={applyMigration}
              isLoading={loading}
              loadingText="迁移中..."
            >
              应用数据库迁移
            </Button>
          </Stack>
        </CardBody>
      </Card>

      {result && (
        <Alert status={result.success ? 'success' : 'error'}>
          <AlertIcon />
          <Box>
            <AlertTitle>{result.success ? '修复成功' : '修复失败'}</AlertTitle>
            <AlertDescription>
              {result.message}
            </AlertDescription>
          </Box>
        </Alert>
      )}
    </Container>
  );
} 