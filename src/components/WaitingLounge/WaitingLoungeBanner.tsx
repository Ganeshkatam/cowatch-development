import React, { useState } from "react";
import { IconCheck, IconUsers, IconX } from "@tabler/icons-react";
import styles from "./WaitingLoungeBanner.module.css";

interface WaitingLoungeBannerProps {
  waitingList: WaitingGuest[];
  onAdmitAll: () => void;
  onOpenPeople: () => void;
}

export const WaitingLoungeBanner: React.FC<WaitingLoungeBannerProps> = ({
  waitingList,
  onAdmitAll,
  onOpenPeople,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || !waitingList || waitingList.length === 0) {
    return null;
  }

  const count = waitingList.length;
  const guestLabel = count === 1 ? "1 person is" : `${count} people are`;

  return (
    <div className={styles.bannerWrapper} role="status" aria-live="polite">
      <div className={styles.pulsingIndicator} />
      
      <span className={styles.bannerText}>
        <span className={styles.badgeCount}>{count}</span>
        {guestLabel} waiting in the lounge
      </span>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={styles.admitAllBtn}
          onClick={onAdmitAll}
          title="Admit all waiting guests immediately"
        >
          <IconCheck size={14} stroke={2.5} />
          <span>Admit All</span>
        </button>

        <button
          type="button"
          className={styles.reviewBtn}
          onClick={onOpenPeople}
          title="View and review waiting guests"
        >
          <IconUsers size={14} />
          <span>Review</span>
        </button>

        <button
          type="button"
          className={styles.dismissBtn}
          onClick={() => setIsDismissed(true)}
          title="Hide banner"
          aria-label="Hide banner"
        >
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
};
