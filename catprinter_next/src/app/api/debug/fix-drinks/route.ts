import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import logger from '@/utils/logger';

/**
 * 修复数据库中饮品类型的API端点
 * 将Type字段为"饮料"的菜品正确设置food_type、category和volume字段
 * 
 * GET /api/debug/fix-drinks
 */
export async function GET() {
  try {
    logger.info('开始修复饮品数据');
    
    // 1. 查询所有菜品
    const { data: allDishes, error: fetchError } = await supabaseAdmin
      .from('dishes')
      .select('*');
    
    if (fetchError) {
      logger.error('获取菜品数据失败', fetchError);
      return NextResponse.json({
        success: false,
        message: '获取菜品数据失败',
        error: fetchError.message
      }, { status: 500 });
    }

    // 2. 识别所有可能的饮品
    const potentialDrinks = allDishes.filter(dish => {
      // 1. 检查Menu分类是否是饮品相关
      const isDrinkCategory = dish.category && (
        dish.category.includes('Drink') || 
        dish.category.includes('drink') || 
        dish.category.includes('Soft') || 
        dish.category.includes('Tea') || 
        dish.category.includes('Bier') || 
        dish.category === '饮料'
      );
      
      // 2. 检查菜品名称是否包含饮品关键词
      const hasDrinkName = dish.name && (
        dish.name.includes('水') ||
        dish.name.includes('茶') ||
        dish.name.includes('酒') ||
        dish.name.includes('Beer') ||
        dish.name.includes('Cola') ||
        dish.name.includes('Drink')
      );
      
      // 3. 检查Type或food_type是否为饮品
      const hasDrinkType = 
        dish.type === 'drink' || 
        dish.food_type === 'drink' || 
        dish.type === '饮料' || 
        dish.food_type === '饮料';
      
      return isDrinkCategory || hasDrinkName || hasDrinkType;
    });
    
    logger.info(`找到 ${potentialDrinks.length} 个可能的饮品`);
    
    // 3. 修复这些饮品
    const updateResults = {
      total: potentialDrinks.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[]
    };
    
    for (const drink of potentialDrinks) {
      try {
        // 检查是否需要更新
        const needsUpdate = (
          drink.food_type !== 'drink' || 
          drink.category !== 'drink' ||
          !drink.volume || 
          drink.volume.trim() === ''
        );
        
        if (!needsUpdate) {
          updateResults.skipped++;
          continue;
        }
        
        // 更新饮品
        const { error: updateError } = await supabaseAdmin
          .from('dishes')
          .update({
            food_type: 'drink',
            type: 'drink',
            category: 'drink',
            volume: drink.volume || '标准' // 如果没有容量，设置默认值
          })
          .eq('id', drink.id);
        
        if (updateError) {
          throw new Error(`更新饮品失败: ${updateError.message}`);
        }
        
        updateResults.updated++;
        logger.info(`成功修复饮品: ${drink.name}`);
        
      } catch (error) {
        updateResults.failed++;
        updateResults.errors.push({
          drink: { id: drink.id, name: drink.name },
          error: error instanceof Error ? error.message : String(error)
        });
        logger.error(`修复饮品失败: ${drink.name}`, error);
      }
    }
    
    // 4. 返回结果
    return NextResponse.json({
      success: true,
      message: `已检查 ${updateResults.total} 个饮品，更新 ${updateResults.updated} 个，跳过 ${updateResults.skipped} 个，失败 ${updateResults.failed} 个`,
      results: updateResults
    });
    
  } catch (error) {
    logger.error('修复饮品过程中出错', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
      error: String(error)
    }, { status: 500 });
  }
} 