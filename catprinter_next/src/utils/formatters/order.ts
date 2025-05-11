/**
 * Bestellungsformatierung Dienstprogramm
 * 
 * Dieses Modul bietet Funktionen zur Formatierung von Bestellungen für den Druck.
 */
import { DIVIDER, LINE_WIDTH } from '../../constants';
import { Order, OrderItem, FoodItem } from './types';

/**
 * Zeitstempel formatieren, linksbündig, minutengenau
 * @param timestamp - Zeitobjekt
 * @returns Formatierte Zeitzeichenfolge
 */
export function formatTimestamp(timestamp: Date | string): string {
  if (!timestamp) {
    return '';
  }
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  // Tag-Monat-Jahr-Stunden-Minuten-Format
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  const formattedDate = `${day}-${month}-${year} ${hours}:${minutes}`;
  
  return formattedDate;
}

/**
 * Gerichtsnamen für den Druck formatieren
 * @param name - Gerichtsname
 * @param code - Gerichtscode (optional)
 * @returns Formatierter Name
 */
export function translateDishName(name: string, code: string = ''): string {
  if (!name) {
    return '';
  }
  
  // Gibt den ursprünglichen Gerichtsnamen zurück, ohne das Suffix "Special" hinzuzufügen
  return name;
}

/**
 * Benutzerdefiniertes Dumpling-Speziallayout formatieren
 * @param item - Dumpling-Artikelobjekt
 * @returns Formatierte Zeilenarray
 */
export function formatCustomDumpling(item: FoodItem): string[] {
  const lines: string[] = [];
  
  // Hauptzeile hinzufügen
  lines.push(`${item.qty} x ${item.code} Dumplings`);
  
  // Unterartikel (Füllungen)
  if (item.sub_items && Object.keys(item.sub_items).length > 0) {
    for (const [subName, subQty] of Object.entries(item.sub_items)) {
      lines.push(`  ${subQty} x ${subName}`);
    }
  }
  
  return lines;
}

/**
 * Bestellung in Vorschauformat konvertieren
 * @param order - Bestellungsobjekt
 * @returns Formatierte Zeilenarray
 */
export function formatOrderPreview(order: Order): string[] {
  const lines: string[] = [];
  
  // Zeit hinzufügen
  if (order.created_at) {
    lines.push(formatTimestamp(order.created_at));
  } else {
    lines.push(formatTimestamp(new Date()));
  }
  
  // Bestellungs-ID hinzufügen
  if (order.order_id || order.id) {
    const masked = maskOrderId(order.order_id || order.id.toString());
    lines.push(`Bestellung-ID: ${masked}`);
  }
  
  // Leere Zeile hinzufügen
  lines.push('');
  
  // Tischnummer hinzufügen
  if (order.table_no) {
    lines.push(`Tisch: ${order.table_no}`);
  }
  
  // Trennlinie hinzufügen
  lines.push(DIVIDER);
  
  // Speisendetails hinzufügen
  if (order.items && order.items.length > 0) {
    // Vorheriges Element aufzeichnen, um zu beurteilen, ob eine Leerzeile hinzugefügt werden soll
    let previousItem = null;
    
    for (const item of order.items) {
      // Wenn es nicht das erste Element ist, eine Leerzeile als Abstand hinzufügen
      if (previousItem) {
        lines.push(''); // Leerzeile als Abstand zwischen Elementen hinzufügen
      }
      
      if (item.is_custom_dumpling) {
        // Spezielles Layout für Dumplings
        const dumplingLines = formatCustomDumpling(item);
        lines.push(...dumplingLines);
      } else {
        // Standardformat für andere Gerichte
        if (item.code) {
          lines.push(`${item.qty || item.quantity} x ${item.code}`);
        } else {
          lines.push(`${item.qty || item.quantity} x ${item.name}`);
        }
      }
      
      previousItem = item;
    }
  }
  
  // Gesamtzeile hinzufügen
  lines.push(DIVIDER);
  lines.push(`Summe: ${order.items?.length || 0} Artikel`);
  
  return lines;
}

/**
 * Bestellung in Druckformat (für Küchendruck) konvertieren
 * @param order - Bestellungsobjekt
 * @returns Formatierte Zeilenarray
 */
export function formatOrderForKitchen(order: Order): string[] {
  return formatOrderPreview(order);
}

/**
 * Bestell-ID maskieren, um die Privatsphäre zu schützen
 * @param orderId - Vollständige Bestell-ID
 * @returns Maskierte ID
 */
export function maskOrderId(orderId: string): string {
  if (!orderId) return '';
  
  // ID-Länge überprüfen
  if (orderId.length <= 8) return orderId;
  
  // Ersten und letzten 4 Zeichen beibehalten, Rest maskieren
  const prefix = orderId.substring(0, 4);
  const suffix = orderId.substring(orderId.length - 4);
  const maskedLength = orderId.length - 8;
  const masked = '*'.repeat(Math.min(maskedLength, 8));
  
  return `${prefix}${masked}${suffix}`;
} 