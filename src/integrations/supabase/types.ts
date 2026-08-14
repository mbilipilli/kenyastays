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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          booking_id: string
          commission_kes: number
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          booking_id: string
          commission_kes: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          booking_id?: string
          commission_kes?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          code: string
          commission_pct: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          profile_id: string | null
          total_earned_kes: number
          updated_at: string
        }
        Insert: {
          code: string
          commission_pct?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          profile_id?: string | null
          total_earned_kes?: number
          updated_at?: string
        }
        Update: {
          code?: string
          commission_pct?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          profile_id?: string | null
          total_earned_kes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          affiliate_code: string | null
          affiliate_commission_kes: number
          check_in: string
          check_out: string
          cleaning_fee_kes: number
          commission_kes: number
          created_at: string
          guest_id: string
          guests: number
          host_id: string
          host_payout_kes: number
          id: string
          nights: number
          notes: string | null
          profileId: string
          property_id: string
          service_fee_kes: number
          status: Database["public"]["Enums"]["booking_status"]
          subtotal_kes: number
          total_kes: number
          updated_at: string
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_commission_kes?: number
          check_in: string
          check_out: string
          cleaning_fee_kes?: number
          commission_kes?: number
          created_at?: string
          guest_id: string
          guests?: number
          host_id: string
          host_payout_kes?: number
          id?: string
          nights: number
          notes?: string | null
          profileId: string
          property_id: string
          service_fee_kes?: number
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_kes?: number
          total_kes: number
          updated_at?: string
        }
        Update: {
          affiliate_code?: string | null
          affiliate_commission_kes?: number
          check_in?: string
          check_out?: string
          cleaning_fee_kes?: number
          commission_kes?: number
          created_at?: string
          guest_id?: string
          guests?: number
          host_id?: string
          host_payout_kes?: number
          id?: string
          nights?: number
          notes?: string | null
          profileId?: string
          property_id?: string
          service_fee_kes?: number
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_kes?: number
          total_kes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_partners: {
        Row: {
          city: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          platform_cut_pct: number
          updated_at: string
        }
        Insert: {
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          platform_cut_pct?: number
          updated_at?: string
        }
        Update: {
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          platform_cut_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      external_listings: {
        Row: {
          availability: Json
          booking_status: string
          city: string | null
          created_at: string
          currency: string
          external_id: string
          hotel_name: string
          id: string
          price_kes: number
          price_native: number
          property_id: string | null
          raw: Json | null
          room_type: string
          source: Database["public"]["Enums"]["sync_source"]
          synced_at: string
          updated_at: string
        }
        Insert: {
          availability?: Json
          booking_status?: string
          city?: string | null
          created_at?: string
          currency: string
          external_id: string
          hotel_name: string
          id?: string
          price_kes: number
          price_native: number
          property_id?: string | null
          raw?: Json | null
          room_type: string
          source: Database["public"]["Enums"]["sync_source"]
          synced_at?: string
          updated_at?: string
        }
        Update: {
          availability?: Json
          booking_status?: string
          city?: string | null
          created_at?: string
          currency?: string
          external_id?: string
          hotel_name?: string
          id?: string
          price_kes?: number
          price_native?: number
          property_id?: string | null
          raw?: Json | null
          room_type?: string
          source?: Database["public"]["Enums"]["sync_source"]
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          id: string
          monthly_price_kes: number
          plan: string
          profile_id: string
          property_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          id?: string
          monthly_price_kes: number
          plan: string
          profile_id: string
          property_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          id?: string
          monthly_price_kes?: number
          plan?: string
          profile_id?: string
          property_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_subscriptions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          base: string
          fetched_at: string
          id: string
          quote: string
          rate: number
        }
        Insert: {
          base: string
          fetched_at?: string
          id?: string
          quote: string
          rate: number
        }
        Update: {
          base?: string
          fetched_at?: string
          id?: string
          quote?: string
          rate?: number
        }
        Relationships: []
      }
      host_payouts: {
        Row: {
          amount_kes: number
          booking_id: string
          conversation_id: string | null
          created_at: string
          host_id: string
          id: string
          mpesa_receipt: string | null
          originator_conversation_id: string | null
          phone: string | null
          raw: Json | null
          result_code: number | null
          result_desc: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_kes: number
          booking_id: string
          conversation_id?: string | null
          created_at?: string
          host_id: string
          id?: string
          mpesa_receipt?: string | null
          originator_conversation_id?: string | null
          phone?: string | null
          raw?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_kes?: number
          booking_id?: string
          conversation_id?: string | null
          created_at?: string
          host_id?: string
          id?: string
          mpesa_receipt?: string | null
          originator_conversation_id?: string | null
          phone?: string | null
          raw?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      ipay_transactions: {
        Row: {
          amount_kes: number
          booking_id: string
          channel: string
          created_at: string
          id: string
          ipay_status_code: string | null
          ipay_txn_id: string | null
          order_id: string
          raw: Json | null
          result_desc: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kes: number
          booking_id: string
          channel?: string
          created_at?: string
          id?: string
          ipay_status_code?: string | null
          ipay_txn_id?: string | null
          order_id: string
          raw?: Json | null
          result_desc?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          booking_id?: string
          channel?: string
          created_at?: string
          id?: string
          ipay_status_code?: string | null
          ipay_txn_id?: string | null
          order_id?: string
          raw?: Json | null
          result_desc?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ipay_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      location_access_logs: {
        Row: {
          action: string
          created_at: string
          exposed_address: boolean
          exposed_gps: boolean
          id: string
          ip_address: string | null
          property_ids: string[]
          record_count: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          exposed_address?: boolean
          exposed_gps?: boolean
          id?: string
          ip_address?: string | null
          property_ids?: string[]
          record_count?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          exposed_address?: boolean
          exposed_gps?: boolean
          id?: string
          ip_address?: string | null
          property_ids?: string[]
          record_count?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mpesa_transactions: {
        Row: {
          amount_kes: number
          booking_id: string
          checkout_request_id: string | null
          created_at: string
          id: string
          merchant_request_id: string | null
          mpesa_receipt: string | null
          phone: string
          raw_callback: Json | null
          result_code: number | null
          result_desc: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kes: number
          booking_id: string
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          phone: string
          raw_callback?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          booking_id?: string
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt?: string | null
          phone?: string
          raw_callback?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_kes: number
          booking_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          phone: string | null
          provider_ref: string | null
          raw: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kes: number
          booking_id: string
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          provider_ref?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          provider_ref?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          is_verified: boolean
          payout_phone: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_verified?: boolean
          payout_phone?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean
          payout_phone?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[]
          bathrooms: number
          bedrooms: number
          city: string
          cleaning_fee_kes: number
          cleaning_partner_id: string | null
          cover_image: string | null
          created_at: string
          description: string
          featured_until: string | null
          host_id: string
          id: string
          is_active: boolean
          is_community: boolean
          is_eco: boolean
          is_featured: boolean
          landmarks: string[]
          latitude: number | null
          longitude: number | null
          max_guests: number
          price_kes: number
          profileId: string
          property_type: Database["public"]["Enums"]["property_type"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          bathrooms?: number
          bedrooms?: number
          city: string
          cleaning_fee_kes?: number
          cleaning_partner_id?: string | null
          cover_image?: string | null
          created_at?: string
          description: string
          featured_until?: string | null
          host_id: string
          id?: string
          is_active?: boolean
          is_community?: boolean
          is_eco?: boolean
          is_featured?: boolean
          landmarks?: string[]
          latitude?: number | null
          longitude?: number | null
          max_guests?: number
          price_kes: number
          profileId: string
          property_type?: Database["public"]["Enums"]["property_type"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          amenities?: string[]
          bathrooms?: number
          bedrooms?: number
          city?: string
          cleaning_fee_kes?: number
          cleaning_partner_id?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string
          featured_until?: string | null
          host_id?: string
          id?: string
          is_active?: boolean
          is_community?: boolean
          is_eco?: boolean
          is_featured?: boolean
          landmarks?: string[]
          latitude?: number | null
          longitude?: number | null
          max_guests?: number
          price_kes?: number
          profileId?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_cleaning_partner_fkey"
            columns: ["cleaning_partner_id"]
            isOneToOne: false
            referencedRelation: "cleaning_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          id: string
          property_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          guest_id: string
          id: string
          property_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          guest_id: string
          id?: string
          property_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          guest_id?: string
          id?: string
          property_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          items_upserted: number
          source: Database["public"]["Enums"]["sync_source"]
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          items_upserted?: number
          source: Database["public"]["Enums"]["sync_source"]
          started_at?: string
          status: Database["public"]["Enums"]["sync_status"]
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          items_upserted?: number
          source?: Database["public"]["Enums"]["sync_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "guest" | "host" | "admin"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      payment_method: "mpesa" | "card"
      payment_status: "initiated" | "pending" | "success" | "failed"
      property_type:
        | "apartment"
        | "lodge"
        | "homestay"
        | "guest_house"
        | "villa"
        | "cottage"
      sync_source: "sirvoy" | "hoteldruid"
      sync_status: "running" | "success" | "error"
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
      app_role: ["guest", "host", "admin"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      payment_method: ["mpesa", "card"],
      payment_status: ["initiated", "pending", "success", "failed"],
      property_type: [
        "apartment",
        "lodge",
        "homestay",
        "guest_house",
        "villa",
        "cottage",
      ],
      sync_source: ["sirvoy", "hoteldruid"],
      sync_status: ["running", "success", "error"],
    },
  },
} as const
