import { supabase } from '@/lib/supabase-client';
import type { Tables, TableRow, TableInsert, TableUpdate } from '@/lib/supabase-client';

/**
 * Basis-Service-Klasse für Datenbankoperationen mit Supabase
 * 基础服务类，用于数据库操作
 */
export class BaseService<T extends keyof Tables> {
  protected tableName: T;

  constructor(tableName: T) {
    this.tableName = tableName;
  }

  /**
   * Erstellt einen neuen Datensatz
   * 创建新记录
   */
  async create(data: TableInsert<T>): Promise<TableRow<T> | null> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Findet einen Datensatz anhand der ID
   * 根据 ID 查找记录
   */
  async findById(id: string): Promise<TableRow<T> | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Aktualisiert einen Datensatz
   * 更新记录
   */
  async update(id: string, data: TableUpdate<T>): Promise<TableRow<T> | null> {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Löscht einen Datensatz
   * 删除记录
   */
  async delete(id: string): Promise<TableRow<T> | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Findet alle Datensätze
   * 查找所有记录
   */
  async findAll(options: {
    skip?: number;
    take?: number;
    where?: Partial<TableRow<T>>;
    orderBy?: { column: keyof TableRow<T>; ascending?: boolean };
  } = {}): Promise<TableRow<T>[]> {
    let query = supabase
      .from(this.tableName)
      .select();

    // Anwenden der Where-Bedingungen
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Anwenden der Sortierung
    if (options.orderBy) {
      query = query.order(options.orderBy.column as string, {
        ascending: options.orderBy.ascending ?? true
      });
    }

    // Anwenden der Pagination
    if (options.skip !== undefined) {
      query = query.range(options.skip, (options.skip + (options.take || 10)) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Zählt die Anzahl der Datensätze
   * 统计记录数量
   */
  async count(where: Partial<TableRow<T>> = {}): Promise<number> {
    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    // Anwenden der Where-Bedingungen
    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }
} 