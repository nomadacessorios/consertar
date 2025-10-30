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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cash_register: {
        Row: {
          closed_at: string | null
          final_amount: number | null
          id: string
          initial_amount: number
          opened_at: string | null
          opened_by: string
          store_id: string
        }
        Insert: {
          closed_at?: string | null
          final_amount?: number | null
          id?: string
          initial_amount: number
          opened_at?: string | null
          opened_by: string
          store_id: string
        }
        Update: {
          closed_at?: string | null
          final_amount?: number | null
          id?: string
          initial_amount?: number
          opened_at?: string | null
          opened_by?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          cep: string | null
          created_at: string | null
          customer_id: string
          id: string
          name: string
          neighborhood: string
          number: string | null
          reference: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          cep?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          name: string
          neighborhood: string
          number?: string | null
          reference?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          cep?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          name?: string
          neighborhood?: string
          number?: string | null
          reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          phone: string
          store_id: string
          updated_at: string | null
          points: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          phone: string
          store_id: string
          updated_at?: string | null
          points?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          phone?: string
          store_id?: string
          updated_at?: string | null
          points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rules: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          min_purchase_amount: number | null
          name: string
          points_per_real: number | null
          store_id: string
          updated_at: string | null
          points_required: number | null
          reward: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          min_purchase_amount?: number | null
          name: string
          points_per_real?: number | null
          store_id: string
          updated_at?: string | null
          points_required?: number | null
          reward?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          min_purchase_amount?: number | null
          name?: string
          points_per_real?: number | null
          store_id?: string
          updated_at?: string | null
          points_required?: number | null
          reward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          store_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          store_id: string
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          store_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          product_variation_id: string | null
          quantity: number
          subtotal: number
          variation_name: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          product_variation_id?: string | null
          quantity: number
          subtotal: number
          variation_name?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          product_variation_id?: string | null
          quantity?: number
          subtotal?: number
          variation_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_variation_id_fkey"
            columns: ["product_variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_register_id: string | null
          change_for: number | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivery: boolean | null
          delivery_cep: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_neighborhood: string | null
          delivery_number: string | null
          delivery_reference: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          pickup_time: string | null
          reservation_date: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          total: number
          updated_at: string | null
        }
        Insert: {
          cash_register_id?: string | null
          change_for?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery?: boolean | null
          delivery_cep?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_neighborhood?: string | null
          delivery_number?: string | null
          delivery_reference?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          pickup_time?: string | null
          reservation_date?: string | null
          source: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          total: number
          updated_at?: string | null
        }
        Update: {
          cash_register_id?: string | null
          change_for?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery?: boolean | null
          delivery_cep?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_neighborhood?: string | null
          delivery_number?: string | null
          delivery_reference?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          pickup_time?: string | null
          reservation_date?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price_adjustment: number
          product_id: string
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price_adjustment?: number
          product_id: string
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price_adjustment?: number
          product_id?: string
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          has_variations: boolean | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock_quantity: number | null
          store_id: string
          updated_at: string | null
          earns_loyalty_points: boolean | null
          loyalty_points_value: number | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          has_variations?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock_quantity?: number | null
          store_id: string
          updated_at?: string | null
          earns_loyalty_points?: boolean | null
          loyalty_points_value?: number | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          has_variations?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string | null
          earns_loyalty_points?: boolean | null
          loyalty_points_value?: number | null
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
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          store_id: string | null
          approved: boolean
          email: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          store_id?: string | null
          approved?: boolean
          email?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          store_id?: string | null
          approved?: boolean
          email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_operating_hours: {
        Row: {
          close_time: string | null
          created_at: string | null
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          close_time?: string | null
          created_at?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          close_time?: string | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_operating_hours_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_special_days: {
        Row: {
          close_time: string | null
          created_at: string | null
          date: string
          id: string
          is_open: boolean
          open_time: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          close_time?: string | null
          created_at?: string | null
          date: string
          id?: string
          is_open?: boolean
          open_time?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          close_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          is_open?: boolean
          open_time?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_special_days_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          image_url: string | null
          motoboy_whatsapp_number: string | null
          name: string
          phone: string | null
          slug: string | null
          updated_at: string | null
          display_name: string | null
          is_active: boolean | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          motoboy_whatsapp_number?: string | null
          name: string
          phone?: string | null
          slug?: string | null
          updated_at?: string | null
          display_name?: string | null
          is_active?: boolean | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          motoboy_whatsapp_number?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          updated_at?: string | null
          display_name?: string | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "store_manager" | "cashier"
      order_source: "totem" | "whatsapp" | "presencial" | "ifood"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "store_manager", "cashier"],
      order_source: ["totem", "whatsapp", "presencial", "ifood"],
      order_status: ["pending", "preparing", "ready", "delivered", "cancelled"],
    },
  },
} as const