// Supabase菜品类型定义
export type Dish = {
  id: string;
  name: string;
  code?: string | null;
  price: number;
  food_type: string;
  category: string;
  volume?: string | null;
  has_sub_items: boolean;
  sub_items?: any;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  drink_items?: Array<{ id: string, dishId: string, name: string }>;
  food_default_items?: Array<{ id: string, dishId: string, name: string, code: string, description?: string, isDefault: boolean }>;
  created_at?: Date;
  updated_at?: Date;
};

// 提供类型转换帮助函数
export function sanitizeDishForDatabase(dish: any): any {
  return {
    name: dish.name,
    code: dish.code || null,
    price: Number(dish.price),
    food_type: dish.food_type || dish.foodType || 'food',
    category: dish.category || '未分类',
    volume: dish.volume || null,
    has_sub_items: dish.has_sub_items || dish.hasSubItems || false,
    sub_items: dish.sub_items || dish.subItems || null,
    description: dish.description || null,
    image_url: dish.image_url || dish.imageUrl || null,
    is_active: dish.is_active !== undefined ? dish.is_active : (dish.isActive !== undefined ? dish.isActive : true),
  };
}