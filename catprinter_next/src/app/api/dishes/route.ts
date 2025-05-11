import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { dbAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    console.log('开始获取菜品列表...');
    
    // 使用管理员客户端查询，绕过RLS
    // 只获取is_active为true的菜品
    const { data, error } = await dbAdmin.dishes.list().eq('is_active', true);
    
    if (error) {
      console.error('获取菜品失败:', error);
      throw error;
    }
    
    // 数据转换和清理
    const formattedData = data.map(dish => {
      console.log(`处理菜品: ${dish.name}, food_type=${dish.food_type}, volume=${dish.volume}`);
      
      // 确定饮品类型
      let isDrink = false;
      
      // 首先检查明确的类型字段
      if (dish.food_type === 'drink') {
        isDrink = true;
      } 
      // 然后检查分类是否为饮品
      else if (dish.category === 'drink') {
        isDrink = true;
      }
      // 再检查是否有容量/体积字段，这也可能表明是饮品
      else if (dish.volume && dish.volume.trim() !== '') {
        isDrink = true;
      }
      
      // 确保类型字段存在并一致
      const type = isDrink ? 'drink' : (dish.food_type || 'food');
      
      console.log(`菜品 ${dish.name} 最终类型: ${type}`);
      
      // 返回带有别名的数据，确保前端可以访问
      return {
        ...dish,
        foodType: type,
        type: type,
        // 容量处理 - 确保饮品有容量字段
        capacity: dish.volume || ''
      };
    });
    
    console.log(`共获取到 ${formattedData.length} 个菜品（仅活跃状态）`);
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching dishes:', error);
    const errorMessage = 'Failed to fetch dishes';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('接收到的菜品数据:', data);

    // Validate required fields
    if (!data.name || data.price === undefined) {
      return NextResponse.json(
        { error: '菜品名称和价格为必填项' },
        { status: 400 }
      );
    }
    
    // 验证code不能只包含空格
    if (data.code && data.code.trim() === '') {
      return NextResponse.json(
        { error: '如果提供菜品编码，则不能为空' },
        { status: 400 }
      );
    }
    
    // 验证price是有效数字
    if (isNaN(Number(data.price)) || Number(data.price) < 0) {
      return NextResponse.json(
        { error: '价格必须是有效的非负数字' },
        { status: 400 }
      );
    }
    
    // 判断是否为饮品类型
    const isDrink = data.type === 'drink' || 
                   data.foodType === 'drink' || 
                   data.food_type === 'drink' || 
                   data.category === 'drink';
    
    // 饮品类型必须有容量
    if (isDrink && (!data.capacity && !data.volume)) {
      return NextResponse.json(
        { error: '饮品类型必须填写容量' },
        { status: 400 }
      );
    }

    // 如果是饮品类型，确保所有类型字段一致
    const dishType = isDrink ? 'drink' : 'food';
    const dishCategory = isDrink ? 'drink' : (data.category || '未分类');
    
    // 处理容量字段
    const volume = isDrink ? (data.volume || data.capacity || '标准') : null;

    // Prepare data for creation
    const dishData = {
      name: data.name,
      code: data.code ? data.code.trim() : '', // code可以为空，但如果提供则去除前后空格
      price: Number(data.price), // 确保price是数字类型
      category: dishCategory,
      description: data.description || '',
      image_url: data.imageUrl || '',
      is_active: data.isActive !== undefined ? data.isActive : true,
      // 容量字段
      volume: volume,
      // 菜品类型
      food_type: dishType,
      has_sub_items: false
    };

    console.log('准备创建的菜品数据:', dishData);
    
    try {
      // 使用管理员客户端创建菜品，绕过RLS策略
      const { data: dish, error } = await dbAdmin.dishes.create(dishData);
      
      if (error) {
        console.error('创建菜品数据库错误:', error);
        return NextResponse.json(
          { error: `数据库错误: ${error.message || '未知错误'}` },
          { status: 500 }
        );
      }
      
      if (!dish || dish.length === 0) {
        return NextResponse.json(
          { error: '创建菜品后未返回数据' },
          { status: 500 }
        );
      }
      
      // 返回时添加额外的客户端需要的字段
      const enhancedDish = {
        ...dish[0],
        type: dish[0].food_type || 'food', // 添加type字段
        foodType: dish[0].food_type || 'food', // 添加foodType字段
        capacity: dish[0].volume || '' // 添加capacity字段
      };
      
      return NextResponse.json(enhancedDish, { status: 201 });
    } catch (dbError) {
      console.error('数据库操作异常:', dbError);
      return NextResponse.json(
        { error: `数据库操作异常: ${dbError instanceof Error ? dbError.message : '未知错误'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating dish:', error);
    let errorMessage = 'Failed to create dish';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // 从URL获取ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: '未指定菜品ID' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    console.log('接收到的更新数据:', data);
    
    // Validate required fields
    if (!data.name || data.price === undefined) {
      return NextResponse.json(
        { error: '菜品名称和价格为必填项' },
        { status: 400 }
      );
    }
    
    // 判断是否为饮品类型
    const isDrink = data.type === 'drink' || 
                   data.foodType === 'drink' || 
                   data.food_type === 'drink' || 
                   data.category === 'drink';
    
    // 饮品类型必须有容量
    if (isDrink && (!data.capacity && !data.volume)) {
      return NextResponse.json(
        { error: '饮品类型必须填写容量' },
        { status: 400 }
      );
    }

    // 如果是饮品类型，确保所有类型字段一致
    const dishType = isDrink ? 'drink' : 'food';
    const dishCategory = isDrink ? 'drink' : (data.category || '未分类');
    
    // 处理容量字段
    const volume = isDrink ? (data.volume || data.capacity || '标准') : null;
    
    try {
      // 构建更新数据
      const updateData = {
        name: data.name,
        code: data.code,
        price: data.price,
        category: dishCategory,
        description: data.description || '',
        image_url: data.imageUrl || '',
        is_active: data.isActive !== undefined ? data.isActive : true,
        // 容量字段
        volume: volume,
        // 菜品类型
        food_type: dishType,
        has_sub_items: data.has_sub_items || false
      };
      
      console.log('准备更新的菜品数据:', updateData);
      
      // 使用管理员客户端更新菜品，绕过RLS策略
      const { data: updatedDish, error } = await dbAdmin.dishes.update(id, updateData);
      
      if (error) throw error;
      
      // 返回时添加额外的客户端需要的字段
      const enhancedDish = updatedDish && updatedDish.length > 0 ? {
        ...updatedDish[0],
        type: updatedDish[0].food_type || 'food', // 添加type字段
        foodType: updatedDish[0].food_type || 'food', // 添加foodType字段
        capacity: updatedDish[0].volume || '' // 添加capacity字段
      } : {};
      
      return NextResponse.json(enhancedDish);
    } catch (error) {
      console.error('更新菜品失败:', error);
      const errorMessage = '更新菜品失败';
      return NextResponse.json(
        { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing PUT request for dish:', error);
    const errorMessage = '处理更新菜品请求失败';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 添加DELETE方法处理菜品删除
export async function DELETE(request: NextRequest) {
  try {
    // 从URL获取ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: '未指定菜品ID' },
        { status: 400 }
      );
    }
    
    // 使用管理员客户端删除菜品，绕过RLS策略
    const { error } = await dbAdmin.dishes.delete(id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除菜品失败:', error);
    const errorMessage = '删除菜品失败';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}