-- ============================================================
-- Comments Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create `comments` table
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id uuid NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 200),
  is_watcher boolean NOT NULL DEFAULT false,
  watcher_display text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_pin ON comments(pin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);


-- 2. Row-Level Security (RLS)
-- ============================================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comments" ON comments;
CREATE POLICY "Public read comments" ON comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert comments" ON comments;
CREATE POLICY "Authenticated insert comments" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own comments" ON comments;
CREATE POLICY "Users delete own comments" ON comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
