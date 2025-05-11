import { supabase } from '@/lib/supabase-client';
import type { Tables } from '@/lib/supabase-client';

type Printer = Tables['printers']['Row'];
type PrintLog = Tables['print_logs']['Row'];

/**
 * Service-Klasse für Printer-Operationen
 * 打印机服务类
 */
export class PrinterService {
  /**
   * Erstellt einen neuen Drucker
   * 创建新打印机
   */
  async create(data: Omit<Printer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Printer | null> {
    const { data: result, error } = await supabase
      .from('printers')
      .insert({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Findet einen Drucker anhand der ID
   * 根据 ID 查找打印机
   */
  async findById(id: string): Promise<(Printer & { printLogs: PrintLog[] }) | null> {
    const { data: printer, error: printerError } = await supabase
      .from('printers')
      .select()
      .eq('id', id)
      .single();

    if (printerError) throw printerError;
    if (!printer) return null;

    const { data: printLogs, error: logsError } = await supabase
      .from('print_logs')
      .select()
      .eq('printerId', id);

    if (logsError) throw logsError;
    return { ...printer, printLogs: printLogs || [] };
  }

  /**
   * Findet einen Drucker anhand der Seriennummer
   * 根据序列号查找打印机
   */
  async findBySN(sn: string): Promise<(Printer & { printLogs: PrintLog[] }) | null> {
    const { data: printer, error: printerError } = await supabase
      .from('printers')
      .select()
      .eq('sn', sn)
      .single();

    if (printerError) throw printerError;
    if (!printer) return null;

    const { data: printLogs, error: logsError } = await supabase
      .from('print_logs')
      .select()
      .eq('printerId', printer.id);

    if (logsError) throw logsError;
    return { ...printer, printLogs: printLogs || [] };
  }

  /**
   * Aktualisiert einen Drucker
   * 更新打印机
   */
  async update(id: string, data: Partial<Omit<Printer, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Printer | null> {
    const { data: result, error } = await supabase
      .from('printers')
      .update({
        ...data,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Löscht einen Drucker
   * 删除打印机
   */
  async delete(id: string): Promise<Printer | null> {
    const { data, error } = await supabase
      .from('printers')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Findet alle Drucker
   * 查找所有打印机
   */
  async findAll(options: {
    skip?: number;
    take?: number;
    where?: Partial<Printer>;
    orderBy?: { column: keyof Printer; ascending?: boolean };
  } = {}): Promise<(Printer & { printLogs: PrintLog[] })[]> {
    let query = supabase
      .from('printers')
      .select();

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column as string, {
        ascending: options.orderBy.ascending ?? true
      });
    }

    if (options.skip !== undefined) {
      query = query.range(options.skip, (options.skip + (options.take || 10)) - 1);
    }

    const { data: printers, error: printersError } = await query;
    if (printersError) throw printersError;
    if (!printers) return [];

    // Fetch print logs for each printer
    const printersWithLogs = await Promise.all(
      printers.map(async (printer) => {
        const { data: printLogs, error: logsError } = await supabase
          .from('print_logs')
          .select()
          .eq('printerId', printer.id);

        if (logsError) throw logsError;
        return { ...printer, printLogs: printLogs || [] };
      })
    );

    return printersWithLogs;
  }

  /**
   * Aktualisiert den Druckerstatus
   * 更新打印机状态
   */
  async updateStatus(id: string, status: string): Promise<Printer | null> {
    const { data, error } = await supabase
      .from('printers')
      .update({
        status,
        lastActiveTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Erstellt einen Druckprotokoll
   * 创建打印日志
   */
  async createPrintLog(data: {
    status: string;
    message?: string;
    orderId: string;
    printerId: string;
  }): Promise<PrintLog | null> {
    const { data: result, error } = await supabase
      .from('print_logs')
      .insert({
        ...data,
        printTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Findet den Standarddrucker
   * 查找默认打印机
   */
  async findDefault(): Promise<Printer | null> {
    const { data, error } = await supabase
      .from('printers')
      .select()
      .eq('isDefault', true)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Setzt einen Drucker als Standard
   * 设置默认打印机
   */
  async setDefault(id: string): Promise<Printer | null> {
    // Reset all printers default status
    const { error: resetError } = await supabase
      .from('printers')
      .update({ isDefault: false, updatedAt: new Date().toISOString() })
      .eq('isDefault', true);

    if (resetError) throw resetError;

    // Set new default printer
    const { data, error } = await supabase
      .from('printers')
      .update({ isDefault: true, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Zählt die Anzahl der Drucker
   * 统计打印机数量
   */
  async count(where: Partial<Printer> = {}): Promise<number> {
    let query = supabase
      .from('printers')
      .select('*', { count: 'exact', head: true });

    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }
} 