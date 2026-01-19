-- Migration: Add polymarket to sources type constraint
-- The sources table currently only allows 'rss', 'youtube', 'twitter'
-- This adds 'polymarket' as a valid source type

-- Drop the existing constraint and recreate with polymarket
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_type_check
  CHECK (type IN ('rss', 'youtube', 'twitter', 'polymarket'));

-- Also update content_items type to include 'prediction' if not already done
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_type_check;
ALTER TABLE content_items ADD CONSTRAINT content_items_type_check
  CHECK (type IN ('article', 'video', 'tweet', 'post', 'prediction'));

-- Add columns for source metadata that may be missing
ALTER TABLE sources ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS metadata JSONB;
