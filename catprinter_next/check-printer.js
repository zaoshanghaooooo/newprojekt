// 检查打印机配置
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 使用绝对路径加载.env文件
const envPath = path.resolve(__dirname, '.env');
console.log('加载环境变量文件:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('加载.env文件出错:', result.error);
} else {
  console.log('成功加载.env文件');
}

console.log('==== 环境变量检查 ====');
console.log('FEIEYUN_URL:', process.env.FEIEYUN_URL);
console.log('FEIEYUN_USER:', process.env.FEIEYUN_USER);
console.log('FEIEYUN_UKEY:', process.env.FEIEYUN_UKEY);
console.log('FEIEYUN_SN:', process.env.FEIEYUN_SN);
console.log('DEBUG:', process.env.DEBUG);

// 检查next.config.js中的env配置
try {
  const nextConfigPath = path.resolve(__dirname, 'next.config.js');
  console.log('\n读取next.config.js:', nextConfigPath);
  
  // 读取文件内容
  const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
  console.log('\n==== next.config.js env部分内容 ====');
  
  // 提取env部分
  const envMatch = nextConfigContent.match(/env\s*:\s*{([^}]*)}/s);
  if (envMatch && envMatch[1]) {
    console.log(envMatch[0]);
  } else {
    console.log('未找到env配置部分');
  }
} catch (error) {
  console.error('无法读取next.config.js文件:', error);
}

// 加载printer-config
try {
  const printerConfigPath = path.resolve(__dirname, 'src/utils/printer-config.ts');
  console.log('\n读取printer-config.ts:', printerConfigPath);
  
  const printerConfigContent = fs.readFileSync(printerConfigPath, 'utf8');
  console.log('\n==== printer-config.ts 文件内容 ====');
  console.log(printerConfigContent);
} catch (error) {
  console.error('无法读取printer-config.ts文件:', error);
}

console.log('\n==== 配置是否完整 ====');
console.log('FEIEYUN配置完整:', 
  !!process.env.FEIEYUN_USER && 
  !!process.env.FEIEYUN_UKEY && 
  !!process.env.FEIEYUN_SN
); 