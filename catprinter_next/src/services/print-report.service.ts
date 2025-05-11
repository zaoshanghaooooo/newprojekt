/**
 * Druckberichtsdienst
 * 
 * Dieser Dienst bietet Funktionen zur Analyse und Berichterstellung von Druckaktivitäten.
 */

import { supabase } from '@/lib/supabase';

// 定义打印机统计类型
interface PrinterStat {
  printer_id: string;
  printer_name: string;
  total_prints: number;
  success_prints: number;
  failed_prints: number;
  success_rate?: number;
}

/**
 * Tägliche Druckzusammenfassung abrufen
 * @param date - Datum für die Zusammenfassung (Standardmäßig heute)
 * @returns Druckzusammenfassungsobjekt
 */
export async function getDailyPrintSummary(date?: Date): Promise<{
  date: string;
  order_count: number;
  total_amount: number;
  print_count: number;
  orders: any[];
}> {
  // Wenn kein Datum angegeben wurde, verwenden Sie das heutige Datum
  const targetDate = date || new Date();
  
  // Datum für Abfragen formatieren
  const dateStr = targetDate.toISOString().split('T')[0];
  
  // Datumsgrenzen für den gesamten Tag festlegen
  const startTime = `${dateStr}T00:00:00`;
  const endTime = `${dateStr}T23:59:59`;
  
  // Erfolgreiche Druckprotokolle abrufen
  const { data: printLogs, error: printLogsError } = await supabase
    .from('print_logs')
    .select('*')
    .gte('created_at', startTime)
    .lte('created_at', endTime)
    .eq('status', 'success');
  
  if (printLogsError) {
    console.error('Fehler beim Abrufen der Druckprotokolle:', printLogsError);
    throw new Error(`Fehler beim Abrufen der Druckprotokolle: ${printLogsError.message}`);
  }
  
  // Zugehörige Bestellungen abrufen
  const orderIds = printLogs.map(log => log.order_id).filter(Boolean);
  
  // Wenn keine Bestellungen gefunden wurden, geben Sie eine leere Zusammenfassung zurück
  if (orderIds.length === 0) {
    return {
      date: dateStr,
      order_count: 0,
      total_amount: 0,
      print_count: 0,
      orders: []
    };
  }
  
  // Bestellungen abrufen
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .in('id', orderIds);
  
  if (ordersError) {
    console.error('Fehler beim Abrufen der Bestellungen:', ordersError);
    throw new Error(`Fehler beim Abrufen der Bestellungen: ${ordersError.message}`);
  }
  
  // Gerichte für Preisreferenz abrufen
  const { data: dishes, error: dishesError } = await supabase
    .from('dishes')
    .select('id, price, code');
  
  if (dishesError) {
    console.error('Fehler beim Abrufen der Gerichte:', dishesError);
    throw new Error(`Fehler beim Abrufen der Gerichte: ${dishesError.message}`);
  }
  
  // Code zu Preis-Zuordnung erstellen
  const dishPriceMap = dishes.reduce((map: {[key: string]: number}, dish) => {
    if (dish.code) {
      map[dish.code] = dish.price || 0;
    }
    map[dish.id] = dish.price || 0;
    return map;
  }, {});
  
  // Bestellzusammenfassung und Gesamtbetrag berechnen
  let totalAmount = 0;
  const orderSummary = orders.map(order => {
    // Bestellbetrag berechnen
    let orderAmount = 0;
    const items = order.order_items || [];
    
    for (const item of items) {
      const dishPrice = dishPriceMap[item.dish_id] || 0;
      const quantity = item.quantity || 1;
      orderAmount += dishPrice * quantity;
    }
    
    // Zum Gesamtbetrag hinzufügen
    totalAmount += orderAmount;
    
    // Bestellzusammenfassung zurückgeben
    return {
      id: order.id,
      order_no: order.order_no,
      table_no: order.table_no,
      print_time: new Date(order.last_print_time || order.created_at).toLocaleString('de-DE'),
      amount: orderAmount,
      item_count: items.length
    };
  });
  
  // Zusammenfassungsbericht erstellen
  return {
    date: dateStr,
    order_count: orders.length,
    total_amount: totalAmount,
    print_count: printLogs.length,
    orders: orderSummary
  };
}

/**
 * Druckerzusammenfassung abrufen
 * @param date - Datum für die Zusammenfassung (Standardmäßig heute)
 * @returns Druckerzusammenfassungsobjekt
 */
export async function getPrinterSummary(date?: Date): Promise<{
  date: string;
  printer_summary: PrinterStat[];
}> {
  // Wenn kein Datum angegeben wurde, verwenden Sie das heutige Datum
  const targetDate = date || new Date();
  
  // Datum für Abfragen formatieren
  const dateStr = targetDate.toISOString().split('T')[0];
  
  // Datumsgrenzen für den gesamten Tag festlegen
  const startTime = `${dateStr}T00:00:00`;
  const endTime = `${dateStr}T23:59:59`;
  
  // Druckprotokolle nach Drucker gruppiert abrufen
  const { data: printLogs, error: printLogsError } = await supabase
    .from('print_logs')
    .select('*')
    .gte('created_at', startTime)
    .lte('created_at', endTime);
  
  if (printLogsError) {
    console.error('Fehler beim Abrufen der Druckprotokolle:', printLogsError);
    throw new Error(`Fehler beim Abrufen der Druckprotokolle: ${printLogsError.message}`);
  }
  
  // Drucker-IDs abrufen
  const printerIds = [...new Set(printLogs.map(log => log.printer_id).filter(Boolean))];
  
  // Wenn keine Drucker gefunden wurden, geben Sie eine leere Zusammenfassung zurück
  if (printerIds.length === 0) {
    return {
      date: dateStr,
      printer_summary: []
    };
  }
  
  // Drucker abrufen
  const { data: printers, error: printersError } = await supabase
    .from('printers')
    .select('*')
    .in('id', printerIds);
  
  if (printersError) {
    console.error('Fehler beim Abrufen der Drucker:', printersError);
    throw new Error(`Fehler beim Abrufen der Drucker: ${printersError.message}`);
  }
  
  // Drucker-ID zu Name-Zuordnung erstellen
  const printerNameMap = printers.reduce((map: {[key: string]: string}, printer) => {
    map[printer.id] = printer.name || printer.sn || 'Unbekannt';
    return map;
  }, {});
  
  // Druckerstatistik berechnen
  const printerStats: {[key: string]: PrinterStat} = {};
  
  for (const log of printLogs) {
    const printerId = log.printer_id || 'unbekannt';
    
    if (!printerStats[printerId]) {
      printerStats[printerId] = {
        printer_id: printerId,
        printer_name: printerNameMap[printerId] || 'Unbekannt',
        total_prints: 0,
        success_prints: 0,
        failed_prints: 0
      };
    }
    
    printerStats[printerId].total_prints++;
    
    if (log.status === 'success') {
      printerStats[printerId].success_prints++;
    } else {
      printerStats[printerId].failed_prints++;
    }
  }
  
  // Erfolgsrate berechnen und Zusammenfassung erstellen
  const printerSummary = Object.values(printerStats).map((stat: PrinterStat) => {
    const successRate = stat.total_prints > 0
      ? (stat.success_prints / stat.total_prints * 100).toFixed(2)
      : '0';
    
    return {
      ...stat,
      success_rate: parseFloat(successRate)
    };
  });
  
  // Nach Gesamtdrucken sortieren
  printerSummary.sort((a, b) => b.total_prints - a.total_prints);
  
  return {
    date: dateStr,
    printer_summary: printerSummary
  };
} 