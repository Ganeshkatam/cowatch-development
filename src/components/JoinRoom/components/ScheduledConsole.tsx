import React from "react";
import { Button, Alert } from "@mantine/core";
import {
  IconPlayerPlayFilled,
  IconSettings,
  IconCopy,
  IconCheck,
  IconAlertCircle,
  IconClock,
} from "@tabler/icons-react";
import styles from "../JoinRoom.module.css";

interface ScheduledConsoleProps {
  roomId: string;
  isHost: boolean;
  scheduledStartsAt: string;
  timeRemaining: string;
  submitting: boolean;
  onStartEarly: () => void;
  onCopyInvite: () => void;
  copiedInvite: boolean;
  error: string | null;
}

export const ScheduledConsole: React.FC<ScheduledConsoleProps> = ({
  roomId,
  isHost,
  scheduledStartsAt,
  timeRemaining,
  submitting,
  onStartEarly,
  onCopyInvite,
  copiedInvite,
  error,
}) => {
  const formattedScheduledTime = React.useMemo(() => {
    if (!scheduledStartsAt) return "";
    try {
      return new Date(scheduledStartsAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "";
    }
  }, [scheduledStartsAt]);

  return (
    <div className={styles.consolePanel}>
      <div className={styles.consoleHeader}>
        <span className={styles.consoleEyebrow}>
          {isHost ? "HOST PRE-FLIGHT CONSOLE" : "SCHEDULED SCREENING"}
        </span>
        <h2 className={styles.consoleHeading}>
          {isHost ? "Room Scheduled" : "Starting Soon"}
        </h2>
        <p className={styles.consoleSubheading}>
          {isHost
            ? "Your party is configured and holding for launch."
            : "The host has not started the watch party yet."}
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

      {/* Countdown Box */}
      <div className={styles.countdownCard}>
        <div className={styles.countdownEyebrow}>
          <IconClock size={13} stroke={2} />
          <span>STARTING IN</span>
        </div>
        <div className={styles.countdownTimer}>{timeRemaining || "-- : -- : --"}</div>
        {formattedScheduledTime && (
          <div className={styles.scheduledTimestamp}>
            Scheduled for {formattedScheduledTime}
          </div>
        )}
      </div>

      {/* Host Actions vs Guest Advisory */}
      {isHost ? (
        <>
          <Button
            onClick={onStartEarly}
            fullWidth
            size="lg"
            color="violet"
            loading={submitting}
            leftSection={<IconPlayerPlayFilled size={18} />}
            className={styles.primaryActionButton}
          >
            Start Watch Party Early
          </Button>

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
        </>
      ) : (
        <div className={styles.guestWaitingNotice}>
          <p>
            You will be able to join the room as soon as the host launches the
            screening or the scheduled time arrives.
          </p>
        </div>
      )}
    </div>
  );
};
