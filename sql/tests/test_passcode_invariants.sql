-- Test: passcode_fingerprint is required
BEGIN;
DO $$
BEGIN
    -- Should fail because passcode_fingerprint is null
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, passcode, owner_passcode, "startedAt", status, "isPermanent") 
    VALUES ('test-room-1', 'Test', '00000000-0000-0000-0000-000000000000', 'hash', 'enc', '1970-01-01T00:00:00Z', 'active', true);
    RAISE EXCEPTION 'Test Failed: Allowed NULL passcode_fingerprint';
EXCEPTION WHEN not_null_violation THEN
    -- Expected
END $$;
ROLLBACK;

-- Test: passcode is required
BEGIN;
DO $$
BEGIN
    -- Should fail because passcode is null
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, passcode_fingerprint, owner_passcode, "startedAt", status, "isPermanent") 
    VALUES ('test-room-2', 'Test', '00000000-0000-0000-0000-000000000000', 'fingerprint123', 'enc', '1970-01-01T00:00:00Z', 'active', true);
    RAISE EXCEPTION 'Test Failed: Allowed NULL passcode';
EXCEPTION WHEN not_null_violation THEN
    -- Expected
END $$;
ROLLBACK;

-- Test: passcode_fingerprint must be unique
BEGIN;
INSERT INTO rooms ("roomId", "roomTitle", owner_id, passcode_fingerprint, passcode, owner_passcode, "startedAt", status, "isPermanent") 
VALUES ('test-room-3', 'Test 1', '00000000-0000-0000-0000-000000000000', 'fingerprint-unique', 'hash', 'enc', '1970-01-01T00:00:00Z', 'active', true);

DO $$
BEGIN
    -- Should fail because passcode_fingerprint is duplicate
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, passcode_fingerprint, passcode, owner_passcode, "startedAt", status, "isPermanent") 
    VALUES ('test-room-4', 'Test 2', '00000000-0000-0000-0000-000000000000', 'fingerprint-unique', 'hash', 'enc', '1970-01-01T00:00:00Z', 'active', true);
    RAISE EXCEPTION 'Test Failed: Allowed duplicate passcode_fingerprint';
EXCEPTION WHEN unique_violation THEN
    -- Expected
END $$;
ROLLBACK;
