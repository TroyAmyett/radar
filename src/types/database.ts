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
      user_profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          is_super_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          is_super_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          is_super_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
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
          type: 'rss' | 'youtube' | 'twitter' | 'polymarket';
          url: string;
          channel_id: string | null;
          username: string | null;
          image_url: string | null;
          description: string | null;
          metadata: Json | null;
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
          type: 'rss' | 'youtube' | 'twitter' | 'polymarket';
          url: string;
          channel_id?: string | null;
          username?: string | null;
          image_url?: string | null;
          description?: string | null;
          metadata?: Json | null;
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
          type?: 'rss' | 'youtube' | 'twitter' | 'polymarket';
          url?: string;
          channel_id?: string | null;
          username?: string | null;
          image_url?: string | null;
          description?: string | null;
          metadata?: Json | null;
          is_active?: boolean;
          last_fetched_at?: string | null;
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
          type: 'article' | 'video' | 'tweet' | 'post' | 'prediction';
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
          type: 'article' | 'video' | 'tweet' | 'post' | 'prediction';
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
      whats_hot_posts: {
        Row: {
          id: string;
          account_id: string;
          content_item_id: string | null;
          title: string;
          summary: string;
          url: string;
          thumbnail_url: string | null;
          topic_id: string | null;
          author: string | null;
          status: 'draft' | 'published' | 'scheduled';
          published_at: string | null;
          scheduled_for: string | null;
          x_post_enabled: boolean;
          x_post_id: string | null;
          x_posted_at: string | null;
          email_digest_enabled: boolean;
          email_digest_sent: boolean;
          email_digest_sent_at: string | null;
          relevance_score: number;
          auto_published: boolean;
          hashtags: string[] | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          content_item_id?: string | null;
          title: string;
          summary: string;
          url: string;
          thumbnail_url?: string | null;
          topic_id?: string | null;
          author?: string | null;
          status?: 'draft' | 'published' | 'scheduled';
          published_at?: string | null;
          scheduled_for?: string | null;
          x_post_enabled?: boolean;
          x_post_id?: string | null;
          x_posted_at?: string | null;
          email_digest_enabled?: boolean;
          email_digest_sent?: boolean;
          email_digest_sent_at?: string | null;
          relevance_score?: number;
          auto_published?: boolean;
          hashtags?: string[] | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          content_item_id?: string | null;
          title?: string;
          summary?: string;
          url?: string;
          thumbnail_url?: string | null;
          topic_id?: string | null;
          author?: string | null;
          status?: 'draft' | 'published' | 'scheduled';
          published_at?: string | null;
          scheduled_for?: string | null;
          x_post_enabled?: boolean;
          x_post_id?: string | null;
          x_posted_at?: string | null;
          email_digest_enabled?: boolean;
          email_digest_sent?: boolean;
          email_digest_sent_at?: string | null;
          relevance_score?: number;
          auto_published?: boolean;
          hashtags?: string[] | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_subscribers: {
        Row: {
          id: string;
          account_id: string;
          email: string;
          name: string | null;
          status: 'pending' | 'confirmed' | 'unsubscribed';
          confirmed_at: string | null;
          unsubscribed_at: string | null;
          topics: string[] | null;
          frequency: 'daily' | 'weekly' | 'both';
          confirmation_token: string | null;
          unsubscribe_token: string | null;
          source: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          email: string;
          name?: string | null;
          status?: 'pending' | 'confirmed' | 'unsubscribed';
          confirmed_at?: string | null;
          unsubscribed_at?: string | null;
          topics?: string[] | null;
          frequency?: 'daily' | 'weekly' | 'both';
          confirmation_token?: string | null;
          unsubscribe_token?: string | null;
          source?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          email?: string;
          name?: string | null;
          status?: 'pending' | 'confirmed' | 'unsubscribed';
          confirmed_at?: string | null;
          unsubscribed_at?: string | null;
          topics?: string[] | null;
          frequency?: 'daily' | 'weekly' | 'both';
          confirmation_token?: string | null;
          unsubscribe_token?: string | null;
          source?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_invites: {
        Row: {
          id: string;
          account_id: string;
          email: string;
          name: string | null;
          invited_by_user_id: string;
          token: string;
          token_expires_at: string;
          status: 'pending' | 'accepted' | 'expired' | 'cancelled';
          reminder_count: number;
          last_reminder_at: string | null;
          accepted_at: string | null;
          accepted_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          email: string;
          name?: string | null;
          invited_by_user_id: string;
          token: string;
          token_expires_at: string;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          reminder_count?: number;
          last_reminder_at?: string | null;
          accepted_at?: string | null;
          accepted_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          email?: string;
          name?: string | null;
          invited_by_user_id?: string;
          token?: string;
          token_expires_at?: string;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          reminder_count?: number;
          last_reminder_at?: string | null;
          accepted_at?: string | null;
          accepted_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
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
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Topic = Database['public']['Tables']['topics']['Row'];
export type Source = Database['public']['Tables']['sources']['Row'];
export type ContentItem = Database['public']['Tables']['content_items']['Row'];
export type ContentInteraction = Database['public']['Tables']['content_interactions']['Row'];
export type WhatsHotPost = Database['public']['Tables']['whats_hot_posts']['Row'];
export type EmailSubscriber = Database['public']['Tables']['email_subscribers']['Row'];

export type TopicInsert = Database['public']['Tables']['topics']['Insert'];
export type SourceInsert = Database['public']['Tables']['sources']['Insert'];
export type ContentItemInsert = Database['public']['Tables']['content_items']['Insert'];
export type ContentInteractionInsert = Database['public']['Tables']['content_interactions']['Insert'];
export type WhatsHotPostInsert = Database['public']['Tables']['whats_hot_posts']['Insert'];
export type EmailSubscriberInsert = Database['public']['Tables']['email_subscribers']['Insert'];

export type UserInvite = Database['public']['Tables']['user_invites']['Row'];
export type UserInviteInsert = Database['public']['Tables']['user_invites']['Insert'];
export type AppSetting = Database['public']['Tables']['app_settings']['Row'];

// Extended types with relations
export interface ContentItemWithInteraction extends ContentItem {
  interaction?: ContentInteraction | null;
  topic?: Topic | null;
  source?: Source | null;
}
