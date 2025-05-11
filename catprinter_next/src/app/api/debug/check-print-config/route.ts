import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

interface Issue {
  id: string;
  description: string;
  solution: string;
  severity: string;
}

/**
 * 检查打印配置的API接口
 * GET /api/debug/check-print-config
 */
export async function GET(request: NextRequest) {
  try {
    const results: any = {};
    
    // 1. 检查菜品分类
    const { data: dishes, error: dishError } = await supabase
      .from('dishes')
      .select('*');
      
    if (dishError) {
      return NextResponse.json({ 
        success: false, 
        error: '获取菜品数据失败', 
        details: dishError 
      }, { status: 500 });
    }
    
    // 分析菜品分类情况
    const drinkTypes = ['drink', 'beverage'];
    const drinks = dishes.filter((dish: any) => {
      return drinkTypes.includes(dish.food_type) || 
             drinkTypes.includes(dish.type) ||
             (dish.food_type && dish.food_type.toLowerCase().includes('drink')) ||
             (dish.code && (dish.code.startsWith('BEV') || dish.code.startsWith('COC')));
    });
    
    const foods = dishes.filter((dish: any) => !drinks.includes(dish));
    
    // 检查是否有未正确分类的菜品
    const uncategorized = dishes.filter((dish: any) => 
      !dish.food_type && !dish.type && (!dish.code || (!dish.code.startsWith('BEV') && !dish.code.startsWith('COC')))
    );
    
    results.dishes = {
      total: dishes.length,
      drinks: drinks.length,
      foods: foods.length,
      uncategorized: uncategorized.length,
      drinksList: drinks.map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        food_type: d.food_type,
        type: d.type
      })),
      uncategorizedList: uncategorized.map((d: any) => ({
        id: d.id,
        name: d.name
      }))
    };
    
    // 2. 检查打印机配置
    const { data: printers, error: printerError } = await supabase
      .from('printers')
      .select('*');
      
    if (printerError) {
      return NextResponse.json({ 
        success: false, 
        error: '获取打印机数据失败', 
        details: printerError 
      }, { status: 500 });
    }
    
    // 检查打印机分类
    const drinkPrinters = printers.filter((p: any) => 
      p.category === 'drink' || p.category === 'beverage'
    );
    
    const foodPrinters = printers.filter((p: any) => p.category === 'food');
    const defaultPrinters = printers.filter((p: any) => p.isDefault === true);
    
    results.printers = {
      total: printers.length,
      drinks: drinkPrinters.length,
      foods: foodPrinters.length,
      defaults: defaultPrinters.length,
      drinksList: drinkPrinters.map((p: any) => ({
        id: p.id,
        name: p.name,
        sn: p.sn,
        type: p.type,
        isDefault: p.isDefault
      })),
      foodsList: foodPrinters.map((p: any) => ({
        id: p.id,
        name: p.name,
        sn: p.sn,
        type: p.type,
        isDefault: p.isDefault
      })),
      defaultsList: defaultPrinters.map((p: any) => ({
        id: p.id,
        name: p.name,
        sn: p.sn,
        type: p.type,
        category: p.category
      }))
    };
    
    // 3. 检查系统设置
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['separate_beverage_food', 'print_type']);
      
    if (settingsError) {
      return NextResponse.json({ 
        success: false, 
        error: '获取系统设置失败', 
        details: settingsError 
      }, { status: 500 });
    }
    
    results.settings = {
      list: settings,
      hasSeparateSettings: settings.some((s: any) => s.key === 'separate_beverage_food')
    };
    
    // 4. 问题诊断
    const issues: Issue[] = [];
    
    if (uncategorized.length > 0) {
      issues.push({
        id: 'uncategorized_dishes',
        description: `存在${uncategorized.length}个未分类的菜品，可能导致分类错误`,
        solution: '更新这些菜品，添加正确的food_type字段 (食物设为"food"，饮品设为"drink")',
        severity: 'high'
      });
    }
    
    if (drinkPrinters.length === 0 && foodPrinters.length === 0) {
      issues.push({
        id: 'no_category_printers',
        description: '未设置专用食物/饮品打印机',
        solution: '在设置→打印机中，为打印机分配正确的类别 (饮品打印机设置category为"drink"，食物打印机设置category为"food")',
        severity: 'high'
      });
    }
    
    const separateSettingExists = settings.some((s: any) => s.key === 'separate_beverage_food');
    if (!separateSettingExists) {
      issues.push({
        id: 'missing_separate_setting',
        description: '未找到分开打印设置配置',
        solution: '添加系统设置: key: separate_beverage_food, value: true',
        severity: 'medium'
      });
    }
    
    results.issues = issues;
    
    // 5. 返回结果
    return NextResponse.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    logger.error('检查打印配置失败', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
      error
    }, { status: 500 });
  }
} 