'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Tabs, 
  TabList, 
  Tab, 
  TabPanel, 
  TabPanels, 
  Card, 
  CardBody, 
  Button, 
  Flex, 
  FormControl, 
  FormLabel, 
  Input, 
  Stack,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Badge,
  Switch
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, AddIcon } from '@chakra-ui/icons';
import { Typography, Row, Col } from 'antd';
import Link from 'next/link';
import { 
  SettingOutlined, 
  PrinterOutlined, 
  HeartOutlined, 
  SafetyOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

interface Printer {
  id: string;
  name: string;
  sn: string;
  type: string;
  status: string;
  address?: string;
  lastActiveTime?: string;
}

interface SystemSetting {
  key: string;
  value: string;
}

const { Title, Paragraph } = Typography;

export default function SettingsPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    sn: '',
    type: '飞鹅云',
    address: ''
  });
  const toast = useToast();

  // 加载打印机数据
  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const response = await fetch('/api/printers');
        if (!response.ok) throw new Error('获取打印机失败');
        const data = await response.json();
        setPrinters(data);
      } catch (error) {
        console.error('获取打印机错误:', error);
        toast({
          title: '加载失败',
          description: '无法获取打印机数据',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('获取系统设置失败');
        const data = await response.json();
        setSystemSettings(data);
      } catch (error) {
        console.error('获取系统设置错误:', error);
        toast({
          title: '加载失败',
          description: '无法获取系统设置数据',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrinters();
    fetchSettings();
  }, [toast]);

  // 添加打印机
  const handleAddPrinter = async () => {
    try {
      if (!newPrinter.name || !newPrinter.sn || !newPrinter.type) {
        toast({
          title: '表单不完整',
          description: '请填写打印机名称、SN和类型',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const response = await fetch('/api/printers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPrinter),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '添加打印机失败');
      }

      const newPrinterData = await response.json();
      setPrinters([...printers, newPrinterData]);
      setNewPrinter({
        name: '',
        sn: '',
        type: '飞鹅云',
        address: ''
      });

      toast({
        title: '添加成功',
        description: '打印机已添加',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('添加打印机错误:', error);
      toast({
        title: '添加失败',
        description: error instanceof Error ? error.message : '添加打印机时出错',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // 删除打印机
  const handleDeletePrinter = async (id: string) => {
    if (!confirm('确定要删除这个打印机吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/printers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除打印机失败');
      }

      setPrinters(printers.filter(printer => printer.id !== id));
      toast({
        title: '删除成功',
        description: '打印机已删除',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('删除打印机错误:', error);
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '删除打印机时出错',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // 测试打印
  const handleTestPrint = async (printerId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/print/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ printerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '测试打印失败');
      }

      const result = await response.json();
      toast({
        title: '测试打印',
        description: '测试打印请求已发送',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('测试打印错误:', error);
      toast({
        title: '测试失败',
        description: error instanceof Error ? error.message : '测试打印时出错',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // 更新系统设置
  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新设置失败');
      }

      setSystemSettings({
        ...systemSettings,
        [key]: value
      });

      toast({
        title: '更新成功',
        description: '系统设置已更新',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('更新设置错误:', error);
      toast({
        title: '更新失败',
        description: error instanceof Error ? error.message : '更新设置时出错',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // 更新飞鹅云设置
  const handleUpdateFeieyunSettings = async () => {
    try {
      const feieyunSettings = {
        feieyun_user: systemSettings.feieyun_user || '',
        feieyun_ukey: systemSettings.feieyun_ukey || '',
        feieyun_url: systemSettings.feieyun_url || 'https://api.feieyun.cn/Api/Open/'
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feieyunSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新飞鹅云设置失败');
      }

      const result = await response.json();
      setSystemSettings({
        ...systemSettings,
        ...result.updated
      });

      toast({
        title: '更新成功',
        description: '飞鹅云设置已更新',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('更新飞鹅云设置错误:', error);
      toast({
        title: '更新失败',
        description: error instanceof Error ? error.message : '更新飞鹅云设置时出错',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.xl" py={5}>
      <Title level={2}>系统设置</Title>
      <Paragraph>
        管理系统配置、打印机设置和检查系统健康状态。
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <CardBody>
              <Box mb={4}>
                <PrinterOutlined /> 打印机设置
              </Box>
              <Paragraph>
                配置打印机连接参数、默认打印机和打印模板。
              </Paragraph>
              <Stack spacing={4} mt={4}>
                {/* 饮品和食品始终分开打印，不再作为可选项 */}
              </Stack>
              <div style={{ marginTop: '16px' }}>
                <Link href="/settings/printers">
                  <Button colorScheme="blue">
                    管理打印机
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <CardBody>
              <Box mb={4}>
                <HeartOutlined /> 系统健康
              </Box>
              <Paragraph>
                检查系统各组件的健康状态，包括数据库连接和API服务。
              </Paragraph>
              <Link href="/settings/health">
                <Button colorScheme="blue">
                  查看健康状态
                </Button>
              </Link>
            </CardBody>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <CardBody>
              <Box mb={4}>
                <DatabaseOutlined /> 数据管理
              </Box>
              <Paragraph>
                管理系统数据，包括备份、恢复和数据清理功能。
              </Paragraph>
              <Link href="/settings/data">
                <Button colorScheme="blue">
                  数据管理
                </Button>
              </Link>
            </CardBody>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <CardBody>
              <Box mb={4}>
                <SafetyOutlined /> 安全设置
              </Box>
              <Paragraph>
                配置系统安全选项，包括权限管理和访问控制。
              </Paragraph>
              <Link href="/settings/security">
                <Button colorScheme="blue">
                  安全设置
                </Button>
              </Link>
            </CardBody>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <CardBody>
              <Box mb={4}>
                <SettingOutlined /> 系统配置
              </Box>
              <Paragraph>
                管理系统基本配置，包括显示选项和操作行为。
              </Paragraph>
              <Link href="/settings/general">
                <Button colorScheme="blue">
                  系统配置
                </Button>
              </Link>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
} 