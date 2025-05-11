/**
 * Kategorie-Druckerdienst
 * 
 * Dieser Dienst ermöglicht das Drucken von Bestellungen basierend auf Speisekategorien.
 * Unterschiedliche Speisenkategorien können auf verschiedene Drucker gesendet werden.
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { FormatService, PrinterType } from '@/utils/formatters/format-service';
import { PrintStyle } from '@/utils/formatters/styles';
import { Order, OrderItem, FoodItem } from '@/utils/formatters/types';
import { PrintStrategyFactory, PrintResult } from '@/utils/print-service';

/**
 * Kategorie-Druckerdienst
 */
export class CategoryPrinterService {
  private formatService: FormatService;
  
  constructor() {
    this.formatService = FormatService.getInstance();
  }
  
  /**
   * Drucker nach Kategorie abrufen
   * @param category - Die zu suchende Kategorie
   * @returns Ein Array von passenden Druckern
   */
  private async getPrintersByCategory(category: string): Promise<any[]> {
    // Drucker nach Kategorie abfragen
    const { data: printers, error } = await supabase
      .from('printers')
      .select('*')
      .or(`category.eq.${category},categories.cs.{${category}}`);
    
    if (error) {
      logger.error(`Fehler beim Abrufen von Druckern für Kategorie ${category}: ${error.message}`);
      return [];
    }
    
    return printers || [];
  }
  
  /**
   * Bestellungen nach Kategorie gruppieren
   * @param order - Die Originalbestellung
   * @param items - Die Bestellungspositionen
   * @returns Ein Objekt mit Kategorien als Schlüssel und zugehörigen Artikeln als Werte
   */
  private async groupItemsByCategory(order: Order, items: OrderItem[]): Promise<{ [key: string]: OrderItem[] }> {
    // Kategoriezuordnung für jedes Element abrufen
    const itemIds = items.map(item => item.dish_id).filter(Boolean);
    
    // Gerichte aus der Datenbank abrufen
    const { data: dishes, error } = await supabase
      .from('dishes')
      .select('id, category')
      .in('id', itemIds);
    
    if (error) {
      logger.error(`Fehler beim Abrufen von Gerichtskategorien: ${error.message}`);
      return { 'default': items };
    }
    
    // Gerichte-ID zu Kategorie-Mapping erstellen
    const dishCategoryMap: {[key: string]: string} = {};
    for (const dish of dishes) {
      dishCategoryMap[dish.id] = dish.category || 'default';
    }
    
    // Artikelgruppen nach Kategorie
    const categorizedItems: { [key: string]: OrderItem[] } = {};
    
    for (const item of items) {
      // Kategorie aus Mapping abrufen oder Standardkategorie verwenden
      let category = 'default';
      
      if (item.dish_id && dishCategoryMap[item.dish_id]) {
        category = dishCategoryMap[item.dish_id];
      } else if (item.food_type) {
        // Fallback: Nach Speisetyp kategorisieren
        category = item.food_type;
      }
      
      // Kategorie-Array initialisieren, wenn es noch nicht existiert
      if (!categorizedItems[category]) {
        categorizedItems[category] = [];
      }
      
      // Artikel zur entsprechenden Kategorie hinzufügen
      categorizedItems[category].push(item);
    }
    
    return categorizedItems;
  }
  
  /**
   * Nach Kategorie drucken
   * @param order - Die zu druckende Bestellung
   * @param items - Die Bestellungspositionen
   * @returns Ein Objekt mit Druckergebnissen nach Kategorie
   */
  public async printByCategory(order: Order, items: OrderItem[]): Promise<{
    success: boolean;
    message: string;
    results: { [key: string]: PrintResult };
  }> {
    try {
      // Artikel nach Kategorie gruppieren
      const categorizedItems = await this.groupItemsByCategory(order, items);
      
      // Druckergebnisse
      const results: { [key: string]: PrintResult } = {};
      let overallSuccess = true;
      
      // Jede Kategorie auf dem entsprechenden Drucker drucken
      for (const [category, categoryItems] of Object.entries(categorizedItems)) {
        // Drucker für diese Kategorie abrufen
        const printers = await this.getPrintersByCategory(category);
        
        if (printers.length === 0) {
          logger.warn(`Keine Drucker für Kategorie "${category}" gefunden, verwende Standarddrucker`);
          
          // Standarddrucker abrufen
          const { data: defaultPrinters } = await supabase
            .from('printers')
            .select('*')
            .eq('isDefault', true)
            .limit(1);
          
          if (defaultPrinters && defaultPrinters.length > 0) {
            const printer = defaultPrinters[0];
            const printType = printer.type || 'network';
            
            // Druckstrategie erstellen
            const strategy = PrintStrategyFactory.create(printType);
            
            // Kategorieartikel drucken
            const result = await strategy.print(order, categoryItems, printer);
            results[category] = result;
            
            if (!result.success) {
              overallSuccess = false;
            }
          } else {
            logger.error(`Kein Standarddrucker konfiguriert für Kategorie "${category}"`);
            results[category] = {
              success: false,
              message: `Kein Drucker für Kategorie "${category}" konfiguriert`
            };
            overallSuccess = false;
          }
        } else {
          // Auf jeden konfigurierten Drucker für diese Kategorie drucken
          for (const printer of printers) {
            const printType = printer.type || 'network';
            
            // Druckstrategie erstellen
            const strategy = PrintStrategyFactory.create(printType);
            
            // Kategorieartikel drucken
            const result = await strategy.print(order, categoryItems, printer);
            
            // Ergebnisse speichern
            if (!results[category]) {
              results[category] = result;
            }
            
            if (!result.success) {
              overallSuccess = false;
            }
          }
        }
      }
      
      // Gesamtergebnis zurückgeben
      return {
        success: overallSuccess,
        message: overallSuccess 
          ? 'Alle Kategorien erfolgreich gedruckt' 
          : 'Einige Kategorien konnten nicht gedruckt werden',
        results
      };
      
    } catch (error) {
      logger.error(`Kategoriedruckfehler: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        message: `Druckfehler: ${error instanceof Error ? error.message : String(error)}`,
        results: {}
      };
    }
  }
  
  /**
   * Getränke und Speisen separat drucken
   * @param order - Die zu druckende Bestellung
   * @param items - Die Bestellungspositionen
   * @returns Ein Objekt mit Druckergebnissen für Getränke und Speisen
   */
  public async printBeveragesAndFoodSeparately(order: Order, items: OrderItem[]): Promise<{
    success: boolean;
    message: string;
    beverages_result?: PrintResult;
    food_result?: PrintResult;
  }> {
    try {
      // 添加详细的订单项目日志
      logger.info('打印订单项目详情:', JSON.stringify(items.map(item => ({
        id: item.id,
        name: item.name,
        food_type: item.food_type,
        quantity: item.quantity
      }))));
      
      // 改进饮品识别逻辑
      const beverageItems = items.filter(item => 
        item.food_type === 'drink' || 
        item.food_type === 'beverage' || 
        (item.food_type || '').toLowerCase().includes('drink') ||
        ((item as any).type === 'drink') ||
        ((item as any).code?.startsWith('COC') || 
        (item as any).code?.startsWith('BEV'))
      );
      
      // 使用更安全的方式过滤食物项目
      const foodItems = items.filter(item => !beverageItems.includes(item));
      
      logger.info(`订单分类结果: 饮品=${beverageItems.length}项, 食物=${foodItems.length}项`, {
        beverages: beverageItems.map(i => i.name),
        foods: foodItems.map(i => i.name)
      });
      
      // Ergebnisse initialisieren
      let beveragesResult: PrintResult | undefined;
      let foodResult: PrintResult | undefined;
      
      // Getränkedrucker abrufen
      const { data: beveragePrinters } = await supabase
        .from('printers')
        .select('*')
        .or('category.eq.beverage,category.eq.drink')
        .limit(1);
      
      // Speisendrucker abrufen
      const { data: foodPrinters } = await supabase
        .from('printers')
        .select('*')
        .eq('category', 'food')
        .limit(1);
      
      // 添加打印机情况的日志
      logger.info('打印机配置:', {
        beveragePrinters: beveragePrinters?.length || 0, 
        foodPrinters: foodPrinters?.length || 0
      });
      
      // Standarddrucker für den Fall, dass keine kategoriespezifischen Drucker konfiguriert sind
      const { data: defaultPrinters } = await supabase
        .from('printers')
        .select('*')
        .eq('isDefault', true)
        .limit(1);
      
      // Getränke drucken, wenn vorhanden
      if (beverageItems.length > 0) {
        const beveragePrinter = beveragePrinters?.[0] || defaultPrinters?.[0];
        
        if (beveragePrinter) {
          const printType = beveragePrinter.type || 'network';
          const strategy = PrintStrategyFactory.create(printType);
          beveragesResult = await strategy.print(order, beverageItems, beveragePrinter);
        } else {
          beveragesResult = {
            success: false,
            message: 'Kein Drucker für Getränke konfiguriert'
          };
        }
      }
      
      // Speisen drucken, wenn vorhanden
      if (foodItems.length > 0) {
        const foodPrinter = foodPrinters?.[0] || defaultPrinters?.[0];
        
        if (foodPrinter) {
          const printType = foodPrinter.type || 'network';
          const strategy = PrintStrategyFactory.create(printType);
          foodResult = await strategy.print(order, foodItems, foodPrinter);
        } else {
          foodResult = {
            success: false,
            message: 'Kein Drucker für Speisen konfiguriert'
          };
        }
      }
      
      // Gesamtergebnis bestimmen
      const beverageSuccess = beverageItems.length === 0 ||
                             (beveragesResult !== undefined && beveragesResult.success === true);
      const foodSuccess = foodItems.length === 0 ||
                         (foodResult !== undefined && foodResult.success === true);
      const overallSuccess = beverageSuccess && foodSuccess;
      
      logger.info(`打印结果: 饮品=${beverageSuccess ? '成功' : '失败'}, 食物=${foodSuccess ? '成功' : '失败'}, 总体=${overallSuccess ? '成功' : '失败'}`);
      
      return {
        success: overallSuccess,
        message: overallSuccess 
          ? 'Getränke und Speisen erfolgreich gedruckt' 
          : 'Probleme beim Drucken von Getränken oder Speisen',
        beverages_result: beveragesResult,
        food_result: foodResult
      };
      
    } catch (error) {
      logger.error(`Fehler beim separaten Drucken: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        message: `Druckfehler: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
} 