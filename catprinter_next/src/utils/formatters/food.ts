import { FoodItem, Formatter, BeverageItem, DumplingItem, SubItem } from './types';

/**
 * Formatter für normale Speisen
 */
export class RegularFoodFormatter implements Formatter {
  public format(item: FoodItem, prefix: string = ""): string[] {
    const result: string[] = [];

    // Basisinformationszeile
    const baseLine = item.code ? 
      `${item.qty}x ${item.code} ${item.name}` : 
      `${item.qty}x ${item.name}`;
    result.push(baseLine);

    // Anmerkungen hinzufügen
    if (item.detail) {
      result.push(`  Hinweis: ${item.detail}`);
    }

    return result;
  }
}

/**
 * Formatter für Getränke
 */
export class BeverageFormatter implements Formatter {
  public format(item: BeverageItem, prefix: string = ""): string[] {
    const result: string[] = [];

    // Basisinformationszeile
    let baseLine = item.code ? 
      `${item.qty}x ${item.code} ${item.name}` : 
      `${item.qty}x ${item.name}`;

    // Volumeninformationen hinzufügen
    if (item.volume) {
      baseLine += ` ${item.volume}`;
    }
    result.push(baseLine);

    // Untereinträge hinzufügen
    if (item.sub_items?.length) {
      item.sub_items.forEach(subItem => {
        result.push(`  +${subItem.name}`);
      });
    }

    // Anmerkungen hinzufügen
    if (item.detail) {
      result.push(`  Hinweis: ${item.detail}`);
    }

    return result;
  }
}

/**
 * Formatter für individuelle Teigtaschen
 */
export class CustomDumplingFormatter implements Formatter {
  public format(item: DumplingItem, prefix: string = ""): string[] {
    const result: string[] = [];

    // Basisinformationszeile
    const baseLine = item.code ? 
      `${item.qty}x ${item.code} ${item.name}` : 
      `${item.qty}x ${item.name}`;
    result.push(baseLine);

    // Teigtaschentyp verarbeiten
    let fixedCount = 0;
    if (item.dumpling_type === 'fixed_10') {
      result.push(`  Feste 10 Dumplings`);
      fixedCount = 10;
    } else if (item.dumpling_type === 'fixed_15') {
      result.push(`  Feste 15 Dumplings`);
      fixedCount = 15;
    }

    // Untereinträge hinzufügen
    if (item.sub_items?.length) {
      let customCount = 0;
      item.sub_items.forEach(subItem => {
        const qty = subItem.qty || 1;
        customCount += qty;
        result.push(`  ${qty}x ${subItem.name}`);
      });

      // Gesamtzahl der Teigtaschen anzeigen
      const totalCount = fixedCount + customCount;
      if (item.dumpling_type === 'fixed_10' && customCount > 0) {
        result.push(`  Dumplings: Feste 10 + Auswahl ${customCount} = Gesamt ${totalCount}`);
      } else if (item.dumpling_type === 'custom') {
        result.push(`  Gesamt: ${customCount} individuelle Dumplings`);
      } else {
        result.push(`  Gesamt: ${totalCount} Dumplings`);
      }
    } else if (fixedCount > 0) {
      result.push(`  Gesamt: ${fixedCount} Dumplings`);
    }

    // Anmerkungen hinzufügen
    if (item.detail) {
      result.push(`  Hinweis: ${item.detail}`);
    }

    return result;
  }
}

/**
 * Formatter für Menüs
 */
export class SetMealFormatter implements Formatter {
  public format(item: FoodItem, prefix: string = ""): string[] {
    const result: string[] = [];

    // Basisinformationszeile
    const baseLine = item.code ? 
      `${item.qty}x ${item.code} ${item.name}` : 
      `${item.qty}x ${item.name}`;
    result.push(baseLine);

    // Untereinträge hinzufügen
    if (item.sub_items?.length) {
      item.sub_items.forEach(subItem => {
        const qty = subItem.qty || 1;
        result.push(`  ${qty}x ${subItem.name}`);
      });
    }

    // Anmerkungen hinzufügen
    if (item.detail) {
      result.push(`  Hinweis: ${item.detail}`);
    }

    return result;
  }
}

/**
 * Formatter für Speisen mit besonderen Anforderungen
 */
export class SpecialRequirementFormatter implements Formatter {
  public format(item: FoodItem, prefix: string = ""): string[] {
    const result: string[] = [];

    // Basisinformationszeile
    const baseLine = item.code ? 
      `${item.qty}x ${item.code} ${item.name}` : 
      `${item.qty}x ${item.name}`;
    result.push(baseLine);

    // Anmerkungen hinzufügen
    if (item.detail) {
      result.push(`  Hinweis: ${item.detail}`);
    }

    return result;
  }
}

/**
 * Fabrik für Speisenformatierer
 */
export class FoodItemFormatterFactory {
  private static formatters = {
    "food": RegularFoodFormatter,
    "drink": BeverageFormatter,
    "custom_dumpling": CustomDumplingFormatter,
    "set_meal": SetMealFormatter,
    "special": SpecialRequirementFormatter
  };

  /**
   * Registrierung eines neuen Formatierers
   */
  public static registerFormatter(typeCode: string, formatterClass: new () => Formatter): void {
    this.formatters[typeCode] = formatterClass;
  }

  /**
   * Abrufen des entsprechenden Formatierers
   */
  public static getFormatter(item: FoodItem): Formatter {
    // Zunächst prüfen, ob es sich um individuelle Teigtaschen handelt
    if (item.is_custom_dumpling) {
      return new this.formatters["custom_dumpling"]();
    }

    // Dann das food_type-Feld prüfen
    if (item.food_type && item.food_type in this.formatters && item.food_type !== "special") {
      return new this.formatters[item.food_type]();
    }

    // Identifizierung anhand des Codes
    if (item.code) {
      const code = item.code.toUpperCase();
      if (code.startsWith('D')) {
        return new this.formatters["drink"]();
      } else if (code.startsWith('CD')) {
        return new this.formatters["custom_dumpling"]();
      } else if (code.startsWith('S')) {
        return new this.formatters["set_meal"]();
      }
    }

    // Standardmäßig als normale Speise behandeln
    return new this.formatters["food"]();
  }
} 