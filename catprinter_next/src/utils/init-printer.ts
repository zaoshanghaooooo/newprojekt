import { supabaseAdmin } from '@/lib/supabase-server';
import printerConfig from './printer-config';
import logger from './logger';

/**
 * Drucker-Initialisierungsskript
 * Wird beim Anwendungsstart verwendet, um die Druckerkonfiguration zu initialisieren
 */
export async function initPrinter() {
  // Überprüfen der Umgebungsvariablen-Konfiguration
  const hasEnvConfig = printerConfig.isConfigured();
  
  if (hasEnvConfig) {
    logger.info('Feie Yun Drucker-Konfiguration in Umgebungsvariablen gefunden');
  } else {
    logger.warn('Keine vollständige Feie Yun Drucker-Konfiguration in Umgebungsvariablen gefunden');
  }
  
  try {
    // Überprüfen der Datenbank-Konfiguration
    const { data: userSetting } = await supabaseAdmin
      .from('system_settings')
      .select()
      .eq('key', 'feieyun_user')
      .single();
    
    const { data: keySetting } = await supabaseAdmin
      .from('system_settings')
      .select()
      .eq('key', 'feieyun_key')
      .single();
    
    const hasDbConfig = !!(userSetting?.value && keySetting?.value);
    
    // Wenn keine Datenbank-Konfiguration vorhanden ist, aber Umgebungsvariablen existieren
    if (!hasDbConfig && hasEnvConfig) {
      logger.info('Schreibe Feie Yun Konfiguration in die Datenbank...');
      
      // Benutzer-Konfiguration erstellen oder aktualisieren
      await supabaseAdmin
        .from('system_settings')
        .upsert({
          key: 'feieyun_user',
          value: printerConfig.feieyun.user,
          updated_at: new Date().toISOString()
        });
      
      // Schlüssel-Konfiguration erstellen oder aktualisieren
      await supabaseAdmin
        .from('system_settings')
        .upsert({
          key: 'feieyun_key',
          value: printerConfig.feieyun.ukey,
          updated_at: new Date().toISOString()
        });
      
      // URL-Konfiguration erstellen oder aktualisieren
      await supabaseAdmin
        .from('system_settings')
        .upsert({
          key: 'feieyun_url',
          value: printerConfig.feieyun.url,
          updated_at: new Date().toISOString()
        });
      
      // Überprüfen ob bereits ein Drucker mit dieser SN existiert
      const { data: existingPrinter } = await supabaseAdmin
        .from('printers')
        .select('*')
        .eq('sn', printerConfig.feieyun.sn)
        .maybeSingle();

      if (existingPrinter) {
        // Wenn Drucker mit SN existiert, aber nicht Standard ist, setze ihn als Standard
        if (!existingPrinter.is_default) {
          logger.info(`Printer with SN ${printerConfig.feieyun.sn} exists but is not default. Setting as default.`);
          const { error: updateError } = await supabaseAdmin
            .from('printers')
            .update({ is_default: true })
            .eq('id', existingPrinter.id);
          if (updateError) {
            logger.error('Error setting existing printer as default:', updateError);
            throw updateError;
          }
        } else {
           logger.info(`Printer with SN ${printerConfig.feieyun.sn} already exists and is default.`);
        }
      } else {
        // Wenn kein Drucker mit dieser SN existiert, Standard-Drucker erstellen
        logger.info('No printer found with configured SN. Creating default printer.');
        const { error: insertError } = await supabaseAdmin
          .from('printers')
          .insert({
            name: 'Standard Feie Yun Drucker',
            sn: printerConfig.feieyun.sn,
            type: 'thermal',
            status: 'active',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        if (insertError) {
          logger.error('Error inserting default printer:', insertError);
          throw insertError;
        }
      }
      
      logger.info('Feie Yun Drucker-Konfiguration erfolgreich in Datenbank geschrieben');
    } else if (hasDbConfig) {
      logger.info('Feie Yun Drucker-Konfiguration bereits in Datenbank vorhanden');
    } else {
      logger.warn('Keine verfügbare Feie Yun Drucker-Konfiguration gefunden, bitte im Verwaltungsbereich konfigurieren');
    }
  } catch (error) {
    logger.error('Fehler bei der Initialisierung der Drucker-Konfiguration:', error);
  }
}

export default initPrinter; 