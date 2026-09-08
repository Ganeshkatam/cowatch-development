import React from "react";
import { Badge, Button, Group, Loader, Text } from "@mantine/core";
import {
  IconLock,
  IconLockOpen,
  IconClock,
  IconInfinity,
  IconArmchair,
  IconMessage,
  IconPlayerPlay,
  IconInfoCircle,
  IconCalendarEvent,
} from "@tabler/icons-react";
import type { RoomFormState } from "./roomCreationDomain";
import styles from "./Create.module.css";

interface SharedRoomPreviewProps {
  formState: RoomFormState;
  mode: "now" | "schedule";
  scheduledDisplay?: string;
  loading: boolean;
  submitLabel: string;
  submitIcon: React.ReactNode;
  formId: string;
}

function formatDurationLabel(minutes: string): string {
  const num = Number(minutes);
  if (num < 60) return `${num}-Minute`;
  if (num === 60) return "1-Hour";
  if (num % 60 === 0) return `${num / 60}-Hour`;
  return `${minutes}-Minute`;
}

export const SharedRoomPreview: React.FC<SharedRoomPreviewProps> = ({
  formState,
  mode,
  scheduledDisplay,
  loading,
  submitLabel,
  submitIcon,
  formId,
}) => {
  return (
    <div className={styles.previewColumn}>
      <div className={styles.previewCard}>
        <div className={styles.previewHeaderBar}>
          <Group gap="xs" align="center">
            <div
              className={styles.pulsingDot}
              style={{
                backgroundColor: mode === "schedule" ? "#8B5CF6" : "#10B981",
                boxShadow: mode === "schedule"
                  ? "0 0 0 0 rgba(139, 92, 246, 0.7)"
                  : "0 0 0 0 rgba(16, 185, 129, 0.7)",
              }}
            />
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1}>
              {mode === "schedule" ? "Scheduled Room Preview" : "Live Room Preview"}
            </Text>
          </Group>
          <Badge
            variant="light"
            color={formState.passcode ? "yellow" : "teal"}
            size="xs"
            leftSection={formState.passcode ? <IconLock size={11} /> : <IconLockOpen size={11} />}
          >
            {formState.passcode ? "Protected" : "Public"}
          </Badge>
        </div>

        <div className={styles.previewBanner}>
          {formState.coverPreview ? (
            <img
              src={formState.coverPreview}
              className={styles.previewCoverImg}
              alt="Room Cover Preview"
            />
          ) : null}
          <div className={styles.previewScrim} />
          <div className={styles.previewBannerInfo}>
            <h3 className={styles.previewRoomTitle}>
              {formState.roomTitle.trim() || "Untitled Room"}
            </h3>
            <p className={styles.previewRoomDescription}>
              {formState.roomDescription.trim() || "A shared space to watch videos together in sync with friends."}
            </p>
          </div>
        </div>

        <div className={styles.previewBody}>
          {mode === "schedule" && scheduledDisplay && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                background: "rgba(139, 92, 246, 0.12)",
                border: "1px solid rgba(139, 92, 246, 0.25)",
                borderRadius: "12px",
              }}
            >
              <IconCalendarEvent size={18} color="#c084fc" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#c084fc" }}>
                  Scheduled Start
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {scheduledDisplay}
                </div>
              </div>
            </div>
          )}

          <div className={styles.previewBadgesRow}>
            <Badge
              variant="outline"
              color={formState.isPermanent ? "teal" : "orange"}
              size="sm"
              leftSection={formState.isPermanent ? <IconInfinity size={12} /> : <IconClock size={12} />}
            >
              {formState.isPermanent ? "No Expiration" : `${formatDurationLabel(formState.durationMinutes)} Session`}
            </Badge>
            <Badge
              variant="outline"
              color={formState.isWaitingLoungeEnabled ? "grape" : "gray"}
              size="sm"
              leftSection={<IconArmchair size={12} />}
            >
              {formState.isWaitingLoungeEnabled ? "Lounge Active" : "Direct Entry"}
            </Badge>
            <Badge
              variant="outline"
              color={!formState.isChatDisabled ? "violet" : "gray"}
              size="sm"
              leftSection={<IconMessage size={12} />}
            >
              {!formState.isChatDisabled ? "Chat Enabled" : "Chat Disabled"}
            </Badge>
            <Badge
              variant="outline"
              color={formState.lock ? "indigo" : "cyan"}
              size="sm"
              leftSection={<IconPlayerPlay size={12} />}
            >
              {formState.lock ? "Host Controls" : "Open Controls"}
            </Badge>
          </div>

          <div className={styles.previewInfoNote}>
            <IconInfoCircle size={18} color="var(--color-violet)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {mode === "schedule"
                ? "You will be taken to your room management console where you can copy the invite link, countdown, or start early."
                : "Once created, you will enter the room immediately and get an instant invite link to share with friends."}
            </span>
          </div>

          <Button
            type="submit"
            form={formId}
            size="lg"
            variant="gradient"
            gradient={{ from: "violet", to: "grape", deg: 135 }}
            disabled={loading || !formState.roomTitle.trim()}
            leftSection={loading ? <Loader size={20} color="white" /> : submitIcon}
            className={styles.createBtnPrimary}
            fullWidth
          >
            {loading ? "Processing..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
