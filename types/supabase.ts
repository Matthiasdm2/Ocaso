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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      Bid: {
        Row: {
          amountCents: number
          bidderId: number
          createdAt: string
          id: number
          listingId: number
        }
        Insert: {
          amountCents: number
          bidderId: number
          createdAt?: string
          id?: number
          listingId: number
        }
        Update: {
          amountCents?: number
          bidderId?: number
          createdAt?: string
          id?: number
          listingId?: number
        }
        Relationships: [
          {
            foreignKeyName: "Bid_bidderId_fkey"
            columns: ["bidderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Bid_listingId_fkey"
            columns: ["listingId"]
            isOneToOne: false
            referencedRelation: "Listing"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          bidder_id: string
          created_at: string | null
          id: string
          listing_id: string
        }
        Insert: {
          amount: number
          bidder_id: string
          created_at?: string | null
          id?: string
          listing_id: string
        }
        Update: {
          amount?: number
          bidder_id?: string
          created_at?: string | null
          id?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon_url: string | null
          id: number
          is_active: boolean
          name: string
          position: number | null
          slug: string
          sort_order: number
        }
        Insert: {
          icon_url?: string | null
          id?: number
          is_active?: boolean
          name: string
          position?: number | null
          slug: string
          sort_order?: number
        }
        Update: {
          icon_url?: string | null
          id?: number
          is_active?: boolean
          name?: string
          position?: number | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          participants: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          participants: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          participants?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_stats: {
        Row: {
          avg_price: number
          bids: number
          business_id: string
          followers: number
          listings: number
          sold: number
          updated_at: string
          views: number
        }
        Insert: {
          avg_price?: number
          bids?: number
          business_id: string
          followers?: number
          listings?: number
          sold?: number
          updated_at?: string
          views?: number
        }
        Update: {
          avg_price?: number
          bids?: number
          business_id?: string
          followers?: number
          listings?: number
          sold?: number
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          business_id: string
          created_at: string
          follower_id: string
          id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          follower_id: string
          id?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      Listing: {
        Row: {
          allowBids: boolean
          condition: string
          createdAt: string
          description: string
          id: number
          imagesCsv: string
          location: string
          ownerId: number
          priceCents: number
          status: string
          title: string
          updatedAt: string
        }
        Insert: {
          allowBids?: boolean
          condition: string
          createdAt?: string
          description: string
          id?: number
          imagesCsv?: string
          location: string
          ownerId: number
          priceCents: number
          status?: string
          title: string
          updatedAt: string
        }
        Update: {
          allowBids?: boolean
          condition?: string
          createdAt?: string
          description?: string
          id?: number
          imagesCsv?: string
          location?: string
          ownerId?: number
          priceCents?: number
          status?: string
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Listing_ownerId_fkey"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_bid_reads: {
        Row: {
          last_seen_at: string
          last_seen_count: number
          listing_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          last_seen_count?: number
          listing_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          last_seen_count?: number
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_bid_reads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_bid_reads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_bid_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_favorites: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_image_embeddings: {
        Row: {
          created_at: string
          embedding: string
          id: string
          image_url: string
          listing_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          embedding: string
          id?: string
          image_url: string
          listing_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          embedding?: string
          id?: string
          image_url?: string
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_image_embeddings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_image_embeddings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_image_hashes: {
        Row: {
          ahash_64: string
          created_at: string
          id: string
          image_url: string
          listing_id: string
          updated_at: string
        }
        Insert: {
          ahash_64: string
          created_at?: string
          id?: string
          image_url: string
          listing_id: string
          updated_at?: string
        }
        Update: {
          ahash_64?: string
          created_at?: string
          id?: string
          image_url?: string
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_image_hashes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_image_hashes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          alt: string | null
          bucket: string
          created_at: string | null
          created_by: string | null
          id: string
          is_main: boolean | null
          listing_id: string | null
          metadata: Json | null
          sort_order: number | null
          storage_path: string
          url: string | null
        }
        Insert: {
          alt?: string | null
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_main?: boolean | null
          listing_id?: string | null
          metadata?: Json | null
          sort_order?: number | null
          storage_path: string
          url?: string | null
        }
        Update: {
          alt?: string | null
          bucket?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_main?: boolean | null
          listing_id?: string | null
          metadata?: Json | null
          sort_order?: number | null
          storage_path?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          allow_offers: boolean
          allow_shipping: boolean | null
          allowoffers: boolean | null
          allowOffers: boolean
          categories: number[] | null
          category_id: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          favorites_count: number
          id: string
          images: string[] | null
          is_paused: boolean
          is_sponsored: boolean | null
          latitude: number | null
          listing_number: number
          location: string | null
          longitude: number | null
          main_photo: string | null
          min_bid: number | null
          organization_id: string | null
          price: number
          promo_featured: boolean
          promo_top: boolean
          search_tsv: unknown
          secure_pay: boolean
          seller_id: string
          shipping_height: number | null
          shipping_length: number | null
          shipping_weight: number | null
          shipping_width: number | null
          state: string | null
          status: string
          stock: number | null
          subcategory_id: number | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          allow_offers?: boolean
          allow_shipping?: boolean | null
          allowoffers?: boolean | null
          allowOffers?: boolean
          categories?: number[] | null
          category_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          favorites_count?: number
          id?: string
          images?: string[] | null
          is_paused?: boolean
          is_sponsored?: boolean | null
          latitude?: number | null
          listing_number?: number
          location?: string | null
          longitude?: number | null
          main_photo?: string | null
          min_bid?: number | null
          organization_id?: string | null
          price: number
          promo_featured?: boolean
          promo_top?: boolean
          search_tsv?: unknown
          secure_pay?: boolean
          seller_id?: string
          shipping_height?: number | null
          shipping_length?: number | null
          shipping_weight?: number | null
          shipping_width?: number | null
          state?: string | null
          status?: string
          stock?: number | null
          subcategory_id?: number | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          allow_offers?: boolean
          allow_shipping?: boolean | null
          allowoffers?: boolean | null
          allowOffers?: boolean
          categories?: number[] | null
          category_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          favorites_count?: number
          id?: string
          images?: string[] | null
          is_paused?: boolean
          is_sponsored?: boolean | null
          latitude?: number | null
          listing_number?: number
          location?: string | null
          longitude?: number | null
          main_photo?: string | null
          min_bid?: number | null
          organization_id?: string | null
          price?: number
          promo_featured?: boolean
          promo_top?: boolean
          search_tsv?: unknown
          secure_pay?: boolean
          seller_id?: string
          shipping_height?: number | null
          shipping_length?: number | null
          shipping_weight?: number | null
          shipping_width?: number | null
          state?: string | null
          status?: string
          stock?: number | null
          subcategory_id?: number | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          id: string
          message_id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          url: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          id?: string
          message_id: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          url?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          id?: string
          message_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          listing_id: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          listing_id: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          listing_id?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          capture_after: string | null
          created_at: string
          currency: string
          id: string
          listing_id: string
          price_cents: number
          protest_status: string
          quantity: number | null
          released_at: string | null
          seller_id: string
          sendcloud_status: string | null
          shipping_details: Json | null
          state: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          capture_after?: string | null
          created_at?: string
          currency?: string
          id?: string
          listing_id: string
          price_cents: number
          protest_status?: string
          quantity?: number | null
          released_at?: string | null
          seller_id: string
          sendcloud_status?: string | null
          shipping_details?: Json | null
          state?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          capture_after?: string | null
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string
          price_cents?: number
          protest_status?: string
          quantity?: number | null
          released_at?: string | null
          seller_id?: string
          sendcloud_status?: string | null
          shipping_details?: Json | null
          state?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_buyer"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_listing"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "fk_orders_listing"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_seller"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_listings: {
        Row: {
          created_at: string | null
          listing_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          listing_id: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          listing_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "organization_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_stub: {
        Row: {
          amount_eur: number
          created_at: string | null
          id: string
          listing_id: string | null
          purpose: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount_eur: number
          created_at?: string | null
          id?: string
          listing_id?: string | null
          purpose: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount_eur?: number
          created_at?: string | null
          id?: string
          listing_id?: string | null
          purpose?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_stub_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "payments_stub_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_stub_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
          is_primary: boolean | null
          listing_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
          is_primary?: boolean | null
          listing_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
          is_primary?: boolean | null
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          address: Json | null
          avatar_url: string | null
          bank: Json | null
          bio: string | null
          business_banner_url: string | null
          business_billing_cycle: string | null
          business_bio: string | null
          business_logo_url: string | null
          business_plan: string | null
          business_slug: string | null
          categories: string[] | null
          company_name: string | null
          company_slug: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          iban: string | null
          id: string
          invoice_address: Json | null
          invoice_email: string | null
          is_admin: boolean
          is_business: boolean | null
          last_name: string | null
          last_seen_reviews_at: string | null
          marketing_opt_in: boolean | null
          notifications: Json | null
          org_slug: string | null
          phone: string | null
          preferences: Json | null
          public_show_email: boolean | null
          public_show_phone: boolean | null
          registration_nr: string | null
          shop_name: string | null
          shop_slug: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_tiktok: string | null
          stripe_account_id: string | null
          stripe_files: Json | null
          vat: string | null
          website: string | null
        }
        Insert: {
          account_type?: string | null
          address?: Json | null
          avatar_url?: string | null
          bank?: Json | null
          bio?: string | null
          business_banner_url?: string | null
          business_billing_cycle?: string | null
          business_bio?: string | null
          business_logo_url?: string | null
          business_plan?: string | null
          business_slug?: string | null
          categories?: string[] | null
          company_name?: string | null
          company_slug?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          iban?: string | null
          id: string
          invoice_address?: Json | null
          invoice_email?: string | null
          is_admin?: boolean
          is_business?: boolean | null
          last_name?: string | null
          last_seen_reviews_at?: string | null
          marketing_opt_in?: boolean | null
          notifications?: Json | null
          org_slug?: string | null
          phone?: string | null
          preferences?: Json | null
          public_show_email?: boolean | null
          public_show_phone?: boolean | null
          registration_nr?: string | null
          shop_name?: string | null
          shop_slug?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          stripe_account_id?: string | null
          stripe_files?: Json | null
          vat?: string | null
          website?: string | null
        }
        Update: {
          account_type?: string | null
          address?: Json | null
          avatar_url?: string | null
          bank?: Json | null
          bio?: string | null
          business_banner_url?: string | null
          business_billing_cycle?: string | null
          business_bio?: string | null
          business_logo_url?: string | null
          business_plan?: string | null
          business_slug?: string | null
          categories?: string[] | null
          company_name?: string | null
          company_slug?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          invoice_address?: Json | null
          invoice_email?: string | null
          is_admin?: boolean
          is_business?: boolean | null
          last_name?: string | null
          last_seen_reviews_at?: string | null
          marketing_opt_in?: boolean | null
          notifications?: Json | null
          org_slug?: string | null
          phone?: string | null
          preferences?: Json | null
          public_show_email?: boolean | null
          public_show_phone?: boolean | null
          registration_nr?: string | null
          shop_name?: string | null
          shop_slug?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          stripe_account_id?: string | null
          stripe_files?: Json | null
          vat?: string | null
          website?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_id: string
          business_id: string | null
          comment: string
          created_at: string | null
          id: string
          listing_id: string | null
          rating: number
        }
        Insert: {
          author_id: string
          business_id?: string | null
          comment: string
          created_at?: string | null
          id?: string
          listing_id?: string | null
          rating: number
        }
        Update: {
          author_id?: string
          business_id?: string | null
          comment?: string
          created_at?: string | null
          id?: string
          listing_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          buyer_id: string
          created_at: string | null
          height_cm: number | null
          id: string
          length_cm: number | null
          listing_id: string
          price_eur: number | null
          service: string | null
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          listing_id: string
          price_eur?: number | null
          service?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          listing_id?: string
          price_eur?: number | null
          service?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listing_highest_bids"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "shipments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_views: {
        Row: {
          id: number
          session_id: string | null
          shop_slug: string
          user_agent: string | null
          viewed_at: string | null
          viewer_ip: unknown
        }
        Insert: {
          id?: number
          session_id?: string | null
          shop_slug: string
          user_agent?: string | null
          viewed_at?: string | null
          viewer_ip?: unknown
        }
        Update: {
          id?: number
          session_id?: string | null
          shop_slug?: string
          user_agent?: string | null
          viewed_at?: string | null
          viewer_ip?: unknown
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: number
          created_at: string
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_id: number
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_id?: number
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories_staging: {
        Row: {
          is_active: boolean
          l1_slug: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          is_active?: boolean
          l1_slug: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          is_active?: boolean
          l1_slug?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      User: {
        Row: {
          createdAt: string
          email: string
          id: number
          name: string
          password: string
          role: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          email: string
          id?: number
          name: string
          password: string
          role?: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          email?: string
          id?: number
          name?: string
          password?: string
          role?: string
          updatedAt?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle: string
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      listing_highest_bids: {
        Row: {
          highest_bid: number | null
          listing_id: string | null
          total_bids: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      conversation_overview: {
        Args: never
        Returns: {
          id: string
          last_message_body: string
          last_message_created_at: string
          last_message_id: string
          last_message_sender: string
          listing_id: string
          participants: string[]
          unread_count: number
          updated_at: string
        }[]
      }
      earth: { Args: never; Returns: number }
      ensure_dashboard_stats_row: { Args: { bid: string }; Returns: undefined }
      get_trending_shops_this_week: {
        Args: never
        Returns: {
          profile_id: string
          shop_name: string
          shop_slug: string
          view_count: number
        }[]
      }
      increment_listing_views: {
        Args: { p_listing_id: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      listings_within_radius: {
        Args: {
          lat: number
          lng: number
          p_limit?: number
          p_offset?: number
          radius_km: number
        }
        Returns: {
          allow_offers: boolean
          allow_shipping: boolean | null
          allowoffers: boolean | null
          allowOffers: boolean
          categories: number[] | null
          category_id: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          favorites_count: number
          id: string
          images: string[] | null
          is_paused: boolean
          is_sponsored: boolean | null
          latitude: number | null
          listing_number: number
          location: string | null
          longitude: number | null
          main_photo: string | null
          min_bid: number | null
          organization_id: string | null
          price: number
          promo_featured: boolean
          promo_top: boolean
          search_tsv: unknown
          secure_pay: boolean
          seller_id: string
          shipping_height: number | null
          shipping_length: number | null
          shipping_weight: number | null
          shipping_width: number | null
          state: string | null
          status: string
          stock: number | null
          subcategory_id: number | null
          title: string
          updated_at: string | null
          views: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      listings_within_radius_count: {
        Args: { lat: number; lng: number; radius_km: number }
        Returns: number
      }
      match_listing_embeddings: {
        Args: { match_count: number; query_embedding: string }
        Returns: {
          distance: number
          listing_id: string
        }[]
      }
      recalc_dashboard_stats: { Args: { bid: string }; Returns: undefined }
      recompute_dashboard_stats_for: {
        Args: { bid: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify: { Args: { txt: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
