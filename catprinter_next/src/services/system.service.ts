import { supabase } from '@/lib/supabase-client';
import type { Tables } from '@/lib/supabase-client';

// 使用显式接口定义来解决类型问题
interface SystemSettingRow {
  id: number;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

interface SystemLogRow {
  id: number;
  level: string;
  source: string | null;
  message: string;
  details: string | null;
  createdAt: string;
}

type SystemSetting = SystemSettingRow;
type SystemLog = SystemLogRow;

/**
 * Service-Klasse für System-Operationen
 * 系统服务类
 */
export class SystemService {
  /**
   * Setzt einen Systemeinstellung
   * 设置系统配置
   */
  async setSetting(key: string, value: string): Promise<SystemSetting | null> {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key,
        value,
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Holt einen Systemeinstellung
   * 获取系统配置
   */
  async getSetting(key: string): Promise<SystemSetting | null> {
    const { data, error } = await supabase
      .from('system_settings')
      .select()
      .eq('key', key)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Holt alle Systemeinstellungen
   * 获取所有系统配置
   */
  async getAllSettings(): Promise<SystemSetting[]> {
    const { data, error } = await supabase
      .from('system_settings')
      .select();

    if (error) throw error;
    return data || [];
  }

  /**
   * Löscht einen Systemeinstellung
   * 删除系统配置
   */
  async deleteSetting(key: string): Promise<SystemSetting | null> {
    const { data, error } = await supabase
      .from('system_settings')
      .delete()
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Erstellt einen Systemprotokoll
   * 创建系统日志
   */
  async createLog(data: {
    level: string;
    source?: string;
    message: string;
    details?: string;
  }): Promise<SystemLog | null> {
    const { data: result, error } = await supabase
      .from('system_logs')
      .insert({
        ...data,
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Findet Systemprotokolle
   * 查找系统日志
   */
  async findLogs(options: {
    skip?: number;
    take?: number;
    where?: Partial<SystemLog>;
    orderBy?: { column: keyof SystemLog; ascending?: boolean };
  } = {}): Promise<SystemLog[]> {
    let query = supabase
      .from('system_logs')
      .select();

    // Anwenden der Where-Bedingungen
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Standard-Sortierung nach Erstellungsdatum absteigend
    query = query.order('createdAt', { ascending: false });

    // Benutzerdefinierte Sortierung überschreibt Standard
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
   * Löscht alte Systemprotokolle
   * 删除旧系统日志
   */
  async cleanupLogs(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error } = await supabase
      .from('system_logs')
      .delete()
      .lt('createdAt', cutoffDate.toISOString());

    if (error) throw error;
  }
} 