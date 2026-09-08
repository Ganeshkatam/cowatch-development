import React from "react";
import { Modal, Button } from "@mantine/core";
import { IconPlayerPlay, IconUsers } from "@tabler/icons-react";
import styles from "./ActiveRoomLeavePopover.module.css";

export interface ActiveRoomLeavePopoverProps {
  opened: boolean;
  roomTitle: string;
  currentMedia?: string;
  mediaDisplayName?: string;
  participantCount: number;
  onStay: () => void;
  onExit: () => void;
}

export const ActiveRoomLeavePopover: React.FC<ActiveRoomLeavePopoverProps> = ({
  opened,
  roomTitle,
  currentMedia,
  mediaDisplayName,
  participantCount,
  onStay,
  onExit,
}) => {
  const displayMediaTitle = mediaDisplayName || currentMedia || "Nothing is currently playing";
  const displayRoomTitle = roomTitle || "Watch Party Room";
  const peopleText =
    participantCount === 1
      ? "1 person in this room"
      : `${participantCount} people in this room`;

  return (
    <Modal
      opened={opened}
      onClose={onStay}
      centered
      withCloseButton={false}
      radius="lg"
      size="md"
      overlayProps={{
        backgroundOpacity: 0.75,
        blur: 8,
      }}
      transitionProps={{
        transition: "fade-up",
        duration: 200,
      }}
      aria-labelledby="active-room-popover-title"
      aria-describedby="active-room-popover-subtitle"
    >
      <div className={styles.modalContent}>
        <div className={styles.badgeWrapper}>
          <div className={styles.liveDot} />
          <span className={styles.badgeText}>Active Room</span>
        </div>

        <div id="active-room-popover-title" className={styles.title}>
          Still watching?
        </div>

        <div id="active-room-popover-subtitle" className={styles.subtitle}>
          Your watch party is still active. Would you like to stay or exit the room?
        </div>

        <div className={styles.roomCard}>
          <div className={styles.roomTitleRow}>
            <span className={styles.roomTitleText}>{displayRoomTitle}</span>
          </div>

          <div className={styles.detailRow}>
            <IconPlayerPlay size={15} className={styles.detailIcon} />
            <span className={styles.mediaText} title={displayMediaTitle}>
              {displayMediaTitle}
            </span>
          </div>

          <div className={styles.detailRow}>
            <IconUsers size={15} className={styles.detailIcon} />
            <span>{peopleText}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="subtle"
            color="gray"
            radius="md"
            onClick={onExit}
            className={styles.exitBtn}
          >
            Exit Room
          </Button>

          <Button
            variant="gradient"
            gradient={{ from: "violet", to: "indigo", deg: 45 }}
            radius="md"
            onClick={onStay}
            className={styles.stayBtn}
          >
            Stay in Room
          </Button>
        </div>
      </div>
    </Modal>
  );
};
