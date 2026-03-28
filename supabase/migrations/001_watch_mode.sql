-- ============================================================
-- Watch Mode Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add new columns to existing `pins` table
-- ============================================================

ALTER TABLE pins
  ADD COLUMN IF NOT EXISTS pending_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_resolved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS community_resolve_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS community_resolve_by uuid REFERENCES auth.users(id);

-- Update status check: now allows 'active', 'pending_resolved', 'resolved'
-- (drop old constraint if exists, then add new one)
ALTER TABLE pins DROP CONSTRAINT IF EXISTS pins_status_check;
ALTER TABLE pins ADD CONSTRAINT pins_status_check
  CHECK (status IN ('active', 'pending_resolved', 'resolved'));


-- 2. Create `user_profiles` table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'regular'
    CHECK (role IN ('regular', 'institutional', 'admin')),
  role_status text NOT NULL DEFAULT 'active'
    CHECK (role_status IN ('active', 'pending_approval', 'rejected')),
  municipality text,
  institution_name text,
  notification_municipality text,
  notification_interests text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- 3. Create `votes` table
-- ============================================================

CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id uuid NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pin_id, user_id)
);


-- 4. Create `notifications` table
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('pending_resolve', 'community_resolve', 'vote_result', 'new_report', 'role_update')),
  pin_id uuid REFERENCES pins(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read) WHERE read = false;


-- 5. Create `push_subscriptions` table
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);


-- 6. Row-Level Security (RLS)
-- ============================================================

-- pins: public read, authenticated write
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read pins" ON pins;
CREATE POLICY "Public read pins" ON pins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert pins" ON pins;
CREATE POLICY "Authenticated insert pins" ON pins
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated update pins" ON pins;
CREATE POLICY "Authenticated update pins" ON pins
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- user_profiles: users read/update own, admins read/update all
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
CREATE POLICY "Users read own profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin' AND role_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin' AND role_status = 'active'
    )
  );

-- Allow reading all profiles for institutional role checks (municipality matching)
DROP POLICY IF EXISTS "Public read basic profiles" ON user_profiles;
CREATE POLICY "Public read basic profiles" ON user_profiles
  FOR SELECT USING (true);

-- votes: authenticated insert/read
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read votes" ON votes;
CREATE POLICY "Authenticated read votes" ON votes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert votes" ON votes;
CREATE POLICY "Authenticated insert votes" ON votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated update own votes" ON votes;
CREATE POLICY "Authenticated update own votes" ON votes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- notifications: users read/update own only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated insert notifications" ON notifications;
CREATE POLICY "Authenticated insert notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- push_subscriptions: users manage own
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subs" ON push_subscriptions;
CREATE POLICY "Users manage own push subs" ON push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
