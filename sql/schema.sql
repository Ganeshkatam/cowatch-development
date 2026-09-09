-- ==============================================================================
-- CoWatch Complete Database Schema
-- Verified against live production database (PostgreSQL 17 on Supabase)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES & CONSTRAINTS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Table: profiles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  username text,
  display_name text,
  avatar_url text,
  pref_show_chat_column boolean NOT NULL DEFAULT true,
  pref_show_people_column boolean NOT NULL DEFAULT false,
  pref_disable_chat_sound boolean NOT NULL DEFAULT false,
  pref_camera_on boolean NOT NULL DEFAULT false,
  pref_mic_on boolean NOT NULL DEFAULT false,
  pref_appearance_mode text NOT NULL DEFAULT 'system'::text,
  CONSTRAINT profiles_pref_appearance_mode_check CHECK (pref_appearance_mode IN ('light', 'mantine', 'system')),
  CONSTRAINT profiles_display_name_length CHECK (display_name IS NULL OR (char_length(display_name) >= 1 AND char_length(display_name) <= 50))
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles USING btree (lower(username)) WHERE (username IS NOT NULL);

-- ------------------------------------------------------------------------------
-- Table: rooms
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  "roomId" text PRIMARY KEY,
  "creationTime" timestamp with time zone,
  passcode text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE,
  "isChatDisabled" boolean NOT NULL DEFAULT false,
  "isSubRoom" boolean,
  "coverPhoto" text,
  data jsonb,
  "lastUpdateTime" timestamp with time zone,
  "roomTitle" text NOT NULL,
  "roomDescription" text,
  "mediaPath" text,
  status text NOT NULL DEFAULT 'waiting'::text,
  "scheduledStartsAt" timestamp with time zone,
  "startedAt" timestamp with time zone,
  "expiresAt" timestamp with time zone,
  "endedAt" timestamp with time zone,
  "cancelledAt" timestamp with time zone,
  "isPermanent" boolean NOT NULL DEFAULT false,
  "durationMinutes" integer,
  "lastActiveAt" timestamp with time zone,
  owner_passcode text NOT NULL,
  passcode_fingerprint text UNIQUE NOT NULL,
  CONSTRAINT room_status_check CHECK (status IN ('waiting', 'scheduled', 'active', 'inactive', 'ended', 'expired', 'cancelled')),
  CONSTRAINT room_title_not_empty CHECK (btrim("roomTitle") <> ''),
  CONSTRAINT rooms_expiration_policy_check CHECK (
    (("isPermanent" = true) AND ("expiresAt" IS NULL))
    OR
    (("isPermanent" = false) AND ((status IN ('waiting', 'scheduled', 'cancelled')) OR ("expiresAt" IS NOT NULL)))
  ),
  CONSTRAINT rooms_lifecycle_invariants_check CHECK (
    (status <> 'scheduled' OR ("scheduledStartsAt" IS NOT NULL AND "startedAt" IS NULL AND "endedAt" IS NULL AND "expiresAt" IS NULL AND "cancelledAt" IS NULL))
    AND
    (status <> 'active' OR ("startedAt" IS NOT NULL AND "endedAt" IS NULL AND "cancelledAt" IS NULL))
    AND
    (status <> 'ended' OR ("startedAt" IS NOT NULL AND "endedAt" IS NOT NULL AND "endedAt" >= "startedAt" AND "cancelledAt" IS NULL))
    AND
    (status <> 'expired' OR ("startedAt" IS NOT NULL AND "expiresAt" IS NOT NULL AND "endedAt" IS NULL AND "cancelledAt" IS NULL AND "isPermanent" = false))
    AND
    (status <> 'cancelled' OR ("scheduledStartsAt" IS NOT NULL AND "cancelledAt" IS NOT NULL AND "startedAt" IS NULL AND "endedAt" IS NULL AND "expiresAt" IS NULL))
  )
);

CREATE INDEX IF NOT EXISTS idx_rooms_scheduled_due ON public.rooms (status, "scheduledStartsAt") WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS "room_creationTime_idx" ON public.rooms USING btree ("creationTime");
CREATE INDEX IF NOT EXISTS room_owner_id_idx ON public.rooms USING btree (owner_id);
CREATE INDEX IF NOT EXISTS "room_roomId_idx" ON public.rooms USING gin ("roomId" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_room_expires_at ON public.rooms USING btree ("expiresAt") WHERE (("expiresAt" IS NOT NULL) AND (status = 'active'::text));
CREATE INDEX IF NOT EXISTS rooms_inactivity_idx ON public.rooms USING btree ("lastActiveAt") WHERE (status = 'active'::text);

-- ------------------------------------------------------------------------------
-- Table: room_lifecycle_events
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "roomId" text NOT NULL REFERENCES public.rooms("roomId") ON DELETE CASCADE,
  actor text NOT NULL,
  event text NOT NULL,
  "previousStatus" text,
  "newStatus" text,
  "previousExpiresAt" timestamp with time zone,
  "newExpiresAt" timestamp with time zone,
  reason text,
  "timestamp" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_lifecycle_events_room_id ON public.room_lifecycle_events USING btree ("roomId");
CREATE INDEX IF NOT EXISTS idx_room_lifecycle_events_timestamp ON public.room_lifecycle_events USING btree ("timestamp");

-- ------------------------------------------------------------------------------
-- Table: room_invites
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms("roomId") ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  used_at timestamptz NULL,
  max_uses integer NULL,
  uses integer NOT NULL DEFAULT 0,
  CONSTRAINT room_invites_max_uses_check CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT room_invites_uses_check CHECK (uses >= 0 AND (max_uses IS NULL OR uses <= max_uses))
);
CREATE INDEX IF NOT EXISTS room_invites_token_hash_idx ON public.room_invites USING btree (token_hash);
CREATE INDEX IF NOT EXISTS room_invites_room_revoked_idx ON public.room_invites USING btree (room_id, revoked_at);
CREATE INDEX IF NOT EXISTS room_invites_expires_at_idx ON public.room_invites USING btree (expires_at);

-- ------------------------------------------------------------------------------
-- Table: room_messages
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms("roomId") ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'user'::text,
  event_type text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  client_message_id uuid,
  CONSTRAINT room_messages_client_message_id_key UNIQUE (room_id, user_id, client_message_id),
  CONSTRAINT room_messages_type_check CHECK (message_type IN ('user', 'system')),
  CONSTRAINT room_messages_event_check CHECK (((message_type = 'user'::text) AND (event_type IS NULL)) OR ((message_type = 'system'::text) AND (event_type IS NOT NULL))),
  CONSTRAINT room_messages_not_empty CHECK (btrim(message) <> ''),
  CONSTRAINT room_messages_updated_at_check CHECK (updated_at IS NULL OR updated_at >= created_at)
);
CREATE INDEX IF NOT EXISTS room_messages_room_created_id_idx ON public.room_messages USING btree (room_id, created_at DESC, id DESC);

-- ------------------------------------------------------------------------------
-- Table: active_user
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.active_user (uid text PRIMARY KEY, "lastActiveTime" timestamp with time zone);

-- ------------------------------------------------------------------------------
-- Table: vbrowser
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vbrowser (
  id bigserial PRIMARY KEY,
  pool text NOT NULL,
  vmid text NOT NULL,
  state text NOT NULL,
  "creationTime" timestamp with time zone NOT NULL,
  "heartbeatTime" timestamp with time zone,
  "assignTime" timestamp with time zone,
  "roomId" text,
  uid text,
  data json,
  retries integer DEFAULT 0,
  pass text,
  image text
);
CREATE UNIQUE INDEX IF NOT EXISTS vbrowser_pool_vmid_idx ON public.vbrowser USING btree (pool, vmid);
CREATE INDEX IF NOT EXISTS vbrowser_pool_state_idx ON public.vbrowser USING btree (pool, state);
CREATE INDEX IF NOT EXISTS "vbrowser_roomId_idx" ON public.vbrowser USING btree ("roomId");
CREATE INDEX IF NOT EXISTS vbrowser_uid_idx ON public.vbrowser USING btree (uid);

-- Table: announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'feature', 'maintenance', 'important')),
  action_label text,
  action_url text,
  target_pages text[] NOT NULL DEFAULT ARRAY['all']::text[],
  is_active boolean NOT NULL DEFAULT true,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_active_published_idx ON public.announcements USING btree (is_active, published_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS announcements_target_pages_gin ON public.announcements USING gin (target_pages);

-- ==============================================================================
-- 3. FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
begin
  insert into public.profiles (id, username, avatar_url, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url), display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
begin new.updated_at = now(); return new; end;
$$;
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.delete_unconfirmed_users()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM auth.users WHERE email_confirmed_at IS NULL AND created_at < now() - interval '7 days' LOOP
    DELETE FROM public.rooms WHERE owner_id = rec.id;
    BEGIN
      EXECUTE 'DELETE FROM public.link_account WHERE uid = $1' USING rec.id::text;
    EXCEPTION WHEN undefined_table THEN
    END;
    DELETE FROM storage.objects WHERE bucket_id = 'avatars' AND (name LIKE rec.id::text || '/%');
    DELETE FROM auth.users WHERE id = rec.id;
  END LOOP;
END;
$$;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vbrowser ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active published announcements" ON public.announcements;
CREATE POLICY "Public can view active published announcements"
  ON public.announcements
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND published_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
  );

DROP POLICY IF EXISTS "room_invites_no_direct_client_access" ON public.room_invites;
CREATE POLICY "room_invites_no_direct_client_access"
  ON public.room_invites
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Rooms Policies
DROP POLICY IF EXISTS "Users can view their own rooms" ON public.rooms;
CREATE POLICY "Users can view their own rooms" ON public.rooms FOR SELECT TO public USING (auth.uid() = owner_id);

-- ==============================================================================
-- 5. REALTIME PUBLICATIONS
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- ==============================================================================
-- 6. STORAGE BUCKETS & POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES 
  ('avatars', 'avatars', true, 1048576, null), 
  ('room_covers', 'room_covers', true, null, null),
  ('app', 'app', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET 
  public = excluded.public, 
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Public Select avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete avatars" ON storage.objects;

DROP POLICY IF EXISTS "Public Select room_covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert room_covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update room_covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete room_covers" ON storage.objects;

CREATE POLICY "Public Select avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Auth Insert avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth Update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth Delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public Select room_covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'room_covers');

CREATE POLICY "Auth Insert room_covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'room_covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth Update room_covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'room_covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'room_covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth Delete room_covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'room_covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Public Access to app bucket" ON storage.objects;
CREATE POLICY "Public Access to app bucket" ON storage.objects FOR SELECT TO public USING (bucket_id = 'app');

CREATE OR REPLACE FUNCTION public.cleanup_room_storage_on_delete()
RETURNS TRIGGER AS $$
DECLARE v_clean_id text;
BEGIN
  v_clean_id := regexp_replace(OLD."roomId", '^/+', '');
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects WHERE bucket_id = 'room_covers' AND (name LIKE OLD.owner_id || '/' || v_clean_id || '/%' OR name LIKE OLD.owner_id || '/%' || v_clean_id || '/%');
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_cleanup_room_storage ON public.rooms;
CREATE TRIGGER trigger_cleanup_room_storage AFTER DELETE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.cleanup_room_storage_on_delete();

CREATE OR REPLACE FUNCTION public.cleanup_user_storage_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects WHERE bucket_id = 'avatars' AND name LIKE OLD.id || '/%';
  DELETE FROM storage.objects WHERE bucket_id = 'room_covers' AND name LIKE OLD.id || '/%';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_cleanup_user_storage ON public.profiles;
CREATE TRIGGER trigger_cleanup_user_storage AFTER DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_storage_on_delete();

-- ==============================================================================
-- 7. SCHEMA DOCUMENTATION (TABLES AND COLUMNS)
-- ==============================================================================

-- PROFILES
COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase Auth users. Stores user preferences and display information.';
COMMENT ON COLUMN public.profiles.id IS 'Primary key, references auth.users(id).';
COMMENT ON COLUMN public.profiles.username IS 'Unique username chosen by the user.';
COMMENT ON COLUMN public.profiles.display_name IS 'Display name shown in UI (1-50 chars).';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user''s avatar image.';
COMMENT ON COLUMN public.profiles.pref_appearance_mode IS 'User preference for UI theme (light, mantine, system).';

-- ROOMS
COMMENT ON TABLE public.rooms IS 'Core entity representing watch party rooms and their state.';
COMMENT ON COLUMN public.rooms."roomId" IS 'Unique identifier for the room (e.g., URL slug).';
COMMENT ON COLUMN public.rooms.passcode IS 'One-way hash (e.g., bcrypt) of the room passcode. Used for secure guest verification.';
COMMENT ON COLUMN public.rooms.owner_passcode IS 'Two-way encrypted version of the passcode. Used so the owner can view/copy their passcode later.';
COMMENT ON COLUMN public.rooms.passcode_fingerprint IS 'Deterministic HMAC-SHA256 of the passcode. Used strictly for enforcing global uniqueness of generated passcodes.';
COMMENT ON COLUMN public.rooms.status IS 'Current lifecycle state of the room (waiting, scheduled, active, inactive, ended, expired, cancelled).';
COMMENT ON COLUMN public.rooms."scheduledStartsAt" IS 'When the room is scheduled to start (for scheduled status).';
COMMENT ON COLUMN public.rooms."startedAt" IS 'When the room actually became active.';
COMMENT ON COLUMN public.rooms."cancelledAt" IS 'When a scheduled room was cancelled.';
COMMENT ON COLUMN public.rooms."expiresAt" IS 'When the room is set to expire/auto-close.';
COMMENT ON COLUMN public.rooms."endedAt" IS 'When the room was explicitly ended by the host.';
COMMENT ON COLUMN public.rooms."isPermanent" IS 'If true, the room does not automatically expire.';
COMMENT ON COLUMN public.rooms.owner_id IS 'References the profile of the room creator/owner.';

-- ROOM_LIFECYCLE_EVENTS
COMMENT ON TABLE public.room_lifecycle_events IS 'Audit log of state transitions for rooms (e.g., active -> ended).';
COMMENT ON COLUMN public.room_lifecycle_events.actor IS 'Who or what triggered the event (e.g., user id or system).';
COMMENT ON COLUMN public.room_lifecycle_events.event IS 'Type of lifecycle event (e.g., start, end, cancel, expire).';
COMMENT ON COLUMN public.room_lifecycle_events."previousStatus" IS 'Room status before the event.';
COMMENT ON COLUMN public.room_lifecycle_events."newStatus" IS 'Room status after the event.';

-- ROOM_INVITES
COMMENT ON TABLE public.room_invites IS 'Secure invitation links allowing users to join a room without needing the passcode.';
COMMENT ON COLUMN public.room_invites.token_hash IS 'Unique hash of the invitation token. The plaintext token is embedded in the invite URL.';
COMMENT ON COLUMN public.room_invites.max_uses IS 'Maximum number of times this invite can be used.';
COMMENT ON COLUMN public.room_invites.uses IS 'Current number of times this invite has been used.';
COMMENT ON COLUMN public.room_invites.expires_at IS 'Timestamp when the invite becomes invalid.';
COMMENT ON COLUMN public.room_invites.revoked_at IS 'Timestamp when the invite was explicitly revoked by the owner.';

-- ROOM_MESSAGES
COMMENT ON TABLE public.room_messages IS 'Persistent chat messages and system events within a room.';
COMMENT ON COLUMN public.room_messages.message_type IS 'Either "user" for normal chat or "system" for automated events.';
COMMENT ON COLUMN public.room_messages.event_type IS 'Specific system event type (e.g., user_joined) when message_type is "system".';
COMMENT ON COLUMN public.room_messages.client_message_id IS 'Idempotency key provided by the client to prevent duplicate message inserts.';

-- ACTIVE_USER
COMMENT ON TABLE public.active_user IS 'Tracks recent active timestamps for users to determine online presence.';

-- VBROWSER
COMMENT ON TABLE public.vbrowser IS 'Tracks virtual browser instances from the pool, assigned to rooms for screensharing.';
COMMENT ON COLUMN public.vbrowser.pool IS 'The provider pool this vbrowser belongs to.';
COMMENT ON COLUMN public.vbrowser.vmid IS 'Unique identifier for the VM instance.';
COMMENT ON COLUMN public.vbrowser.state IS 'Current state of the VM (e.g., available, assigned).';
COMMENT ON COLUMN public.vbrowser."roomId" IS 'The room this VM is currently assigned to.';
COMMENT ON COLUMN public.vbrowser.pass IS 'Password required to connect to the VM stream.';

-- ANNOUNCEMENTS
COMMENT ON TABLE public.announcements IS 'Global site announcements shown to users across the platform.';
COMMENT ON COLUMN public.announcements.type IS 'Category of announcement (info, feature, maintenance, important).';
COMMENT ON COLUMN public.announcements.target_pages IS 'Array of paths where this announcement should be displayed.';
COMMENT ON COLUMN public.announcements.is_active IS 'Whether the announcement is currently active and visible.';
