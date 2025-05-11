/**
 * Druckformatierungshilfsprogramm
 */
import { DIVIDER, LINE_WIDTH } from '@/constants';
import { maskOrderId } from '@/utils/security';
import { Bestellung, BestellungItem } from '@/types/printer';

/**
 * Formatiert den Zeitstempel, linksbündig, minutengenau
 * @param {Date | string} timestamp - Zeitobjekt oder Zeitstempel
 * @returns {string} - Formatierte Zeitzeichenfolge
 */
export function formatZeitstempel(timestamp: Date | string): string {
  if (!timestamp) {
    return '';
  }
  
  const datum = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  // Tag-Monat-Jahr Stunden:Minuten Format
  const tag = datum.getDate().toString().padStart(2, '0');
  const monat = (datum.getMonth() + 1).toString().padStart(2, '0');
  const jahr = datum.getFullYear();
  const stunden = datum.getHours().toString().padStart(2, '0');
  const minuten = datum.getMinutes().toString().padStart(2, '0');
  
  return `${tag}-${monat}-${jahr} ${stunden}:${minuten}`;
}

/**
 * Formatiert den Gerichtnamen für den Druck
 * @param {string} name - Gerichtname
 * @param {string} [code] - Gerichtcode (optional)
 * @returns {string} - Formatierter Name
 */
export function übersetzeGerichtName(name: string, code = ''): string {
  if (!name) {
    return '';
  }
  
  return name;
}

/**
 * Formatiert das benutzerdefinierte Knödel-Speziallayout
 * @param {BestellungItem} artikel - Knödelartikelobjekt
 * @returns {string[]} - Formatierte Zeilenanordnung
 */
export function formatiereBenutzerdefiniertenKnödel(artikel: BestellungItem): string[] {
  const zeilen: string[] = [];
  
  // Hauptzeile hinzufügen
  zeilen.push(`${artikel.qty} x ${artikel.code} Knödel`);
  
  // Unterartikel (Füllungen)
  if (artikel.sub_items && Object.keys(artikel.sub_items).length > 0) {
    for (const [subName, subQty] of Object.entries(artikel.sub_items)) {
      zeilen.push(`  ${subQty} x ${subName}`);
    }
  }
  
  return zeilen;
}

/**
 * Konvertiert die Bestellung in das Vorschauformat
 * @param {Bestellung} bestellung - Bestellungsobjekt
 * @returns {string[]} - Formatierte Zeilenanordnung
 */
export function formatierBestellungVorschau(bestellung: Bestellung): string[] {
  const zeilen: string[] = [];
  
  // Zeit hinzufügen
  zeilen.push(formatZeitstempel(bestellung.date_time || new Date()));
  
  // Bestellungs-ID hinzufügen
  if (bestellung.order_id) {
    const maskiert = maskOrderId(bestellung.order_id);
    zeilen.push(`Bestellung-ID: ${maskiert}`);
  }
  
  // Leerzeile hinzufügen
  zeilen.push('');
  
  // Tischnummer hinzufügen
  if (bestellung.table_no) {
    zeilen.push(`Tisch: ${bestellung.table_no}`);
  }
  
  // Trennlinie hinzufügen
  zeilen.push(DIVIDER);
  
  // Gerichtdetails hinzufügen
  if (bestellung.items && bestellung.items.length > 0) {
    let vorheriger: BestellungItem | null = null;
    
    for (const artikel of bestellung.items) {
      // Leerzeile zwischen Artikeln hinzufügen
      if (vorheriger) {
        zeilen.push('');
      }
      
      if (artikel.is_custom_dumpling) {
        // Spezielles Layout für Knödel
        const knödelZeilen = formatiereBenutzerdefiniertenKnödel(artikel);
        zeilen.push(...knödelZeilen);
      } else {
        // Standardformat für andere Gerichte
        zeilen.push(`${artikel.qty} x ${artikel.code || artikel.name}`);
      }
      
      vorheriger = artikel;
    }
  }
  
  // Summenzeile hinzufügen
  zeilen.push(DIVIDER);
  zeilen.push(`Summe: ${bestellung.items?.length || 0} Artikel`);
  
  return zeilen;
}

/**
 * Konvertiert die Bestellung in das Druckformat (für Küchendruck)
 * @param {Bestellung} bestellung - Bestellungsobjekt
 * @returns {string[]} - Formatierte Zeilenanordnung
 */
export function formatierBestellungFürKüche(bestellung: Bestellung): string[] {
  return formatierBestellungVorschau(bestellung);
} 