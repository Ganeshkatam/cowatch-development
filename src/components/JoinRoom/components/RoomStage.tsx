import React, { useState, useEffect } from "react";
import { Avatar } from "@mantine/core";
import {
  IconCalendar,
  IconMovieOff,
  IconClock,
  IconX,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { RoomFeatureTags } from "./RoomFeatureTags";
import styles from "../JoinRoom.module.css";

const DEFAULT_STAGE_COVER = "/cinema_theater_bg.jpg";

export interface RoomMetadata {
  startedAt: any;
  id: string;
  title: string;
  description: string | null;
  status: "waiting" | "scheduled" | "active" | "expired" | "ended" | "cancelled";
  startsAt: string | null;
  scheduledStartsAt?: string | null;
  expiresAt: string | null;
  endedAt: string | null;
  owner_id?: string | null;
  durationMinutes?: number | null;
  coverPhoto?: string | null;
  host: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  access: {
    requiresPasscode: boolean;
    isWaitingLoungeEnabled: boolean;
    isOwner?: boolean;
    requiresAuthentication?: boolean;
  };
}

interface RoomStageProps {
  room: RoomMetadata;
  isHost: boolean;
  durationLabel: string;
}

export const RoomStage: React.FC<RoomStageProps> = ({
  room,
  isHost,
  durationLabel,
}) => {
  const [coverSrc, setCoverSrc] = useState<string>(room.coverPhoto || DEFAULT_STAGE_COVER);

  useEffect(() => {
    setCoverSrc(room.coverPhoto || DEFAULT_STAGE_COVER);
  }, [room.coverPhoto]);

  const handleImageError = () => {
    if (coverSrc !== DEFAULT_STAGE_COVER) {
      setCoverSrc(DEFAULT_STAGE_COVER);
    }
  };

  return (
    <div className={styles.lobbyStage}>
      {/* Lifecycle Eyebrow */}
      <div className={styles.eyebrowContainer}>
        {(room.status === "active" || room.status === "waiting") && (
          <div className={styles.eyebrowLive}>
            <span className={styles.livePulseDot} />
            <span>{room.status === "active" ? "LIVE WATCH PARTY" : "READY FOR SCREENING"}</span>
          </div>
        )}
        {room.status === "scheduled" && (
          <div className={styles.eyebrowScheduled}>
            <IconCalendar size={13} stroke={2.2} />
            <span>SCHEDULED PARTY</span>
          </div>
        )}
        {room.status === "ended" && (
          <div className={styles.eyebrowPast}>
            <span>ROOM ENDED</span>
          </div>
        )}
        {room.status === "expired" && (
          <div className={styles.eyebrowPast}>
            <span>EXPIRED SESSION</span>
          </div>
        )}
        {room.status === "cancelled" && (
          <div className={styles.eyebrowCancelled}>
            <span>CANCELLED PARTY</span>
          </div>
        )}
      </div>

      {/* Room Title */}
      <h1 className={styles.roomTitle}>{room.title}</h1>

      {/* Room Description */}
      {room.description && (
        <p className={styles.roomDescription}>{room.description}</p>
      )}

      {/* Understated Host Identity */}
      <div className={styles.hostRow}>
        <Avatar
          src={room.host.avatarUrl}
          size={30}
          radius="xl"
          color="violet"
          className={styles.hostAvatar}
        >
          {room.host.displayName?.[0] || room.host.username?.[0] || "?"}
        </Avatar>
        <span className={styles.hostLabel}>
          Hosted by{" "}
          <strong className={styles.hostName}>
            {isHost ? "you" : (room.host.displayName || room.host.username || "Host")}
          </strong>
          {isHost && <span className={styles.hostPill}>Host</span>}
        </span>
      </div>

      {/* Ambient Theater Stage Preview */}
      <div className={styles.cinemaStageBox}>
        <img
          src={coverSrc}
          alt={room.title || "Cinema Stage"}
          className={styles.stageCoverImage}
          onError={handleImageError}
        />
        <div className={styles.stageScrim} />
        <div className={styles.cinemaScreenGlow} />

        <div className={styles.cinemaScreenInner}>
          <div className={styles.stageTopRow}>
            {(room.status === "active" || room.status === "waiting") && (
              <div className={styles.screenActiveIndicator}>
                <span className={styles.livePulseDot} />
                <span>{room.status === "active" ? "LIVE SCREENING" : "READY FOR SCREENING"}</span>
              </div>
            )}
            {room.status === "scheduled" && (
              <div className={styles.screenScheduledIndicator}>
                <IconClock size={15} stroke={2} />
                <span>PRE-FLIGHT STAGING</span>
              </div>
            )}
            {room.status === "ended" && (
              <div className={styles.screenEndedIndicator}>
                <IconMovieOff size={15} stroke={2} />
                <span>ROOM HAS ENDED</span>
              </div>
            )}
            {room.status === "expired" && (
              <div className={styles.screenEndedIndicator}>
                <IconMovieOff size={15} stroke={2} />
                <span>EXPIRED SESSION</span>
              </div>
            )}
            {room.status === "cancelled" && (
              <div className={styles.screenCancelledIndicator}>
                <IconX size={15} stroke={2} />
                <span>SESSION CANCELLED</span>
              </div>
            )}
          </div>

          <div className={styles.stageCenterWatermark}>
            <div className={styles.cinemaCurtainCue}>
              <IconPlayerPlayFilled size={20} className={styles.playCueIcon} />
            </div>
          </div>

          <div className={styles.stageBottomRow}>
            <span className={styles.stageAmbianceLabel}>
              {room.status === "scheduled" ? "Auditorium Reserved" : "Theater Stage"}
            </span>
          </div>
        </div>
      </div>

      {/* Compact Feature Metadata */}
      <RoomFeatureTags
        isWaitingLoungeEnabled={room.access?.isWaitingLoungeEnabled}
        requiresPasscode={room.access?.requiresPasscode}
        durationLabel={durationLabel}
      />
    </div>
  );
};
