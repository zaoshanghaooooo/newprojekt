// 环境变量修复脚本
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// 读取.env文件
try {
  console.log('正在读取.env文件...');
  const envPath = join(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf8');
  
  // 解析环境变量
  const envConfig = dotenv.parse(envContent);
  console.log('环境变量解析结果:', {
    hasFeieyunUser: !!envConfig.FEIEYUN_USER,
    hasFeieyunUkey: !!envConfig.FEIEYUN_UKEY,
    hasFeieyunSn: !!envConfig.FEIEYUN_SN,
    hasFeieyunUrl: !!envConfig.FEIEYUN_URL
  });
  
  // 将环境变量内容写入runtime.env文件
  const runtimeEnvPath = join(process.cwd(), 'runtime.env');
  writeFileSync(runtimeEnvPath, envContent);
  console.log('已创建runtime.env文件');
  
  // 将环境变量设置到process.env
  Object.keys(envConfig).forEach(key => {
    process.env[key] = envConfig[key];
    console.log(`设置环境变量: ${key}`);
  });
  
  console.log('环境变量设置完成。');
} catch (error) {
  console.error('设置环境变量时出错:', error);
} 