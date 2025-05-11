'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Stack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  Badge,
  Card,
  CardHeader,
  CardBody,
  VStack,
  Divider,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast
} from '@chakra-ui/react';
import axios from 'axios';

interface Issue {
  id: string;
  description: string;
  solution: string;
  severity: string;
}

interface DiagnosticData {
  dishes: {
    total: number;
    drinks: number;
    foods: number;
    uncategorized: number;
    drinksList: any[];
    uncategorizedList: any[];
  };
  printers: {
    total: number;
    drinks: number;
    foods: number;
    defaults: number;
    drinksList: any[];
    foodsList: any[];
    defaultsList: any[];
  };
  settings: {
    list: any[];
    hasSeparateSettings: boolean;
  };
  issues: Issue[];
}

export default function PrintFixPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [diagData, setDiagData] = useState<DiagnosticData | null>(null);
  const [fixing, setFixing] = useState(false);
  
  // 加载诊断数据
  const loadDiagnosticData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/debug/check-print-config');
      
      if (response.data.success) {
        setDiagData(response.data.data);
      } else {
        toast({
          title: '加载失败',
          description: response.data.message || '无法获取诊断数据',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('获取诊断数据失败', error);
      toast({
        title: '加载失败',
        description: '无法获取诊断数据',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadDiagnosticData();
  }, []);
  
  // 修复打印问题
  const fixPrintIssues = async () => {
    try {
      setFixing(true);
      
      // 修复未分类菜品
      if (diagData && diagData.dishes && diagData.dishes.uncategorized && diagData.dishes.uncategorized > 0) {
        const foodsToUpdate = diagData.dishes.uncategorizedList?.map(dish => ({
          id: dish.id,
          food_type: 'food' // 默认设为食物
        })) || [];
        
        await axios.post('/api/dishes/batch-update', { dishes: foodsToUpdate });
        
        toast({
          title: '菜品更新成功',
          description: `已将${foodsToUpdate.length}个未分类菜品设置为食物`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      // 设置打印机分类
      if (diagData?.printers?.drinks === 0 && diagData?.printers?.foods === 0 && diagData?.printers?.defaults && diagData.printers.defaults > 0) {
        // 至少有默认打印机，将第一个设为食物打印机
        const defaultPrinter = diagData.printers.defaultsList?.[0];
        if (defaultPrinter) {
          await axios.patch(`/api/printers/${defaultPrinter.id}`, {
            category: 'food'
          });
          
          toast({
            title: '打印机更新成功',
            description: `已将打印机"${defaultPrinter.name}"设置为食物打印机`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
      }
      
      // 添加分开打印设置
      if (!diagData?.settings?.hasSeparateSettings) {
        await axios.post('/api/settings', {
          key: 'separate_beverage_food',
          value: 'true'
        });
        
        toast({
          title: '设置添加成功',
          description: '已添加分开打印设置',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      // 重新加载诊断数据
      await loadDiagnosticData();
      
      toast({
        title: '修复完成',
        description: '已应用所有自动修复，请重新尝试打印',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('修复问题失败', error);
      toast({
        title: '修复失败',
        description: '应用修复时发生错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setFixing(false);
    }
  };
  
  // 页面内容
  if (loading) {
    return (
      <Box p={5} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>正在加载诊断数据...</Text>
      </Box>
    );
  }
  
  if (!diagData) {
    return (
      <Box p={5}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法获取诊断数据</AlertDescription>
        </Alert>
        <Button mt={4} onClick={loadDiagnosticData}>重试</Button>
      </Box>
    );
  }
  
  return (
    <Box p={5} maxW="1200px" mx="auto">
      <Heading mb={4}>打印问题诊断修复工具</Heading>
      
      {/* 问题概述 */}
      <Card mb={6}>
        <CardHeader>
          <Heading size="md">检测到 {diagData.issues.length} 个问题</Heading>
        </CardHeader>
        <CardBody>
          {diagData.issues.length === 0 ? (
            <Alert status="success">
              <AlertIcon />
              <AlertTitle>所有系统正常</AlertTitle>
              <AlertDescription>未检测到任何打印配置问题</AlertDescription>
            </Alert>
          ) : (
            <VStack align="stretch" spacing={4}>
              {diagData.issues.map(issue => (
                <Alert 
                  key={issue.id}
                  status={issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'info'}
                >
                  <AlertIcon />
                  <Box>
                    <AlertTitle>{issue.description}</AlertTitle>
                    <AlertDescription>{issue.solution}</AlertDescription>
                  </Box>
                </Alert>
              ))}
              
              <Button 
                colorScheme="blue" 
                isLoading={fixing} 
                loadingText="正在修复..."
                onClick={fixPrintIssues}
              >
                自动修复所有问题
              </Button>
            </VStack>
          )}
        </CardBody>
      </Card>
      
      {/* 详细诊断 */}
      <Accordion allowMultiple defaultIndex={[0]}>
        {/* 菜品分类 */}
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <Heading size="sm">菜品分类</Heading>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Stack direction="row" spacing={4} mb={4}>
              <Box p={3} bg="gray.100" borderRadius="md">
                <Text fontWeight="bold">总数: {diagData.dishes.total}</Text>
              </Box>
              <Box p={3} bg="blue.100" borderRadius="md">
                <Text fontWeight="bold">饮品: {diagData.dishes.drinks}</Text>
              </Box>
              <Box p={3} bg="green.100" borderRadius="md">
                <Text fontWeight="bold">食物: {diagData.dishes.foods}</Text>
              </Box>
              <Box p={3} bg={diagData.dishes.uncategorized > 0 ? "red.100" : "gray.100"} borderRadius="md">
                <Text fontWeight="bold">未分类: {diagData.dishes.uncategorized}</Text>
              </Box>
            </Stack>
            
            {diagData.dishes.uncategorized > 0 && (
              <Box mt={4}>
                <Heading size="xs" mb={2}>未分类菜品:</Heading>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>ID</Th>
                      <Th>名称</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {diagData.dishes.uncategorizedList.map(dish => (
                      <Tr key={dish.id}>
                        <Td>{dish.id}</Td>
                        <Td>{dish.name}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </AccordionPanel>
        </AccordionItem>
        
        {/* 打印机配置 */}
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <Heading size="sm">打印机配置</Heading>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Stack direction="row" spacing={4} mb={4}>
              <Box p={3} bg="gray.100" borderRadius="md">
                <Text fontWeight="bold">总数: {diagData.printers.total}</Text>
              </Box>
              <Box p={3} bg={diagData.printers.drinks > 0 ? "blue.100" : "red.100"} borderRadius="md">
                <Text fontWeight="bold">饮品打印机: {diagData.printers.drinks}</Text>
              </Box>
              <Box p={3} bg={diagData.printers.foods > 0 ? "green.100" : "red.100"} borderRadius="md">
                <Text fontWeight="bold">食物打印机: {diagData.printers.foods}</Text>
              </Box>
              <Box p={3} bg={diagData.printers.defaults > 0 ? "gray.100" : "yellow.100"} borderRadius="md">
                <Text fontWeight="bold">默认打印机: {diagData.printers.defaults}</Text>
              </Box>
            </Stack>
            
            <Box mt={4}>
              <Heading size="xs" mb={2}>所有打印机:</Heading>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>名称</Th>
                    <Th>类型</Th>
                    <Th>类别</Th>
                    <Th>默认</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {diagData.printers.defaultsList.map(printer => (
                    <Tr key={printer.id}>
                      <Td>{printer.name}</Td>
                      <Td>{printer.type}</Td>
                      <Td>
                        {printer.category ? (
                          <Badge colorScheme={printer.category === 'food' ? 'green' : 'blue'}>
                            {printer.category}
                          </Badge>
                        ) : (
                          <Badge colorScheme="red">未分类</Badge>
                        )}
                      </Td>
                      <Td>{printer.isDefault ? '是' : '否'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </AccordionPanel>
        </AccordionItem>
        
        {/* 系统设置 */}
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                <Heading size="sm">系统设置</Heading>
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>设置键</Th>
                  <Th>值</Th>
                </Tr>
              </Thead>
              <Tbody>
                {diagData.settings.list.map((setting, index) => (
                  <Tr key={index}>
                    <Td>{setting.key}</Td>
                    <Td>{setting.value}</Td>
                  </Tr>
                ))}
                {!diagData.settings.hasSeparateSettings && (
                  <Tr>
                    <Td>
                      <Text color="red.500">separate_beverage_food</Text>
                    </Td>
                    <Td>
                      <Badge colorScheme="red">未设置 (默认为 true)</Badge>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      
      <Divider my={6} />
      
      <Stack direction="row" spacing={4}>
        <Button 
          colorScheme="teal" 
          onClick={loadDiagnosticData} 
          isLoading={loading}
        >
          刷新诊断数据
        </Button>
        
        <Button 
          colorScheme="blue" 
          isLoading={fixing} 
          loadingText="正在修复..."
          onClick={fixPrintIssues}
          isDisabled={diagData.issues.length === 0}
        >
          自动修复所有问题
        </Button>
      </Stack>
    </Box>
  );
} 