export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      dishes: {
        Row: {
          id: string  // UUID in PostgreSQL
          code: string
          name: string
          price: number
          category: string
          description: string | null
          image_url: string | null
          is_active: boolean
          food_type: string | null
          volume: string | null
          has_sub_items: boolean
          sub_items: Json | null
          drink_items: Json | null
          food_default_items: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          price: number
          category?: string
          description?: string | null
          image_url?: string | null
          is_active?: boolean
          food_type?: string | null
          volume?: string | null
          has_sub_items?: boolean
          sub_items?: Json | null
          drink_items?: Json | null
          food_default_items?: Json | null
        }
        Update: {
          code?: string
          name?: string
          price?: number
          category?: string
          description?: string | null
          image_url?: string | null
          is_active?: boolean
          food_type?: string | null
          volume?: string | null
          has_sub_items?: boolean
          sub_items?: Json | null
          drink_items?: Json | null
          food_default_items?: Json | null
        }
      }
      orders: {
        Row: {
          id: number
          status: string
          total_amount: number
          customer_name: string | null
          customer_phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          status: string
          total_amount: number
          customer_name?: string | null
          customer_phone?: string | null
          notes?: string | null
        }
        Update: {
          status?: string
          total_amount?: number
          customer_name?: string | null
          customer_phone?: string | null
          notes?: string | null
        }
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          dish_id: number
          quantity: number
          unit_price: number
          notes: string | null
          created_at: string
        }
        Insert: {
          order_id: number
          dish_id: number
          quantity: number
          unit_price: number
          notes?: string | null
        }
        Update: {
          quantity?: number
          unit_price?: number
          notes?: string | null
        }
      }
      printers: {
        Row: {
          id: number
          name: string
          sn: string
          key: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          sn: string
          key: string
          status: string
        }
        Update: {
          name?: string
          sn?: string
          key?: string
          status?: string
        }
      }
      print_logs: {
        Row: {
          id: number
          printer_id: number
          content: string
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          printer_id: number
          content: string
          status: string
          error_message?: string | null
        }
        Update: {
          status?: string
          error_message?: string | null
        }
      }
      system_settings: {
        Row: {
          id: number
          key: string
          value: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          key: string
          value: string
          createdAt?: string
          updatedAt: string
        }
        Update: {
          key?: string
          value?: string
          updatedAt?: string
        }
      }
      system_logs: {
        Row: {
          id: number
          level: string
          source: string | null
          message: string
          details: string | null
          createdAt: string
        }
        Insert: {
          level: string
          source?: string | null
          message: string
          details?: string | null
          createdAt: string
        }
        Update: {
          level?: string
          source?: string | null
          message?: string
          details?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 