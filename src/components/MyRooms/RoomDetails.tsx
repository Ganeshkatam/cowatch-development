import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  Title,
  Text,
  Badge,
  Button,
  Group,
  Modal,
  Loader,
  Paper,
  ActionIcon,
  Tooltip,
  SegmentedControl,
  Avatar,
  ScrollArea,
  Stack,
} from "@mantine/core";

const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h}h ${m}m`;
};
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconPlayerPlayFilled,
  IconCopy,
  IconSettings,
  IconLock,
  IconLockOpen,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconCalendar,
  IconClock,
  IconUsers,
  IconMessage,
  IconShieldCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconExternalLink,
  IconActivity,
  IconInfinity,
  IconTrash,
  IconPlayerStop,
} from "@tabler/icons-react";
import { serverPath, getRoomUrl, addAndSavePasscode, getSavedPasscodes } from "../../utils/utils";
import { getAccessToken, supabase } from "../../utils/supabaseClient";
import styles from "./RoomDetails.module.css";
import { EditRoomModal } from "./RoomCard";

export interface LifecycleEvent {
  id: string;
  actor: string;
  event: string;
  previousStatus: string | null;
  newStatus: string | null;
  previousExpiresAt: string | null;
  newExpiresAt: string | null;
  reason: string | null;
  timestamp: string;
}

export interface RoomDetailsData {
  roomId: string;
  isPasscodeProtected: boolean;
  currentPasscode?: string | null;
  creationTime: string;
  roomTitle: string;
  roomDescription: string | null;
  coverPhoto: string | null;
  isChatDisabled: boolean;
  isSubRoom: boolean;
  status: "waiting" | "scheduled" | "active" | "inactive" | "expiring" | "expired" | "ended";
  startedAt: string | null;
  expiresAt: string | null;
  endedAt: string | null;
  isPermanent: boolean;
  durationMinutes?: number | null;
  owner_id?: string;
  lifecycleEvents: LifecycleEvent[];
  chatSummary?: {
    messagesCount: number;
    lastMessageAt: string | null;
  };
  chatMessages?: ChatMessageItem[];
}

interface ChatMessageItem {
  id: string;
  roomId: string;
  user_id: string | null;
  message: string;
  message_type: 'user' | 'system';
  event_type?: string | null;
  metadata?: any;
  created_at: string;
  authorName?: string;
  authorAvatar?: string;
}

const getStatusConfig = (status: RoomDetailsData["status"]) => {
  switch (status) {
    case "waiting":
      return {
        label: "Waiting to Start",
        color: "yellow",
        dotClass: styles.inactive,
        description: "Created and ready. The timer begins when the host starts the party.",
        badgeColor: "yellow",
      };
    case "active":
      return {
        label: "Active",
        color: "green",
        dotClass: styles.active,
        description: "People are watching right now.",
        badgeColor: "green",
      };
    case "inactive":
      return {
        label: "Inactive",
        color: "yellow",
        dotClass: styles.inactive,
        description: "Empty right now. Starts when someone joins.",
        badgeColor: "yellow",
      };
    case "expiring":
      return {
        label: "Closing Soon",
        color: "orange",
        dotClass: styles.expiring,
        description: "This room will close soon.",
        badgeColor: "orange",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        color: "blue",
        dotClass: styles.scheduled,
        description: "Set up for an upcoming watch party.",
        badgeColor: "blue",
      };
    case "ended":
      return {
        label: "Ended",
        color: "gray",
        dotClass: styles.ended,
        description: "This watch party has finished.",
        badgeColor: "gray",
      };
    case "expired":
      return {
        label: "Expired",
        color: "red",
        dotClass: styles.expired,
        description: "This temporary room has expired and is closed.",
        badgeColor: "red",
      };
    default:
      return {
        label: status || "Unknown",
        color: "gray",
        dotClass: styles.inactive,
        description: "Room status.",
        badgeColor: "gray",
      };
  }
};

export const RoomDetails = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const history = useHistory();
  const [room, setRoom] = useState<RoomDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"chat" | "activity">("chat");

  const fetchRoomDetails = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Not authenticated");

      const response = await fetch(`${serverPath}/roomDetails?roomId=${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error("Room not found or unauthorized");
        throw new Error("Failed to fetch room details");
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Received invalid response from server");
      }
      const data = await response.json();
      if (data && data.currentPasscode) {
        addAndSavePasscode(data.roomId, data.currentPasscode);
      }
      setRoom(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentPasscode =
    room?.currentPasscode ||
    (room?.roomId && getSavedPasscodes()[room.roomId]) ||
    (room?.roomId && getSavedPasscodes()[room.roomId.startsWith("/") ? room.roomId.substring(1) : room.roomId]) ||
    "";

  useEffect(() => {
    fetchRoomDetails();
  }, [roomId]);

  const handleCopyUrl = () => {
    if (!room) return;
    const url = getRoomUrl(room.roomId);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }).catch(console.error);
  };

  const handleCopyRoomId = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.roomId).then(() => {
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2000);
    }).catch(console.error);
  };

  const handleCopyPassword = () => {
    if (!currentPasscode) return;
    navigator.clipboard.writeText(currentPasscode).then(() => {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }).catch(console.error);
  };

  const handleDelete = async () => {
    if (!room) return;
    setIsDeleting(true);
    try {
      const token = await getAccessToken();
      const user = await supabase.auth.getUser();
      const uid = user.data.user?.id;

      // Clean up storage bucket files for this room
      if (uid) {
        try {
          const cleanId = room.roomId.startsWith("/") ? room.roomId.substring(1) : room.roomId;
          const folderPath = `${uid}/${cleanId}`;
          const { data: files } = await supabase.storage.from("room_covers").list(folderPath);
          if (files && files.length > 0) {
            const filesToRemove = files.map(f => `${folderPath}/${f.name}`);
            await supabase.storage.from("room_covers").remove(filesToRemove);
          }
        } catch (storageErr) {
          console.warn("Storage cleanup error:", storageErr);
        }
      }

      const response = await fetch(`${serverPath}/deleteRoom?roomId=${room.roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        history.push("/myrooms");
      } else {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error?.message || errData?.error || "Failed to delete room");
      }
    } catch (e: any) {
      console.error(e);
      setActionError(e.message || "Failed to delete room");
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const [nowTime, setNowTime] = useState(Date.now());
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startConfirm, setStartConfirm] = useState(false);

  const handleStartRoom = async () => {
    if (!room) return;
    setIsStarting(true);
    setActionError(null);
    try {
      const token = await getAccessToken();
      const user = await supabase.auth.getUser();
      const response = await fetch(`${serverPath}/startRoom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.data.user?.id, token, roomId: room.roomId }),
      });
      if (response.ok) {
        history.push(urlPath);
      } else {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error?.message || errData?.error || "Failed to start room");
      }
    } catch (e: any) {
      console.error(e);
      setActionError(e.message || "Failed to start room");
    } finally {
      setIsStarting(false);
      setStartConfirm(false);
    }
  };

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const confirmCancelRoom = async () => {
    if (!room) return;
    setIsCancelling(true);
    try {
      const token = await getAccessToken();
      const user = await supabase.auth.getUser();
      const response = await fetch(`${serverPath}/cancelRoom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.data.user?.id, token, roomId: room.roomId }),
      });
      if (response.ok) {
        setCancelConfirm(false);
        await fetchRoomDetails();
      } else {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error?.message || errData?.error || "Failed to cancel room");
      }
    } catch (e: any) {
      console.error(e);
      setActionError(e.message || "Failed to cancel room");
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const [endConfirm, setEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const confirmEndRoom = async () => {
    if (!room) return;
    setIsEnding(true);
    try {
      const token = await getAccessToken();
      const user = await supabase.auth.getUser();
      const response = await fetch(`${serverPath}/endRoom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.data.user?.id, token, roomId: room.roomId }),
      });
      if (response.ok) {
        setEndConfirm(false);
        await fetchRoomDetails();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Loader size="lg" color="violet" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className={styles.container}>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => history.push("/myrooms")} mb="xl">
          Back to My Rooms
        </Button>
        <Paper withBorder p="xl" radius="md" style={{ textAlign: "center" }}>
          <Title order={3} c="red" mb="sm">Something went wrong</Title>
          <Text>{error || "Could not load this room."}</Text>
        </Paper>
      </div>
    );
  }

  const statusStr = room.status as string;
  const isClosed = statusStr === "expired" || statusStr === "ended" || statusStr === "cancelled";
  const isWaiting = room.status === "waiting";
  const isScheduled = room.status === "scheduled";
  const isOpenable = !isClosed && (room.status === "active" || room.status === "expiring" || room.status === "scheduled" || room.status === "inactive");
  const urlPath = `/watch/${room.roomId.replace(/^\//, "")}`;
  const statusConfig = getStatusConfig(room.status);

  // Time remaining calculator
  const getExpiresIn = () => {
    if (!room.expiresAt) return null;
    if (room.status === "expired" || room.status === "ended") return "Expired";
    const diff = new Date(room.expiresAt).getTime() - nowTime;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const expiresInText = getExpiresIn();

  return (
    <div className={styles.container}>
      {/* BREADCRUMBS */}
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbLink} onClick={() => history.push("/myrooms")}>
          <IconArrowLeft size={15} /> My Rooms
        </span>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{room.roomTitle || room.roomId}</span>
      </div>

      {actionError && (
        <Paper withBorder p="md" radius="md" mb="md" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" }}>
          <Group justify="space-between">
            <Text c="red" size="sm" fw={600}>{actionError}</Text>
            <ActionIcon size="xs" variant="subtle" color="red" onClick={() => setActionError(null)}>
              <IconCheck size={12} />
            </ActionIcon>
          </Group>
        </Paper>
      )}

      {/* HERO SECTION */}
      <div className={styles.hero}>
        {room.coverPhoto ? (
          <>
            <img src={room.coverPhoto} alt="Room Cover" className={styles.heroCover} />
            <div className={styles.heroScrim} />
          </>
        ) : (
          <>
            <div className={styles.heroFallbackBg} />
            <div className={styles.heroScrim} />
          </>
        )}

        <div className={styles.heroContent}>
          {/* Top Bar inside Hero */}
          <div className={styles.heroTopRow}>
            <div className={styles.statusPill}>
              <div className={`${styles.pulseDot} ${statusConfig.dotClass}`} />
              <span style={{ color: "rgba(255,255,255,0.9)" }}>{statusConfig.label}</span>
            </div>
          </div>

          {/* Bottom Row inside Hero */}
          <div className={styles.heroBottomRow}>
            <div className={styles.heroMeta}>
              <h1 className={styles.heroTitle}>
                {room.roomTitle || "Watch Party Room"}
              </h1>

              {room.roomDescription && (
                <p className={styles.heroDescription}>
                  {room.roomDescription}
                </p>
              )}

              <Tooltip label={isClosed ? "Room is expired — link disabled" : (copiedUrl ? "Copied to clipboard!" : "Click to copy invite link")} withArrow>
                <div
                  className={styles.heroUrlBadge}
                  onClick={isClosed ? undefined : handleCopyUrl}
                  style={isClosed ? { opacity: 0.5, cursor: "not-allowed", textDecoration: "line-through" } : undefined}
                >
                  {copiedUrl && !isClosed ? <IconCheck size={14} color="#10B981" /> : <IconCopy size={14} />}
                  <span>/watch/{room.roomId.replace(/^\//, "")}</span>
                </div>
              </Tooltip>
            </div>

            <div className={styles.heroActions}>
              {isOpenable && (
                <Button
                  size="md"
                  className={styles.primaryOpenBtn}
                  onClick={() => history.push(urlPath)}
                  leftSection={<IconPlayerPlayFilled size={16} />}
                >
                  Join Room
                </Button>
              )}
              {isWaiting && (
                <>
                  <Button
                    size="md"
                    className={styles.primaryOpenBtn}
                    onClick={() => setStartConfirm(true)}
                    loading={isStarting}
                    leftSection={!isStarting ? <IconPlayerPlayFilled size={16} /> : undefined}
                  >
                    Start Watch Party
                  </Button>
                  <Button
                    size="md"
                    className={styles.glassBtn}
                    onClick={() => history.push(`/join/${room.roomId.replace(/^\//, "")}`)}
                    leftSection={<IconPlayerPlay size={16} />}
                  >
                    Pre-Flight Lobby
                  </Button>
                </>
              )}
              {isScheduled && (
                <>
                  <Button
                    size="md"
                    className={styles.primaryOpenBtn}
                    onClick={() => history.push(urlPath)}
                    leftSection={<IconPlayerPlay size={16} />}
                  >
                    Join Waiting Room
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    color="violet"
                    onClick={handleStartRoom}
                    loading={isStarting}
                  >
                    Start Early
                  </Button>
                  <Button
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={() => setCancelConfirm(true)}
                  >
                    Cancel
                  </Button>
                </>
              )}
              {!isClosed && (
                <Button
                  size="md"
                  className={styles.glassBtn}
                  onClick={() => setEditModalOpened(true)}
                  leftSection={<IconSettings size={16} />}
                >
                  Edit
                </Button>
              )}
              {!isClosed && (
                <Button
                  size="md"
                  className={styles.glassBtn}
                  onClick={handleCopyUrl}
                  leftSection={copiedUrl ? <IconCheck size={16} color="#10B981" /> : <IconCopy size={16} />}
                >
                  {copiedUrl ? "Copied!" : "Copy Link"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS ROW */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ backgroundColor: "rgba(16, 185, 129, 0.12)" }}>
            <IconActivity size={22} color="#10B981" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Room Status</span>
            <span className={styles.statValue}>{statusConfig.label}</span>
            <span className={styles.statSubtitle}>{statusConfig.description}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ backgroundColor: "rgba(139, 92, 246, 0.12)" }}>
            <IconUsers size={22} color="#8B5CF6" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Viewers</span>
            <span className={styles.statValue}>{room.status === "active" ? "Watching Now" : "0"}</span>
            <span className={styles.statSubtitle}>
              {room.status === "active" ? "People in the room" : "No one watching yet"}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIconWrap}
            style={{
              backgroundColor: room.isPermanent ? "rgba(20, 184, 166, 0.12)" : "rgba(245, 158, 11, 0.12)",
            }}
          >
            {room.isPermanent ? <IconInfinity size={22} color="#14B8A6" /> : <IconClock size={22} color="#F59E0B" />}
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Room Expiry</span>
            <span className={styles.statValue}>
              {room.isPermanent
                ? "Never Expires"
                : room.status === "waiting"
                  ? (room.durationMinutes ? `${room.durationMinutes}m session` : "Not started")
                  : room.status === "expired" || expiresInText === "Expired"
                    ? "Expired"
                    : room.status === "ended"
                      ? "Ended"
                      : expiresInText || "Temporary"}
            </span>
            <span className={styles.statSubtitle}>
              {room.isPermanent
                ? "Saved forever"
                : room.status === "waiting"
                  ? "Timer begins on start"
                  : room.status === "expired" || expiresInText === "Expired" || room.status === "ended"
                    ? "Room is closed"
                    : "Temporary room"}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ backgroundColor: "rgba(236, 72, 153, 0.12)" }}>
            <IconMessage size={22} color="#EC4899" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Chat</span>
            <span className={styles.statValue}>{room.chatSummary ? room.chatSummary.messagesCount : 0} Messages</span>
            <span className={styles.statSubtitle}>
              {room.chatSummary?.lastMessageAt
                ? `Last message: ${new Date(room.chatSummary.lastMessageAt).toLocaleDateString()}`
                : "No messages yet"}
            </span>
          </div>
        </div>
      </div>

      {/* BENTO CONTENT GRID */}
      <div className={styles.bentoGrid}>
        {/* LEFT COLUMN: DETAILS & SETTINGS */}
        <div>
          {/* Card 1: Room Details */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <div className={styles.cardTitleIconWrap}>
                  <IconInfoCircle size={18} />
                </div>
                <span>Room Details</span>
              </div>
            </div>

            <div className={styles.tileGrid}>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>Room ID</span>
                <div className={styles.tileValue}>
                  <span className={styles.codeBadge}>{room.roomId}</span>
                  {!isClosed && (
                    <Tooltip label={copiedRoomId ? "Copied!" : "Copy room ID"} withArrow>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color={copiedRoomId ? "green" : "gray"}
                        onClick={handleCopyRoomId}
                        aria-label="Copy Room ID"
                      >
                        {copiedRoomId ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className={styles.tile}>
                <span className={styles.tileLabel}>
                  <IconCalendar size={13} />
                  Created
                </span>
                <span className={styles.tileValue}>
                  {new Date(room.creationTime).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className={styles.tile}>
                <span className={styles.tileLabel}>
                  <IconLock size={13} />
                  Password
                </span>
                <div className={styles.tileValue}>
                  {isClosed ? (
                    <Badge
                      color="gray"
                      variant="light"
                      size="md"
                      radius="md"
                      leftSection={<IconLock size={13} />}
                      style={{ fontWeight: 600 }}
                    >
                      Room Closed
                    </Badge>
                  ) : room.isPasscodeProtected ? (
                    currentPasscode ? (
                      <Group gap={6} align="center">
                        <span
                          style={{
                            fontFamily: showPassword ? "inherit" : "monospace",
                            letterSpacing: showPassword ? "normal" : "2px",
                            fontWeight: 700,
                          }}
                        >
                          {showPassword ? currentPasscode : "••••••••"}
                        </span>
                        <Tooltip label={showPassword ? "Hide password" : "Show password"} withArrow>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="gray"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Toggle password visibility"
                          >
                            {showPassword ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={copiedPassword ? "Copied!" : "Copy password"} withArrow>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color={copiedPassword ? "green" : "gray"}
                            onClick={handleCopyPassword}
                            aria-label="Copy password"
                          >
                            {copiedPassword ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </ActionIcon>
                        </Tooltip>
                        <Badge
                          color="violet"
                          variant="light"
                          size="md"
                          radius="md"
                          style={{ fontWeight: 600, border: "1px solid rgba(139, 92, 246, 0.25)" }}
                        >
                          Password Protected
                        </Badge>
                      </Group>
                    ) : (
                      <Badge
                        color="violet"
                        variant="light"
                        size="md"
                        radius="md"
                        leftSection={<IconLock size={13} />}
                        style={{ fontWeight: 600, border: "1px solid rgba(139, 92, 246, 0.25)" }}
                      >
                        Password Protected
                      </Badge>
                    )
                  ) : (
                    <Badge
                      color="gray"
                      variant="light"
                      size="md"
                      radius="md"
                      leftSection={<IconLockOpen size={13} />}
                      style={{ fontWeight: 600 }}
                    >
                      No Password Needed
                    </Badge>
                  )}
                </div>
              </div>

              <div className={styles.tile}>
                <span className={styles.tileLabel}>Room Type</span>
                <div className={styles.tileValue}>
                  <Badge
                    color={room.isPermanent ? "teal" : "blue"}
                    variant="light"
                    size="md"
                    radius="md"
                    style={{
                      fontWeight: 600,
                      border: room.isPermanent
                        ? "1px solid rgba(20, 184, 166, 0.25)"
                        : "1px solid rgba(59, 130, 246, 0.25)",
                    }}
                  >
                    {room.isPermanent ? "Permanent Room" : "Temporary Room"}
                  </Badge>
                  {room.isSubRoom && (
                    <Badge color="gray" variant="outline" size="md" radius="md" style={{ fontWeight: 600 }}>
                      Sub-Room
                    </Badge>
                  )}
                </div>
              </div>

              <div className={styles.tile} style={{ gridColumn: "1 / -1" }}>
                <span className={styles.tileLabel}>Invite Link</span>
                <div className={styles.tileValue}>
                  {isClosed ? (
                    <Group gap="xs" align="center">
                      <span style={{ color: "var(--text-muted)", textDecoration: "line-through", fontSize: 13 }}>
                        {window.location.origin}{urlPath}
                      </span>
                      <Badge color="red" variant="light" size="sm">
                        Link Inactive (Expired)
                      </Badge>
                    </Group>
                  ) : (
                    <a
                      href={urlPath}
                      onClick={(e) => {
                        e.preventDefault();
                        history.push(urlPath);
                      }}
                      style={{
                        color: "var(--color-violet)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        textDecoration: "underline",
                        fontWeight: 600,
                      }}
                    >
                      {window.location.origin}{urlPath}
                      <IconExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Settings */}
          <div className={styles.card} style={isClosed ? { opacity: 0.75 } : undefined}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <div className={styles.cardTitleIconWrap}>
                  <IconSettings size={18} />
                </div>
                <span>Room Settings</span>
              </div>
              {!isClosed && (
                <Button
                  variant="subtle"
                  size="xs"
                  color="violet"
                  onClick={() => setEditModalOpened(true)}
                  leftSection={<IconSettings size={14} />}
                >
                  Edit
                </Button>
              )}
            </div>

            <div className={styles.tileGrid}>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>Live Chat</span>
                <div className={styles.tileValue}>
                  <Badge
                    color={isClosed ? "gray" : room.isChatDisabled ? "gray" : "green"}
                    variant="light"
                    size="md"
                    radius="md"
                    style={{
                      fontWeight: 600,
                      border: isClosed
                        ? "1px solid rgba(156, 163, 175, 0.25)"
                        : room.isChatDisabled
                          ? "1px solid rgba(156, 163, 175, 0.25)"
                          : "1px solid rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    {isClosed ? "Disabled" : room.isChatDisabled ? "Turned Off" : "Turned On"}
                  </Badge>
                </div>
              </div>

              <div className={styles.tile}>
                <span className={styles.tileLabel}>Video Controls</span>
                <div className={styles.tileValue}>
                  <Badge
                    color={isClosed ? "gray" : "violet"}
                    variant="light"
                    size="md"
                    radius="md"
                    leftSection={<IconShieldCheck size={13} />}
                    style={{ fontWeight: 600, border: isClosed ? "1px solid rgba(156, 163, 175, 0.25)" : "1px solid rgba(139, 92, 246, 0.25)" }}
                  >
                    {isClosed ? "Disabled" : "Host Only"}
                  </Badge>
                </div>
              </div>

              <div className={styles.tile} style={{ gridColumn: "1 / -1" }}>
                <span className={styles.tileLabel}>Description</span>
                <div className={styles.tileValue}>
                  {room.roomDescription ? (
                    <Text size="sm" c="var(--text-secondary)" style={{ fontStyle: "italic" }}>
                      "{room.roomDescription}"
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No description added yet. Click "Edit" to add one.
                    </Text>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Danger Zone */}
          <div className={styles.dangerCard}>
            <div className={styles.dangerInfo}>
              <div className={styles.dangerTitle}>
                <IconAlertTriangle size={16} />
                <span>Room Management</span>
              </div>
              <div className={styles.dangerDesc}>
                End the room now or permanently delete it.
              </div>
            </div>
            <Group gap="xs">
              {room.status !== "ended" && room.status !== "expired" && (
                <Button
                  color="orange"
                  variant="light"
                  onClick={() => setEndConfirm(true)}
                  loading={isEnding}
                  leftSection={<IconPlayerStop size={15} />}
                >
                  End Room
                </Button>
              )}
              <Button
                color="red"
                variant="outline"
                onClick={() => setDeleteConfirm(true)}
                leftSection={<IconTrash size={15} />}
              >
                Delete Room
              </Button>
            </Group>
          </div>
        </div>

        {/* RIGHT COLUMN: STATUS & RECENT ACTIVITY */}
        <div>
          {/* Card 4: Status & Timing */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <div className={styles.cardTitleIconWrap}>
                  <IconClock size={18} />
                </div>
                <span>Status & Timing</span>
              </div>
              <Badge color={statusConfig.badgeColor} variant="light" size="sm">
                {statusConfig.label}
              </Badge>
            </div>

            <div
              className={`${styles.lifecycleBanner} ${room.isPermanent
                  ? styles.permanent
                  : room.status === "active"
                    ? styles.active
                    : room.status === "expired" || room.status === "ended"
                      ? styles.ended
                      : styles.inactive
                }`}
            >
              <div>
                <Text fw={700} size="sm" c="var(--text-primary)">
                  {room.isPermanent
                    ? "Permanent Room"
                    : room.status === "waiting"
                      ? "Waiting to Start"
                      : room.status === "active"
                        ? "Party in Progress"
                        : room.status === "expired"
                          ? "Room Expired"
                          : room.status === "ended"
                            ? "Room Ended"
                            : "Room is Paused"}
                </Text>
                <Text size="xs" c="var(--text-secondary)" mt={4} style={{ lineHeight: 1.5 }}>
                  {room.isPermanent
                    ? "This room is saved forever. You and your friends can come back and watch together anytime."
                    : room.status === "waiting"
                      ? "This watch party is ready. The countdown timer starts as soon as the host begins."
                      : room.status === "active"
                        ? "People are currently in this room watching together."
                        : room.status === "expired"
                          ? "This temporary room has reached its end of life and is now closed."
                          : room.status === "ended"
                            ? "This watch party has been ended by the host."
                            : "Nobody is in the room right now. It automatically wakes up as soon as someone joins."}
                </Text>
              </div>
            </div>

            {(room.status === "active" || room.status === "expiring") && !room.isPermanent && room.expiresAt && expiresInText !== "Expired" && (
              <div style={{ marginBottom: "20px" }}>
                <div className={styles.countdownBig}>
                  {expiresInText || "—"}
                </div>
                <div className={styles.countdownLabel}>Time left until room closes</div>
              </div>
            )}

            <div className={styles.tileGrid} style={{ gridTemplateColumns: "1fr" }}>
              <div className={styles.tile}>
                <span className={styles.tileLabel}>Last Used</span>
                <span className={styles.tileValue}>
                  {room.lifecycleEvents && room.lifecycleEvents.length > 0
                    ? new Date(room.lifecycleEvents[0].timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "Never used yet"}
                </span>
              </div>

              <div className={styles.tile}>
                <span className={styles.tileLabel}>Auto-Start</span>
                <span className={styles.tileValue}>
                  {isClosed ? "Disabled (Room closed)" : "Starts when someone joins"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Room Chat & Activity History */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <div className={styles.cardTitleIconWrap}>
                  {activeHistoryTab === "chat" ? <IconMessage size={18} /> : <IconActivity size={18} />}
                </div>
                <span>{activeHistoryTab === "chat" ? "Room Chat" : "Activity History"}</span>
              </div>
              <SegmentedControl
                value={activeHistoryTab}
                onChange={(val) => setActiveHistoryTab(val as "chat" | "activity")}
                size="xs"
                radius="md"
                data={[
                  {
                    label: `Chat (${room.chatMessages?.length ?? room.chatSummary?.messagesCount ?? 0})`,
                    value: "chat",
                  },
                  {
                    label: `Activity (${room.lifecycleEvents?.length ?? 0})`,
                    value: "activity",
                  },
                ]}
              />
            </div>

            {activeHistoryTab === "chat" ? (
              room.chatMessages && room.chatMessages.length > 0 ? (
                <ScrollArea.Autosize mah={360} type="auto">
                  <div className={styles.chatList}>
                    {room.chatMessages.map((msg) => (
                      <div key={msg.id} className={styles.chatItem}>
                        <Avatar
                          src={msg.authorAvatar}
                          alt={msg.authorName || "Guest"}
                          radius="xl"
                          size="sm"
                          color="violet"
                        >
                          {(msg.authorName || "G").charAt(0).toUpperCase()}
                        </Avatar>
                        <div className={styles.chatContent}>
                          <div className={styles.chatHeaderRow}>
                            <span className={styles.chatAuthor}>{msg.authorName || "Guest"}</span>
                            <span className={styles.chatTime}>
                              {new Date(msg.created_at).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className={styles.chatMessageText}>{msg.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea.Autosize>
              ) : (
                <div className={styles.emptyStateContainer}>
                  <div className={styles.emptyStateIconWrap}>
                    <IconMessage size={22} color="var(--color-violet)" />
                  </div>
                  <Text fw={600} size="sm" c="var(--text-primary)">
                    No Messages Yet
                  </Text>
                  <Text size="xs" c="dimmed" ta="center" style={{ maxWidth: 260 }}>
                    Chats sent during watch parties in this room will appear here.
                  </Text>
                </div>
              )
            ) : (
              room.lifecycleEvents && room.lifecycleEvents.length > 0 ? (
                <div className={styles.timeline}>
                  {room.lifecycleEvents.slice(0, 10).map((event, index) => (
                    <div key={event.id || index} className={styles.timelineItem}>
                      {index < Math.min(room.lifecycleEvents.length, 10) - 1 && (
                        <div className={styles.timelineLine} />
                      )}
                      <div className={styles.timelineNode}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: "var(--color-violet)",
                          }}
                        />
                      </div>
                      <div className={styles.timelineBody}>
                        <div className={styles.timelineTitle}>{event.event}</div>
                        <div className={styles.timelineTime}>
                          {new Date(event.timestamp).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyStateContainer}>
                  <div className={styles.emptyStateIconWrap}>
                    <IconActivity size={22} color="var(--color-violet)" />
                  </div>
                  <Text fw={600} size="sm" c="var(--text-primary)">
                    No Activity Recorded
                  </Text>
                  <Text size="xs" c="dimmed" ta="center" style={{ maxWidth: 260 }}>
                    Room events, status changes, and participant activity will appear here.
                  </Text>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* CANCEL CONFIRMATION MODAL */}
      <Modal opened={cancelConfirm} onClose={() => setCancelConfirm(false)} title="Cancel Watch Party" centered>
        <Text size="sm" mb="lg">
          Are you sure you want to cancel this scheduled room? This cannot be undone, and the room will become inaccessible.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setCancelConfirm(false)}>Keep Room</Button>
          <Button color="red" onClick={confirmCancelRoom} loading={isCancelling}>Cancel Room</Button>
        </Group>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal opened={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete Room" centered>
        <Text size="sm" mb="lg">
          Are you sure you want to delete <strong>{room.roomTitle || room.roomId}</strong> forever? You will not be able to get it back.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteConfirm(false)}>
            Keep Room
          </Button>
          <Button color="red" onClick={handleDelete} loading={isDeleting}>
            Delete Room
          </Button>
        </Group>
      </Modal>

      {/* END CONFIRMATION MODAL */}
      <Modal opened={endConfirm} onClose={() => setEndConfirm(false)} title="End Watch Party" centered>
        <Text size="sm" mb="lg">
          Are you sure you want to end <strong>{room.roomTitle || room.roomId}</strong>? Guests will no longer be able to watch or join this room.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setEndConfirm(false)}>
            Cancel
          </Button>
          <Button color="orange" onClick={confirmEndRoom} loading={isEnding}>
            End Room
          </Button>
        </Group>
      </Modal>

      {/* START ROOM CONFIRMATION MODAL (Before entering room) */}
      <Modal
        opened={startConfirm}
        onClose={() => setStartConfirm(false)}
        title="Start Watch Party"
        centered
      >
        <Stack gap="sm" mb="lg">
          <Text size="sm">
            You are about to start <strong>{room.roomTitle || room.roomId}</strong>.
          </Text>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              backgroundColor: "rgba(139, 92, 246, 0.08)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
              <IconClock size={16} color="var(--color-violet)" />
              <span>
                {room.isPermanent
                  ? "Permanent Room (no expiration)"
                  : `Session Duration: ${formatDuration(room.durationMinutes) || "5 hours"}`}
              </span>
            </div>
            {!room.isPermanent && (
              <Text size="xs" c="dimmed">
                The countdown begins when you start the watch party.
              </Text>
            )}
          </div>
        </Stack>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setStartConfirm(false)}>
            Cancel
          </Button>
          <Button
            color="violet"
            onClick={handleStartRoom}
            loading={isStarting}
            leftSection={<IconPlayerPlayFilled size={15} />}
          >
            Start Watch Party
          </Button>
        </Group>
      </Modal>

      {/* NOTICE / ERROR MODAL */}
      <Modal opened={Boolean(actionError)} onClose={() => setActionError(null)} title="Notice" centered>
        <Text size="sm" mb="lg">
          {actionError}
        </Text>
        <Group justify="flex-end">
          <Button onClick={() => setActionError(null)} color="violet">
            OK
          </Button>
        </Group>
      </Modal>

      {/* EDIT ROOM MODAL */}
      <EditRoomModal
        room={{
          roomId: room.roomId,
          creationTime: room.creationTime,
          roomTitle: room.roomTitle,
          roomDescription: room.roomDescription,
          coverPhoto: room.coverPhoto,
          isChatDisabled: room.isChatDisabled,
          isPasscodeProtected: room.isPasscodeProtected,
          currentPasscode: room.currentPasscode,
          isSubRoom: room.isSubRoom,
          status: room.status,
          startedAt: room.startedAt,
          endedAt: room.endedAt,
          expiresAt: room.expiresAt,
          isPermanent: room.isPermanent,
        }}
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        onSuccess={fetchRoomDetails}
      />
    </div>
  );
};
