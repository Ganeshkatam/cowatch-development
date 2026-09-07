-- Migration: 20260908_auto_cleanup_orphan_storage_objects.sql
-- Automatically remove storage bucket objects when rooms or user profiles are deleted

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
