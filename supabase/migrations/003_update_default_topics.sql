-- Remove old default topics
DELETE FROM topics
WHERE account_id = 'default-account'
AND slug IN ('advisors', 'video');

-- Add new default topics
INSERT INTO topics (account_id, name, slug, color, icon, is_default) VALUES
  ('default-account', 'Competitors', 'competitors', '#ef4444', 'target', true),
  ('default-account', 'Partners', 'partners', '#10b981', 'handshake', true)
ON CONFLICT (account_id, slug) DO NOTHING;
