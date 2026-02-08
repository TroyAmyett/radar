-- Migration: Add user invites system
-- Description: Create tables for invite management with email reminders

-- =====================================================
-- Table: app_settings (for configurable limits)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings for invites
INSERT INTO app_settings (key, value, description) VALUES
  ('invite_limit_per_user', '3', 'Maximum invites per user'),
  ('invite_expiry_days', '7', 'Days before invite token expires'),
  ('invite_reminder_max', '3', 'Maximum reminder emails to send'),
  ('invite_reminder_interval_hours', '24', 'Hours between reminder emails')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Table: user_invites
-- =====================================================
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, email)
);

-- Index for efficient cron job queries
CREATE INDEX IF NOT EXISTS idx_user_invites_pending
  ON user_invites(status, last_reminder_at)
  WHERE status = 'pending';

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_user_invites_token
  ON user_invites(token);

-- Index for user's invites
CREATE INDEX IF NOT EXISTS idx_user_invites_invited_by
  ON user_invites(invited_by_user_id);

-- =====================================================
-- RLS Policies for user_invites
-- =====================================================
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Super admins can manage all invites" ON user_invites;
DROP POLICY IF EXISTS "Users can view invites they sent" ON user_invites;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all invites" ON user_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Users can view invites they sent
CREATE POLICY "Users can view invites they sent" ON user_invites
  FOR SELECT USING (invited_by_user_id = auth.uid());

-- =====================================================
-- RLS Policies for app_settings (read-only for all authenticated)
-- =====================================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Authenticated users can read settings" ON app_settings;
DROP POLICY IF EXISTS "Super admins can manage settings" ON app_settings;

-- Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read settings" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only super admins can modify settings
CREATE POLICY "Super admins can manage settings" ON app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- =====================================================
-- Updated_at trigger for user_invites
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_invites_updated_at ON user_invites;
CREATE TRIGGER user_invites_updated_at
  BEFORE UPDATE ON user_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_user_invites_updated_at();

-- =====================================================
-- Helper function to get app setting value
-- =====================================================
CREATE OR REPLACE FUNCTION get_app_setting(setting_key TEXT, default_value JSONB DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT value INTO result FROM app_settings WHERE key = setting_key;
  RETURN COALESCE(result, default_value);
END;
$$ LANGUAGE plpgsql STABLE;
