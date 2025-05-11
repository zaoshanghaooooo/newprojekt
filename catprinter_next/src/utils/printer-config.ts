/**
 * 打印机配置
 * 从环境变量加载打印机配置信息
 */

export const printerConfig = {
  // 飞鹅云配置
  feieyun: {
    // API地址，德国和中国区域地址不同
    url: process.env.FEIEYUN_URL || 'http://api.de.feieyun.com/Api/Open/',
    // 飞鹅云后台注册的账号名
    user: process.env.FEIEYUN_USER || '',
    // 飞鹅云登录后生成的UKEY
    ukey: process.env.FEIEYUN_UKEY || '',
    // 默认打印机编号，查看打印机底部标签获取
    sn: process.env.FEIEYUN_SN || '',
    // 打印联数
    copies: process.env.FEIEYUN_COPIES || '1',
  },
  
  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  
  // 调试模式
  debug: process.env.DEBUG === 'True',
  
  // API前缀
  apiPrefix: process.env.API_PREFIX || '/api',
  
  // 安全密钥
  secretKey: process.env.SECRET_KEY || 'default_secret_key',
  
  // 检查配置是否完整
  isConfigured: function() {
    return !!this.feieyun.user && !!this.feieyun.ukey && !!this.feieyun.sn;
  }
};

export default printerConfig; 