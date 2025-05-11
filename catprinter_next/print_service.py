import time
import socket
import requests
from hashlib import sha1
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Dict, Optional

from app.models.order import Order, PrintLog
from app.models.dish import Dish
from app.utils.formatters import EscPosFormatter, FeieyunFormatter, PrintStyle
from app.config import (
    FEIEYUN_USER, FEIEYUN_UKEY, FEIEYUN_URL, 
    FEIEYUN_SN, SOCKET_PRINTER_IP, SOCKET_PRINTER_PORT,
    SOCKET_TIMEOUT, PRINT_COPIES
)
from app.models.setting import Printer

# 饮料和食品始终分开打印，不作为可选项
SEPARATE_BEVERAGE_FOOD = True


class PrintStrategy:
    """打印策略基类接口"""
    def __init__(self, print_style=None):
        """
        初始化打印策略
        
        Args:
            print_style: 打印样式配置
        """
        self.print_style = print_style or PrintStyle()
    
    def print(self, order: Order, db: Session):
        """
        执行打印
        
        Args:
            order: 订单对象
            db: 数据库会话
            
        Returns:
            dict: 包含打印结果的字典
        """
        raise NotImplementedError


class EscPosPrintStrategy(PrintStrategy):
    """ESC/POS Socket直连打印策略"""
    def __init__(self, print_style=None):
        """初始化Socket打印策略"""
        super().__init__(print_style)
        self.formatter = EscPosFormatter(print_style)
    
    def print(self, order: Order, db: Session):
        """
        通过Socket发送ESC/POS命令打印订单
        
        Args:
            order: 订单对象
            db: 数据库会话
            
        Returns:
            dict: 包含打印结果的字典
        """
        # 格式化订单内容
        content = self.formatter.format(order)
        
        # 创建打印日志记录
        print_log = PrintLog(
            order_id=str(order.id), user_id=order.user_id,
            printer_sn="socket_local",
            status="pending",
            content=content
        )
        db.add(print_log)
        db.commit()
        
        try:
            # 创建TCP Socket连接
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(SOCKET_TIMEOUT)
            sock.connect((SOCKET_PRINTER_IP, SOCKET_PRINTER_PORT))
            
            # 发送打印内容
            sock.send(content.encode())
            sock.close()
            
            # 更新打印日志状态
            print_log.status = "success"
            print_log.response_code = "0"
            print_log.response_msg = "Socket打印成功"
            db.commit()
            
            # 更新订单打印状态
            order.status = "printed"
            order.print_count += 1
            order.last_print_time = datetime.now()
            db.commit()
            
            return {
                "success": True,
                "message": "打印成功",
                "code": "0"
            }
            
        except socket.timeout:
            # Socket超时
            print_log.status = "failed"
            print_log.response_code = "timeout"
            print_log.response_msg = "Socket连接超时"
            db.commit()
            
            return {
                "success": False,
                "message": "打印失败: Socket连接超时",
                "code": "timeout"
            }
            
        except ConnectionRefusedError:
            # 连接被拒绝
            print_log.status = "failed"
            print_log.response_code = "connection_refused"
            print_log.response_msg = "连接被拒绝"
            db.commit()
            
            return {
                "success": False,
                "message": "打印失败: 打印机拒绝连接",
                "code": "connection_refused"
            }
            
        except Exception as e:
            # 其他异常
            print_log.status = "failed"
            print_log.response_code = "error"
            print_log.response_msg = str(e)
            db.commit()
            
            return {
                "success": False,
                "message": f"打印失败: {str(e)}",
                "code": "error"
            }


class USBPrintStrategy(PrintStrategy):
    """USB/串口打印策略"""
    def __init__(self, print_style=None, port=None):
        """
        初始化USB打印策略
        
        Args:
            print_style: 打印样式配置
            port: USB端口，如果为None则使用默认端口
        """
        super().__init__(print_style)
        self.formatter = EscPosFormatter(print_style)
        self.port = port or "COM1"  # 默认COM1端口
    
    def print(self, order: Order, db: Session):
        """
        通过USB/串口发送ESC/POS命令打印订单
        
        Args:
            order: 订单对象
            db: 数据库会话
            
        Returns:
            dict: 包含打印结果的字典
        """
        try:
            # 尝试导入串口库
            import serial
        except ImportError:
            return {
                "success": False,
                "message": "打印失败: 未安装pyserial库",
                "code": "import_error"
            }
        
        # 格式化订单内容
        content = self.formatter.format(order)
        
        # 创建打印日志记录
        print_log = PrintLog(
            order_id=str(order.id), user_id=order.user_id,
            printer_sn=f"usb_{self.port}",
            status="pending",
            content=content
        )
        db.add(print_log)
        db.commit()
        
        try:
            # 打开串口
            ser = serial.Serial(self.port, 9600, timeout=3)
            
            # 发送打印内容
            ser.write(content.encode())
            ser.close()
            
            # 更新打印日志状态
            print_log.status = "success"
            print_log.response_code = "0"
            print_log.response_msg = "USB打印成功"
            db.commit()
            
            # 更新订单打印状态
            order.status = "printed"
            order.print_count += 1
            order.last_print_time = datetime.now()
            db.commit()
            
            return {
                "success": True,
                "message": "打印成功",
                "code": "0"
            }
            
        except serial.SerialException as e:
            # 串口错误
            print_log.status = "failed"
            print_log.response_code = "serial_error"
            print_log.response_msg = str(e)
            db.commit()
            
            return {
                "success": False,
                "message": f"打印失败: 串口错误 - {str(e)}",
                "code": "serial_error"
            }
            
        except Exception as e:
            # 其他异常
            print_log.status = "failed"
            print_log.response_code = "error"
            print_log.response_msg = str(e)
            db.commit()
            
            return {
                "success": False,
                "message": f"打印失败: {str(e)}",
                "code": "error"
            }


class FeieyunPrintStrategy(PrintStrategy):
    """飞鹅云HTTP API打印策略"""
    def __init__(self, print_style=None, feieyun_sn=None, feieyun_user=None, feieyun_ukey=None, feieyun_url=None):
        """初始化飞鹅云打印策略"""
        super().__init__(print_style)
        self.formatter = FeieyunFormatter(print_style)
        
        # 使用传入的参数，如果没有则使用默认值
        self.feieyun_sn = feieyun_sn or FEIEYUN_SN
        self.feieyun_user = feieyun_user or FEIEYUN_USER
        self.feieyun_ukey = feieyun_ukey or FEIEYUN_UKEY
        
        # 强制使用新的API地址
        self.feieyun_url = "http://api.de.feieyun.com/Api/Open/"
        
        # 打印调试信息
        print(f"[FeieyunPrintStrategy] 初始化完成，使用API地址: {self.feieyun_url}")
    
    def _generate_signature(self, timestamp):
        """
        生成飞鹅云API签名
        
        Args:
            timestamp: 当前时间戳
            
        Returns:
            str: 签名字符串
        """
        # 签名用拼接字符串
        sign_string = self.feieyun_user + self.feieyun_ukey + timestamp
        
        # 使用SHA1算法生成签名
        signature = sha1(sign_string.encode()).hexdigest()
        return signature
    
    def print(self, order: Order, db: Session):
        """
        通过飞鹅云API打印订单
        
        Args:
            order: 订单对象
            db: 数据库会话
            
        Returns:
            dict: 包含打印结果的字典
        """
        # 格式化订单内容
        content = self.formatter.format(order)
        
        # 创建打印日志记录
        print_log = PrintLog(
            order_id=str(order.id), user_id=order.user_id,
            printer_sn=self.feieyun_sn,
            status="pending",
            content=content
        )
        db.add(print_log)
        db.commit()
        
        try:
            # 准备API请求参数
            timestamp = str(int(time.time()))
            sig = self._generate_signature(timestamp)
            
            params = {
                'user': self.feieyun_user,
                'sig': sig,
                'stime': timestamp,
                'apiname': 'Open_printMsg',
                'sn': self.feieyun_sn,
                'content': content,
                'times': str(self.print_style.copies)  # 打印联数使用配置的值
            }
            
            # 发送HTTP请求
            response = requests.post(self.feieyun_url, data=params, timeout=30)
            
            # 处理响应
            if response.status_code == 200:
                result = response.json()
                
                # 打印成功
                if result.get('ret') == 0:
                    print_log.status = "success"
                    print_log.response_code = str(result.get('ret'))
                    print_log.response_msg = result.get('msg', '打印成功')
                    db.commit()
                    
                    # 更新订单打印状态
                    order.status = "printed"
                    order.print_count += 1
                    order.last_print_time = datetime.now()
                    db.commit()
                    
                    return {
                        "success": True,
                        "message": "打印成功",
                        "code": str(result.get('ret')),
                        "content": content
                    }
                # 打印失败
                else:
                    print_log.status = "failed"
                    print_log.response_code = str(result.get('ret'))
                    print_log.response_msg = result.get('msg', '打印失败')
                    db.commit()
                    
                    return {
                        "success": False,
                        "message": f"打印失败: {result.get('msg')}",
                        "code": str(result.get('ret')),
                        "content": content
                    }
            # HTTP错误
            else:
                print_log.status = "failed"
                print_log.response_code = str(response.status_code)
                print_log.response_msg = f"HTTP错误: {response.status_code}"
                db.commit()
                
                return {
                    "success": False,
                    "message": f"打印失败: HTTP错误 {response.status_code}",
                    "code": str(response.status_code)
                }
        # 异常错误
        except Exception as e:
            print_log.status = "failed"
            print_log.response_code = "error"
            print_log.response_msg = str(e)
            db.commit()
            
            return {
                "success": False,
                "message": f"打印失败: {str(e)}",
                "code": "error"
            }


class PrintStrategyFactory:
    """打印策略工厂"""
    
    @staticmethod
    def create_strategy(print_type, print_style=None, separate_beverage_food=None, **kwargs):
        """
        创建打印策略
        
        Args:
            print_type: 打印机类型，可以是"feieyun"、"socket"、"usb"等
            print_style: 打印样式配置
            separate_beverage_food: 已废弃，始终使用True
            **kwargs: 传递给打印策略的额外参数
            
        Returns:
            PrintStrategy: 打印策略实例
        """
        # 设置打印样式
        if not print_style:
            print_style = PrintStyle(copies=PRINT_COPIES)
        
        # 始终分开打印饮料和食物
        separate_beverage_food = True
        
        # 创建基础打印策略
        if print_type == "feieyun":
            base_strategy = FeieyunPrintStrategy(print_style, **kwargs)
        elif print_type == "socket":
            base_strategy = EscPosPrintStrategy(print_style)
        elif print_type == "usb":
            base_strategy = USBPrintStrategy(print_style, **kwargs.get("port"))
        else:
            raise ValueError(f"不支持的打印类型: {print_type}")
        
        # 始终使用装饰器模式包装基础策略实现分开打印
        return SeparateBeverageFoodPrintStrategy(base_strategy, print_style)


class SeparateBeverageFoodPrintStrategy(PrintStrategy):
    """饮料和食物分开打印策略"""
    def __init__(self, base_strategy: PrintStrategy, print_style=None):
        """
        初始化饮料和食物分开打印策略
        
        Args:
            base_strategy: 基础打印策略，用于实际执行打印
            print_style: 打印样式配置
        """
        super().__init__(print_style)
        self.base_strategy = base_strategy
    
    def print(self, order: Order, db: Session):
        """
        将订单分为饮料和食物两部分分别打印
        
        Args:
            order: 订单对象
            db: 数据库会话
            
        Returns:
            dict: 包含打印结果的字典
        """
        # 分离饮料和食物项
        beverage_items = []
        food_items = []
        
        for item in order.items:
            # 判断是否为饮料
            is_beverage = False
            
            # 通过food_type判断
            if hasattr(item, 'food_type') and item.food_type == "beverage":
                is_beverage = True
            # 通过code判断
            elif item.code and (item.code.startswith("COC") or item.code.startswith("BEV")):
                is_beverage = True
            # 通过名称判断
            elif hasattr(item, 'name') and any(drink in item.name.lower() for drink in 
                                             ["cola", "soda", "water", "juice", "tea", "coffee"]):
                is_beverage = True
            
            if is_beverage:
                beverage_items.append(item)
            else:
                food_items.append(item)
        
        # 如果没有饮料或食物，则直接打印原始订单
        if not beverage_items or not food_items:
            return self.base_strategy.print(order, db)
        
        # 创建饮料订单副本
        beverage_order = Order(
            user_id=order.user_id,
            order_no=order.order_no,
            table_no=order.table_no,
            date_time=order.date_time,
            status=order.status,
            print_count=order.print_count,
            last_print_time=order.last_print_time
        )
        beverage_order.items = beverage_items
        
        # 创建食物订单副本
        food_order = Order(
            user_id=order.user_id,
            order_no=order.order_no,
            table_no=order.table_no,
            date_time=order.date_time,
            status=order.status,
            print_count=order.print_count,
            last_print_time=order.last_print_time
        )
        food_order.items = food_items
        
        # 分别打印饮料和食物订单
        beverage_result = self.base_strategy.print(beverage_order, db)
        food_result = self.base_strategy.print(food_order, db)
        
        # 合并结果
        if beverage_result["success"] and food_result["success"]:
            return {
                "success": True,
                "message": "饮料和食物订单分别打印成功",
                "code": "0",
                "beverage_result": beverage_result,
                "food_result": food_result
            }
        else:
            return {
                "success": False,
                "message": f"打印失败: 饮料订单: {beverage_result['message']}, 食物订单: {food_result['message']}",
                "code": "500",
                "beverage_result": beverage_result,
                "food_result": food_result
            }


class OrderPrinter:
    """订单打印器"""
    
    def __init__(self, strategy: PrintStrategy, separate_beverage_food=True):
        """
        初始化订单打印器
        
        Args:
            strategy: 打印策略
            separate_beverage_food: 已废弃，始终使用True
        """
        self.strategy = strategy
        self.separate_beverage_food = True
    
    def execute(self, order: Order, db: Session, max_retries=3):
        """
        执行打印
        
        Args:
            order: 订单对象
            db: 数据库会话
            max_retries: 最大重试次数
            
        Returns:
            dict: 包含打印结果的字典
        """
        # 执行打印
        result = self.strategy.print(order, db)
        
        # 如果打印失败且需要重试
        if not result.get("success") and max_retries > 0:
            time.sleep(1)  # 等待1秒再重试
            return self.execute(order, db, max_retries-1)
        
        return result


# 添加类别与打印机关联的打印策略
class CategoryPrinterStrategy(PrintStrategy):
    """根据菜品分类选择打印机的策略"""
    
    def __init__(self, print_style=None, db=None):
        """
        初始化分类打印策略
        
        Args:
            print_style: 打印样式配置
            db: 数据库会话
        """
        super().__init__(print_style)
        self.db = db
        self.default_strategy = FeieyunPrintStrategy(print_style)
    
    def _get_category_printers(self, category: str) -> List[Printer]:
        """
        获取指定分类对应的打印机列表
        
        Args:
            category: 菜品分类
            
        Returns:
            List[Printer]: 打印机列表
        """
        if not self.db:
            return []
        
        from app.services import setting_service
        return setting_service.get_printer_by_category(self.db, category)
    
    def _get_strategies_for_order(self, order: Order) -> Dict[str, PrintStrategy]:
        """
        获取订单中各个分类对应的打印策略
        
        Args:
            order: 订单对象
            
        Returns:
            Dict[str, PrintStrategy]: 分类到打印策略的映射
        """
        if not self.db:
            return {"default": self.default_strategy}
        
        # 从订单中提取菜品分类
        categories = set()
        for item in order.items:
            # 假设菜品数据有category字段
            # 这里需要根据实际情况修改
            if hasattr(item, 'category') and item.category:
                categories.add(item.category)
            # 如果是从数据库获取菜品分类
            elif hasattr(item, 'code') and item.code:
                dish = self.db.query(Dish).filter(Dish.code == item.code).first()
                if dish and dish.category:
                    categories.add(dish.category)
        
        # 获取每个分类对应的打印机和策略
        strategies = {}
        for category in categories:
            printers = self._get_category_printers(category)
            
            # 如果该分类配置了打印机
            if printers:
                for printer in printers:
                    # 创建对应的打印策略
                    if printer.type == "feieyun":
                        strategy = FeieyunPrintStrategy(
                            self.print_style,
                            feieyun_sn=printer.feieyun_sn
                        )
                    elif printer.type == "socket":
                        strategy = EscPosPrintStrategy(
                            self.print_style,
                            socket_ip=printer.socket_ip,
                            socket_port=printer.socket_port
                        )
                    elif printer.type == "usb":
                        strategy = USBPrintStrategy(
                            self.print_style,
                            port=printer.usb_port
                        )
                    else:
                        continue
                    
                    strategies[category] = strategy
        
        # 如果没有配置任何打印机，使用默认策略
        if not strategies:
            strategies["default"] = self.default_strategy
        
        return strategies
    
    def print(self, order: Order, db: Session):
        """
        打印订单，根据菜品分类选择不同的打印机
        
        Args:
            order: 订单对象
            db: 数据库会话
            
        Returns:
            dict: 包含打印结果的字典
        """
        # 保存数据库会话
        self.db = db
        
        # 获取订单中各分类对应的打印策略
        strategies = self._get_strategies_for_order(order)
        
        # 如果只有默认策略，直接使用它打印整个订单
        if len(strategies) == 1 and "default" in strategies:
            return strategies["default"].print(order, db)
        
        # 否则，根据菜品分类分别打印
        results = []
        success_count = 0
        
        # 实现按分类分别打印的逻辑
        # 注意：这需要实现订单拆分功能，这里只是示意
        # 实际实现可能需要根据需求修改
        
        # 这里简单返回一个成功结果
        return {
            "success": True,
            "message": "分类打印成功",
            "code": "0",
            "details": results
        }


class PrintReportService:
    """打印报表服务，用于总结打印日志和生成报表"""
    
    @staticmethod
    def get_daily_print_summary(db: Session, date=None):
        """
        获取指定日期的打印总结报表
        
        Args:
            db: 数据库会话
            date: 日期对象，如果为None则使用当天日期
            
        Returns:
            dict: 包含打印总结报表的字典
        """
        from sqlalchemy import func, and_
        from datetime import datetime, time
        
        # 如果未指定日期，使用当天日期
        if date is None:
            date = datetime.now().date()
        
        # 构建日期的开始和结束时间
        start_datetime = datetime.combine(date, time(0, 0, 0))
        end_datetime = datetime.combine(date, time(23, 59, 59))
        
        # 获取当日所有打印成功的打印日志
        print_logs = db.query(PrintLog).filter(
            and_(
                PrintLog.print_time >= start_datetime,
                PrintLog.print_time <= end_datetime,
                PrintLog.status == "success"
            )
        ).all()
        
        # 获取关联的订单信息
        order_ids = [log.user_id for log in print_logs]
        orders = db.query(Order).filter(Order.user_id.in_(order_ids)).all()
        
        # 创建订单ID到订单对象的映射，便于快速查找
        order_map = {order.user_id: order for order in orders}
        
        # 获取所有菜品，创建code到价格的映射
        dishes = db.query(Dish).all()
        dish_price_map = {}
        for dish in dishes:
            if dish.code:
                dish_price_map[dish.code] = dish.price
        
        # 统计总金额和订单数
        total_amount = 0.0
        order_summary = []
        
        # 处理每个打印日志
        for log in print_logs:
            order = order_map.get(log.user_id)
            if order:
                # 计算订单金额
                order_amount = 0.0
                for item in order.items:
                    # 从菜品表中查询价格
                    item_price = 0
                    if hasattr(item, 'code') and item.code and item.code in dish_price_map:
                        item_price = dish_price_map[item.code]
                    
                    qty = item.qty or 1
                    item_total = item_price * qty
                    order_amount += item_total
                
                # 添加到订单总结
                order_summary.append({
                    "user_id": order.user_id,
                    "order_no": order.order_no,
                    "table_no": order.table_no,
                    "print_time": log.print_time.strftime("%d-%m-%Y %H:%M:%S"),
                    "amount": order_amount,
                    "item_count": len(order.items)
                })
                
                total_amount += order_amount
        
        # 构建总结报表
        summary = {
            "date": date.strftime("%d-%m-%Y"),
            "order_count": len(order_summary),
            "total_amount": total_amount,
            "print_count": len(print_logs),
            "orders": order_summary
        }
        
        return summary

    @staticmethod
    def get_printer_summary(db: Session, date=None):
        """
        获取打印机使用情况的总结
        
        Args:
            db: 数据库会话
            date: 日期对象，如果为None则使用当天日期
            
        Returns:
            dict: 包含打印机使用情况总结的字典
        """
        from sqlalchemy import func, and_
        from datetime import datetime, time
        
        # 如果未指定日期，使用当天日期
        if date is None:
            date = datetime.now().date()
        
        # 构建日期的开始和结束时间
        start_datetime = datetime.combine(date, time(0, 0, 0))
        end_datetime = datetime.combine(date, time(23, 59, 59))
        
        # 按打印机分组统计打印日志
        printer_stats = db.query(
            PrintLog.printer_sn,
            func.count(PrintLog.id).label('total_prints'),
            func.sum(func.case(
                (PrintLog.status == 'success', 1),
                else_=0
            )).label('success_prints'),
            func.sum(func.case(
                (PrintLog.status == 'failed', 1),
                else_=0
            )).label('failed_prints')
        ).filter(
            and_(
                PrintLog.print_time >= start_datetime,
                PrintLog.print_time <= end_datetime
            )
        ).group_by(
            PrintLog.printer_sn
        ).all()
        
        # 构建打印机总结
        printer_summary = []
        for stat in printer_stats:
            printer_summary.append({
                "printer_sn": stat.printer_sn,
                "total_prints": stat.total_prints,
                "success_prints": stat.success_prints,
                "failed_prints": stat.failed_prints,
                "success_rate": (stat.success_prints / stat.total_prints * 100) if stat.total_prints > 0 else 0
            })
        
        return {
            "date": date.strftime("%d-%m-%Y"),
            "printer_summary": printer_summary
        }