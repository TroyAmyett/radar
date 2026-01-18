export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      topics: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          slug: string;
          color: string | null;
          icon: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          name: string;
          slug: string;
          color?: string | null;
          icon?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          name?: string;
          slug?: string;
          color?: string | null;
          icon?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sources: {
        Row: {
          id: string;
          account_id: string;
          topic_id: string | null;
          name: string;
          type: 'rss' | 'youtube' | 'twitter';
          url: string;
          channel_id: string | null;
          username: string | null;
          is_active: boolean;
          last_fetched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          topic_id?: string | null;
          name: string;
          type: 'rss' | 'youtube' | 'twitter';
          url: string;
          channel_id?: string | null;
          username?: string | null;
          is_active?: boolean;
          last_fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          topic_id?: string | null;
          name?: string;
          type?: 'rss' | 'youtube' | 'twitter';
          url?: string;
          channel_id?: string | null;
          username?: string | null;
          is_active?: boolean;
          last_fetched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      advisors: {
        Row: {
          id: string;
          account_id: string;
          topic_id: string | null;
          name: string;
          platform: 'twitter' | 'linkedin' | 'youtube';
          username: string;
          avatar_url: string | null;
          bio: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          topic_id?: string | null;
          name: string;
          platform: 'twitter' | 'linkedin' | 'youtube';
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          topic_id?: string | null;
          name?: string;
          platform?: 'twitter' | 'linkedin' | 'youtube';
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_items: {
        Row: {
          id: string;
          account_id: string;
          source_id: string | null;
          advisor_id: string | null;
          topic_id: string | null;
          type: 'article' | 'video' | 'tweet' | 'post';
          title: string;
          summary: string | null;
          content: string | null;
          url: string;
          thumbnail_url: string | null;
          author: string | null;
          published_at: string | null;
          duration: number | null;
          external_id: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          source_id?: string | null;
          advisor_id?: string | null;
          topic_id?: string | null;
          type: 'article' | 'video' | 'tweet' | 'post';
          title: string;
          summary?: string | null;
          content?: string | null;
          url: string;
          thumbnail_url?: string | null;
          author?: string | null;
          published_at?: string | null;
          duration?: number | null;
          external_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          source_id?: string | null;
          advisor_id?: string | null;
          topic_id?: string | null;
          type?: 'article' | 'video' | 'tweet' | 'post';
          title?: string;
          summary?: string | null;
          content?: string | null;
          url?: string;
          thumbnail_url?: string | null;
          author?: string | null;
          published_at?: string | null;
          duration?: number | null;
          external_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      content_interactions: {
        Row: {
          id: string;
          account_id: string;
          content_item_id: string;
          is_liked: boolean;
          is_saved: boolean;
          notes: string | null;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          content_item_id: string;
          is_liked?: boolean;
          is_saved?: boolean;
          notes?: string | null;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          content_item_id?: string;
          is_liked?: boolean;
          is_saved?: boolean;
          notes?: string | null;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Topic = Database['public']['Tables']['topics']['Row'];
export type Source = Database['public']['Tables']['sources']['Row'];
export type Advisor = Database['public']['Tables']['advisors']['Row'];
export type ContentItem = Database['public']['Tables']['content_items']['Row'];
export type ContentInteraction = Database['public']['Tables']['content_interactions']['Row'];

export type TopicInsert = Database['public']['Tables']['topics']['Insert'];
export type SourceInsert = Database['public']['Tables']['sources']['Insert'];
export type AdvisorInsert = Database['public']['Tables']['advisors']['Insert'];
export type ContentItemInsert = Database['public']['Tables']['content_items']['Insert'];
export type ContentInteractionInsert = Database['public']['Tables']['content_interactions']['Insert'];

// Extended types with relations
export interface ContentItemWithInteraction extends ContentItem {
  interaction?: ContentInteraction | null;
  topic?: Topic | null;
  source?: Source | null;
  advisor?: Advisor | null;
}
