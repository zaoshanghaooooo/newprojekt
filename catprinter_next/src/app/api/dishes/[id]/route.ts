import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin, supabaseAdmin } from '@/lib/supabase-server';

// 获取单个菜品
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`获取菜品详情, id=${id}`);

    if (!id) {
      return NextResponse.json(
        { error: '未指定菜品ID' },
        { status: 400 }
      );
    }

    // 使用管理员客户端查询，绕过RLS
    const { data, error } = await dbAdmin.dishes.getById(id);

    if (error) {
      console.error('获取菜品详情失败:', error);
      return NextResponse.json(
        { error: `获取菜品详情失败: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '菜品不存在' },
        { status: 404 }
      );
    }

    // 返回时添加额外的客户端需要的字段
    const enhancedDish = {
      ...data,
      type: data.food_type || 'food', // 添加type字段
      foodType: data.food_type || 'food', // 添加foodType字段
      capacity: data.volume || '' // 添加capacity字段
    };

    return NextResponse.json(enhancedDish);
  } catch (error) {
    console.error('Error fetching dish:', error);
    const errorMessage = 'Failed to fetch dish';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 更新菜品
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`更新菜品, id=${id}`);

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

// 删除菜品（物理删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`物理删除菜品, id=${id}`);

    if (!id) {
      return NextResponse.json(
        { error: '未指定菜品ID' },
        { status: 400 }
      );
    }

    // 检查此菜品是否在订单中被引用
    const { data: orderItems, error: checkError } = await supabaseAdmin
      .from('order_items')
      .select('id')
      .eq('dish_id', id)
      .limit(1);
    
    if (checkError) {
      console.error(`检查菜品引用失败, id=${id}, error:`, checkError);
      return NextResponse.json(
        { error: `检查菜品引用失败: ${checkError.message}` },
        { status: 500 }
      );
    }
    
    // 如果菜品被订单引用，需要先解除引用关系
    if (orderItems && orderItems.length > 0) {
      console.log(`菜品 ${id} 被订单项引用，先解除引用关系`);
      
      // 将引用此菜品的订单项中的dish_id设置为null，而不是删除订单项
      const { error: updateError } = await supabaseAdmin
        .from('order_items')
        .update({ dish_id: null })
        .eq('dish_id', id);
      
      if (updateError) {
        console.error(`解除菜品引用失败, id=${id}, error:`, updateError);
        return NextResponse.json(
          { error: `解除菜品引用失败: ${updateError.message}` },
          { status: 500 }
        );
      }
    }
    
    // 现在可以安全地物理删除菜品
    const { error: deleteError } = await dbAdmin.dishes.delete(id);
    
    if (deleteError) {
      console.error(`物理删除菜品失败, id=${id}, error:`, deleteError);
      return NextResponse.json(
        { error: `删除菜品失败: ${deleteError.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: '菜品已成功彻底删除'
    });
  } catch (error) {
    console.error('删除菜品失败:', error);
    const errorMessage = '删除菜品失败';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 