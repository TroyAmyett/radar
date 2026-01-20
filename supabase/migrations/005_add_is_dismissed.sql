-- Add is_dismissed column to content_interactions table
-- This allows users to permanently hide content items without deleting them
-- so they don't reappear when sources are re-fetched

ALTER TABLE public.content_interactions
ADD COLUMN IF NOT EXISTS is_dismissed boolean DEFAULT false;

-- Add index for filtering dismissed items
CREATE INDEX IF NOT EXISTS idx_content_interactions_is_dismissed
ON public.content_interactions(is_dismissed)
WHERE is_dismissed = true;

-- Comment on column
COMMENT ON COLUMN public.content_interactions.is_dismissed IS 'Whether the user has dismissed/hidden this content item';
