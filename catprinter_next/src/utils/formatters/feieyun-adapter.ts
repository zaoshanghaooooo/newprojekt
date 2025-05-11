/**
 * Feieyun Cloud Druckadapter
 * Zum Formatieren von Bestellungen im Feieyun Cloud-Druckformat
 */

/**
 * Formatiert normalen Text als Feieyun-Tag-Inhalt
 * @param lines - Array mit ursprünglichen Textzeilen
 * @returns Mit Feieyun-Tags versehener Text
 */
export function formatToFeieyunContent(lines: string[]): string {
  const taggedLines: string[] = [];
  
  // Jede Zeile verarbeiten
  lines.forEach((line, index) => {
    // Zeitstempelbehandlung (rechtsbündig)
    if (index === 0 && line.trim().match(/\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}/)) {
      // Sicherstellen, dass der Zeitstempel normale Schrift verwendet (nicht fett)
      taggedLines.push(`${line}`);
      return;
    }
    
    // Bestellnummer und Bestellungs-ID behandeln (linksbündig, leicht fett - etwas fetter als der Zeitstempel)
    if (line.startsWith('Bestellungsnummer:') || line.startsWith('Bestellung-ID:')) {
      // Feieyun Cloud unterstützte Tags verwenden - müssen offizielle Tags sein
      // Feieyun-Tags: <BR>Zeilenumbruch, <L>Linksbündig, <C>Zentriert, <R>Rechtsbündig, <N>Normal, <HB>Große Schrift, <BOLD>Fettdruck, <CB>Zentriert Große Schrift
      taggedLines.push(`<BOLD>${line}</BOLD>`); // Fettdruck-Tag
      return;
    }
    
    // Leerzeilen behandeln
    if (line.trim() === '') {
      taggedLines.push('<BR>');
      return;
    }
    
    // Tischbehandlung (zentriert)
    if (line.trim().startsWith('Tisch:')) {
      taggedLines.push(`${line.trim()}`);
      return;
    }
    
    // Trennlinienbehandlung (linksbündig)
    if (line.startsWith('-') && line.indexOf(' ') === -1) {
      taggedLines.push(line);
      return;
    }
    
    // Eingerückte Zeilen behandeln (Anmerkungen oder Unterelemente)
    if (line.startsWith('  ')) {
      taggedLines.push(line);
      return;
    }
    
    // Normale Speisezeilen (linksbündig)
    taggedLines.push(line);
  });
  
  // Mit Feieyun-Zeilentrennzeichen verbinden
  return taggedLines.join('<BR>');
}

/**
 * Erstellt einen vollständigen Feieyun-formatierten Druckinhalt
 * @param order - Das zu formatierende Bestellungsobjekt
 * @param formattedLines - Vorformatierte Zeilen aus dem Formatter
 * @returns Vollständig formatierter Feieyun-Druckinhalt
 */
export function createFeieyunPrintContent(order: any, formattedLines: string[]): string {
  // Anwendung der Feieyun-spezifischen Formatierung
  const feieyunContent = formatToFeieyunContent(formattedLines);
  
  // Zusätzliche Feieyun-spezifische Anpassungen können hier hinzugefügt werden
  
  // Abschließende Leerzeilen für sauberes Papierabschneiden
  return feieyunContent + '<BR><BR><BR><BR>';
} 