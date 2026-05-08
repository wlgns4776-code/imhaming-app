-- Supabase Schema Migration from Base44
-- 1. Create tables

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  session_id TEXT NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  sort_order INTEGER DEFAULT 0,
  external_id TEXT,
  color TEXT,
  time TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  columns JSONB,
  categories JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  user_id TEXT,
  category TEXT,
  counts JSONB,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS music_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track TEXT,
  lyrics TEXT,
  current_lyric_index INTEGER DEFAULT -1,
  is_playing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'ming',
  images JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS part_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id TEXT,
  song_title TEXT,
  lyrics TEXT,
  members TEXT,
  assignments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pieces INTEGER NOT NULL,
  reward TEXT NOT NULL,
  emoji TEXT,
  color_from TEXT,
  color_to TEXT,
  popular BOOLEAN,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  costume TEXT NOT NULL,
  type TEXT NOT NULL,
  pieces INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  lyrics TEXT,
  key TEXT,
  tags JSONB,
  proficiency TEXT,
  condition_check BOOLEAN,
  remarks TEXT,
  youtube_url TEXT,
  mr_url TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Storage Bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT DO NOTHING;

-- 3. Disable RLS (Row Level Security) temporarily for all tables to allow the app to work identically to Base44
ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_memos DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE music_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE outfits DISABLE ROW LEVEL SECURITY;
ALTER TABLE part_distributors DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_exchange_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- 4. Enable public access to the storage bucket
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'uploads');

