import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import logger from '@/utils/logger';

interface CSVDish {
  Menu: string;
  Numeration: string;
  'Name (de)': string;
  'Name (en)': string;
  'Name (zh)': string;
  'Description (de)': string;
  'Description (en)': string;
  'Description (zh)': string;
  Remarks: string;
  'Price (€)': string;
  Type: string;
}

/**
 * 从CSV导入菜品数据API
 * POST /api/dishes/import-csv
 */
export async function POST(request: NextRequest) {
  try {
    const { csvContent } = await request.json();
    
    if (!csvContent) {
      return NextResponse.json(
        { success: false, message: '请提供CSV内容' },
        { status: 400 }
      );
    }
    
    // 解析CSV内容 - 使用简单的解析方式，不使用额外的库
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''));
    
    // 构建记录数组
    const records: CSVDish[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // 跳过空行
      
      const values = lines[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
      const record: any = {};
      
      headers.forEach((header: string, index: number) => {
        record[header] = values[index] || '';
      });
      
      records.push(record as CSVDish);
    }
    
    logger.info(`解析CSV内容，共找到${records.length}条记录`);
    
    // 过滤掉Menu为"muell"的记录（垃圾/测试记录）
    const validRecords = records.filter(record => record.Menu !== 'muell');
    logger.info(`过滤后剩余${validRecords.length}条有效记录`);
    
    // 存储导入结果
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
      createdDishes: [] as any[]
    };
    
    // 批量处理记录
    for (const record of validRecords) {
      try {
        // 检查是否为饮料类型
        const isDrink = record.Type === '饮料';
        
        logger.info(`处理菜品: ${record['Name (de)']}，类型: ${record.Type}，是否饮品: ${isDrink}`);

        // 准备基本的菜品数据
        const dishData = {
          name: record['Name (de)'],
          code: record.Numeration || '', // 使用Numeration作为菜品编码
          price: parseFloat(record['Price (€)'].replace(',', '.')) || 0, // 确保价格是数字
          category: isDrink ? 'drink' : (record.Menu || '未分类'),
          description: record['Description (de)'] || '',
          food_type: isDrink ? 'drink' : 'food', // 根据Type确定food_type
          type: isDrink ? 'drink' : 'food',  // 同时设置type字段
          volume: isDrink ? '标准' : null, // 饮料类型设置默认容量
          capacity: isDrink ? '标准' : null, // 同时设置capacity字段
          is_active: true
        };
        
        // 添加其他语言的名称和描述到JSON字段
        const additionalData = {
          name_en: record['Name (en)'] || '',
          name_zh: record['Name (zh)'] || '',
          description_en: record['Description (en)'] || '',
          description_zh: record['Description (zh)'] || '',
          remarks: record.Remarks || ''
        };
        
        // 检查是否已存在同名或同编码的菜品
        const { data: existingDish, error: checkError } = await supabaseAdmin
          .from('dishes')
          .select('id, name, code')
          .or(`name.eq."${dishData.name}",code.eq."${dishData.code}"`)
          .limit(1);
        
        if (checkError) {
          throw new Error(`检查菜品是否存在时出错: ${checkError.message}`);
        }
        
        if (existingDish && existingDish.length > 0) {
          // 已存在同名或同编码的菜品，进行更新
          const { data: updatedDish, error: updateError } = await supabaseAdmin
            .from('dishes')
            .update({
              ...dishData,
              sub_items: additionalData
            })
            .eq('id', existingDish[0].id)
            .select();
          
          if (updateError) {
            throw new Error(`更新菜品失败: ${updateError.message}`);
          }
          
          results.success++;
          results.createdDishes.push(updatedDish);
          logger.info(`更新现有菜品: ${dishData.name}, 饮品状态: ${isDrink ? '是饮品' : '非饮品'}`);
        } else {
          // 不存在同名或同编码的菜品，创建新菜品
          const { data: newDish, error: createError } = await supabaseAdmin
            .from('dishes')
            .insert({
              ...dishData,
              sub_items: additionalData
            })
            .select();
          
          if (createError) {
            // 如果创建失败，记录错误
            throw new Error(`创建菜品失败: ${createError.message}`);
          }
          
          results.success++;
          results.createdDishes.push(newDish);
          logger.info(`创建新菜品: ${dishData.name}, 饮品状态: ${isDrink ? '是饮品' : '非饮品'}`);
        }
      } catch (error) {
        // 记录导入失败的记录
        results.failed++;
        results.errors.push({
          record,
          error: error instanceof Error ? error.message : String(error)
        });
        logger.error(`导入菜品失败: ${record['Name (de)']}`, error);
      }
    }
    
    logger.info(`CSV导入完成: 成功=${results.success}, 失败=${results.failed}, 跳过=${results.skipped}`);
    
    return NextResponse.json({
      success: true,
      message: `已成功导入${results.success}个菜品，${results.failed}个失败，${results.skipped}个跳过`,
      results
    });
    
  } catch (error) {
    logger.error('CSV导入处理失败', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '未知错误',
      error: String(error)
    }, { status: 500 });
  }
} 