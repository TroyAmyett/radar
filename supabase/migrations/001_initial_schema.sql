-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, slug)
);

-- Sources table (RSS feeds, YouTube channels, X accounts)
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'youtube', 'twitter')),
  url TEXT NOT NULL,
  channel_id TEXT,
  username TEXT,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advisors table (people to follow)
CREATE TABLE IF NOT EXISTS advisors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'youtube')),
  username TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content items table
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  advisor_id UUID REFERENCES advisors(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('article', 'video', 'tweet', 'post')),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  duration INTEGER, -- for videos, in seconds
  external_id TEXT, -- original ID from source
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content interactions table (likes, saves, notes)
CREATE TABLE IF NOT EXISTS content_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  is_liked BOOLEAN DEFAULT false,
  is_saved BOOLEAN DEFAULT false,
  notes TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, content_item_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_topics_account_id ON topics(account_id);
CREATE INDEX IF NOT EXISTS idx_sources_account_id ON sources(account_id);
CREATE INDEX IF NOT EXISTS idx_sources_topic_id ON sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_advisors_account_id ON advisors(account_id);
CREATE INDEX IF NOT EXISTS idx_advisors_topic_id ON advisors(topic_id);
CREATE INDEX IF NOT EXISTS idx_content_items_account_id ON content_items(account_id);
CREATE INDEX IF NOT EXISTS idx_content_items_topic_id ON content_items(topic_id);
CREATE INDEX IF NOT EXISTS idx_content_items_source_id ON content_items(source_id);
CREATE INDEX IF NOT EXISTS idx_content_items_advisor_id ON content_items(advisor_id);
CREATE INDEX IF NOT EXISTS idx_content_items_published_at ON content_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_interactions_account_id ON content_interactions(account_id);
CREATE INDEX IF NOT EXISTS idx_content_interactions_content_item_id ON content_interactions(content_item_id);

-- Enable Row Level Security
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topics
CREATE POLICY "Users can view their own topics" ON topics
  FOR SELECT USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can insert their own topics" ON topics
  FOR INSERT WITH CHECK (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can update their own topics" ON topics
  FOR UPDATE USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can delete their own topics" ON topics
  FOR DELETE USING (account_id = current_setting('app.account_id', true));

-- RLS Policies for sources
CREATE POLICY "Users can view their own sources" ON sources
  FOR SELECT USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can insert their own sources" ON sources
  FOR INSERT WITH CHECK (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can update their own sources" ON sources
  FOR UPDATE USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can delete their own sources" ON sources
  FOR DELETE USING (account_id = current_setting('app.account_id', true));

-- RLS Policies for advisors
CREATE POLICY "Users can view their own advisors" ON advisors
  FOR SELECT USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can insert their own advisors" ON advisors
  FOR INSERT WITH CHECK (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can update their own advisors" ON advisors
  FOR UPDATE USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can delete their own advisors" ON advisors
  FOR DELETE USING (account_id = current_setting('app.account_id', true));

-- RLS Policies for content_items
CREATE POLICY "Users can view their own content items" ON content_items
  FOR SELECT USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can insert their own content items" ON content_items
  FOR INSERT WITH CHECK (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can update their own content items" ON content_items
  FOR UPDATE USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can delete their own content items" ON content_items
  FOR DELETE USING (account_id = current_setting('app.account_id', true));

-- RLS Policies for content_interactions
CREATE POLICY "Users can view their own interactions" ON content_interactions
  FOR SELECT USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can insert their own interactions" ON content_interactions
  FOR INSERT WITH CHECK (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can update their own interactions" ON content_interactions
  FOR UPDATE USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can delete their own interactions" ON content_interactions
  FOR DELETE USING (account_id = current_setting('app.account_id', true));

-- Seed default topics
INSERT INTO topics (account_id, name, slug, color, icon, is_default) VALUES
  ('default-account', 'Agentforce', 'agentforce', '#0ea5e9', 'bot', true),
  ('default-account', 'AI Tools', 'ai-tools', '#8b5cf6', 'sparkles', true),
  ('default-account', 'Blockchain AI', 'blockchain-ai', '#f59e0b', 'link', true),
  ('default-account', 'Advisors', 'advisors', '#10b981', 'users', true),
  ('default-account', 'Video', 'video', '#ef4444', 'play', true)
ON CONFLICT (account_id, slug) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advisors_updated_at BEFORE UPDATE ON advisors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_interactions_updated_at BEFORE UPDATE ON content_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
