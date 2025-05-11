import { formatOrderForKitchen } from './formatter';
import { db, supabase } from '@/lib/db';
import { logger } from './logger';

interface PrinterResponse {
  ret: number;
  msg: string;
  data?: string;
  serverExecutedTime?: number;
}

export async function printOrder(orderId: string, printerId?: string) {
  try {
    // 1. Bestellung abrufen
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Bestellung nicht gefunden');
    }

    // 2. Druckinhalt formatieren
    const printLines = formatOrderForKitchen(order);
    const content = printLines.join('\n');

    // 3. Feieyun Druckerschnittstelle aufrufen
    const response = await sendToPrinter(printerId, content);
    logger.info('Feieyun Cloud Druckantwort:', response);

    // 4. Druckprotokoll erstellen
    const printLogData: any = {
      status: response.ret === 0 ? 'success' : 'failed',
      message: response.msg || 'Druckbefehl gesendet',
      order_id: orderId,
      created_at: new Date().toISOString()
    };

    // Drucker-ID nur hinzufügen, wenn vorhanden und gültig
    if (printerId) {
      const { data: printer } = await supabase
        .from('printers')
        .select('id')
        .eq('id', printerId)
        .single();
      
      if (printer) {
        printLogData.printer_id = printerId;
      }
    }

    const { error: logError } = await supabase
      .from('print_logs')
      .insert(printLogData);

    if (logError) {
      logger.error('Fehler beim Erstellen des Druckprotokolls:', logError);
    }

    return response.ret === 0;
  } catch (error) {
    logger.error('Fehler beim Drucken der Bestellung:', error);
    
    // Fehlerprotokoll erstellen
    const errorLogData: any = {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      order_id: orderId,
      created_at: new Date().toISOString()
    };

    if (printerId) {
      const { data: printer } = await supabase
        .from('printers')
        .select('id')
        .eq('id', printerId)
        .single();
      
      if (printer) {
        errorLogData.printer_id = printerId;
      }
    }

    const { error: logError } = await supabase
      .from('print_logs')
      .insert(errorLogData);

    if (logError) {
      logger.error('Fehler beim Erstellen des Fehlerprotokolls:', logError);
    }

    throw error;
  }
}

async function sendToPrinter(printerId: string | undefined, content: string): Promise<PrinterResponse> {
  // TODO: Implementierung der spezifischen Feieyun Drucker-API
  // Dies muss entsprechend Ihrer Feieyun Druckerkonfiguration implementiert werden
  // Beispielimplementierung:
  return {
    ret: 0,
    msg: 'ok',
    data: 'mock-print-job-id',
    serverExecutedTime: 0
  };
} 