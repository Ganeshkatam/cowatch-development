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
