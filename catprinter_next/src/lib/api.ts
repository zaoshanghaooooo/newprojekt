import axios from 'axios';
import { formatISO } from 'date-fns';

// API基础URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// 定义接口类型
export interface OrderItem {
  id?: string;
  qty: number;
  name: string;
  code?: string;
  detail?: string;
  isCustomDumpling?: boolean;
  foodType?: string;
  volume?: string;
  dumplingType?: string;
  price?: number;
  subItems?: Array<{
    qty: number;
    name: string;
  }>;
}

export interface Order {
  id: string;
  orderNo: string;
  tableNo: string;
  dateTime: Date | string;
  status: string;
  printCount: number;
  lastPrintTime?: Date | string | null;
  totalPrice: number;
  items: OrderItem[];
}

export interface Printer {
  id: string;
  sn: string;
  name: string;
  type: string;
  address?: string;
  status: string;
  lastActiveTime?: Date | string | null;
}

export interface Dish {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
  volume: string;
  foodType: string;
  type?: string;
  food_type?: string;
  capacity?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  hasSubItems: boolean;
  foodDefaultItems?: string[];
  createdAt: string;
  updatedAt: string;
}

// 格式化日期
const formatDate = (date: Date | string | undefined | null): string | null => {
  if (!date) return null;
  return typeof date === 'string' ? date : formatISO(date);
};

// 获取所有订单
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const response = await axios.get(`${API_URL}/orders`);
    return response.data;
  } catch (error) {
    console.error('获取订单失败:', error);
    throw error;
  }
};

// 获取所有菜品
export const fetchDishes = async (): Promise<Dish[]> => {
  try {
    const response = await axios.get(`${API_URL}/dishes`);
    return response.data;
  } catch (error) {
    console.error('获取菜品列表失败:', error);
    throw error;
  }
};

// 获取单个菜品
export const fetchDish = async (id: string): Promise<Dish> => {
  try {
    const response = await axios.get(`${API_URL}/dishes/${id}`);
    return response.data;
  } catch (error) {
    console.error('获取菜品详情失败:', error);
    throw error;
  }
};

// 获取打印状态
export const fetchPrintStatus = async (): Promise<any> => {
  try {
    const response = await axios.get(`${API_URL}/print/status`);
    return response.data;
  } catch (error) {
    console.error('获取打印状态失败:', error);
    throw error;
  }
};

// 获取单个订单
export const fetchOrder = async (id: string): Promise<Order> => {
  try {
    const response = await axios.get(`${API_URL}/orders/${id}`);
    return response.data;
  } catch (error) {
    console.error('获取订单详情失败:', error);
    throw error;
  }
};

// 创建订单
export const createOrder = async (order: Partial<Order>): Promise<Order> => {
  try {
    // 确保totalPrice至少为0
    const totalPrice = order.totalPrice || 0;
    
    // 提取printPriority参数，如果存在
    const { printPriority, ...orderData } = order as any;
    
    const payload = {
      ...orderData,
      dateTime: formatDate(order.dateTime as Date),
      lastPrintTime: formatDate(order.lastPrintTime as Date),
      // 使用计算好的totalPrice，同时添加total_price字段支持后端兼容性
      totalPrice: totalPrice,
      total_price: totalPrice,
      // 添加shouldPrint参数传递给后端，由后端统一处理打印逻辑
      shouldPrint: true,
      // 如果设置了打印优先级，传递给后端
      ...(printPriority ? { printPriority } : {})
    };
    
    console.log('发送订单数据到服务器:', payload);
    
    const response = await axios.post(`${API_URL}/orders`, payload);
    const createdOrder = response.data;
    
    // 移除自动打印逻辑，由后端统一处理，避免重复打印
    // 订单创建成功后直接返回结果
    
    // 返回服务器响应，包含订单创建结果
    return createdOrder;
  } catch (error) {
    console.error('创建订单失败:', error);
    throw error;
  }
};

// 更新订单
export const updateOrder = async (id: string, order: Partial<Order>): Promise<Order> => {
  try {
    const payload = {
      ...order,
      dateTime: formatDate(order.dateTime as Date),
      lastPrintTime: formatDate(order.lastPrintTime as Date),
    };
    
    const response = await axios.put(`${API_URL}/orders/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error('更新订单失败:', error);
    throw error;
  }
};

// 删除订单
export const deleteOrder = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/orders/${id}`);
  } catch (error) {
    console.error('删除订单失败:', error);
    throw error;
  }
};

// 打印订单
export const printOrder = async (orderId: string, printerId?: string): Promise<any> => {
  try {
    // 使用正式的打印接口，而不是测试接口
    // 如果printerId为"default"，则不传递printerId，让服务器使用默认打印机
    const payload = printerId && printerId !== 'default' ? 
      { orderId, printerId, printType: 'network' } : 
      { orderId, printType: 'network' };
    const response = await axios.post(`${API_URL}/print`, payload);
    return response.data;
  } catch (error) {
    console.error('打印订单失败:', error);
    throw error;
  }
};

// 获取所有打印机
export const fetchPrinters = async (): Promise<Printer[]> => {
  try {
    const response = await axios.get(`${API_URL}/api/printers`);
    return response.data;
  } catch (error) {
    console.error('获取打印机列表失败:', error);
    throw error;
  }
};

// 菜品管理接口
export interface DishPayload {
  name: string;
  code: string;
  price: number;
  category: string;
  type: string;
  foodType?: string;
  food_type?: string;
  capacity?: string;
  volume?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

// 创建菜品
export const createDish = async (payload: DishPayload): Promise<Dish> => {
  try {
    // 确保饮品类型数据一致性
    if (payload.type === 'drink' || payload.foodType === 'drink' || payload.food_type === 'drink' || payload.category === 'drink') {
      // 统一所有类型字段
      payload.type = 'drink';
      payload.foodType = 'drink';
      payload.food_type = 'drink';
      payload.category = 'drink';
      
      // 确保容量字段同步
      if (payload.capacity && !payload.volume) {
        payload.volume = payload.capacity;
      } else if (payload.volume && !payload.capacity) {
        payload.capacity = payload.volume;
      }
      
      // 如果仍然没有容量，设置一个默认值
      if (!payload.capacity && !payload.volume) {
        payload.capacity = '标准';
        payload.volume = '标准';
      }
    } else {
      // 确保食品类型一致
      payload.type = 'food';
      payload.foodType = 'food';
      payload.food_type = 'food';
    }
    
    console.log('发送到服务器的创建菜品数据:', payload);
    
    try {
      const response = await axios.post(`${API_URL}/dishes`, payload);
      return response.data;
    } catch (axiosError: any) {
      console.error('创建菜品API错误:', axiosError);
      if (axiosError.response) {
        // 服务器响应了错误状态码
        console.error('服务器响应状态:', axiosError.response.status);
        console.error('服务器响应数据:', axiosError.response.data);
        
        if (axiosError.response.data && axiosError.response.data.error) {
          throw new Error(`创建菜品失败: ${axiosError.response.data.error}`);
        }
      }
      throw axiosError;
    }
  } catch (error) {
    console.error('创建菜品失败:', error);
    throw error;
  }
};

// 更新菜品
export const updateDish = async (id: string, payload: DishPayload): Promise<Dish> => {
  try {
    // 确保饮品类型数据一致性
    if (payload.type === 'drink' || payload.foodType === 'drink' || payload.food_type === 'drink' || payload.category === 'drink') {
      // 统一所有类型字段
      payload.type = 'drink';
      payload.foodType = 'drink';
      payload.food_type = 'drink';
      payload.category = 'drink';
      
      // 确保容量字段同步
      if (payload.capacity && !payload.volume) {
        payload.volume = payload.capacity;
      } else if (payload.volume && !payload.capacity) {
        payload.capacity = payload.volume;
      }
      
      // 如果仍然没有容量，设置一个默认值
      if (!payload.capacity && !payload.volume) {
        payload.capacity = '标准';
        payload.volume = '标准';
      }
    } else {
      // 确保食品类型一致
      payload.type = 'food';
      payload.foodType = 'food';
      payload.food_type = 'food';
    }
    
    console.log('发送到服务器的更新菜品数据:', payload);
    const response = await axios.put(`${API_URL}/dishes/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error('更新菜品失败:', error);
    throw error;
  }
};

// 删除菜品
export const deleteDish = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/dishes/${id}`);
  } catch (error) {
    console.error('删除菜品失败:', error);
    throw error;
  }
};