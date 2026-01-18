-- Add AI summary fields to content_items
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS ai_key_points JSONB;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS ai_sentiment DECIMAL(3, 2);
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Create user_preferences table for digest settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL UNIQUE,
  digest_enabled BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly', 'both')),
  digest_time TIME DEFAULT '06:00:00',
  digest_timezone TEXT DEFAULT 'America/New_York',
  digest_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  email_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create digest_history table to track sent digests
CREATE TABLE IF NOT EXISTS digest_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id TEXT NOT NULL,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('morning', 'weekly')),
  content_count INTEGER,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_items_ai_analyzed ON content_items(ai_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_account_id ON user_preferences(account_id);
CREATE INDEX IF NOT EXISTS idx_digest_history_account_id ON digest_history(account_id);
CREATE INDEX IF NOT EXISTS idx_digest_history_sent_at ON digest_history(sent_at);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (account_id = current_setting('app.account_id', true));

-- RLS Policies for digest_history
CREATE POLICY "Users can view their own digest history" ON digest_history
  FOR SELECT USING (account_id = current_setting('app.account_id', true));

CREATE POLICY "Users can insert their own digest history" ON digest_history
  FOR INSERT WITH CHECK (account_id = current_setting('app.account_id', true));

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
