import React from "react";
import { Button } from "@mantine/core";
import {
  IconSettings,
  IconVideoPlus,
  IconHome,
  IconCalendarEvent,
  IconClock,
  IconPlayerStop,
} from "@tabler/icons-react";
import styles from "../JoinRoom.module.css";

interface PostShowConsoleProps {
  status: "ended" | "expired" | "cancelled";
  startedAt: string | null;
  endedAt: string | null;
  durationLabel: string;
  isHost: boolean;
  roomId: string;
  onNavigateHome: () => void;
  onNavigateNewRoom: () => void;
}

export const PostShowConsole: React.FC<PostShowConsoleProps> = ({
  status,
  startedAt,
  endedAt,
  durationLabel,
  isHost,
  roomId,
  onNavigateHome,
  onNavigateNewRoom,
}) => {
  const formatTime = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className={styles.consolePanel}>
      <div className={styles.consoleHeader}>
        <span className={styles.consoleEyebrow}>
          {status === "cancelled"
            ? "CANCELLED PARTY"
            : status === "expired"
            ? "EXPIRED SESSION"
            : "ROOM ENDED"}
        </span>
        <h2 className={styles.consoleHeading}>
          {status === "cancelled"
            ? "Party Cancelled"
            : status === "expired"
            ? "Party Expired"
            : "This Room Has Ended"}
        </h2>
        <p className={styles.consoleSubheading}>
          {status === "cancelled"
            ? "This scheduled watch party was cancelled by the host."
            : status === "expired"
            ? "This watch party expired after its configured viewing duration."
            : "This watch party room has ended. Joining this room is no longer possible."}
        </p>
      </div>

      {status === "ended" && (
        <div className={styles.endedAlertBanner}>
          <IconPlayerStop size={18} className={styles.endedAlertIcon} />
          <div className={styles.endedAlertContent}>
            <span className={styles.endedAlertTitle}>Room Has Ended</span>
            <span className={styles.endedAlertDesc}>
              The host has concluded this watch party session. No further guests can be admitted.
            </span>
          </div>
        </div>
      )}

      {/* Show historical metadata ONLY for ended and expired rooms, NOT cancelled */}
      {status !== "cancelled" && (startedAt || endedAt || durationLabel) && (
        <div className={styles.historicalStatsBox}>
          <div className={styles.historicalStatItem}>
            <span className={styles.statLabel}>Started</span>
            <span className={styles.statValue}>{formatTime(startedAt)}</span>
          </div>
          <div className={styles.statSeparator} />
          <div className={styles.historicalStatItem}>
            <span className={styles.statLabel}>Ended</span>
            <span className={styles.statValue}>{formatTime(endedAt)}</span>
          </div>
          <div className={styles.statSeparator} />
          <div className={styles.historicalStatItem}>
            <span className={styles.statLabel}>Duration</span>
            <span className={styles.statValue}>
              {durationLabel !== "Duration unavailable" ? durationLabel : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Host Specific Management */}
      {isHost && (
        <Button
          component="a"
          href={`/myrooms/${roomId}`}
          fullWidth
          size="md"
          variant="light"
          color="violet"
          leftSection={<IconSettings size={17} />}
          className={styles.secondaryButton}
          style={{ marginBottom: "12px" }}
        >
          View Room Settings & Logs
        </Button>
      )}

      {/* Navigation Actions */}
      <div className={styles.postShowNavGroup}>
        <Button
          onClick={onNavigateNewRoom}
          fullWidth
          size="md"
          color="violet"
          leftSection={<IconVideoPlus size={18} />}
          className={styles.primaryActionButton}
        >
          Host Your Own Watch Party
        </Button>
        <Button
          onClick={onNavigateHome}
          fullWidth
          size="sm"
          variant="subtle"
          color="gray"
          leftSection={<IconHome size={16} />}
          className={styles.tertiaryButton}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};
