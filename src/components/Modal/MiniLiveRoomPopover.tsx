import React from "react";
import { Tooltip, ActionIcon, Button } from "@mantine/core";
import {
  IconArrowUpRight,
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
  IconPhoneOff,
  IconPlayerPlay,
  IconUsers,
} from "@tabler/icons-react";
import styles from "./MiniLiveRoomPopover.module.css";

export interface MiniLiveRoomPopoverProps {
  visible: boolean;
  roomTitle: string;
  currentMedia?: string;
  mediaDisplayName?: string;
  participantCount: number;
  isMicEnabled: boolean;
  isVideoEnabled: boolean;
  onReturnToRoom: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onLeaveRoom: () => void;
}

export const MiniLiveRoomPopover: React.FC<MiniLiveRoomPopoverProps> = ({
  visible,
  roomTitle,
  currentMedia,
  mediaDisplayName,
  participantCount,
  isMicEnabled,
  isVideoEnabled,
  onReturnToRoom,
  onToggleMic,
  onToggleVideo,
  onLeaveRoom,
}) => {
  if (!visible) return null;

  const displayMediaTitle = mediaDisplayName || currentMedia || "Nothing is currently playing";
  const displayRoomTitle = roomTitle || "Watch Party Room";
  const peopleText = participantCount === 1 ? "1 in room" : `${participantCount} in room`;

  return (
    <div
      className={styles.miniContainer}
      role="complementary"
      aria-label="Active room mini controls"
    >
      {/* Header: Live Badge + Room Title */}
      <div className={styles.headerRow}>
        <div className={styles.leftInfo}>
          <div className={styles.liveBadge}>
            <div className={styles.liveDot} />
            <span className={styles.liveText}>LIVE</span>
          </div>
          <span className={styles.roomTitle} title={displayRoomTitle}>
            {displayRoomTitle}
          </span>
        </div>
      </div>

      {/* Media & Participants info */}
      <div className={styles.mediaRow}>
        <div className={styles.mediaInfo} title={displayMediaTitle}>
          <IconPlayerPlay size={13} style={{ flexShrink: 0, color: "var(--color-violet, #8b5cf6)" }} />
          <span className={styles.mediaText}>{displayMediaTitle}</span>
        </div>
        <div className={styles.participantPill}>
          <IconUsers size={12} style={{ flexShrink: 0 }} />
          <span>{peopleText}</span>
        </div>
      </div>

      {/* Action Controls: Return, Mic, Video, Leave */}
      <div className={styles.actionsRow}>
        <Button
          variant="gradient"
          gradient={{ from: "violet", to: "indigo", deg: 45 }}
          className={styles.returnBtn}
          onClick={onReturnToRoom}
          leftSection={<IconArrowUpRight size={15} />}
        >
          Return to Room
        </Button>

        <Tooltip label={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"} withArrow position="top">
          <ActionIcon
            variant={isMicEnabled ? "default" : "light"}
            color={isMicEnabled ? "gray" : "red"}
            className={styles.controlBtn}
            onClick={onToggleMic}
            aria-label={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicEnabled ? <IconMicrophone size={18} /> : <IconMicrophoneOff size={18} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"} withArrow position="top">
          <ActionIcon
            variant={isVideoEnabled ? "default" : "light"}
            color={isVideoEnabled ? "gray" : "red"}
            className={styles.controlBtn}
            onClick={onToggleVideo}
            aria-label={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isVideoEnabled ? <IconVideo size={18} /> : <IconVideoOff size={18} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Leave Room" withArrow position="top">
          <ActionIcon
            variant="filled"
            color="red"
            className={styles.leaveBtn}
            onClick={onLeaveRoom}
            aria-label="Leave Room"
          >
            <IconPhoneOff size={18} />
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
};
