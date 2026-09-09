ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_passcode_fingerprint_key;
ALTER TABLE rooms ADD CONSTRAINT rooms_passcode_fingerprint_key UNIQUE (passcode_fingerprint);
ALTER TABLE rooms ALTER COLUMN passcode_fingerprint SET NOT NULL;
ALTER TABLE rooms ALTER COLUMN passcode SET NOT NULL;
-- Only alter owner_passcode if domain already treats it as mandatory.
-- In our case, the domain does treat it as mandatory for new rooms (and backfilled ones),
-- so we can safely enforce it as well.
ALTER TABLE rooms ALTER COLUMN owner_passcode SET NOT NULL;
