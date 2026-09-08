import React from "react";
import { Button, Modal, Text } from "@mantine/core";
import { IconAlertTriangle, IconUsers, IconX } from "@tabler/icons-react";
import styles from "./ActiveRoomLeavePopover.module.css";

interface ActiveRoomLeavePopoverProps {
  opened: boolean;
  roomTitle: string;
  currentMedia?: string;
  participantCount: number;
  onStay: () => void;
  onExit: () => void;
}

export const ActiveRoomLeavePopover: React.FC<ActiveRoomLeavePopoverProps> = ({
  opened,
  roomTitle,
  currentMedia,
  participantCount,
  onStay,
  onExit,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onStay}
      centered
      size={480}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.72, blur: 10 }}
      classNames={{
        content: styles.modal,
        body: styles.body,
      }}
      transitionProps={{ transition: "pop", duration: 180 }}
    >
      <div className={styles.headerGlow} />

      <div className={styles.content}>
        <div className={styles.iconWrap} aria-hidden="true">
          <IconAlertTriangle size={22} stroke={2} />
        </div>

        <div className={styles.eyebrow}>
          <span className={styles.liveDot} />
          Active room
        </div>

        <h2 className={styles.title}>Your watch party is still live</h2>
        <Text className={styles.description}>
          Leaving the page will disconnect you from the room. Stay here to keep watching with everyone.
        </Text>

        <div className={styles.roomCard}>
          <div className={styles.roomInfo}>
            <span className={styles.label}>Room</span>
            <span className={styles.value}>{roomTitle || "Watch Party Room"}</span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              <IconUsers size={15} stroke={1.8} />
              {participantCount} {participantCount === 1 ? "person" : "people"}
            </span>
            {currentMedia && (
              <span className={styles.mediaValue} title={currentMedia}>
                {currentMedia}
              </span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            className={styles.stayButton}
            size="md"
            radius="md"
            onClick={onStay}
          >
            Stay in Room
          </Button>
          <Button
            className={styles.exitButton}
            variant="subtle"
            color="red"
            size="md"
            radius="md"
            leftSection={<IconX size={16} stroke={2} />}
            onClick={onExit}
          >
            Exit Room
          </Button>
        </div>
      </div>
    </Modal>
  );
};
