export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          changed_by: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          event_type: string
          id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          event_type: string
          id?: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          category_number: number
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category_number: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category_number?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          location_id: string
          product_id: string
          quantity_on_hand: number
          reorder_point: number
          reorder_quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          product_id: string
          quantity_on_hand?: number
          reorder_point?: number
          reorder_quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          product_id?: string
          quantity_on_hand?: number
          reorder_point?: number
          reorder_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sku_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          location_id: string
          notes: string | null
          performed_by: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_delta: number
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          performed_by?: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_delta: number
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          performed_by?: string | null
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_delta?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sku_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          location_id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          location_id: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          location_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          state: string
          tenant_id: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          state?: string
          tenant_id: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          state?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nightly_submission_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity_sold: number
          retail_price: number | null
          submission_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity_sold: number
          retail_price?: number | null
          submission_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity_sold?: number
          retail_price?: number | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nightly_submission_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "nightly_submission_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "nightly_submission_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sku_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nightly_submission_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nightly_submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "nightly_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nightly_submission_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "nightly_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      nightly_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          location_id: string
          notes: string | null
          sales_total: number | null
          status: Database["public"]["Enums"]["nightly_status"]
          submission_date: string
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          sales_total?: number | null
          status?: Database["public"]["Enums"]["nightly_status"]
          submission_date?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          sales_total?: number | null
          status?: Database["public"]["Enums"]["nightly_status"]
          submission_date?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nightly_submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nightly_submissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nightly_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      po_receipts: {
        Row: {
          id: string
          location_id: string
          notes: string | null
          po_id: string
          po_item_id: string
          quantity_expected: number | null
          quantity_received: number
          received_at: string
          received_by: string | null
          transaction_id: string | null
        }
        Insert: {
          id?: string
          location_id: string
          notes?: string | null
          po_id: string
          po_item_id: string
          quantity_expected?: number | null
          quantity_received: number
          received_at?: string
          received_by?: string | null
          transaction_id?: string | null
        }
        Update: {
          id?: string
          location_id?: string
          notes?: string | null
          po_id?: string
          po_item_id?: string
          quantity_expected?: number | null
          quantity_received?: number
          received_at?: string
          received_by?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_receipts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "po_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receipts_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json | null
          brand: string | null
          category_id: string
          cost_price: number | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          product_number: number
          retail_price: number | null
          supplier_id: string | null
        }
        Insert: {
          attributes?: Json | null
          brand?: string | null
          category_id: string
          cost_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          product_number: number
          retail_price?: number | null
          supplier_id?: string | null
        }
        Update: {
          attributes?: Json | null
          brand?: string | null
          category_id?: string
          cost_price?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          product_number?: number
          retail_price?: number | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_sku_lookup"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "po_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string | null
          full_name: string
          id: string
          is_active: boolean
          pin: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          full_name: string
          id: string
          is_active?: boolean
          pin?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          pin?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received: number
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          po_id?: string
          product_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "po_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_status"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sku_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expected_at: string | null
          id: string
          location_id: string
          notes: string | null
          ordered_at: string | null
          po_number: string
          received_at: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expected_at?: string | null
          id?: string
          location_id: string
          notes?: string | null
          ordered_at?: string | null
          po_number: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expected_at?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          ordered_at?: string | null
          po_number?: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "po_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          lead_days: number | null
          name: string
          notes: string | null
          phone: string | null
          website: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          lead_days?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          website?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          lead_days?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          website?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          slug?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_status: {
        Row: {
          brand: string | null
          category_name: string | null
          is_low_stock: boolean | null
          is_out_of_stock: boolean | null
          location_name: string | null
          product_id: string | null
          product_name: string | null
          quantity_on_hand: number | null
          reorder_point: number | null
          reorder_quantity: number | null
          sku: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      low_stock_alerts: {
        Row: {
          brand: string | null
          category_name: string | null
          is_low_stock: boolean | null
          is_out_of_stock: boolean | null
          location_name: string | null
          product_id: string | null
          product_name: string | null
          quantity_on_hand: number | null
          reorder_point: number | null
          reorder_quantity: number | null
          sku: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      nightly_summary: {
        Row: {
          id: string | null
          location_name: string | null
          product_count: number | null
          sales_total: number | null
          status: Database["public"]["Enums"]["nightly_status"] | null
          submission_date: string | null
          submitted_at: string | null
          submitted_by_name: string | null
          total_units_sold: number | null
        }
        Relationships: []
      }
      po_summary: {
        Row: {
          created_at: string | null
          created_by_name: string | null
          expected_at: string | null
          id: string | null
          lead_days: number | null
          line_item_count: number | null
          location_id: string | null
          location_name: string | null
          notes: string | null
          ordered_at: string | null
          po_number: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["po_status"] | null
          supplier_id: string | null
          supplier_name: string | null
          total_cost: number | null
          total_ordered: number | null
          total_received: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sku_lookup: {
        Row: {
          attributes: Json | null
          brand: string | null
          category_id: string | null
          category_name: string | null
          category_number: number | null
          cost_price: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          product_number: number | null
          retail_price: number | null
          sku: string | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "po_summary"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_initial_stock: {
        Args: {
          p_location_id: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
        }
        Returns: number
      }
      apply_manual_adjustment: {
        Args: {
          p_delta: number
          p_location_id: string
          p_new_qty: number
          p_notes: string
          p_product_id: string
        }
        Returns: number
      }
      deactivate_user: { Args: { p_user_id: string }; Returns: undefined }
      delete_brand: { Args: { p_id: string }; Returns: undefined }
      delete_category: { Args: { p_id: string }; Returns: undefined }
      delete_supplier: { Args: { p_id: string }; Returns: undefined }
      get_setting: { Args: { p_key: string }; Returns: Json }
      my_location_ids: { Args: never; Returns: string[] }
      my_tenant_id: { Args: never; Returns: string }
      receive_po_items: {
        Args: { p_po_id: string; p_receipts: Json }
        Returns: Json
      }
      remove_user_location: {
        Args: { p_location_id: string; p_user_id: string }
        Returns: undefined
      }
      set_product_active: {
        Args: { p_id: string; p_is_active: boolean }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          p_location_id: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      update_location: {
        Args: {
          p_address: string
          p_city: string
          p_id: string
          p_name: string
          p_phone: string
          p_state: string
        }
        Returns: undefined
      }
      update_profile: {
        Args: { p_display_name: string; p_full_name: string; p_user_id: string }
        Returns: undefined
      }
      update_setting: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      upsert_brand: { Args: { p_id: string; p_name: string }; Returns: string }
      upsert_category: {
        Args: {
          p_category_number: number
          p_description: string
          p_id: string
          p_name: string
        }
        Returns: string
      }
      upsert_product: {
        Args: {
          p_attributes: Json
          p_brand: string
          p_category_id: string
          p_cost_price: number
          p_id: string
          p_is_active: boolean
          p_name: string
          p_notes: string
          p_product_number: number
          p_retail_price: number
          p_supplier_id: string
        }
        Returns: string
      }
      upsert_reorder_point: {
        Args: {
          p_location_id: string
          p_product_id: string
          p_reorder_point: number
          p_reorder_qty: number
        }
        Returns: undefined
      }
      upsert_supplier: {
        Args: {
          p_contact: string
          p_email: string
          p_id: string
          p_lead_days: number
          p_name: string
          p_notes: string
          p_phone: string
          p_website: string
        }
        Returns: string
      }
      user_role_at: {
        Args: { loc_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      nightly_status: "open" | "submitted" | "approved" | "rejected"
      po_status: "draft" | "sent" | "partial" | "received" | "cancelled"
      transaction_type:
        | "sale"
        | "receive"
        | "adjustment"
        | "transfer_out"
        | "transfer_in"
        | "initial"
      user_role: "owner" | "manager" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      nightly_status: ["open", "submitted", "approved", "rejected"],
      po_status: ["draft", "sent", "partial", "received", "cancelled"],
      transaction_type: [
        "sale",
        "receive",
        "adjustment",
        "transfer_out",
        "transfer_in",
        "initial",
      ],
      user_role: ["owner", "manager", "employee"],
    },
  },
} as const
