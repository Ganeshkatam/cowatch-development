-- ==============================================================================
-- Migration: Add scheduledStartsAt, cancelledAt and formalize lifecycle constraints
-- ==============================================================================

-- 1. Add scheduledStartsAt and cancelledAt columns
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS "scheduledStartsAt" timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp with time zone NULL;

-- 2. Update status check constraint to explicitly permit 'cancelled'
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS room_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT room_status_check
  CHECK (status IN ('waiting', 'scheduled', 'active', 'inactive', 'ended', 'expired', 'cancelled'));

-- 3. Update expiration policy constraint to account for 'cancelled' rooms (which have no expiresAt)
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_expiration_policy_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_expiration_policy_check
  CHECK (
    (("isPermanent" = true) AND ("expiresAt" IS NULL))
    OR
    (("isPermanent" = false) AND ((status IN ('waiting', 'scheduled', 'cancelled')) OR ("expiresAt" IS NOT NULL)))
  );

-- 4. Enforce structural lifecycle state invariants
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_lifecycle_invariants_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_lifecycle_invariants_check CHECK (
  -- scheduled: scheduledStartsAt must be set; startedAt, endedAt, expiresAt, cancelledAt must be NULL
  (status <> 'scheduled' OR ("scheduledStartsAt" IS NOT NULL AND "startedAt" IS NULL AND "endedAt" IS NULL AND "expiresAt" IS NULL AND "cancelledAt" IS NULL))
  AND
  -- active: startedAt must be set; endedAt, cancelledAt must be NULL
  (status <> 'active' OR ("startedAt" IS NOT NULL AND "endedAt" IS NULL AND "cancelledAt" IS NULL))
  AND
  -- ended: startedAt and endedAt must be set; endedAt >= startedAt; cancelledAt must be NULL
  (status <> 'ended' OR ("startedAt" IS NOT NULL AND "endedAt" IS NOT NULL AND "endedAt" >= "startedAt" AND "cancelledAt" IS NULL))
  AND
  -- expired: startedAt and expiresAt must be set; endedAt, cancelledAt must be NULL; cannot be permanent
  (status <> 'expired' OR ("startedAt" IS NOT NULL AND "expiresAt" IS NOT NULL AND "endedAt" IS NULL AND "cancelledAt" IS NULL AND "isPermanent" = false))
  AND
  -- cancelled: scheduledStartsAt and cancelledAt must be set; startedAt, endedAt, expiresAt must be NULL
  (status <> 'cancelled' OR ("scheduledStartsAt" IS NOT NULL AND "cancelledAt" IS NOT NULL AND "startedAt" IS NULL AND "endedAt" IS NULL AND "expiresAt" IS NULL))
);

-- 5. Create index for scheduler performance on due scheduled rooms
CREATE INDEX IF NOT EXISTS idx_rooms_scheduled_due
  ON public.rooms (status, "scheduledStartsAt")
  WHERE status = 'scheduled';
