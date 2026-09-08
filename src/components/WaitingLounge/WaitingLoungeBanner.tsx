import React, { useState } from "react";
import { IconCheck, IconUsers, IconX } from "@tabler/icons-react";
import { WaitingParticipantsPopover } from "./WaitingParticipantsPopover";
import styles from "./WaitingLoungeBanner.module.css";

interface WaitingLoungeBannerProps {
  waitingList: WaitingGuest[];
  onAdmitAll: () => void;
  onAdmitUser?: (clientId: string) => void;
  onDeclineUser?: (clientId: string) => void;
  onOpenPeople?: () => void;
}

export const WaitingLoungeBanner: React.FC<WaitingLoungeBannerProps> = ({
  waitingList,
  onAdmitAll,
  onAdmitUser,
  onDeclineUser,
  onOpenPeople,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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

        <WaitingParticipantsPopover
          waitingList={waitingList}
          onAdmitUser={onAdmitUser}
          onDeclineUser={onDeclineUser}
          onAdmitAll={onAdmitAll}
          position="bottom"
          opened={isPopoverOpen}
          onOpen={() => setIsPopoverOpen(true)}
          onClose={() => setIsPopoverOpen(false)}
        >
          <button
            type="button"
            className={`${styles.reviewBtn} ${isPopoverOpen ? styles.reviewBtnActive : ""}`}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            title="View and review waiting guests in popover"
          >
            <IconUsers size={14} />
            <span>Review</span>
          </button>
        </WaitingParticipantsPopover>

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
