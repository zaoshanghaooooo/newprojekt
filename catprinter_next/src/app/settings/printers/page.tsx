'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  Stack,
  Switch,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Flex,
  Divider
} from '@chakra-ui/react';
import axios from 'axios';
import { fetchPrinters } from '@/lib/api';

interface Printer {
  id: string;
  name: string;
  sn: string;
  type: string;
  status: string;
  isDefault?: boolean;
}

interface FeieyunConfig {
  user: string;
  key: string;
  configured: boolean;
}

export default function PrinterSettingsPage() {
  const toast = useToast();
  
  // 状态
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [feieyunConfig, setFeieyunConfig] = useState<FeieyunConfig>({
    user: '',
    key: '',
    configured: false
  });
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    sn: '',
    type: 'thermal',
    isDefault: false
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // 加载打印机数据
  const loadPrinters = async () => {
    try {
      setLoading(true);
      const response = await fetchPrinters();
      setPrinters(response);
      
      // 加载飞鹅云配置
      const configResponse = await axios.get('/api/print/status');
      if (configResponse.data.config.feieyun_configured) {
        // 如果配置已存在，获取详细配置
        const settingsResponse = await axios.get('/api/settings');
        const settings = settingsResponse.data;
        
        const user = settings.find((s: any) => s.key === 'feieyun_user')?.value || '';
        const key = settings.find((s: any) => s.key === 'feieyun_key')?.value || '';
        
        setFeieyunConfig({
          user,
          key,
          configured: true
        });
      }
    } catch (error) {
      console.error('加载打印机数据失败', error);
      toast({
        title: '加载失败',
        description: '无法获取打印机信息',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载
  useEffect(() => {
    loadPrinters();
  }, []);
  
  // 保存飞鹅云配置
  const saveFeieyunConfig = async () => {
    if (!feieyunConfig.user || !feieyunConfig.key) {
      toast({
        title: '验证失败',
        description: '账号和密钥不能为空',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      await axios.post('/api/settings', [
        { key: 'feieyun_user', value: feieyunConfig.user },
        { key: 'feieyun_key', value: feieyunConfig.key }
      ]);
      
      toast({
        title: '保存成功',
        description: '飞鹅云配置已更新',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setFeieyunConfig(prev => ({ ...prev, configured: true }));
    } catch (error) {
      console.error('保存飞鹅云配置失败', error);
      toast({
        title: '保存失败',
        description: '无法更新飞鹅云配置',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // 添加新打印机
  const addPrinter = async () => {
    if (!newPrinter.name || !newPrinter.sn) {
      toast({
        title: '验证失败',
        description: '打印机名称和编号不能为空',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      await axios.post('/api/printers', newPrinter);
      
      toast({
        title: '添加成功',
        description: '新打印机已添加',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // 重置表单并刷新列表
      setNewPrinter({
        name: '',
        sn: '',
        type: 'thermal',
        isDefault: false
      });
      
      loadPrinters();
    } catch (error) {
      console.error('添加打印机失败', error);
      toast({
        title: '添加失败',
        description: '无法添加新打印机',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // 设置默认打印机
  const setDefaultPrinter = async (printerId: string) => {
    try {
      await axios.patch(`/api/printers/${printerId}/default`);
      
      toast({
        title: '设置成功',
        description: '默认打印机已更新',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      loadPrinters();
    } catch (error) {
      console.error('设置默认打印机失败', error);
      toast({
        title: '设置失败',
        description: '无法更新默认打印机',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // 删除打印机
  const deletePrinter = async (printerId: string) => {
    if (!window.confirm('确定要删除此打印机吗？')) {
      return;
    }
    
    try {
      await axios.delete(`/api/printers/${printerId}`);
      
      toast({
        title: '删除成功',
        description: '打印机已删除',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      loadPrinters();
    } catch (error) {
      console.error('删除打印机失败', error);
      toast({
        title: '删除失败',
        description: '无法删除打印机',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={6}>打印机设置</Heading>
      
      <Stack spacing={6}>
        {/* 飞鹅云配置 */}
        <Card>
          <CardHeader>
            <Heading size="md">飞鹅云服务配置</Heading>
          </CardHeader>
          
          <CardBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>飞鹅云用户</FormLabel>
                <Input 
                  placeholder="请输入飞鹅云账号" 
                  value={feieyunConfig.user} 
                  onChange={(e) => setFeieyunConfig(prev => ({ ...prev, user: e.target.value }))} 
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>用户密钥(UKEY)</FormLabel>
                <Input 
                  placeholder="请输入飞鹅云UKEY" 
                  value={feieyunConfig.key} 
                  onChange={(e) => setFeieyunConfig(prev => ({ ...prev, key: e.target.value }))} 
                  type="password"
                />
              </FormControl>
              
              <Text fontSize="sm" color="gray.500">
                请在飞鹅云小票打印机官网获取账号和密钥: https://www.feieyun.com/
              </Text>
            </Stack>
          </CardBody>
          
          <CardFooter>
            <Button 
              colorScheme="blue" 
              onClick={saveFeieyunConfig}
              isLoading={isSaving}
            >
              保存配置
            </Button>
            
            {feieyunConfig.configured && (
              <Badge colorScheme="green" ml={4} p={2}>
                已配置
              </Badge>
            )}
          </CardFooter>
        </Card>
        
        {/* 打印机列表 */}
        <Card>
          <CardHeader>
            <Heading size="md">打印机列表</Heading>
          </CardHeader>
          
          <CardBody>
            {printers.length === 0 ? (
              <Text color="gray.500">暂无打印机</Text>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>名称</Th>
                    <Th>编号(SN)</Th>
                    <Th>类型</Th>
                    <Th>状态</Th>
                    <Th>默认</Th>
                    <Th>操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {printers.map(printer => (
                    <Tr key={printer.id}>
                      <Td>{printer.name}</Td>
                      <Td>{printer.sn}</Td>
                      <Td>{printer.type}</Td>
                      <Td>
                        <Badge 
                          colorScheme={printer.status === '在线' ? 'green' : 'gray'}
                        >
                          {printer.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Switch 
                          isChecked={printer.isDefault} 
                          onChange={() => setDefaultPrinter(printer.id)}
                        />
                      </Td>
                      <Td>
                        <Button 
                          size="sm" 
                          colorScheme="red" 
                          onClick={() => deletePrinter(printer.id)}
                        >
                          删除
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
        
        {/* 添加新打印机 */}
        <Card>
          <CardHeader>
            <Heading size="md">添加打印机</Heading>
          </CardHeader>
          
          <CardBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>打印机名称</FormLabel>
                <Input 
                  placeholder="例如: 厨房打印机" 
                  value={newPrinter.name} 
                  onChange={(e) => setNewPrinter(prev => ({ ...prev, name: e.target.value }))} 
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>打印机编号(SN)</FormLabel>
                <Input 
                  placeholder="请输入飞鹅云打印机编号" 
                  value={newPrinter.sn} 
                  onChange={(e) => setNewPrinter(prev => ({ ...prev, sn: e.target.value }))} 
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>设为默认</FormLabel>
                <Switch 
                  isChecked={newPrinter.isDefault} 
                  onChange={(e) => setNewPrinter(prev => ({ ...prev, isDefault: e.target.checked }))} 
                />
              </FormControl>
            </Stack>
          </CardBody>
          
          <CardFooter>
            <Button 
              colorScheme="green" 
              onClick={addPrinter}
              isLoading={isSaving}
            >
              添加打印机
            </Button>
          </CardFooter>
        </Card>
      </Stack>
    </Box>
  );
} 