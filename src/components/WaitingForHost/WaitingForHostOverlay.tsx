import React, { useState, useContext } from "react";
import {
  Overlay,
  Title,
  Text,
  Button,
  Loader,
  Stack,
  Badge,
} from "@mantine/core";
import { IconPlayerPlay, IconClock, IconUsers } from "@tabler/icons-react";
import { MetadataContext } from "../../MetadataContext";
import { serverPath } from "../../utils/utils";
import { getAccessToken } from "../../utils/supabaseClient";

interface WaitingForHostOverlayProps {
  roomId: string;
  roomTitle: string;
  owner: string | undefined;
  roomStatus: string;
  roomDurationMinutes: number | null;
  roomIsPermanent: boolean;
  participantCount: number;
  socket: any;
}

/**
 * Full-screen overlay shown when a room is in "waiting" status.
 *
 * - Host sees a "Start Watch Party" button that transitions the room to "active".
 * - Non-host users see a "Waiting for host" message.
 *
 * The overlay is rendered on top of the room content and blocks all interaction
 * until the host starts the room via CMD:startRoom (socket) or POST /startRoom (REST).
 */
export const WaitingForHostOverlay: React.FC<WaitingForHostOverlayProps> = ({
  roomId,
  roomTitle,
  owner,
  roomStatus,
  roomDurationMinutes,
  roomIsPermanent,
  participantCount,
  socket,
}) => {
  const { user } = useContext(MetadataContext);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  if (roomStatus !== "waiting") {
    return null;
  }

  const isOwner = Boolean(
    user && owner && (
      String(user.id).toLowerCase() === String(owner).toLowerCase() ||
      (user.email && user.email.toLowerCase() === String(owner).toLowerCase())
    )
  );

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(console.error);
  };

  const handleStartRoom = async () => {
    setIsStarting(true);
    setError("");

    try {
      // Primary path: socket command (instant, broadcast)
      if (socket && socket.connected) {
        socket.emit("CMD:startRoom");
        // Give the server a moment to respond via REC:roomStarted
        // If it fails, the error will come back via "errorMessage" event
        return;
      }

      // Fallback: REST API (for cases where socket is not ready)
      const token = await getAccessToken();
      const response = await fetch(`${serverPath}/startRoom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user?.id,
          token,
          roomId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start room");
      }
    } catch (err: any) {
      setError(err.message || "Failed to start the watch party.");
    } finally {
      // Keep isStarting true briefly to prevent double-clicks;
      // the overlay will disappear when roomStatus changes to 'active'
      setTimeout(() => setIsStarting(false), 3000);
    }
  };

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "Unlimited";
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (remaining === 0) {
      return hours === 1 ? "1 hour" : `${hours} hours`;
    }
    return `${hours}h ${remaining}m`;
  };

  return (
    <Overlay
      fixed
      zIndex={1500}
      backgroundOpacity={0.96}
      color="var(--bg-app, #08090D)"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "480px",
          padding: "32px",
        }}
      >
        {/* Status badge */}
        <Badge
          color="violet"
          variant="light"
          size="lg"
          radius="sm"
          mb="lg"
          style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          {isOwner ? "Host Control" : "Waiting for Host"}
        </Badge>

        {/* Room title */}
        <Title
          order={2}
          style={{
            color: "var(--text-main, #ffffff)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: "8px",
          }}
        >
          {roomTitle || "Watch Party"}
        </Title>

        {/* Session info */}
        <Stack gap="xs" align="center" mt="md" mb="xl">
          {!roomIsPermanent && roomDurationMinutes && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--text-secondary, #888)",
                fontSize: "14px",
              }}
            >
              <IconClock size={16} />
              <span>Session duration: {formatDuration(roomDurationMinutes)}</span>
            </div>
          )}
          {roomIsPermanent && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--text-secondary, #888)",
                fontSize: "14px",
              }}
            >
              <IconClock size={16} />
              <span>Permanent room (no expiration)</span>
            </div>
          )}
          {participantCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--text-secondary, #888)",
                fontSize: "14px",
              }}
            >
              <IconUsers size={16} />
              <span>
                {participantCount} {participantCount === 1 ? "person" : "people"} connected
              </span>
            </div>
          )}
        </Stack>

        {/* Action area */}
        {isOwner ? (
          <Stack gap="sm" align="center">
            <Button
              size="lg"
              color="violet"
              radius="md"
              onClick={handleStartRoom}
              loading={isStarting}
              leftSection={!isStarting ? <IconPlayerPlay size={20} /> : undefined}
              style={{
                fontWeight: 600,
                fontSize: "16px",
                paddingLeft: "28px",
                paddingRight: "28px",
                minWidth: "220px",
              }}
            >
              {isStarting ? "Starting..." : "Start Watch Party"}
            </Button>

            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <Button
                variant="light"
                color="violet"
                size="sm"
                onClick={() => { window.location.href = `/myrooms/${roomId}`; }}
              >
                Room Settings
              </Button>
              <Button
                variant="light"
                color={copiedLink ? "teal" : "gray"}
                size="sm"
                onClick={handleCopyLink}
              >
                {copiedLink ? "Link Copied!" : "Copy Invite Link"}
              </Button>
            </div>

            {!roomIsPermanent && roomDurationMinutes && (
              <Text size="xs" c="dimmed" mt="xs">
                The {formatDuration(roomDurationMinutes)} countdown begins when you press start
              </Text>
            )}
            {error && (
              <Text size="sm" c="red" mt="xs">
                {error}
              </Text>
            )}
          </Stack>
        ) : (
          <Stack gap="md" align="center">
            <Loader color="violet" size="md" />
            <Text
              size="md"
              c="dimmed"
              style={{ maxWidth: "320px" }}
            >
              Waiting for the host to start the watch party.
              You will be able to watch once the session begins.
            </Text>
          </Stack>
        )}
      </div>
    </Overlay>
  );
};
