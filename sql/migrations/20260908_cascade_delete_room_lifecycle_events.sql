-- Migration: 20260908_cascade_delete_room_lifecycle_events.sql
-- Allow rooms to be deleted without violating foreign key constraints on room_lifecycle_events

ALTER TABLE public.room_lifecycle_events
DROP CONSTRAINT IF EXISTS "room_lifecycle_events_roomId_fkey",
DROP CONSTRAINT IF EXISTS "room_lifecycle_events_room_fk";

ALTER TABLE public.room_lifecycle_events
ADD CONSTRAINT "room_lifecycle_events_roomId_fkey"
FOREIGN KEY ("roomId")
REFERENCES public.rooms("roomId")
ON DELETE CASCADE;
