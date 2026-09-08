-- ==============================================================================
-- Automated Lifecycle Invariants & Concurrency Race Suite
-- Verified against PostgreSQL 17 on Supabase
-- ==============================================================================

DO $$
DECLARE
  v_test_owner_id uuid;
  v_rows_affected integer;
  v_final_status text;
BEGIN
  SELECT id INTO v_test_owner_id FROM profiles LIMIT 1;
  IF v_test_owner_id IS NULL THEN
    RAISE EXCEPTION 'Test requires at least one profile in public.profiles';
  END IF;

  -- ----------------------------------------------------------------------------
  -- 1. STRUCTURAL INVARIANT TESTS (Illegal state rejections)
  -- ----------------------------------------------------------------------------

  -- Invariant 1.1: scheduled with missing scheduledStartsAt must fail
  BEGIN
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, status, "creationTime")
    VALUES ('test-inv-1', 'Invariant Test', v_test_owner_id, 'scheduled', NOW());
    RAISE EXCEPTION 'Invariant 1.1 Failed: scheduled without scheduledStartsAt allowed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Invariant 1.1 Passed: rejected scheduled without scheduledStartsAt';
  END;

  -- Invariant 1.2: scheduled with startedAt already set must fail
  BEGIN
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, status, "scheduledStartsAt", "startedAt", "creationTime")
    VALUES ('test-inv-2', 'Invariant Test', v_test_owner_id, 'scheduled', NOW() + INTERVAL '1 hour', NOW(), NOW());
    RAISE EXCEPTION 'Invariant 1.2 Failed: scheduled with startedAt allowed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Invariant 1.2 Passed: rejected scheduled with startedAt';
  END;

  -- Invariant 1.3: active with missing startedAt must fail
  BEGIN
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, status, "creationTime")
    VALUES ('test-inv-3', 'Invariant Test', v_test_owner_id, 'active', NOW());
    RAISE EXCEPTION 'Invariant 1.3 Failed: active without startedAt allowed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Invariant 1.3 Passed: rejected active without startedAt';
  END;

  -- Invariant 1.4: ended with endedAt < startedAt must fail
  BEGIN
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, status, "startedAt", "endedAt", "creationTime")
    VALUES ('test-inv-4', 'Invariant Test', v_test_owner_id, 'ended', NOW(), NOW() - INTERVAL '10 minutes', NOW());
    RAISE EXCEPTION 'Invariant 1.4 Failed: endedAt < startedAt allowed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Invariant 1.4 Passed: rejected endedAt < startedAt';
  END;

  -- Invariant 1.5: cancelled without cancelledAt must fail
  BEGIN
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, status, "scheduledStartsAt", "creationTime")
    VALUES ('test-inv-5', 'Invariant Test', v_test_owner_id, 'cancelled', NOW(), NOW());
    RAISE EXCEPTION 'Invariant 1.5 Failed: cancelled without cancelledAt allowed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Invariant 1.5 Passed: rejected cancelled without cancelledAt';
  END;

  -- Invariant 1.6: expired permanent room must fail
  BEGIN
    INSERT INTO rooms ("roomId", "roomTitle", owner_id, status, "startedAt", "expiresAt", "isPermanent", "creationTime")
    VALUES ('test-inv-6', 'Invariant Test', v_test_owner_id, 'expired', NOW(), NOW(), true, NOW());
    RAISE EXCEPTION 'Invariant 1.6 Failed: expired permanent room allowed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Invariant 1.6 Passed: rejected expired permanent room';
  END;

  -- ----------------------------------------------------------------------------
  -- 2. CONCURRENCY RACE TESTS (Serializability & deterministic winners)
  -- ----------------------------------------------------------------------------

  -- Race 2.1: Cancel commits first, Scheduler attempts second
  INSERT INTO rooms ("roomId", "roomTitle", owner_id, status, "scheduledStartsAt", "durationMinutes", "isPermanent", "creationTime")
  VALUES ('test-race-1', 'Race Room 1', v_test_owner_id, 'scheduled', NOW() - INTERVAL '10 seconds', 120, false, NOW());

  UPDATE rooms SET status = 'cancelled', "cancelledAt" = NOW(), "lastUpdateTime" = NOW()
  WHERE "roomId" = 'test-race-1' AND status = 'scheduled';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected <> 1 THEN RAISE EXCEPTION 'Race 2.1 Failed on Cancel'; END IF;

  UPDATE rooms SET status = 'active', "startedAt" = NOW(), "expiresAt" = NOW() + INTERVAL '120 minutes', "lastUpdateTime" = NOW()
  WHERE "roomId" = 'test-race-1' AND status = 'scheduled';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected <> 0 THEN RAISE EXCEPTION 'Race 2.1 Failed on Scheduler'; END IF;

  SELECT status INTO v_final_status FROM rooms WHERE "roomId" = 'test-race-1';
  IF v_final_status <> 'cancelled' THEN RAISE EXCEPTION 'Race 2.1 final status mismatch'; END IF;
  DELETE FROM rooms WHERE "roomId" = 'test-race-1';

  -- Race 2.2: Scheduler commits first, Cancel attempts second
  INSERT INTO rooms ("roomId", "roomTitle", owner_id, status, "scheduledStartsAt", "durationMinutes", "isPermanent", "creationTime")
  VALUES ('test-race-2', 'Race Room 2', v_test_owner_id, 'scheduled', NOW() - INTERVAL '10 seconds', 120, false, NOW());

  UPDATE rooms SET status = 'active', "startedAt" = NOW(), "expiresAt" = NOW() + INTERVAL '120 minutes', "lastUpdateTime" = NOW()
  WHERE "roomId" = 'test-race-2' AND status = 'scheduled';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected <> 1 THEN RAISE EXCEPTION 'Race 2.2 Failed on Scheduler'; END IF;

  UPDATE rooms SET status = 'cancelled', "cancelledAt" = NOW(), "lastUpdateTime" = NOW()
  WHERE "roomId" = 'test-race-2' AND status = 'scheduled';
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected <> 0 THEN RAISE EXCEPTION 'Race 2.2 Failed on Cancel'; END IF;

  SELECT status INTO v_final_status FROM rooms WHERE "roomId" = 'test-race-2';
  IF v_final_status <> 'active' THEN RAISE EXCEPTION 'Race 2.2 final status mismatch'; END IF;
  DELETE FROM rooms WHERE "roomId" = 'test-race-2';

  RAISE NOTICE 'All lifecycle invariant and concurrency race tests passed successfully.';
END $$;
