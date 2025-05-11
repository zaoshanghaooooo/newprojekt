import { supabase } from '@/lib/supabase';
import logger from './logger';
import { FormatService, PrinterType } from './formatters/format-service';
import { PrintStyle } from './formatters/styles';
import { Order, OrderItem } from '@/utils/formatters/types';
import { FeieyunService } from './feieyun-service';
import axios from 'axios';

// 打印类型
export enum PrintType {
  THERMAL = 'thermal',
  NETWORK = 'network',
  USB = 'usb',
  MOCK = 'mock'
}

// 定义打印机类型
export interface Printer {
  id: string;
  name: string;
  sn: string;
  key: string;
  type: string;
  status: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// 打印结果
export interface PrintResult {
  success: boolean;
  message: string;
  queued?: boolean;
  printerId?: string;
}

// 定义打印策略接口
export interface PrintStrategy {
  print(order: Order, items: OrderItem[], printer?: Printer): Promise<PrintResult>;
}

// 热敏打印策略
class ThermalPrintStrategy implements PrintStrategy {
  private separateBeverageFood: boolean;
  private formatService: FormatService;

  constructor(separateBeverageFood: boolean = false) {
    this.separateBeverageFood = separateBeverageFood;
    this.formatService = FormatService.getInstance();
  }

  async print(order: Order, items: OrderItem[], printer?: Printer): Promise<PrintResult> {
    try {
      if (!printer) {
        throw new Error('未指定打印机');
      }

      logger.info(`使用热敏打印机打印订单: ${order.order_no}`, 'ThermalPrintStrategy');
      
      // 添加详细的订单项目日志
      logger.info('订单项目详情:', JSON.stringify(items.map(item => ({
        id: item.id,
        name: item.name,
        food_type: item.food_type,
        is_beverage: item.food_type === 'drink'
      }))));

      // 如果需要分开打印饮料和食物
      if (this.separateBeverageFood) {
        // 增强饮品识别逻辑
        const beverageItems = items.filter(item => 
          item.food_type === 'drink' || 
          item.food_type === 'beverage' || 
          (item.food_type || '').toLowerCase().includes('drink') ||
          ((item as any).type === 'drink') // 使用类型断言访问可能存在的type属性
        );
        
        // 非饮品项目定义为食物
        const foodItems = items.filter(item => !beverageItems.includes(item));
        
        logger.info(`订单 ${order.order_no} 分类结果: 饮品=${beverageItems.length}项, 食物=${foodItems.length}项`);

        if (foodItems.length > 0) {
          // 打印食物订单（不添加order_type标记）
          await this.printOrderItems(order, foodItems, printer, '食物');
        }

        if (beverageItems.length > 0) {
          // 打印饮料订单（不添加order_type标记）
          await this.printOrderItems(order, beverageItems, printer, '饮料');
        }
      } else {
        // 打印完整订单
        await this.printOrderItems(order, items, printer);
      }

      return {
        success: true,
        message: '打印成功',
        printerId: printer.id
      };
    } catch (error) {
      logger.error(`热敏打印失败: ${error instanceof Error ? error.message : String(error)}`, error);
      
      return {
        success: false,
        message: `打印失败: ${error instanceof Error ? error.message : String(error)}`,
        printerId: printer?.id
      };
    }
  }

  private async printOrderItems(
    order: Order, 
    items: OrderItem[], 
    printer: Printer, 
    type: string = '完整'
  ): Promise<void> {
    // 创建一个新的订单对象，仅包含需要打印的项目
    const filteredOrder = { ...order, items_to_print: items };
    
    // 使用新的格式化服务格式化订单
    const formattedContent = await this.formatService.formatOrder(
      filteredOrder,
      items,
      PrinterType.ESCPOS,
      new PrintStyle()
    );

    // 这里应该实现真实的打印逻辑
    logger.info(`打印${type}订单 ${order.order_no} 到 ${printer.name}`, 'ThermalPrintStrategy');
    logger.debug(`打印内容:\n${formattedContent}`, 'ThermalPrintStrategy');
    
    // 模拟打印延迟
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// 网络打印策略
class NetworkPrintStrategy implements PrintStrategy {
  private separateBeverageFood: boolean;
  private formatService: FormatService;
  private feieyunService: FeieyunService | null = null;

  constructor(separateBeverageFood: boolean = false) {
    this.separateBeverageFood = separateBeverageFood;
    this.formatService = FormatService.getInstance();
  }

  async print(order: Order, items: OrderItem[], printer?: Printer): Promise<PrintResult> {
    try {
      if (!printer) {
        throw new Error('未指定打印机');
      }

      if (!printer.address && !printer.sn) {
        throw new Error('打印机缺少网络地址或SN编号');
      }

      logger.info(`使用网络打印机打印订单: ${order.order_no}`, 'NetworkPrintStrategy');
      
      // 添加详细的订单项目日志
      logger.info('订单项目详情:', JSON.stringify(items.map(item => ({
        id: item.id,
        name: item.name,
        food_type: item.food_type,
        is_beverage: item.food_type === 'drink'
      }))));

      // 直接创建飞鹅云服务，优先使用环境变量，而不考虑打印机类型
      // 飞鹅云环境变量配置自检
      const feieyunUserEnv = process.env.FEIEYUN_USER;
      const feieyunKeyEnv = process.env.FEIEYUN_UKEY;
      const feieyunSnEnv = process.env.FEIEYUN_SN;
      
      logger.info('飞鹅云环境变量配置自检:', {
        FEIEYUN_USER: feieyunUserEnv ? '已设置' : '未设置',
        FEIEYUN_UKEY: feieyunKeyEnv ? '已设置' : '未设置',
        FEIEYUN_SN: feieyunSnEnv ? '已设置' : '未设置',
        PRINTER_SN: printer.sn
      });
      
      // 优先使用环境变量中的打印机SN
      const printerSn = printer.sn || feieyunSnEnv;
      
      // 直接创建飞鹅云服务，不检查打印机类型
      this.feieyunService = new FeieyunService({
        printerSn: printerSn,
        debug: true
      });
      
      if (!this.feieyunService.isConfigured()) {
        logger.warn('飞鹅云服务配置不完整，尝试强制使用环境变量', {
          hasPrinterSn: !!printerSn,
          envUser: !!feieyunUserEnv,
          envKey: !!feieyunKeyEnv
        });
        
        // 再次尝试，显式传递所有环境变量
        this.feieyunService = new FeieyunService({
          printerSn: printerSn,
          user: feieyunUserEnv || '',
          key: feieyunKeyEnv || '',
          debug: true
        });
        
        if (!this.feieyunService.isConfigured()) {
          logger.error('飞鹅云服务配置仍然不完整，无法使用飞鹅云API打印', {
            printerSn: printerSn,
            user: feieyunUserEnv ? '已设置' : '未设置',
            key: feieyunKeyEnv ? '已设置' : '未设置'
          });
          this.feieyunService = null;
        } else {
          logger.info('成功使用环境变量配置飞鹅云服务');
        }
      } else {
        logger.info('飞鹅云服务配置成功', {
          printerSn: printerSn
        });
      }

      // 如果分开打印饮料和食物
      if (this.separateBeverageFood) {
        // 增强饮品识别逻辑
        const beverageItems = items.filter(item => 
          item.food_type === 'drink' || 
          item.food_type === 'beverage' || 
          (item.food_type || '').toLowerCase().includes('drink') ||
          ((item as any).type === 'drink') // 使用类型断言访问可能存在的type属性
        );
        
        // 非饮品项目定义为食物
        const foodItems = items.filter(item => !beverageItems.includes(item));
        
        logger.info(`订单 ${order.order_no} 分类结果: 饮品=${beverageItems.length}项, 食物=${foodItems.length}项`);

        if (foodItems.length > 0) {
          // 打印食物订单（不添加order_type标记）
          await this.sendToPrinter(order, foodItems, printer, '食物');
        }

        if (beverageItems.length > 0) {
          // 打印饮料订单（不添加order_type标记）
          await this.sendToPrinter(order, beverageItems, printer, '饮料');
        }
      } else {
        // 打印完整订单
        await this.sendToPrinter(order, items, printer);
      }

      return {
        success: true,
        message: '打印成功',
        printerId: printer.id
      };
    } catch (error) {
      logger.error(`网络打印失败: ${error instanceof Error ? error.message : String(error)}`, error);

      return {
        success: false,
        message: `打印失败: ${error instanceof Error ? error.message : String(error)}`,
        printerId: printer?.id
      };
    }
  }

  private async sendToPrinter(
    order: Order, 
    items: OrderItem[], 
    printer: Printer, 
    type: string = '完整'
  ): Promise<void> {
    // 创建一个新的订单对象，仅包含需要打印的项目
    const filteredOrder = { ...order, items_to_print: items };
    
    // 使用新的格式化服务格式化订单
    const formattedContent = await this.formatService.formatOrder(
      filteredOrder,
      items,
      PrinterType.FEIEYUN,
      new PrintStyle()
    );

    // 如果有可用的飞鹅云服务，使用飞鹅云API打印
    if (this.feieyunService) {
      logger.info(`使用飞鹅云API发送${type}订单 ${order.order_no} 到打印机 ${printer.name}`, 'NetworkPrintStrategy');
      
      try {
        // 处理订单数据
        const feieyunOrderData = {
          id: order.id || order.order_no,
          tableNo: order.table_no || 'N/A',
          status: order.status,
          // 添加飞鹅云服务所需的订单项
          items: items.map(item => {
            // 确保qty有值
            let qty = 1;
            if ((item as any).quantity) {
              qty = (item as any).quantity;
            } else if ((item as any).qty) {
              qty = (item as any).qty;
            }
            
            return {
              id: item.id,
              name: item.name || '',
              code: item.code || '',
              qty: qty,
              notes: (item as any).notes || ''
            };
          })
        };

        logger.info('准备调用飞鹅云API打印订单', { 
          sn: printer.sn, 
          orderId: order.id,
          itemsCount: items.length
        });

        // 修复格式化内容中可能的undefined标记
        const cleanedContent = formattedContent.replace(/undefined/g, '1');
        
        // 构建打印内容，仅包含选定类型的项目
        let printContent = cleanedContent;
        
        // 直接使用飞鹅云的原始API调用
        const result = await this.feieyunService.callApi('Open_printMsg', {
          sn: printer.sn,
          content: printContent,
          times: '1'
        });
        
        logger.info('飞鹅云API打印结果', result);

        if (result.ret !== 0) {
          throw new Error(`飞鹅云打印失败: ${result.msg}`);
        } else {
          logger.info('飞鹅云打印成功', {
            orderId: order.id,
            printerSn: printer.sn
          });
        }
      } catch (error) {
        logger.error('飞鹅云API调用失败', error);
        throw error;
      }
    } else {
      // 网络打印机但没有飞鹅云服务配置，尝试直接发送
      logger.info(`发送${type}订单 ${order.order_no} 到网络打印机 ${printer.address || printer.sn}`, 'NetworkPrintStrategy');
      logger.debug(`打印内容:\n${formattedContent}`, 'NetworkPrintStrategy');
      
      // 如果有打印机地址，我们尝试直接发送
      if (printer.address) {
        try {
          // 使用axios直接发送到打印机IP
          const response = await axios.post(`http://${printer.address}/print`, {
            content: formattedContent
          }, {
            timeout: 5000, // 5秒超时
            headers: {
              'Content-Type': 'text/plain'
            }
          });
          
          logger.info(`直接网络打印响应: ${JSON.stringify(response.data)}`, 'NetworkPrintStrategy');
        } catch (error) {
          logger.error(`直接网络打印失败: ${error instanceof Error ? error.message : String(error)}`, error);
          // 我们不抛出错误，因为这是备用尝试
        }
      } else {
        // 没有网络打印机地址，只能模拟
        logger.warn(`无法发送到打印机：缺少网络地址，SN=${printer.sn}`, 'NetworkPrintStrategy');
        
        // 尝试使用环境变量中的飞鹅云配置进行打印
        try {
          const feieyunService = new FeieyunService({
            printerSn: printer.sn,
            debug: true
          });
          
          if (feieyunService.isConfigured()) {
            logger.info('尝试使用全局飞鹅云配置打印', {
              printerSn: printer.sn
            });
            
            // 修复格式化内容中可能的undefined标记
            const cleanedContent = formattedContent.replace(/undefined/g, '1');
            
            const result = await feieyunService.callApi('Open_printMsg', {
              sn: printer.sn,
              content: cleanedContent,
              times: '1'
            });
            
            logger.info('使用全局配置的飞鹅云打印结果', result);
          } else {
            logger.error('全局飞鹅云配置不完整，无法进行打印');
          }
        } catch (error) {
          logger.error('使用全局飞鹅云配置打印失败', error);
        }
      }
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 模拟打印策略
class MockPrintStrategy implements PrintStrategy {
  async print(order: Order, items: OrderItem[], printer?: Printer): Promise<PrintResult> {
    logger.info(`模拟打印订单: ${order.order_no}，共 ${items.length} 个项目`, 'MockPrintStrategy');
    
    // 模拟打印延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      message: '模拟打印成功',
      printerId: printer?.id
    };
  }
}

// 打印策略工厂
export class PrintStrategyFactory {
  static create(type: string, separateBeverageFood: boolean = true): PrintStrategy {
    switch (type.toLowerCase()) {
      case PrintType.THERMAL:
        return new ThermalPrintStrategy(separateBeverageFood);
      case PrintType.NETWORK:
        return new NetworkPrintStrategy(separateBeverageFood);
      case PrintType.MOCK:
      default:
        return new MockPrintStrategy();
    }
  }
}

// 订单打印器
export class OrderPrinter {
  private strategy: PrintStrategy;
  private defaultRetryCount: number;
  private separateBeverageFood: boolean;

  constructor(
    strategy: PrintStrategy, 
    separateBeverageFood: boolean = true,
    defaultRetryCount: number = 3
  ) {
    this.strategy = strategy;
    this.separateBeverageFood = separateBeverageFood;
    this.defaultRetryCount = defaultRetryCount;
  }

  async printOrder(orderId: string, printerId?: string, options?: { priority?: 'normal' | 'high' }): Promise<PrintResult> {
    try {
      const isPriorityHigh = options?.priority === 'high';
      
      // 添加打印去重检查
      const { data: printLogs, error: printLogsError } = await supabase
        .from('print_logs')
        .select('id, created_at, priority')
        .eq('order_id', orderId)
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // 最近1分钟内
        .order('created_at', { ascending: false });
        
      if (!printLogsError && printLogs && printLogs.length > 0) {
        // 记录警告日志
        logger.warn(`订单 ${orderId} 在过去1分钟内已经打印过 ${printLogs.length} 次，最近一次在 ${printLogs[0].created_at}`, 'OrderPrinter');
        
        // 增强的重复打印检测逻辑：
        // 1. 无论优先级如何，20秒内一律不允许重复打印
        const twentySecondsAgo = new Date(Date.now() - 20000);
        const veryRecentPrints = printLogs.filter(log => 
          new Date(log.created_at) >= twentySecondsAgo
        );
        
        if (veryRecentPrints.length > 0) {
          logger.warn(`订单 ${orderId} 在最近20秒内已打印，强制跳过重复打印`, {
            latestPrint: veryRecentPrints[0].created_at,
            currentPriority: isPriorityHigh ? 'high' : 'normal'
          });
          
          return {
            success: true,
            message: '订单刚刚已打印（<20秒），忽略此次请求',
            printerId: printerId
          };
        }
        
        // 2. 20-60秒内，高优先级可以覆盖普通优先级，但高优先级不能覆盖高优先级
        if (printLogs.length >= 1) {
          // 检查是否高优先级可以覆盖普通优先级
          const canOverridePrevious = isPriorityHigh && 
            !printLogs.some(log => log.priority === 'high');
            
          if (!canOverridePrevious) {
            logger.warn(`订单 ${orderId} 打印请求被忽略，防止重复打印`, {
              currentPriority: isPriorityHigh ? 'high' : 'normal',
              previousPriorities: printLogs.map(log => log.priority || 'normal')
            });
            
            return {
              success: true,
              message: '订单近期已打印，忽略此次请求',
              printerId: printerId
            };
          } else {
            logger.info(`订单 ${orderId} 虽然近期已打印，但当前是高优先级请求覆盖普通请求，将继续执行`, {
              latestPrint: printLogs[0].created_at
            });
          }
        }
      }
      
      // 查询订单及其项目
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!order) throw new Error(`订单不存在: ${orderId}`);

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // 查询指定打印机或默认打印机
      let printer: Printer | null = null;
      
      if (printerId) {
        const { data: printerData, error: printerError } = await supabase
          .from('printers')
          .select('*')
          .eq('id', printerId)
          .single();
          
        if (printerError) throw printerError;
        printer = printerData;
      } else {
        // 查找默认打印机
        const { data: defaultPrinter, error: defaultPrinterError } = await supabase
          .from('printers')
          .select('*')
          .eq('isDefault', true)
          .single();
          
        if (defaultPrinterError && defaultPrinterError.code !== 'PGRST116') {
          // PGRST116 是"未找到结果"错误，我们可以安全地忽略它
          throw defaultPrinterError;
        }
        
        printer = defaultPrinter;
      }

      if (!printer) {
        logger.warn(`找不到可用的打印机，将订单 ${orderId} 添加到离线队列`, 'OrderPrinter');
        // 如果找不到打印机，则添加到离线队列
        return this.addToOfflineQueue(orderId);
      }

      // 输出调试信息
      logger.info(`准备使用打印机打印订单: ${order.order_no}`, {
        printerId: printer.id,
        printerName: printer.name,
        printerType: printer.type,
        printerSN: printer.sn,
        printerAddress: printer.address,
        strategy: this.strategy.constructor.name
      });

      // 使用策略打印订单
      const result = await this.strategy.print(order, items, printer);
      
      // 记录打印结果
      await this.logPrintResult(orderId, printer.id, result);

      return result;
    } catch (error) {
      logger.error(`打印订单失败: ${error instanceof Error ? error.message : String(error)}`, error);

      // 如果打印失败，则添加到离线队列
      return this.addToOfflineQueue(orderId);
    }
  }

  // 将订单添加到离线队列
  async addToOfflineQueue(orderId: string): Promise<PrintResult> {
    try {
      // 查询订单
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!order) throw new Error(`订单不存在: ${orderId}`);

      // 更新订单状态为离线队列
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'offline_queue',
          queued_at: new Date(),
          print_retries: 0
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) throw updateError;

      logger.info(`订单 ${order.order_no} 已添加到离线打印队列`, 'OrderPrinter');

      return {
        success: true,
        message: '订单已添加到离线打印队列',
        queued: true
      };
    } catch (error) {
      logger.error(`添加订单到离线队列失败: ${error instanceof Error ? error.message : String(error)}`, error);
      
      return {
        success: false,
        message: `添加到离线队列失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // 处理离线打印队列
  async processOfflineQueue(): Promise<{ 
    success: boolean; 
    message: string; 
    processed: number; 
    succeeded: number; 
    failed: number; 
  }> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      // 查询所有离线队列中的订单
      const { data: queuedOrders, error: queuedOrdersError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'offline_queue')
        .eq('print_retries', { lt: this.defaultRetryCount }) // 未超过重试次数
        .order('queued_at', { ascending: true }); // 先进先出

      if (queuedOrdersError) throw queuedOrdersError;
      if (queuedOrders.length === 0) {
        return {
          success: true,
          message: '离线队列为空',
          processed: 0,
          succeeded: 0,
          failed: 0
        };
      }

      logger.info(`开始处理离线打印队列，共 ${queuedOrders.length} 个订单`, 'OrderPrinter');

      // 获取默认打印机
      const { data: printer, error: printerError } = await supabase
        .from('printers')
        .select('*')
        .eq('isDefault', true)
        .single();

      if (printerError) throw printerError;

      if (!printer) {
        return {
          success: false,
          message: '没有默认打印机',
          processed: 0,
          succeeded: 0,
          failed: 0
        };
      }

      // 逐个处理队列中的订单
      for (const order of queuedOrders) {
        processed++;
        
        try {
          // 尝试打印订单
          const result = await this.printOrder(order.id, printer.id);
          
          if (result.success) {
            // 打印成功，更新订单状态
            const { data: updatedOrder, error: updateError } = await supabase
              .from('orders')
              .update({
                status: '已打印',
                print_retries: 0
              })
              .eq('id', order.id)
              .select()
              .single();

            if (updateError) throw updateError;
            
            succeeded++;
          } else {
            // 打印失败，增加重试次数
            const newRetryCount = order.print_retries + 1;
            
            const { data: updatedOrder, error: updateError } = await supabase
              .from('orders')
              .update({
                print_retries: newRetryCount,
                // 如果超过最大重试次数，标记为打印失败
                status: newRetryCount >= this.defaultRetryCount ? '打印失败' : 'offline_queue'
              })
              .eq('id', order.id)
              .select()
              .single();

            if (updateError) throw updateError;
            
            failed++;
          }
        } catch (error) {
          // 处理单个订单时出错
          logger.error(`处理离线队列订单 ${order.id} 失败: ${error instanceof Error ? error.message : String(error)}`, error);
          
          failed++;
          
          // 更新重试次数
          const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update({
              print_retries: order.print_retries + 1
            })
            .eq('id', order.id)
            .select();

          if (updateError) throw updateError;
        }
      }

      return {
        success: true,
        message: `离线队列处理完成: ${succeeded}/${processed} 成功`,
        processed,
        succeeded,
        failed
      };
    } catch (error) {
      logger.error(`处理离线打印队列失败: ${error instanceof Error ? error.message : String(error)}`, error);
      
      return {
        success: false,
        message: `处理离线队列失败: ${error instanceof Error ? error.message : String(error)}`,
        processed,
        succeeded,
        failed
      };
    }
  }

  // 记录打印结果日志
  private async logPrintResult(
    orderId: string, 
    printerId: string, 
    result: PrintResult
  ): Promise<void> {
    try {
      await supabase
        .from('print_logs')
        .insert({
          status: result.success ? 'success' : 'failed',
          message: result.message,
          order_id: orderId,
          printer_id: printerId,
          print_time: new Date()
        });
    } catch (error) {
      logger.error(`记录打印日志失败: ${error instanceof Error ? error.message : String(error)}`, error);
    }
  }
}

// 默认导出通用打印服务
export default class PrintService {
  private static defaultPrintType: string = process.env.DEFAULT_PRINT_TYPE || 'network';
  private static separateBeverageFood: boolean = true;
  private static retryCount: number = parseInt(process.env.PRINT_RETRY_COUNT || '3', 10);

  static async printOrder(
    orderId: string, 
    printerId?: string, 
    options?: { printType?: string; priority?: 'normal' | 'high' }
  ): Promise<PrintResult> {
    try {
      // 记录打印请求日志
      const priority = options?.priority || 'normal';
      logger.info(`开始处理打印请求: orderId=${orderId}, printerId=${printerId || 'default'}, priority=${priority}`);
      
      // 记录高优先级打印请求的开始时间
      const startTime = priority === 'high' ? Date.now() : null;
      
      // 获取打印策略类型
      const printType = options?.printType || this.defaultPrintType;
      
      // 创建打印策略
      const strategy = PrintStrategyFactory.create(
        printType, 
        this.separateBeverageFood
      );
      
      // 创建打印器实例
      const printer = new OrderPrinter(
        strategy, 
        this.separateBeverageFood,
        this.retryCount
      );
      
      // 执行打印
      const result = await printer.printOrder(orderId, printerId, {
        priority: options?.priority
      });
      
      // 记录高优先级打印完成时间和耗时
      if (startTime) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        logger.info(`高优先级打印完成: orderId=${orderId}, 耗时=${duration}ms`);
      }
      
      return result;
    } catch (error) {
      logger.error(`打印订单失败: ${error instanceof Error ? error.message : String(error)}`, error);
      
      return {
        success: false,
        message: `打印失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  static async processOfflineQueue(): Promise<{ 
    success: boolean; 
    message: string; 
    processed: number; 
    succeeded: number; 
    failed: number; 
  }> {
    const strategy = PrintStrategyFactory.create(this.defaultPrintType, this.separateBeverageFood);
    const printer = new OrderPrinter(strategy, this.separateBeverageFood, this.retryCount);
    
    return await printer.processOfflineQueue();
  }

  static async getPrintStatus(): Promise<any> {
    try {
      // 查询离线队列中的订单数量
      const { count: offlineCount, error: offlineCountError } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('status', 'offline_queue');
      
      if (offlineCountError) throw offlineCountError;
      
      // 查询最近24小时的打印日志
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const { count: totalPrints, error: totalPrintsError } = await supabase
        .from('print_logs')
        .select('*', { count: 'exact' })
        .gte('created_at', last24h.toISOString());
      
      if (totalPrintsError) throw totalPrintsError;
      
      const { count: successPrints, error: successPrintsError } = await supabase
        .from('print_logs')
        .select('*', { count: 'exact' })
        .gte('created_at', last24h.toISOString())
        .eq('status', 'success');
      
      if (successPrintsError) throw successPrintsError;
      
      const { count: failedPrints, error: failedPrintsError } = await supabase
        .from('print_logs')
        .select('*', { count: 'exact' })
        .gte('created_at', last24h.toISOString())
        .eq('status', 'failed');
      
      if (failedPrintsError) throw failedPrintsError;
      
      // 计算成功率
      const totalPrintsCount = totalPrints || 0;
      const successPrintsCount = successPrints || 0;
      const successRate = totalPrintsCount > 0 ? (successPrintsCount / totalPrintsCount * 100) : 0;
      
      return {
        success: true,
        offline_queue: {
          count: offlineCount || 0
        },
        print_stats: {
          total: totalPrintsCount,
          success: successPrintsCount,
          failed: failedPrints || 0,
          success_rate: Math.round(successRate * 100) / 100
        },
        config: {
          retry_count: this.retryCount,
          default_print_type: this.defaultPrintType,
          separate_beverage_food: this.separateBeverageFood
        }
      };
    } catch (error) {
      logger.error(`获取打印状态失败: ${error instanceof Error ? error.message : String(error)}`, error);
      
      return {
        success: false,
        message: `获取打印状态失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}