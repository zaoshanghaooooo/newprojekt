import { supabase, Tables } from '@/lib/supabase';
import type { Tables as TablesType } from '@/lib/supabase';

// 定义菜品类型
export type Dish = TablesType<'dishes'>;

/**
 * Service-Klasse für Dish-Operationen
 * 菜品服务类
 */
export class DishService {
  /**
   * Erstellt ein neues Gericht
   * 创建新菜品
   */
  async create(data: Omit<Dish, 'id' | 'created_at' | 'updated_at'>) {
    const { data: dish, error } = await supabase
      .from('dishes')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return dish;
  }

  /**
   * Findet ein Gericht anhand der ID
   * 根据 ID 查找菜品
   */
  async findById(id: string) {
    const { data: dish, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return dish;
  }

  /**
   * Aktualisiert ein Gericht
   * 更新菜品
   */
  async update(id: string, data: Partial<Omit<Dish, 'id' | 'created_at' | 'updated_at'>>) {
    const { data: dish, error } = await supabase
      .from('dishes')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return dish;
  }

  /**
   * Löscht ein Gericht
   * 删除菜品
   */
  async delete(id: string) {
    const { data, error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Findet alle Gerichte
   * 查找所有菜品
   */
  async findAll(options: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  } = {}) {
    let query = supabase
      .from('dishes')
      .select('*');
    
    // 处理分页
    if (options.skip !== undefined && options.take !== undefined) {
      const from = options.skip;
      const to = options.skip + options.take - 1;
      query = query.range(from, to);
    }
    
    // 处理排序
    if (options.orderBy) {
      for (const [column, direction] of Object.entries(options.orderBy)) {
        query = query.order(column, { ascending: direction === 'asc' });
      }
    }
    
    // 处理过滤条件
    if (options.where) {
      for (const [column, value] of Object.entries(options.where)) {
        if (value !== undefined) {
          query = query.eq(column, value);
        }
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Findet Gerichte nach Kategorie
   * 根据分类查找菜品
   */
  async findByCategory(category: string) {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('category', category);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Findet aktive Gerichte
   * 查找活动菜品
   */
  async findActive() {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Zählt die Anzahl der Gerichte
   * 统计菜品数量
   */
  async count(where: any = {}) {
    let query = supabase
      .from('dishes')
      .select('*', { count: 'exact', head: true });
    
    for (const [column, value] of Object.entries(where)) {
      if (value !== undefined) {
        query = query.eq(column, value);
      }
    }
    
    const { count, error } = await query;
    
    if (error) throw error;
    return count || 0;
  }
} 