-- Add digest_prompt column to user_preferences for custom AI briefing prompts
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS digest_prompt TEXT;
