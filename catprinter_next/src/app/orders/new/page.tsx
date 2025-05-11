'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter,
  Heading,
  FormControl, 
  FormLabel, 
  Input, 
  Button, 
  Flex, 
  Box, 
  Tabs, 
  TabList, 
  Tab, 
  TabPanels, 
  TabPanel,
  SimpleGrid,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Text,
  Badge,
  useToast
} from '@chakra-ui/react';

import { fetchDishes, createOrder, Dish } from '@/lib/api';
import OrderPrintPreview from '@/components/OrderPrintPreview';

interface OrderItem {
  dishId: string;
  name: string;
  code: string;
  qty: number;
  price: number;
  foodType?: string;
}

interface CartItem extends OrderItem {
  subtotal: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const toast = useToast();
  
  // 状态定义
  const [tableNo, setTableNo] = useState('');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [foodItems, setFoodItems] = useState<Dish[]>([]);
  const [drinkItems, setDrinkItems] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 预览用临时订单
  const previewOrder = {
    orderNo: `OD${Date.now()}`,
    tableNo: tableNo,
    dateTime: new Date(),
    items: cart.map(item => ({
      qty: item.qty,
      name: item.name,
      code: item.code
    }))
  };

  // 加载菜品数据
  useEffect(() => {
    const loadDishes = async () => {
      setLoading(true);
      try {
        const data = await fetchDishes();
        console.log('获取到的原始菜品数据:', data); // 添加调试日志
        setDishes(data);
        
        // 优化饮品识别逻辑
        const drinks = data.filter(dish => {
          // 检查所有可能的字段来确定是否为饮品
          const isDrink = 
            dish.type === 'drink' || 
            dish.foodType === 'drink' || 
            dish.food_type === 'drink' ||
            dish.category === 'drink';
          
          // 添加额外的日志，检查每个可能影响判断的字段
          console.log(`菜品: ${dish.name}, 判定结果: ${isDrink ? '饮品' : '食品'}`);
          console.log(`  - type: ${dish.type}`);
          console.log(`  - foodType: ${dish.foodType}`);
          console.log(`  - food_type: ${dish.food_type}`);
          console.log(`  - category: ${dish.category}`);
          console.log(`  - volume/capacity: ${dish.volume || dish.capacity || 'None'}`);
          
          return isDrink;
        });
        
        // 非饮品即为食品
        const foods = data.filter(dish => !drinks.includes(dish));
        
        console.log('筛选后的食品数量:', foods.length);
        console.log('筛选后的饮品数量:', drinks.length);
        
        // 如果发现饮品中缺少容量信息，打印警告
        drinks.forEach(drink => {
          if (!drink.volume && !drink.capacity) {
            console.warn(`警告: 饮品 ${drink.name} 缺少容量信息`);
          }
        });
        
        // 如果没有识别到饮品，但有些菜品带有容量信息，可能是饮品识别失败
        if (drinks.length === 0) {
          const possibleDrinks = data.filter(dish => dish.volume || dish.capacity);
          if (possibleDrinks.length > 0) {
            console.warn('警告: 没有识别到饮品，但发现一些菜品带有容量信息，可能是饮品识别失败');
            console.log('可能的饮品:', possibleDrinks);
          }
        }
        
        setFoodItems(foods);
        setDrinkItems(drinks);
      } catch (error) {
        console.error('加载菜品失败', error);
        toast({
          title: '加载菜品失败',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadDishes();
  }, [toast]);

  // 添加菜品到购物车
  const addToCart = (dish: Dish) => {
    console.log('添加到购物车:', dish); // 调试日志
    
    setCart(prevCart => {
      // 确保价格是数字，至少为0
      const price = typeof dish.price === 'number' ? dish.price : 0;
      
      // 检查是否已在购物车中
      const existingItem = prevCart.find(item => item.dishId === dish.id);
      
      if (existingItem) {
        // 已存在则增加数量
        return prevCart.map(item => 
          item.dishId === dish.id 
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * price }
            : item
        );
      } else {
        // 不存在则添加新项，确保保存菜品类型信息
        const foodType = dish.type || dish.foodType || dish.food_type || 
                       (dish.category === 'drink' ? 'drink' : 'food');
        
        const newItem = {
          dishId: dish.id,
          name: dish.name,
          code: dish.code,
          qty: 1,
          price: price,
          foodType: foodType,
          subtotal: price
        };
        console.log('新添加的购物车项:', newItem); // 调试日志
        return [...prevCart, newItem];
      }
    });
  };

  // 更新购物车中商品数量
  const updateItemQuantity = (dishId: string, qty: number) => {
    if (qty <= 0) {
      // 数量为0则移除
      setCart(prevCart => prevCart.filter(item => item.dishId !== dishId));
      return;
    }
    
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.dishId === dishId) {
          // 确保价格是数字，至少为0
          const price = typeof item.price === 'number' ? item.price : 0;
          return { ...item, qty, subtotal: qty * price };
        }
        return item;
      })
    );
  };

  // 移除购物车中的商品
  const removeFromCart = (dishId: string) => {
    setCart(prevCart => prevCart.filter(item => item.dishId !== dishId));
  };

  // 计算总价
  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      // 确保价格至少为0，避免null或undefined
      const price = typeof item.price === 'number' ? item.price : 0;
      return sum + (price * item.qty);
    }, 0);
  };

  // 提交订单
  const handleSubmitOrder = async () => {
    // 表单验证
    if (!tableNo.trim()) {
      toast({
        title: '请输入桌号',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (cart.length === 0) {
      toast({
        title: '请至少选择一个菜品',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // 提交订单
    setIsSubmitting(true);
    
    // 添加打印中的提示
    toast({
      title: '正在发送订单',
      description: '订单正在创建并自动发送到打印机...',
      status: 'loading',
      duration: null,
      isClosable: false,
    });
    
    try {
      // 计算总价
      const total = calculateTotal();
      console.log('计算的订单总价:', total); // 调试日志
      
      const orderData = {
        tableNo,
        items: cart.map(item => ({
          dishId: item.dishId,
          name: item.name,
          code: item.code,
          qty: item.qty,
          // 确保每个商品的价格至少为0
          price: typeof item.price === 'number' ? item.price : 0,
          foodType: item.foodType
        })),
        totalPrice: total,
        total_price: total, // 同时添加snake_case格式的字段，增加兼容性
        // 添加打印优先级标志，确保服务器优先处理打印
        printPriority: 'high'
      };
      
      const result = await createOrder(orderData);
      
      // 关闭之前的loading提示
      toast.closeAll();
      
      toast({
        title: '订单创建成功',
        description: `订单号: ${result.orderNo}，已自动发送到打印机，无需手动打印`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // 跳转到订单列表页
      router.push('/orders');
    } catch (error) {
      console.error('创建订单失败', error);
      
      // 关闭之前的loading提示
      toast.closeAll();
      
      toast({
        title: '创建订单失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={6}>新建订单</Heading>
      
      <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
        {/* 左侧 - 菜品选择区域 */}
        <Box flex="2" minW={0}>
          <Card mb={6}>
            <CardHeader pb={0}>
              <FormControl isRequired>
                <FormLabel>桌号</FormLabel>
                <Input 
                  placeholder="输入桌号" 
                  value={tableNo} 
                  onChange={(e) => setTableNo(e.target.value)} 
                />
              </FormControl>
            </CardHeader>
            
            <CardBody>
              <Tabs isFitted variant="enclosed">
                <TabList mb={4}>
                  <Tab>吃的</Tab>
                  <Tab>喝的</Tab>
                </TabList>
                
                <TabPanels>
                  {/* 食品菜单 */}
                  <TabPanel>
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                      {foodItems.map(dish => (
                        <Card 
                          key={dish.id} 
                          cursor="pointer" 
                          onClick={() => addToCart(dish)}
                          _hover={{ boxShadow: 'md' }}
                        >
                          <CardBody>
                            <Text fontWeight="bold">{dish.name}</Text>
                            <Text fontSize="sm" color="gray.500">编码: {dish.code}</Text>
                            <Badge colorScheme="green" mt={2}>¥{dish.price.toFixed(2)}</Badge>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </TabPanel>
                  
                  {/* 饮品菜单 */}
                  <TabPanel>
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                      {drinkItems.map(dish => (
                        <Card 
                          key={dish.id} 
                          cursor="pointer" 
                          onClick={() => addToCart(dish)}
                          _hover={{ boxShadow: 'md' }}
                        >
                          <CardBody>
                            <Text fontWeight="bold">{dish.name}</Text>
                            <Text fontSize="sm" color="gray.500">编码: {dish.code}</Text>
                            <Badge colorScheme="blue" mt={2}>¥{dish.price.toFixed(2)}</Badge>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        </Box>
        
        {/* 右侧 - 订单预览和提交 */}
        <Box flex="1" minW={0}>
          <Card>
            <CardHeader>
              <Heading size="md">订单明细</Heading>
            </CardHeader>
            
            <CardBody>
              {cart.length === 0 ? (
                <Text color="gray.500">购物车为空，请选择菜品</Text>
              ) : (
                <>
                  {cart.map(item => (
                    <Flex 
                      key={item.dishId} 
                      justifyContent="space-between" 
                      alignItems="center"
                      mb={3}
                      p={2}
                      borderBottom="1px solid"
                      borderColor="gray.100"
                    >
                      <Box>
                        <Text fontWeight="medium">{item.name}</Text>
                        <Text fontSize="xs" color="gray.500">{item.code}</Text>
                        <Text fontSize="sm">¥{item.price.toFixed(2)}</Text>
                      </Box>
                      
                      <Flex alignItems="center">
                        <NumberInput 
                          size="sm" 
                          maxW={24} 
                          min={0} 
                          value={item.qty}
                          onChange={(_, val) => updateItemQuantity(item.dishId, val)}
                          mr={2}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                        
                        <Text fontWeight="bold" minW="70px" textAlign="right">
                          ¥{item.subtotal.toFixed(2)}
                        </Text>
                        
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          colorScheme="red"
                          ml={2}
                          onClick={() => removeFromCart(item.dishId)}
                        >
                          ×
                        </Button>
                      </Flex>
                    </Flex>
                  ))}
                  
                  <Flex justifyContent="flex-end" mt={4}>
                    <Text fontWeight="bold" fontSize="lg">
                      总计: ¥{calculateTotal().toFixed(2)}
                    </Text>
                  </Flex>
                </>
              )}
            </CardBody>
            
            <CardFooter flexDirection="column">
              <Button 
                colorScheme="green" 
                w="full"
                mb={4}
                isLoading={isSubmitting}
                isDisabled={cart.length === 0 || !tableNo.trim()}
                onClick={handleSubmitOrder}
              >
                发送订单
              </Button>
              
              <Box mt={4} p={4} bg="gray.50" borderRadius="md">
                <Heading size="sm" mb={2}>打印预览</Heading>
                <OrderPrintPreview order={previewOrder} />
              </Box>
            </CardFooter>
          </Card>
        </Box>
      </Flex>
    </Box>
  );
} 