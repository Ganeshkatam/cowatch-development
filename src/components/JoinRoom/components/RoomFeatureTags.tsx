import React from "react";
import { IconUsers, IconLock, IconClock } from "@tabler/icons-react";
import styles from "../JoinRoom.module.css";

interface RoomFeatureTagsProps {
  isWaitingLoungeEnabled: boolean;
  requiresPasscode: boolean;
  durationLabel?: string;
}

export const RoomFeatureTags: React.FC<RoomFeatureTagsProps> = ({
  isWaitingLoungeEnabled,
  requiresPasscode,
  durationLabel,
}) => {
  return (
    <div className={styles.featureTagsRow}>
      {isWaitingLoungeEnabled && (
        <span className={styles.featureTag}>
          <IconUsers size={13} stroke={2} />
          <span>Waiting Lounge</span>
        </span>
      )}

      {requiresPasscode && (
        <span className={styles.featureTag}>
          <IconLock size={13} stroke={2} />
          <span>Passcode Protected</span>
        </span>
      )}

      {durationLabel && durationLabel !== "Duration unavailable" && (
        <span className={styles.featureTag}>
          <IconClock size={13} stroke={2} />
          <span>{durationLabel}</span>
        </span>
      )}
    </div>
  );
};
