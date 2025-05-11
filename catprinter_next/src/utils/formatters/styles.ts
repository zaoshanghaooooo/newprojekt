import { PrintStyleConfig } from './types';

/**
 * Druckstilkonfigurationsklasse
 */
export class PrintStyle {
  public copies: number;
  public boldTitle: boolean;
  public enlargedTable: boolean;
  public dividerChar: string;
  public lineWidth: number;

  constructor(config?: PrintStyleConfig) {
    // Standardwerte setzen
    const defaultCopies = process.env.NEXT_PUBLIC_PRINT_COPIES ? 
      parseInt(process.env.NEXT_PUBLIC_PRINT_COPIES, 10) : 1;

    this.copies = config?.copies ?? defaultCopies;
    this.boldTitle = config?.boldTitle ?? true;
    this.enlargedTable = config?.enlargedTable ?? true;
    this.dividerChar = config?.dividerChar ?? "-";
    this.lineWidth = config?.lineWidth ?? 32;
  }

  /**
   * Trennlinie abrufen
   */
  public getDivider(): string {
    return this.dividerChar.repeat(this.lineWidth);
  }
} 