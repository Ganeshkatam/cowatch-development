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

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique 
  ON public.profiles USING btree (lower(username)) 
  WHERE (username IS NOT NULL);

-- ------------------------------------------------------------------------------
-- Table: rooms
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  "roomId" text PRIMARY KEY,
  "creationTime" timestamp with time zone,
  passcode text,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON UPDATE CASCADE,
  "isChatDisabled" boolean NOT NULL DEFAULT false,
  "isSubRoom" boolean,
  "coverPhoto" text,
  data jsonb,
  "lastUpdateTime" timestamp with time zone,
  "roomTitle" text NOT NULL,
  "roomDescription" text,
  "mediaPath" text,
  status text NOT NULL DEFAULT 'active'::text,
  "startedAt" timestamp with time zone NOT NULL,
  "expiresAt" timestamp with time zone,
  "endedAt" timestamp with time zone,
  "isPermanent" boolean NOT NULL DEFAULT false,
  "lastActiveAt" timestamp with time zone,
  owner_passcode text,
  CONSTRAINT room_status_check CHECK (status IN ('scheduled', 'active', 'inactive', 'ended', 'expired')),
  CONSTRAINT room_title_not_empty CHECK (btrim("roomTitle") <> ''),
  CONSTRAINT rooms_expiration_policy_check CHECK (
    (("isPermanent" = true) AND ("expiresAt" IS NULL)) OR 
    (("isPermanent" = false) AND ("expiresAt" IS NOT NULL))
  )
);

CREATE INDEX IF NOT EXISTS "room_creationTime_idx" ON public.rooms USING btree ("creationTime");
CREATE INDEX IF NOT EXISTS room_owner_id_idx ON public.rooms USING btree (owner_id);
CREATE INDEX IF NOT EXISTS "room_roomId_idx" ON public.rooms USING gin ("roomId" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_room_expires_at 
  ON public.rooms USING btree ("expiresAt") 
  WHERE (("expiresAt" IS NOT NULL) AND (status = 'active'::text));
CREATE INDEX IF NOT EXISTS rooms_inactivity_idx 
  ON public.rooms USING btree ("lastActiveAt") 
  WHERE (status = 'active'::text);

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

CREATE INDEX IF NOT EXISTS idx_room_lifecycle_events_room_id 
  ON public.room_lifecycle_events USING btree ("roomId");
CREATE INDEX IF NOT EXISTS idx_room_lifecycle_events_timestamp 
  ON public.room_lifecycle_events USING btree ("timestamp");

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
  CONSTRAINT room_messages_event_check CHECK (
    ((message_type = 'user'::text) AND (event_type IS NULL)) OR 
    ((message_type = 'system'::text) AND (event_type IS NOT NULL))
  ),
  CONSTRAINT room_messages_not_empty CHECK (btrim(message) <> ''),
  CONSTRAINT room_messages_updated_at_check CHECK (updated_at IS NULL OR updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS room_messages_room_created_id_idx 
  ON public.room_messages USING btree (room_id, created_at DESC, id DESC);

-- ------------------------------------------------------------------------------
-- Table: active_user
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.active_user (
  uid text PRIMARY KEY,
  "lastActiveTime" timestamp with time zone
);

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

-- ==============================================================================
-- 3. FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
begin
  insert into public.profiles (
    id,
    username,
    avatar_url,
    display_name
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'username',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update set
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatically update profiles.updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cleanup unconfirmed users older than 7 days
CREATE OR REPLACE FUNCTION public.delete_unconfirmed_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT id FROM auth.users 
        WHERE email_confirmed_at IS NULL AND created_at < now() - interval '7 days'
    LOOP
        DELETE FROM public.rooms WHERE owner_id = rec.id;
        
        BEGIN
            EXECUTE 'DELETE FROM public.link_account WHERE uid = $1' USING rec.id::text;
        EXCEPTION
            WHEN undefined_table THEN
                -- table not present, ignore
        END;

        DELETE FROM storage.objects 
        WHERE bucket_id = 'avatars' 
          AND (name LIKE rec.id::text || '/%');
          
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

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid()) 
  WITH CHECK (id = auth.uid());

-- Rooms Policies
DROP POLICY IF EXISTS "Users can view their own rooms" ON public.rooms;
CREATE POLICY "Users can view their own rooms" 
  ON public.rooms FOR SELECT 
  TO public 
  USING (auth.uid() = owner_id);

-- ==============================================================================
-- 5. REALTIME PUBLICATIONS
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- ==============================================================================
-- 6. STORAGE BUCKETS & POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('avatars', 'avatars', true, 1048576),
  ('room_covers', 'room_covers', true, null)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Avatars Bucket Policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." 
  ON storage.objects FOR SELECT 
  TO public 
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload avatars to their own folder." ON storage.objects;
CREATE POLICY "Users can upload avatars to their own folder." 
  ON storage.objects FOR INSERT 
  TO public 
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update avatars in their own folder." ON storage.objects;
CREATE POLICY "Users can update avatars in their own folder." 
  ON storage.objects FOR UPDATE 
  TO public 
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete avatars in their own folder." ON storage.objects;
CREATE POLICY "Users can delete avatars in their own folder." 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Room Covers Bucket Policies
DROP POLICY IF EXISTS "Public Access to room_covers" ON storage.objects;
CREATE POLICY "Public Access to room_covers" 
  ON storage.objects FOR SELECT 
  TO public 
  USING (bucket_id = 'room_covers');

DROP POLICY IF EXISTS "Users can upload their own room covers" ON storage.objects;
CREATE POLICY "Users can upload their own room covers" 
  ON storage.objects FOR INSERT 
  TO public 
  WITH CHECK (
    (bucket_id = 'room_covers') AND 
    (auth.role() = 'authenticated') AND 
    ((storage.foldername(name))[1] = (auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can update their own room covers" ON storage.objects;
CREATE POLICY "Users can update their own room covers" 
  ON storage.objects FOR UPDATE 
  TO public 
  USING (
    (bucket_id = 'room_covers') AND 
    (auth.role() = 'authenticated') AND 
    ((storage.foldername(name))[1] = (auth.uid())::text)
  );

DROP POLICY IF EXISTS "Users can delete their own room covers" ON storage.objects;
CREATE POLICY "Users can delete their own room covers" 
  ON storage.objects FOR DELETE 
  TO public 
  USING (
    (bucket_id = 'room_covers') AND 
    (auth.role() = 'authenticated') AND 
    ((storage.foldername(name))[1] = (auth.uid())::text)
  );

-- ------------------------------------------------------------------------------
-- Storage Cleanup Triggers: Prevent Orphan Storage Objects
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_room_storage_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_clean_id text;
BEGIN
  v_clean_id := regexp_replace(OLD."roomId", '^/+', '');
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE bucket_id = 'room_covers'
    AND (
      name LIKE OLD.owner_id || '/' || v_clean_id || '/%'
      OR name LIKE OLD.owner_id || '/%' || v_clean_id || '/%'
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_room_storage ON public.rooms;
CREATE TRIGGER trigger_cleanup_room_storage
AFTER DELETE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_room_storage_on_delete();

CREATE OR REPLACE FUNCTION public.cleanup_user_storage_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND name LIKE OLD.id || '/%';
  DELETE FROM storage.objects
  WHERE bucket_id = 'room_covers'
    AND name LIKE OLD.id || '/%';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_user_storage ON public.profiles;
CREATE TRIGGER trigger_cleanup_user_storage
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_user_storage_on_delete();

