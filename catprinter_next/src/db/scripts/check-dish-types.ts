import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * 检查菜品分类和打印机配置
 */
async function checkDishTypesAndPrinters() {
  try {
    console.log('===== 开始检查菜品分类和打印机配置 =====');
    
    // 1. 获取所有菜品
    console.log('\n【1】检查菜品分类:');
    const { data: dishes, error: dishError } = await supabase
      .from('dishes')
      .select('*');
      
    if (dishError) {
      console.error('获取菜品失败:', dishError);
      return;
    }
    
    console.log(`共找到 ${dishes.length} 个菜品`);
    
    // 分析菜品分类情况
    const drinkTypes = ['drink', 'beverage'];
    const drinks = dishes.filter(dish => {
      return drinkTypes.includes(dish.food_type) || 
             drinkTypes.includes(dish.type) ||
             (dish.food_type && dish.food_type.toLowerCase().includes('drink')) ||
             (dish.code && (dish.code.startsWith('BEV') || dish.code.startsWith('COC')));
    });
    
    const foods = dishes.filter(dish => !drinks.includes(dish));
    
    console.log(`饮品: ${drinks.length}个, 食物: ${foods.length}个`);
    console.log('\n饮品列表:');
    drinks.forEach(drink => {
      console.log(`- ${drink.name} (code: ${drink.code || '无'}, food_type: ${drink.food_type || '无'}, type: ${drink.type || '无'})`);
    });
    
    // 检查是否有未正确分类的菜品
    const uncategorized = dishes.filter(dish => 
      !dish.food_type && !dish.type && (!dish.code || (!dish.code.startsWith('BEV') && !dish.code.startsWith('COC')))
    );
    
    if (uncategorized.length > 0) {
      console.log('\n警告: 以下菜品缺少分类信息:');
      uncategorized.forEach(dish => {
        console.log(`- ${dish.name} (ID: ${dish.id})`);
      });
    }
    
    // 2. 检查打印机配置
    console.log('\n【2】检查打印机配置:');
    const { data: printers, error: printerError } = await supabase
      .from('printers')
      .select('*');
      
    if (printerError) {
      console.error('获取打印机失败:', printerError);
      return;
    }
    
    console.log(`共找到 ${printers.length} 台打印机`);
    
    // 检查打印机分类
    const drinkPrinters = printers.filter(p => 
      p.category === 'drink' || p.category === 'beverage'
    );
    
    const foodPrinters = printers.filter(p => p.category === 'food');
    const defaultPrinters = printers.filter(p => p.isDefault === true);
    
    console.log(`饮品打印机: ${drinkPrinters.length}台`);
    drinkPrinters.forEach(p => {
      console.log(`- ${p.name} (SN: ${p.sn}, 类型: ${p.type}, 默认: ${p.isDefault ? '是' : '否'})`);
    });
    
    console.log(`食物打印机: ${foodPrinters.length}台`);
    foodPrinters.forEach(p => {
      console.log(`- ${p.name} (SN: ${p.sn}, 类型: ${p.type}, 默认: ${p.isDefault ? '是' : '否'})`);
    });
    
    console.log(`默认打印机: ${defaultPrinters.length}台`);
    defaultPrinters.forEach(p => {
      console.log(`- ${p.name} (SN: ${p.sn}, 类型: ${p.type}, 类别: ${p.category || '无'})`);
    });
    
    // 3. 检查系统设置
    console.log('\n【3】检查系统设置:');
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['separate_beverage_food', 'print_type']);
      
    if (settingsError) {
      console.error('获取系统设置失败:', settingsError);
      return;
    }
    
    console.log('分类打印相关设置:');
    settings.forEach(setting => {
      console.log(`- ${setting.key}: ${setting.value}`);
    });
    
    const separateSettingExists = settings.some(s => s.key === 'separate_beverage_food');
    if (!separateSettingExists) {
      console.log('警告: 未找到分开打印设置，系统默认使用 separateBeverageFood = true');
    }
    
    console.log('\n===== 检查完成 =====');
    
    // 4. 提供解决方案建议
    console.log('\n【4】问题诊断和解决方案:');
    
    if (uncategorized.length > 0) {
      console.log('\n问题1: 存在未分类的菜品，可能导致分类错误');
      console.log('解决方案: 更新这些菜品，添加正确的food_type字段:');
      console.log('  食物设为 "food"，饮品设为 "drink"');
    }
    
    if (drinkPrinters.length === 0 && foodPrinters.length === 0) {
      console.log('\n问题2: 未设置专用食物/饮品打印机');
      console.log('解决方案: 在设置→打印机中，为打印机分配正确的类别:');
      console.log('  饮品打印机设置category为"drink"');
      console.log('  食物打印机设置category为"food"');
    }
    
    if (!separateSettingExists) {
      console.log('\n问题3: 未找到分开打印设置配置');
      console.log('解决方案: 添加系统设置:');
      console.log('  key: separate_beverage_food, value: true');
    }
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  }
}

// 执行检查
checkDishTypesAndPrinters().catch(console.error); 