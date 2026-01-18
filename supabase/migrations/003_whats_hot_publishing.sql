-- Migration: What's Hot Publishing
-- Creates tables for publishing content and email subscribers

-- What's Hot Posts table
CREATE TABLE IF NOT EXISTS whats_hot_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id TEXT NOT NULL,
    content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    author TEXT,

    -- Publishing status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'scheduled')),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE,

    -- X (Twitter) integration
    x_post_enabled BOOLEAN DEFAULT false,
    x_post_id TEXT,
    x_posted_at TIMESTAMP WITH TIME ZONE,

    -- Email digest
    email_digest_enabled BOOLEAN DEFAULT false,
    email_digest_sent BOOLEAN DEFAULT false,
    email_digest_sent_at TIMESTAMP WITH TIME ZONE,

    -- Auto-publish scoring
    relevance_score INTEGER DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
    auto_published BOOLEAN DEFAULT false,

    -- Metadata
    hashtags TEXT[],
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Subscribers table
CREATE TABLE IF NOT EXISTS email_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,

    -- Subscription status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,

    -- Preferences
    topics TEXT[],  -- Array of topic slugs to subscribe to
    frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'both')),

    -- Tokens
    confirmation_token TEXT UNIQUE,
    unsubscribe_token TEXT UNIQUE,

    -- Metadata
    source TEXT,  -- Where they subscribed from
    metadata JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(account_id, email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whats_hot_posts_account ON whats_hot_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_whats_hot_posts_status ON whats_hot_posts(status);
CREATE INDEX IF NOT EXISTS idx_whats_hot_posts_published_at ON whats_hot_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_whats_hot_posts_topic ON whats_hot_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_whats_hot_posts_email_digest ON whats_hot_posts(email_digest_enabled, email_digest_sent);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_account ON email_subscribers(account_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON email_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_tokens ON email_subscribers(confirmation_token, unsubscribe_token);

-- Enable RLS
ALTER TABLE whats_hot_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whats_hot_posts (public read, authenticated write)
CREATE POLICY "Public can read published whats_hot_posts"
    ON whats_hot_posts FOR SELECT
    USING (status = 'published');

CREATE POLICY "Authenticated users can manage whats_hot_posts"
    ON whats_hot_posts FOR ALL
    USING (true)
    WITH CHECK (true);

-- RLS Policies for email_subscribers
CREATE POLICY "Authenticated users can manage email_subscribers"
    ON email_subscribers FOR ALL
    USING (true)
    WITH CHECK (true);

-- Updated at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_whats_hot_posts_updated_at ON whats_hot_posts;
CREATE TRIGGER update_whats_hot_posts_updated_at
    BEFORE UPDATE ON whats_hot_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_subscribers_updated_at ON email_subscribers;
CREATE TRIGGER update_email_subscribers_updated_at
    BEFORE UPDATE ON email_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
