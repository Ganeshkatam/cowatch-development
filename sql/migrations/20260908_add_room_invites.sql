-- Secure invitation tokens: only SHA-256 token hashes are persisted.
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

CREATE INDEX IF NOT EXISTS room_invites_token_hash_idx
  ON public.room_invites USING btree (token_hash);

CREATE INDEX IF NOT EXISTS room_invites_room_revoked_idx
  ON public.room_invites USING btree (room_id, revoked_at);

CREATE INDEX IF NOT EXISTS room_invites_expires_at_idx
  ON public.room_invites USING btree (expires_at);

ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

-- Invite lifecycle is intentionally managed by the application service using the
-- server-side database connection. Do not expose invite rows to browser clients.
DROP POLICY IF EXISTS "room_invites_no_direct_client_access" ON public.room_invites;
CREATE POLICY "room_invites_no_direct_client_access"
  ON public.room_invites
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
