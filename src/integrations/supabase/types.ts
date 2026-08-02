export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_actions: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      card_events: {
        Row: {
          id: string;
          card_id: string | null;
          profile_id: string;
          card_uid: string;
          event_type: "activated" | "written" | "deactivated" | "deleted" | "registered";
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id?: string | null;
          profile_id: string;
          card_uid: string;
          event_type: "activated" | "written" | "deactivated" | "deleted" | "registered";
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string | null;
          profile_id?: string;
          card_uid?: string;
          event_type?: "activated" | "written" | "deactivated" | "deleted" | "registered";
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      app_settings: {
        Row: {
          id: boolean;
          site_title: string | null;
          site_description: string | null;
          default_language: string | null;
          footer_note: string | null;
          maintenance_mode: boolean | null;
          show_public_profiles: boolean | null;
          enable_leads_form: boolean | null;
          show_qr_code: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          id?: boolean;
          site_title?: string | null;
          site_description?: string | null;
          default_language?: string | null;
          footer_note?: string | null;
          maintenance_mode?: boolean | null;
          show_public_profiles?: boolean | null;
          enable_leads_form?: boolean | null;
          show_qr_code?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          id?: boolean;
          site_title?: string | null;
          site_description?: string | null;
          default_language?: string | null;
          footer_note?: string | null;
          maintenance_mode?: boolean | null;
          show_public_profiles?: boolean | null;
          enable_leads_form?: boolean | null;
          show_qr_code?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      leads: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          mobile: string;
          interest: string | null;
          source_card_uid: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          mobile: string;
          interest?: string | null;
          source_card_uid?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          name?: string;
          mobile?: string;
          interest?: string | null;
          source_card_uid?: string | null;
          created_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      nfc_cards: {
        Row: {
          id: string;
          card_uid: string;
          profile_id: string | null;
          status: "unassigned" | "active" | "disabled";
          is_official: boolean;
          activated_at: string | null;
          last_written_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_uid: string;
          profile_id?: string | null;
          status?: "unassigned" | "active" | "disabled";
          is_official?: boolean;
          activated_at?: string | null;
          last_written_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_uid?: string;
          profile_id?: string | null;
          status?: "unassigned" | "active" | "disabled";
          is_official?: boolean;
          activated_at?: string | null;
          last_written_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      profile_links: {
        Row: {
          id: string;
          profile_id: string;
          type: "url" | "email" | "phone" | "whatsapp" | "instapay" | "social" | "messenger" | "website" | "instagram" | "x" | "linkedin" | "facebook" | "tiktok" | "youtube" | "github" | "telegram" | "snapchat" | "map" | "custom";
          label: string;
          value: string;
          position: number;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: "url" | "email" | "phone" | "whatsapp" | "instapay" | "social" | "messenger" | "website" | "instagram" | "x" | "linkedin" | "facebook" | "tiktok" | "youtube" | "github" | "telegram" | "snapchat" | "map" | "custom";
          label: string;
          value: string;
          position?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          type?: "url" | "email" | "phone" | "whatsapp" | "instapay" | "social" | "messenger" | "website" | "instagram" | "x" | "linkedin" | "facebook" | "tiktok" | "youtube" | "github" | "telegram" | "snapchat" | "map" | "custom";
          label?: string;
          value?: string;
          position?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      profile_media: {
        Row: {
          id: string;
          profile_id: string;
          type: "image" | "video" | "pdf" | "file";
          storage_path: string;
          title: string | null;
          description: string | null;
          position: number;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: "image" | "video" | "pdf" | "file";
          storage_path: string;
          title?: string | null;
          description?: string | null;
          position?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          type?: "image" | "video" | "pdf" | "file";
          storage_path?: string;
          title?: string | null;
          description?: string | null;
          position?: number;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      profile_themes: {
        Row: {
          profile_id: string;
          preset: string;
          colors: Json;
          fonts: Json;
          layout: string;
          custom_css: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          preset?: string;
          colors?: Json;
          fonts?: Json;
          layout?: string;
          custom_css?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          preset?: string;
          colors?: Json;
          fonts?: Json;
          layout?: string;
          custom_css?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          title: string | null;
          bio: string | null;
          avatar_url: string | null;
          cover_url: string | null;
          theme: string;
          language: string;
          is_published: boolean;
          created_at: string;
          updated_at: string;
          is_banned: boolean;
          banned_at: string | null;
          ban_reason: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          title?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          theme?: string;
          language?: string;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
          is_banned?: boolean;
          banned_at?: string | null;
          ban_reason?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          title?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          theme?: string;
          language?: string;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
          is_banned?: boolean;
          banned_at?: string | null;
          ban_reason?: string | null;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      rate_limits: {
        Row: {
          bucket_key: string;
          window_start: string;
          count: number;
        };
        Insert: {
          bucket_key: string;
          window_start: string;
          count?: number;
        };
        Update: {
          bucket_key?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      security_events: {
        Row: {
          id: string;
          created_at: string;
          severity: "info" | "warn" | "critical";
          category: string;
          action: string;
          actor_id: string | null;
          route: string | null;
          user_agent: string | null;
          ip: string | null;
          details: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          severity?: "info" | "warn" | "critical";
          category: string;
          action: string;
          actor_id?: string | null;
          route?: string | null;
          user_agent?: string | null;
          ip?: string | null;
          details?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          severity?: "info" | "warn" | "critical";
          category?: string;
          action?: string;
          actor_id?: string | null;
          route?: string | null;
          user_agent?: string | null;
          ip?: string | null;
          details?: Json;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      tap_events: {
        Row: {
          id: string;
          tap_id: string | null;
          profile_id: string;
          event_type: "view" | "call" | "whatsapp" | "email" | "website" | "vcard" | "share" | "qr" | "link";
          link_id: string | null;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tap_id?: string | null;
          profile_id: string;
          event_type: "view" | "call" | "whatsapp" | "email" | "website" | "vcard" | "share" | "qr" | "link";
          link_id?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tap_id?: string | null;
          profile_id?: string;
          event_type?: "view" | "call" | "whatsapp" | "email" | "website" | "vcard" | "share" | "qr" | "link";
          link_id?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      taps: {
        Row: {
          id: string;
          profile_id: string;
          card_id: string | null;
          ip_hash: string | null;
          country: string | null;
          city: string | null;
          device: string | null;
          os: string | null;
          browser: string | null;
          lang: string | null;
          referrer: string | null;
          utm: Json | null;
          visitor_hash: string | null;
          is_returning: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          card_id?: string | null;
          ip_hash?: string | null;
          country?: string | null;
          city?: string | null;
          device?: string | null;
          os?: string | null;
          browser?: string | null;
          lang?: string | null;
          referrer?: string | null;
          utm?: Json | null;
          visitor_hash?: string | null;
          is_returning?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          card_id?: string | null;
          ip_hash?: string | null;
          country?: string | null;
          city?: string | null;
          device?: string | null;
          os?: string | null;
          browser?: string | null;
          lang?: string | null;
          referrer?: string | null;
          utm?: Json | null;
          visitor_hash?: string | null;
          is_returning?: boolean;
          created_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: "admin" | "user";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "admin" | "user";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Relationships: Array<Record<string, unknown>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: {
          _user_id: string;
          _role: string;
        };
        Returns: boolean;
      };
      claim_official_card: {
        Args: {
          _uid: string;
        };
        Returns: {
          id: string;
          profile_id: string;
          card_uid: string;
          status: "unassigned" | "active" | "disabled";
          is_official: boolean;
          activated_at: string | null;
          last_written_at: string | null;
          created_at: string;
          updated_at: string;
        } | null;
      };
      admin_set_user_role: {
        Args: {
          _user_id: string;
          _role: string;
          _grant: boolean;
        };
        Returns: boolean;
      };
      admin_ban_user: {
        Args: {
          _user_id: string;
          _ban: boolean;
          _reason?: string | null;
        };
        Returns: boolean;
      };
      log_security_event: {
        Args: {
          _severity: string;
          _category: string;
          _action: string;
          _route?: string | null;
          _user_agent?: string | null;
          _ip?: string | null;
          _details?: Json | null;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      card_event_type: "activated" | "written" | "deactivated" | "deleted" | "registered";
      card_status: "unassigned" | "active" | "disabled";
      link_type: "url" | "email" | "phone" | "whatsapp" | "instapay" | "social" | "messenger" | "website" | "instagram" | "x" | "linkedin" | "facebook" | "tiktok" | "youtube" | "github" | "telegram" | "snapchat" | "map" | "custom";
      media_type: "image" | "video" | "pdf" | "file";
      tap_event_type: "view" | "call" | "whatsapp" | "email" | "website" | "vcard" | "share" | "qr" | "link";
    };
    CompositeTypes: Record<string, never>;
  };
};

type DefaultSchema = Database["public"];

type TableData<SchemaName extends keyof Database, TableName extends keyof Database[SchemaName]["Tables"]> =
  Database[SchemaName]["Tables"][TableName];

export type Tables<
  SchemaName extends keyof Database = "public",
  TableName extends keyof Database[SchemaName]["Tables"] = keyof Database[SchemaName]["Tables"],
> = TableData<SchemaName, TableName> extends { Row: infer Row } ? Row : never;

export type TablesInsert<
  SchemaName extends keyof Database = "public",
  TableName extends keyof Database[SchemaName]["Tables"] = keyof Database[SchemaName]["Tables"],
> = TableData<SchemaName, TableName> extends { Insert: infer Insert } ? Insert : never;

export type TablesUpdate<
  SchemaName extends keyof Database = "public",
  TableName extends keyof Database[SchemaName]["Tables"] = keyof Database[SchemaName]["Tables"],
> = TableData<SchemaName, TableName> extends { Update: infer Update } ? Update : never;

export type Enums<
  SchemaName extends keyof Database = "public",
  EnumName extends keyof Database[SchemaName]["Enums"] = keyof Database[SchemaName]["Enums"],
> = Database[SchemaName]["Enums"][EnumName];

export type CompositeTypes<
  SchemaName extends keyof Database = "public",
  CompositeTypeName extends keyof Database[SchemaName]["CompositeTypes"] = keyof Database[SchemaName]["CompositeTypes"],
> = Database[SchemaName]["CompositeTypes"][CompositeTypeName];

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      card_event_type: ["activated", "written", "deactivated", "deleted", "registered"],
      card_status: ["unassigned", "active", "disabled"],
      link_type: ["url", "email", "phone", "whatsapp", "instapay", "social", "messenger", "website", "instagram", "x", "linkedin", "facebook", "tiktok", "youtube", "github", "telegram", "snapchat", "map", "custom"],
      media_type: ["image", "video", "pdf", "file"],
      tap_event_type: ["view", "call", "whatsapp", "email", "website", "vcard", "share", "qr", "link"],
    },
  },
} as const;
