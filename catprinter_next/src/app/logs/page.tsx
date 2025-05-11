'use client';

export const dynamic = 'force-dynamic'; // Ensure this page is server-rendered at request time
import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Badge, 
  Card, 
  CardBody,
  Button,
  Flex,
  Spinner,
  Text,
  Stack,
  Input,
  Table, 
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  GridItem,
  HStack,
  Divider
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
// 导入 Supabase 类型定义
import type { PrintLog, Printer } from '@/types/database.types';

// Define props for the page component to accept searchParams
interface LogsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function LogsPage({ searchParams }: LogsPageProps) {
  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [orderNo, setOrderNo] = useState<string>('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const router = useRouter();
  const toast = useToast();
  
  useEffect(() => {
    // 从 props 获取查询参数
    const printerIdParam = searchParams?.printer_id as string | undefined;
    const orderNoParam = searchParams?.order_no as string | undefined;
    
    if (printerIdParam) {
      setSelectedPrinter(printerIdParam);
    }
    
    if (orderNoParam) {
      setOrderNo(orderNoParam);
    }
    
    fetchPrinters();
    fetchLogs(printerIdParam, orderNoParam);
    fetchStatistics(dateRange.startDate, dateRange.endDate);
  }, [searchParams]);
  
  // 加载打印机列表
  const fetchPrinters = async () => {
    try {
      const response = await fetch('/api/printers');
      if (response.ok) {
        const data = await response.json();
        setPrinters(data);
      }
    } catch (error) {
      console.error('获取打印机列表错误:', error);
    }
  };
  
  // 加载日志数据
  const fetchLogs = async (printer_id?: string | null, order_no?: string | null) => {
    setLoading(true);
    try {
      let url = '/api/print-logs?limit=100';
      
      if (printer_id) {
        url += `&printer_id=${printer_id}`;
      }
      
      // 如果有订单号，需要先查询订单ID
      if (order_no) {
        const orderResponse = await fetch(`/api/orders?orderNo=${order_no}`);
        if (orderResponse.ok) {
          const orders = await orderResponse.json();
          if (orders && orders.length > 0) {
            url += `&order_id=${orders[0].id}`;
          }
        }
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('获取日志错误:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 加载统计数据
  const fetchStatistics = async (startDate: string, endDate: string) => {
    setStatsLoading(true);
    try {
      const url = `/api/print-logs/statistics?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStatistics(result.data);
        } else {
          throw new Error(result.message || '获取统计数据失败');
        }
      } else {
        throw new Error('获取统计数据请求失败');
      }
    } catch (error) {
      console.error('获取统计数据错误:', error);
      toast({
        title: '获取统计数据失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setStatsLoading(false);
    }
  };
  
  // 处理筛选条件变化
  const handleFilter = () => {
    // 更新URL参数
    const params = new URLSearchParams();
    
    if (selectedPrinter) {
      params.append('printer_id', selectedPrinter);
    }
    
    if (orderNo) {
      params.append('order_no', orderNo);
    }
    
    router.push(`/logs?${params.toString()}`);
    fetchLogs(selectedPrinter, orderNo);
  };
  
  // 清除筛选
  const handleClearFilter = () => {
    setSelectedPrinter('');
    setOrderNo('');
    router.push('/logs');
    fetchLogs();
  };
  
  // 获取状态徽章的颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case '成功':
        return 'green';
      case '失败':
        return 'red';
      case '等待中':
        return 'yellow';
      default:
        return 'gray';
    }
  };
  
  // 格式化日期时间
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('zh-CN');
  };
  
  // 处理Select值变化
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPrinter(e.target.value);
  };
  
  // 处理日期范围变化
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const newRange = {
      ...dateRange,
      [type === 'start' ? 'startDate' : 'endDate']: e.target.value
    };
    setDateRange(newRange);
  };
  
  // 刷新统计数据
  const refreshStatistics = () => {
    fetchStatistics(dateRange.startDate, dateRange.endDate);
  };
  
  // 格式化金额显示
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <Container maxW="container.xl" py={5}>
      <Tabs variant="enclosed">
        <TabList>
          <Tab>打印记录</Tab>
          <Tab>统计分析</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Heading as="h1" mb={6}>打印日志</Heading>
            
            <Card mb={6}>
              <CardBody>
                <Flex direction={{ base: 'column', md: 'row' }} gap={4} align="flex-end">
                  <Box flex={1}>
                    <Text mb={2}>打印机</Text>
                    <Select
                      placeholder="选择打印机"
                      value={selectedPrinter}
                      onChange={handleSelectChange}
                    >
                      {printers.map(printer => (
                        <option key={printer.id} value={printer.id}>
                          {printer.name}
                        </option>
                      ))}
                    </Select>
                  </Box>
                  <Box flex={1}>
                    <Text mb={2}>订单号</Text>
                    <Input
                      placeholder="输入订单号"
                      value={orderNo}
                      onChange={(e) => setOrderNo(e.target.value)}
                    />
                  </Box>
                  <Stack direction="row" spacing={4}>
                    <Button colorScheme="blue" onClick={handleFilter}>
                      筛选
                    </Button>
                    <Button variant="outline" onClick={handleClearFilter}>
                      清除筛选
                    </Button>
                  </Stack>
                </Flex>
              </CardBody>
            </Card>

            {error && (
              <Alert status="error" mb={6}>
                <AlertIcon />
                <AlertTitle>错误</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <Flex justify="center" align="center" minH="200px">
                <Spinner />
              </Flex>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>订单号</Th>
                    <Th>桌号</Th>
                    <Th>打印机</Th>
                    <Th>状态</Th>
                    <Th>打印时间</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map((log) => (
                    <Tr key={log.id}>
                      <Td>{log.order.order_no}</Td>
                      <Td>{log.order.table_no}</Td>
                      <Td>{log.printer.name}</Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </Td>
                      <Td>{formatDateTime(log.created_at)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </TabPanel>
          
          <TabPanel>
            <Heading as="h1" mb={6}>统计分析</Heading>
            
            <Card mb={6}>
              <CardBody>
                <Flex direction={{ base: 'column', md: 'row' }} gap={4} align="flex-end">
                  <Box flex={1}>
                    <Text mb={2}>开始日期</Text>
                    <Input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => handleDateChange(e, 'start')}
                    />
                  </Box>
                  <Box flex={1}>
                    <Text mb={2}>结束日期</Text>
                    <Input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => handleDateChange(e, 'end')}
                    />
                  </Box>
                  <Button colorScheme="blue" onClick={refreshStatistics}>
                    查询
                  </Button>
                </Flex>
              </CardBody>
            </Card>
            
            {statsLoading ? (
              <Flex justify="center" align="center" minH="200px">
                <Spinner />
              </Flex>
            ) : statistics ? (
              <>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={6}>
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>总订单数</StatLabel>
                        <StatNumber>{statistics.summary.totalOrders}</StatNumber>
                        <StatHelpText>
                          {dateRange.startDate === dateRange.endDate ? '今日' : `${dateRange.startDate} 至 ${dateRange.endDate}`}
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                  
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>总营业额</StatLabel>
                        <StatNumber>{formatCurrency(statistics.summary.totalAmount)}</StatNumber>
                        <StatHelpText>
                          平均单价: {formatCurrency(statistics.summary.averageOrderAmount)}
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                  
                  <Card>
                    <CardBody>
                      <Stat>
                        <StatLabel>打印成功率</StatLabel>
                        <StatNumber>{statistics.printing.successRate.toFixed(1)}%</StatNumber>
                        <StatHelpText>
                          成功: {statistics.printing.successCount} / 总数: {statistics.printing.totalPrints}
                        </StatHelpText>
                      </Stat>
                    </CardBody>
                  </Card>
                </SimpleGrid>
                
                <Card mb={6}>
                  <CardBody>
                    <Heading size="md" mb={4}>订单时段分布</Heading>
                    <Box h="200px">
                      <Flex h="100%" align="flex-end">
                        {statistics.hourlyDistribution.map((count: number, hour: number) => {
                          const maxCount = Math.max(...statistics.hourlyDistribution);
                          const percentage = maxCount > 0 ? (count / maxCount * 100) : 0;
                          
                          return (
                            <Box 
                              key={hour} 
                              flex="1" 
                              bg="blue.500" 
                              h={`${percentage}%`} 
                              minH="1px"
                              mx="1px"
                              position="relative"
                            >
                              {count > 0 && (
                                <Text 
                                  position="absolute" 
                                  top="-25px" 
                                  left="50%" 
                                  transform="translateX(-50%)"
                                  fontSize="xs"
                                >
                                  {count}
                                </Text>
                              )}
                              <Text 
                                position="absolute" 
                                bottom="-25px" 
                                left="50%" 
                                transform="translateX(-50%)"
                                fontSize="xs"
                              >
                                {hour}
                              </Text>
                            </Box>
                          );
                        })}
                      </Flex>
                    </Box>
                  </CardBody>
                </Card>
                
                <Card>
                  <CardBody>
                    <Heading size="md" mb={4}>打印状态分布</Heading>
                    <HStack spacing={4} justify="center">
                      <Stat>
                        <StatLabel color="green.500">成功</StatLabel>
                        <StatNumber>{statistics.printing.successCount}</StatNumber>
                      </Stat>
                      <Divider orientation="vertical" h="50px" />
                      <Stat>
                        <StatLabel color="red.500">失败</StatLabel>
                        <StatNumber>{statistics.printing.failedCount}</StatNumber>
                      </Stat>
                      <Divider orientation="vertical" h="50px" />
                      <Stat>
                        <StatLabel color="yellow.500">等待中</StatLabel>
                        <StatNumber>{statistics.printing.waitingCount}</StatNumber>
                      </Stat>
                    </HStack>
                  </CardBody>
                </Card>
              </>
            ) : (
              <Alert status="warning">
                <AlertIcon />
                <AlertTitle>无统计数据</AlertTitle>
                <AlertDescription>
                  选择日期范围并点击"查询"按钮获取统计数据
                </AlertDescription>
              </Alert>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
}