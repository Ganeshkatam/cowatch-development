import React from "react";
import { type RoomSummary } from "./MyRooms";
import styles from "./MyRooms.module.css";

export const RoomStats = ({ rooms }: { rooms: RoomSummary[] }) => {
  const total = rooms.length;
  const active = rooms.filter(r => r.status === "active").length;
  const expiring = rooms.filter(r => r.status === "expiring").length;
  const finished = rooms.filter(r => r.status === "expired" || r.status === "ended").length;

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statLabelTotal}>TOTAL ROOMS</div>
        <div className={styles.statValue}>{total.toString().padStart(2, '0')}</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statLabelActive}>ACTIVE</div>
        <div className={styles.statValue}>{active.toString().padStart(2, '0')}</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statLabelExpiring}>EXPIRING SOON</div>
        <div className={styles.statValue}>{expiring.toString().padStart(2, '0')}</div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statLabelFinished}>FINISHED</div>
        <div className={styles.statValue}>{finished.toString().padStart(2, '0')}</div>
      </div>
    </div>
  );
};
