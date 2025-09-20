export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      Bid: {
        Row: {
          amountCents: number;
          bidderId: number;
          createdAt: string;
          id: number;
          listingId: number;
        };
        Insert: {
          amountCents: number;
          bidderId: number;
          createdAt?: string;
          id?: number;
          listingId: number;
        };
        Update: {
          amountCents?: number;
          bidderId?: number;
          createdAt?: string;
          id?: number;
          listingId?: number;
        };
        Relationships: [
          {
            foreignKeyName: "Bid_bidderId_fkey";
            columns: ["bidderId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "Bid_listingId_fkey";
            columns: ["listingId"];
            isOneToOne: false;
            referencedRelation: "Listing";
            referencedColumns: ["id"];
          },
        ];
      };
      bids: {
        Row: {
          amount: number;
          bidder_id: string;
          created_at: string | null;
          id: string;
          listing_id: string;
        };
        Insert: {
          amount: number;
          bidder_id: string;
          created_at?: string | null;
          id?: string;
          listing_id: string;
        };
        Update: {
          amount?: number;
          bidder_id?: string;
          created_at?: string | null;
          id?: string;
          listing_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bids_bidder_id_fkey";
            columns: ["bidder_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bids_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listing_highest_bids";
            referencedColumns: ["listing_id"];
          },
          {
            foreignKeyName: "bids_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string | null;
          listing_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          listing_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          listing_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listing_highest_bids";
            referencedColumns: ["listing_id"];
          },
          {
            foreignKeyName: "favorites_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      Listing: {
        Row: {
          allowBids: boolean;
          condition: string;
          createdAt: string;
          description: string;
          id: number;
          imagesCsv: string;
          location: string;
          ownerId: number;
          priceCents: number;
          status: string;
          title: string;
          updatedAt: string;
        };
        Insert: {
          allowOffers?: boolean;
          condition: string;
          createdAt?: string;
          description: string;
          id?: number;
          imagesCsv?: string;
          location: string;
          ownerId: number;
          priceCents: number;
          status?: string;
          title: string;
          updatedAt: string;
        };
        Update: {
          allowOffers?: boolean;
          condition?: string;
          createdAt?: string;
          description?: string;
          id?: number;
          imagesCsv?: string;
          location?: string;
          ownerId?: number;
          priceCents?: number;
          status?: string;
          title?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "Listing_ownerId_fkey";
            columns: ["ownerId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          allowOffers: boolean;
          created_at: string | null;
          description: string | null;
          id: string;
          main_photo: string | null;
          price: number;
          seller_id: string;
          title: string;
        };
        Insert: {
          allow_bids?: boolean;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          main_photo?: string | null;
          price: number;
          seller_id: string;
          title: string;
        };
        Update: {
          allow_bids?: boolean;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          main_photo?: string | null;
          price?: number;
          seller_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string | null;
          id: string;
          listing_id: string;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string | null;
          id?: string;
          listing_id: string;
          recipient_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string | null;
          id?: string;
          listing_id?: string;
          recipient_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listing_highest_bids";
            referencedColumns: ["listing_id"];
          },
          {
            foreignKeyName: "messages_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments_stub: {
        Row: {
          amount_eur: number;
          created_at: string | null;
          id: string;
          listing_id: string | null;
          purpose: string;
          status: string | null;
          user_id: string;
        };
        Insert: {
          amount_eur: number;
          created_at?: string | null;
          id?: string;
          listing_id?: string | null;
          purpose: string;
          status?: string | null;
          user_id: string;
        };
        Update: {
          amount_eur?: number;
          created_at?: string | null;
          id?: string;
          listing_id?: string | null;
          purpose?: string;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_stub_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listing_highest_bids";
            referencedColumns: ["listing_id"];
          },
          {
            foreignKeyName: "payments_stub_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_stub_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          created_at: string | null;
          file_name: string;
          id: string;
          is_primary: boolean | null;
          listing_id: string;
        };
        Insert: {
          created_at?: string | null;
          file_name: string;
          id?: string;
          is_primary?: boolean | null;
          listing_id: string;
        };
        Update: {
          created_at?: string | null;
          file_name?: string;
          id?: string;
          is_primary?: boolean | null;
          listing_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listing_highest_bids";
            referencedColumns: ["listing_id"];
          },
          {
            foreignKeyName: "photos_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          display_name: string | null;
          id: string;
          last_seen_reviews_at?: string | null;
        };
        Insert: {
          created_at?: string | null;
          display_name?: string | null;
          id: string;
          last_seen_reviews_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          last_seen_reviews_at?: string | null;
        };
        Relationships: [];
      };
      shipments: {
        Row: {
          buyer_id: string;
          created_at: string | null;
          height_cm: number | null;
          id: string;
          length_cm: number | null;
          listing_id: string;
          price_eur: number | null;
          service: string | null;
          weight_kg: number | null;
          width_cm: number | null;
        };
        Insert: {
          buyer_id: string;
          created_at?: string | null;
          height_cm?: number | null;
          id?: string;
          length_cm?: number | null;
          listing_id: string;
          price_eur?: number | null;
          service?: string | null;
          weight_kg?: number | null;
          width_cm?: number | null;
        };
        Update: {
          buyer_id?: string;
          created_at?: string | null;
          height_cm?: number | null;
          id?: string;
          length_cm?: number | null;
          listing_id?: string;
          price_eur?: number | null;
          service?: string | null;
          weight_kg?: number | null;
          width_cm?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listing_highest_bids";
            referencedColumns: ["listing_id"];
          },
          {
            foreignKeyName: "shipments_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      User: {
        Row: {
          createdAt: string;
          email: string;
          id: number;
          name: string;
          password: string;
          role: string;
          updatedAt: string;
        };
        Insert: {
          createdAt?: string;
          email: string;
          id?: number;
          name: string;
          password: string;
          role?: string;
          updatedAt: string;
        };
        Update: {
          createdAt?: string;
          email?: string;
          id?: number;
          name?: string;
          password?: string;
          role?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      listing_highest_bids: {
        Row: {
          highest_bid: number | null;
          listing_id: string | null;
          total_bids: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
