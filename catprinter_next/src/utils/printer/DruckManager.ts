/**
 * Druckauftragsmanager
 */
import { DruckAuftrag, DruckProtokoll, DruckerKonfiguration } from '@/types/printer';
import { formatierBestellungFürKüche } from './formatter';

export class DruckManager {
  private auftragsQueue: DruckAuftrag[] = [];
  private maxRetries: number = 3;
  private isProcessing: boolean = false;
  
  /**
   * Fügt einen neuen Druckauftrag zur Warteschlange hinzu
   * @param {DruckAuftrag} auftrag - Der Druckauftrag
   */
  public async hinzufügenAuftrag(auftrag: DruckAuftrag): Promise<void> {
    this.auftragsQueue.push({
      ...auftrag,
      retry_count: 0
    });
    
    if (!this.isProcessing) {
      await this.verarbeiteQueue();
    }
  }
  
  /**
   * Verarbeitet die Druckauftrags-Warteschlange
   */
  private async verarbeiteQueue(): Promise<void> {
    if (this.isProcessing || this.auftragsQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.auftragsQueue.length > 0) {
        const auftrag = this.auftragsQueue[0];
        
        try {
          await this.druckeAuftrag(auftrag);
          this.auftragsQueue.shift(); // Erfolgreichen Auftrag entfernen
        } catch (error) {
          if ((auftrag.retry_count || 0) < this.maxRetries) {
            // Erhöhe Wiederholungszähler und verschiebe ans Ende der Warteschlange
            auftrag.retry_count = (auftrag.retry_count || 0) + 1;
            this.auftragsQueue.push(this.auftragsQueue.shift()!);
          } else {
            // Maximale Wiederholungen erreicht, Auftrag entfernen
            this.auftragsQueue.shift();
            await this.protokolliereFehler(auftrag, error as Error);
          }
        }
        
        // Kurze Pause zwischen Druckaufträgen
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Führt den eigentlichen Druckvorgang aus
   * @param {DruckAuftrag} auftrag - Der auszuführende Druckauftrag
   */
  private async druckeAuftrag(auftrag: DruckAuftrag): Promise<void> {
    const formatierteZeilen = formatierBestellungFürKüche(auftrag.bestellung);
    
    // TODO: Implementiere die tatsächliche Drucklogik hier
    // Dies würde die Kommunikation mit dem physischen Drucker beinhalten
    
    await this.protokolliereErfolg(auftrag);
  }
  
  /**
   * Protokolliert einen erfolgreichen Druckvorgang
   * @param {DruckAuftrag} auftrag - Der erfolgreiche Druckauftrag
   */
  private async protokolliereErfolg(auftrag: DruckAuftrag): Promise<void> {
    const protokoll: DruckProtokoll = {
      id: crypto.randomUUID(),
      printer_id: auftrag.drucker.id,
      order_id: auftrag.bestellung.order_id!,
      status: 'ERFOLG',
      created_at: new Date()
    };
    
    // TODO: Speichere das Protokoll in der Datenbank
  }
  
  /**
   * Protokolliert einen fehlgeschlagenen Druckvorgang
   * @param {DruckAuftrag} auftrag - Der fehlgeschlagene Druckauftrag
   * @param {Error} error - Der aufgetretene Fehler
   */
  private async protokolliereFehler(auftrag: DruckAuftrag, error: Error): Promise<void> {
    const protokoll: DruckProtokoll = {
      id: crypto.randomUUID(),
      printer_id: auftrag.drucker.id,
      order_id: auftrag.bestellung.order_id!,
      status: 'FEHLGESCHLAGEN',
      error_message: error.message,
      created_at: new Date()
    };
    
    // TODO: Speichere das Protokoll in der Datenbank
  }
} 