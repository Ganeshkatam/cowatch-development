import React from "react";
import { Button, Alert } from "@mantine/core";
import {
  IconPlayerPlayFilled,
  IconSettings,
  IconCopy,
  IconCheck,
  IconUsers,
  IconLockOpen,
  IconAlertCircle,
} from "@tabler/icons-react";
import styles from "../JoinRoom.module.css";

interface HostConsoleProps {
  roomId: string;
  submitting: boolean;
  onEnterAsHost: () => void;
  onCopyInvite: () => void;
  copiedInvite: boolean;
  isWaitingLoungeEnabled: boolean;
  error: string | null;
}

export const HostConsole: React.FC<HostConsoleProps> = ({
  roomId,
  submitting,
  onEnterAsHost,
  onCopyInvite,
  copiedInvite,
  isWaitingLoungeEnabled,
  error,
}) => {
  return (
    <div className={styles.consolePanel}>
      <div className={styles.consoleHeader}>
        <span className={styles.consoleEyebrow}>HOST COMMAND CONSOLE</span>
        <h2 className={styles.consoleHeading}>You are the Room Host</h2>
        <p className={styles.consoleSubheading}>
          Your watch room is live and ready for screening.
        </p>
      </div>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          className={styles.errorBanner}
        >
          {error}
        </Alert>
      )}

      {/* Primary Action */}
      <Button
        onClick={onEnterAsHost}
        fullWidth
        size="lg"
        color="violet"
        loading={submitting}
        leftSection={<IconPlayerPlayFilled size={18} />}
        className={styles.primaryActionButton}
      >
        Enter Room as Host
      </Button>

      {/* Operational Status Badges */}
      <div className={styles.operationalStatusGroup}>
        <div className={styles.operationalItem}>
          <IconLockOpen size={16} className={styles.statusIconViolet} />
          <div className={styles.operationalText}>
            <span className={styles.statusTitle}>Host Access Active</span>
            <span className={styles.statusDesc}>
              Passcode verification automatically bypassed for host.
            </span>
          </div>
        </div>

        {isWaitingLoungeEnabled && (
          <div className={styles.operationalItem}>
            <IconUsers size={16} className={styles.statusIconViolet} />
            <div className={styles.operationalText}>
              <span className={styles.statusTitle}>Waiting Lounge Active</span>
              <span className={styles.statusDesc}>
                Guests queue in the lounge until you admit them into the room.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Supporting Operations Toolbar */}
      <div className={styles.supportingToolbar}>
        <Button
          component="a"
          href={`/myrooms/${roomId}`}
          variant="light"
          color="violet"
          size="sm"
          leftSection={<IconSettings size={15} />}
          className={styles.secondaryButton}
        >
          Room Settings
        </Button>
        <Button
          onClick={onCopyInvite}
          variant="light"
          color={copiedInvite ? "teal" : "gray"}
          size="sm"
          leftSection={copiedInvite ? <IconCheck size={15} /> : <IconCopy size={15} />}
          className={styles.secondaryButton}
        >
          {copiedInvite ? "Link Copied!" : "Copy Invite Link"}
        </Button>
      </div>
    </div>
  );
};
