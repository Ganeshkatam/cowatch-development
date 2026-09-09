import { postgres } from "../server/utils/postgres.ts";
import { 
  hashRoomPasscode, 
  calculatePasscodeFingerprint, 
  generateRandomPasscode,
  encryptPasscodeForOwner
} from "../server/utils/roomPasscode.ts";

async function run() {
  if (!postgres) {
    console.error("No postgres connection available.");
    process.exit(1);
  }

  const { rows } = await postgres.query(`SELECT "roomId" FROM rooms WHERE passcode_fingerprint IS NULL`);
  
  let successCount = 0;
  for (const row of rows) {
    const freshPasscode = generateRandomPasscode();
    const fingerprint = calculatePasscodeFingerprint(freshPasscode);
    const hash = await hashRoomPasscode(freshPasscode);
    const ownerEncrypted = encryptPasscodeForOwner(freshPasscode);

    const updateRes = await postgres.query(
      `UPDATE rooms SET passcode_fingerprint = $1, passcode = $2, owner_passcode = $3 WHERE "roomId" = $4 AND passcode_fingerprint IS NULL`,
      [fingerprint, hash, ownerEncrypted, row.roomId]
    );

    if (updateRes.rowCount && updateRes.rowCount > 0) {
      successCount++;
    }
  }
  
  console.log(`Backfilled ${successCount} rooms out of ${rows.length} candidates.`);
  process.exit(0);
}
run();
