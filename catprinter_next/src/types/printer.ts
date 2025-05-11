/**
 * Druckertypen und Schnittstellen
 */

export interface BestellungItem {
  qty: number;
  code?: string;
  name: string;
  is_custom_dumpling?: boolean;
  sub_items?: Record<string, number>;
}

export interface Bestellung {
  date_time?: Date | string;
  order_id?: string;
  table_no?: string;
  items?: BestellungItem[];
}

export interface DruckerKonfiguration {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  is_active: boolean;
}

export interface DruckProtokoll {
  id: string;
  printer_id: string;
  order_id: string;
  status: 'ERFOLG' | 'FEHLGESCHLAGEN';
  error_message?: string;
  created_at: Date;
}

export interface DruckAuftrag {
  bestellung: Bestellung;
  drucker: DruckerKonfiguration;
  retry_count?: number;
} 