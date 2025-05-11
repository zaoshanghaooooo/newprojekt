// 在文件顶部添加环境变量检查
// 立即检查飞鹅云环境变量配置
console.log('========= 飞鹅云服务初始化检查 =========');
console.log('FEIEYUN_USER:', process.env.FEIEYUN_USER ? '已设置' : '未设置');
console.log('FEIEYUN_UKEY:', process.env.FEIEYUN_UKEY ? '已设置' : '未设置');
console.log('FEIEYUN_SN:', process.env.FEIEYUN_SN ? '已设置' : '未设置');
console.log('FEIEYUN_URL:', process.env.FEIEYUN_URL || 'http://api.de.feieyun.com/Api/Open/');
console.log('========================================');

import axios from 'axios';
import * as crypto from 'crypto';
import { Order } from '@/lib/api';
import logger from './logger';
import printerConfig from './printer-config';
import { supabase } from '@/lib/supabase';

/**
 * 飞鹅云打印机服务
 * 根据飞鹅云API文档实现
 * @see https://developer.de.feieyun.com/apidoc-cn.html
 */
export class FeieyunService {
  private apiUrl: string;
  private user: string;
  private key: string;
  private printerSn: string;
  private debug: boolean;

  /**
   * 创建飞鹅云打印服务实例
   * @param config 配置参数
   */
  constructor(config?: {
    apiUrl?: string;
    user?: string;
    key?: string;
    printerSn?: string;
    debug?: boolean;
  }) {
    // 优先使用传入的配置，否则使用环境变量配置
    this.apiUrl = config?.apiUrl || printerConfig.feieyun.url;
    this.user = config?.user || printerConfig.feieyun.user;
    this.key = config?.key || printerConfig.feieyun.ukey;
    this.printerSn = config?.printerSn || printerConfig.feieyun.sn;
    this.debug = config?.debug || printerConfig.debug;
  }

  /**
   * 生成飞鹅云API所需的签名
   * @param timestamp 当前时间戳(秒)，如不传则自动生成
   * @returns 签名字符串
   */
  private generateSign(timestamp?: number): string {
    const stime = timestamp || Math.floor(Date.now() / 1000); // 当前时间戳（秒）
    const signContent = `${this.user}${this.key}${stime}`;
    return crypto.createHash('sha1').update(signContent).digest('hex');
  }

  /**
   * 检查配置是否完整
   * @returns 布尔值表示配置是否完整
   */
  public isConfigured(): boolean {
    const configured = !!(this.user && this.key && this.printerSn);
    
    // 添加详细的调试输出
    if (this.debug) {
      console.log('飞鹅云配置详情:', {
        user: this.user ? '已设置' : '未设置',
        key: this.key ? '已设置' : '未设置',
        printerSn: this.printerSn ? '已设置' : '未设置',
        configured: configured,
        url: this.apiUrl
      });
      
      // 如果配置不完整，输出具体缺少什么
      if (!configured) {
        console.warn('飞鹅云配置不完整:', {
          缺少用户名: !this.user,
          缺少密钥: !this.key, 
          缺少打印机SN: !this.printerSn
        });
      }
    }
    
    return configured;
  }

  /**
   * 掩码订单ID
   * @param orderId 订单ID
   * @returns 掩码后的ID
   */
  private maskOrderId(orderId: string | number): string {
    if (!orderId) {
      return "**********";
    }

    let processedId = String(orderId);
    if (processedId.length > 10) {
      processedId = processedId.slice(-10);
    } else if (processedId.length < 10) {
      processedId = processedId.padStart(10, '0');
    }

    const visiblePart = processedId.slice(-4);
    const maskedPart = "*".repeat(6);
    return maskedPart + visiblePart;
  }

  /**
   * 获取当日订单数量，并格式化为3位数字
   */
  private async getDailyOrderCount(): Promise<string> {
    try {
      // 获取当前日期的起止时间
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // 查询当日订单数量
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());
        
      if (error) {
        logger.error('获取当日订单数量错误:', error);
        return "001";
      }
      
      // 格式化为3位数字
      return (count || 1).toString().padStart(3, '0');
    } catch (error) {
      logger.error('获取当日订单数量错误:', error);
      return "001";
    }
  }

  /**
   * 格式化订单内容为打印格式
   * @param order 订单对象
   * @param orderType 订单类型标识（饮品/食物）
   * @returns 格式化后的打印内容
   */
  private async formatOrderContent(order: Order, orderType?: string): Promise<string> {
    const lines: string[] = [];
    
    // 添加调试日志
    console.log('格式化订单打印内容:', {
      orderId: order.id,
      tableNo: order.tableNo,
      itemsCount: order.items ? order.items.length : 0,
      orderType: orderType
    });
    
    // 1. 时间为日月年小时分钟排列，默认字号默认大小默认字体左对齐
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    const timeStr = `${day}-${month}-${year} ${hours}:${minutes}`;
    lines.push(`${timeStr}<BR>`);

    // 2. Bestellungsnummer 默认字号但加粗
    const todayOrderCount = await this.getDailyOrderCount();
    lines.push(`<BOLD>Bestellungsnummer: ${todayOrderCount}</BOLD><BR>`);

    // 3. Bestellung-ID，十位加密字符串，且只显示后四位
    const maskedId = this.maskOrderId(order.id);
    lines.push(`Bestellung-ID: ${maskedId}<BR>`);

    // 4. 添加订单类型标识
    if (orderType) {
      lines.push(`<B>类型: ${orderType}</B><BR>`);
    }

    // 5. Tisch 号
    lines.push(`<B>Tisch: ${order.tableNo || 'N/A'}</B><BR>`);

    // 6. 分割线 - 使用足够长的分隔线确保覆盖整张纸
    // 标准58mm纸张每行约32个字符，使用48个'-'确保覆盖整行
    const divider = '-'.repeat(48);
    lines.push(`${divider}<BR>`);
    
    // 7. 菜品项目：数字乘以单品编号和单品名称
    if (order.items && order.items.length > 0) {
      // 打印菜品数量和详情
      console.log('打印菜品项目:', JSON.stringify(order.items));
      
      for (const item of order.items) {
        // 确保数量正确显示
        const qty = item.qty || 1;
        console.log(`处理菜品:`, {name: item.name, qty: qty, rawQty: item.qty});
        
        // 加粗显示菜品
        const itemText = item.code ? `${item.code} ${item.name}` : item.name;
        lines.push(`<B>${qty}x ${itemText}</B><BR>`);
        
        // 如果有备注，显示备注
        if ('notes' in item && item.notes) {
          lines.push(`  ${item.notes}<BR>`);
        }
        
        // 项目之间添加空行
        lines.push('<BR>');
      }
    } else {
      // 如果没有菜品项目，添加空行保持模板结构
      console.warn('订单没有菜品项目:', order);
      lines.push('<BR>');
    }
    
    // 8. 如果是外卖订单，底部加上To Go字样加大字号
    if (order.status === 'takeaway' || ('orderType' in order && order.orderType === 'takeaway')) {
      lines.push(`${divider}<BR>`);
      lines.push('<FS>To Go</FS><BR>');
    }

    // 添加结束空行，确保严格遵守换行
    lines.push('<BR><BR>');
    
    const formattedContent = lines.join('');
    console.log('格式化后的打印内容:', formattedContent);
    
    return formattedContent;
  }

  /**
   * 发送API请求到飞鹅云
   * @param apiName API名称
   * @param params 请求参数
   * @returns API响应
   */
  public async callApi(apiName: string, params: Record<string, string>): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('飞鹅云打印服务配置不完整');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const requestParams = new URLSearchParams({
      user: this.user,
      stime: timestamp.toString(),
      sig: this.generateSign(timestamp),
      apiname: apiName,
      ...params
    });

    if (this.debug) {
      logger.info(`飞鹅云API请求 [${apiName}]:`, { url: this.apiUrl, params: Object.fromEntries(requestParams) });
    }

    try {
      const response = await axios.post(this.apiUrl, requestParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (this.debug) {
        logger.info(`飞鹅云API响应 [${apiName}]:`, response.data);
      }

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`飞鹅云API错误 [${apiName}]:`, error);
      throw new Error(`飞鹅云API请求错误: ${errorMessage}`);
    }
  }

  /**
   * 添加打印机
   * @param printerList 打印机信息列表，格式：SN#KEY#REMARK#CARNUM
   * @returns 添加结果
   */
  async addPrinters(printerList: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const response = await this.callApi('Open_printerAddlist', {
        printerContent: printerList
      });

      return {
        success: response.ret === 0,
        message: response.msg || '操作完成',
        data: response.data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        success: false,
        message: `添加打印机失败: ${errorMessage}`
      };
    }
  }

  /**
   * 打印订单
   * @param order 订单对象
   * @returns 打印结果
   */
  async printOrder(order: Order, options?: { priority?: 'high' | 'normal' }): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      // 先检查配置是否完整
      if (!this.isConfigured()) {
        console.error('飞鹅云配置不完整，无法打印');
        return { success: false, message: '打印机配置不完整' };
      }
      
      console.log(`[FeieyunService] 开始处理订单打印: ${order.orderNo || order.id}`);
      
      // 将订单项目分为饮品和食物两类
      const drinkItems = order.items.filter(item => 
        item.foodType === 'drink' || 
        ('type' in item && item.type === 'drink') || 
        ('volume' in item && item.volume)
      );
      
      const foodItems = order.items.filter(item => 
        item.foodType !== 'drink' && 
        !('type' in item && item.type === 'drink') && 
        !('volume' in item && item.volume)
      );
      
      console.log(`[FeieyunService] 订单项目分类: 饮品=${drinkItems.length}个, 食物=${foodItems.length}个`);
      
      let drinkPrintResult = { success: true, message: '无饮品订单项' };
      let foodPrintResult = { success: true, message: '无食物订单项' };
      
      // 如果有饮品，打印饮品单
      if (drinkItems.length > 0) {
        const drinkOrder = {...order, items: drinkItems};
        // 构造打印内容并添加饮品标识
        const drinkContent = await this.formatOrderContent(drinkOrder, '饮品');
        
        console.log(`[FeieyunService] 发送饮品打印请求到飞鹅云: SN=${this.printerSn}, 优先级=${options?.priority || 'normal'}`);
        drinkPrintResult = await this.callApi('Open_printMsg', {
          sn: this.printerSn,
          content: drinkContent,
          times: '1'
        });
        
        console.log(`[FeieyunService] 饮品打印结果:`, drinkPrintResult);
      }
      
      // 如果有食物，打印食物单
      if (foodItems.length > 0) {
        const foodOrder = {...order, items: foodItems};
        // 构造打印内容并添加食物标识
        const foodContent = await this.formatOrderContent(foodOrder, '食物');
        
        console.log(`[FeieyunService] 发送食物打印请求到飞鹅云: SN=${this.printerSn}, 优先级=${options?.priority || 'normal'}`);
        foodPrintResult = await this.callApi('Open_printMsg', {
          sn: this.printerSn,
          content: foodContent,
          times: '1'
        });
        
        console.log(`[FeieyunService] 食物打印结果:`, foodPrintResult);
      }
      
      // 综合两次打印结果
      const isSuccess = (drinkItems.length === 0 || (drinkPrintResult as any).ret === 0) && 
                        (foodItems.length === 0 || (foodPrintResult as any).ret === 0);
                        
      const message = [
        drinkItems.length > 0 ? `饮品打印: ${(drinkPrintResult as any).msg || '已处理'}` : '',
        foodItems.length > 0 ? `食物打印: ${(foodPrintResult as any).msg || '已处理'}` : ''
      ].filter(Boolean).join(', ');
      
      return {
        success: isSuccess,
        message: message || '打印命令已发送',
        data: {
          drinks: drinkPrintResult,
          foods: foodPrintResult
        }
      };
    } catch (error) {
      console.error('飞鹅云打印订单出错:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '打印失败，未知错误'
      };
    }
  }

  /**
   * 查询订单打印状态
   * @param orderId 订单ID
   * @returns 查询结果
   */
  async queryOrderState(orderId: string): Promise<{
    success: boolean;
    message: string;
    isPrinted?: boolean;
    data?: any;
  }> {
    try {
      const response = await this.callApi('Open_queryOrderState', {
        orderid: orderId
      });

      return {
        success: response.ret === 0,
        message: response.msg || '查询完成',
        isPrinted: response.data === true,
        data: response.data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        success: false,
        message: `查询订单状态失败: ${errorMessage}`
      };
    }
  }

  /**
   * 查询指定打印机某天的订单详情
   * @param date 日期，格式：yyyy-MM-dd
   * @param printerSn 打印机编号，不传则使用默认打印机
   * @returns 查询结果
   */
  async queryOrderInfoByDate(date: string, printerSn?: string): Promise<{
    success: boolean;
    message: string;
    print?: number;
    waiting?: number;
    data?: any;
  }> {
    try {
      const response = await this.callApi('Open_queryOrderInfoByDate', {
        sn: printerSn || this.printerSn,
        date: date
      });

      return {
        success: response.ret === 0,
        message: response.msg || '查询完成',
        print: response.data?.print,
        waiting: response.data?.waiting,
        data: response.data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        success: false,
        message: `查询打印机订单详情失败: ${errorMessage}`
      };
    }
  }

  /**
   * 查询打印机状态
   * @param printerSn 打印机编号，不传则使用默认打印机
   * @returns 查询结果
   */
  async queryPrinterStatus(printerSn?: string): Promise<{
    success: boolean;
    message: string;
    status?: string;
    data?: any;
  }> {
    try {
      const response = await this.callApi('Open_queryPrinterStatus', {
        sn: printerSn || this.printerSn
      });

      return {
        success: response.ret === 0,
        message: response.msg || '查询完成',
        status: response.data,
        data: response.data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return {
        success: false,
        message: `查询打印机状态失败: ${errorMessage}`
      };
    }
  }
} 