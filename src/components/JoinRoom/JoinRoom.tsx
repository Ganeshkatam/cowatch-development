import React, { useState, useEffect, useContext } from "react";
import { useParams, useHistory, useLocation } from "react-router-dom";
import {
  Button,
  PasswordInput,
  Loader,
  Alert,
  Avatar,
  Text,
} from "@mantine/core";
import {
  IconLock,
  IconCalendar,
  IconPlayerStop,
  IconAlertTriangle,
  IconPlayerPlayFilled,
  IconVideoPlus,
} from "@tabler/icons-react";
import { serverPath, setServerPath, serverCandidates, calculateRoomDuration } from "../../utils/utils";
import { MetadataContext } from "../../MetadataContext";
import styles from "./JoinRoom.module.css";
import { TopBar } from "../TopBar/TopBar";
import { safeGetSession } from "../../utils/supabaseClient";

interface RoomMetadata {
  startedAt: any;
  id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "active" | "expired" | "ended" | "cancelled";
  startsAt: string | null;
  expiresAt: string | null;
  endedAt: string | null;
  host: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  access: {
    requiresAuthentication: boolean;
    requiresPasscode: boolean;
    isWaitingLoungeEnabled?: boolean;
    isOwner: boolean;
  };
}

export default function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const history = useHistory();
  const location = useLocation();
  const context = useContext(MetadataContext);

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<RoomMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    fetchMetadata();
  }, [roomId]);

  useEffect(() => {
    if (!room || room.status !== "scheduled" || !room.startsAt) return;

    let interval = setInterval(() => {
      const start = new Date(room.startsAt!).getTime();
      const now = Date.now();
      const diff = start - now;

      if (diff <= 0) {
        setTimeRemaining("00:00:00");
        clearInterval(interval);
        // Refresh metadata to transition to active
        fetchMetadata();
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  const fetchMetadata = async () => {
    setLoading(true);
    setError(null);
    try {
      const candidatesToTry = [
        serverPath,
        ...serverCandidates.filter((c: string) => c !== serverPath),
      ];
      let res: Response | undefined;
      for (let i = 0; i < candidatesToTry.length; i++) {
        const candidate = candidatesToTry[i];
        try {
          const attempt = await fetch(`${candidate}/api/room/metadata/${roomId}`);
          const contentType = attempt.headers.get("content-type") || "";
          if (attempt.ok || attempt.status === 404 || contentType.includes("application/json")) {
            res = attempt;
            if (candidate !== serverPath) {
              setServerPath(candidate);
            }
            break;
          } else {
            res = attempt;
          }
        } catch (fetchErr) {
          if (i === candidatesToTry.length - 1 && !res) {
            throw fetchErr;
          }
        }
      }

      if (!res) {
        setError("Network error. Unable to reach server.");
        return;
      }
      if (!res.ok) {
        if (res.status === 404) {
          setError("Room not found");
        } else {
          setError("Failed to load room details");
        }
        return;
      }
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
      } else {
        setError("Invalid room data");
      }
    } catch (e) {
      console.error("fetchMetadata error:", e);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const requestAdmission = async (providedPasscode?: string) => {
    if (!room) return;
    setSubmitting(true);
    setError(null);
    try {
      const sessionData = await safeGetSession(1000);
      const token = sessionData?.data?.session?.access_token;

      const res = await fetch(`${serverPath}/api/room/verifyPasscode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          passcode: providedPasscode || "",
          uid: context.user?.id,
          token: token,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error === "INVALID_PASSCODE" ? "Incorrect passcode." :
          data.error === "RATE_LIMIT_EXCEEDED" ? "Too many attempts. Try again later." :
            data.error === "PASSCODE_REQUIRED" ? "This room requires a passcode." :
              "Access denied.");
        setSubmitting(false);
        return;
      }

      // Success - save token and navigate
      if (data.admissionToken) {
        window.sessionStorage.setItem(`admissionToken_${roomId}`, data.admissionToken);
        history.replace(`/watch/${roomId}`);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to verify admission");
      setSubmitting(false);
    }
  };

  const handleJoinClicked = () => {
    // If no passcode required and logged in (or auth not required), try admission immediately
    if (admissionRequirement === "none") {
      requestAdmission();
    }
  };

  const navigateToLogin = () => {
    history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
  };

  const navigateToSignup = () => {
    history.push(`/signup?redirect=${encodeURIComponent(location.pathname)}`);
  };

  if (loading) {
    return (
      <>
        <TopBar hideNewRoom={true} />
        <div className={styles.container}>
          <div className={styles.glowContainer}>
            <div className={styles.glowLeft} />
            <div className={styles.glowRight} />
          </div>
          <Loader color="violet" size="lg" />
        </div>
      </>
    );
  }

  if (error && !room) {
    return (
      <>
        <TopBar hideNewRoom={true} />
        <div className={styles.container}>
          <div className={styles.glowContainer}>
            <div className={styles.glowLeft} />
            <div className={styles.glowRight} />
          </div>
          <div className={styles.card}>
            <div className={styles.title}>Unavailable</div>
            <div className={styles.subtitle}>{error}</div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "center" }}>
              <Button onClick={fetchMetadata} variant="filled" color="violet">
                Try Again
              </Button>
              <Button onClick={() => history.push(context.user ? "/myrooms" : "/")} variant="light" color="gray">
                {context.user ? "Back to My Rooms" : "Return Home"}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!room) return null;

  // Determine Derived UI State
  const admissionRequirement = room.access.requiresAuthentication && !context.user
    ? "authentication"
    : (room.access.requiresPasscode && room.host.id !== context.user?.id)
      ? "passcode"
      : "none";

  return (
    <>
      <TopBar hideNewRoom={true} />
      <div className={styles.container}>
        <div className={styles.glowContainer}>
          <div className={styles.glowLeft} />
          <div className={styles.glowRight} />
        </div>

        <div className={styles.card}>
          <Text size="sm" c="dimmed" mb={8} fw={600} style={{ textTransform: "uppercase", letterSpacing: "1px" }}>
            You're invited to watch
          </Text>
          <div className={styles.title}>{room.title}</div>

          <div className={styles.hostBadge}>
            <Avatar src={room.host.avatarUrl} size={24} radius="xl" color="violet">
              {room.host.displayName?.[0] || room.host.username?.[0] || "?"}
            </Avatar>
            <span className={styles.hostName}>
              Hosted by {room.host.displayName || room.host.username || "Anonymous"}
            </span>
          </div>

          {room.access?.isWaitingLoungeEnabled && room.status !== "ended" && room.status !== "expired" && room.status !== "cancelled" && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              background: "rgba(139, 92, 246, 0.12)",
              color: "var(--color-violet)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              margin: "2px 0 10px",
            }}>
              <span>Waiting Room enabled • Host admits guests</span>
            </div>
          )}

          {room.status === "active" && (
            <div className={`${styles.statusIndicator} ${styles.statusLive}`}>
              <IconPlayerPlayFilled /> Live now
            </div>
          )}

          {(room.status === "ended" || room.status === "expired" || room.status === "cancelled") ? (
            <div className={styles.postShowContainer}>
              <div className={styles.postShowTitle}>
                {room.status === "cancelled" ? "This watch party was cancelled" : room.status === "expired" ? "This watch party has expired" : "The watch party has ended"}
              </div>
              
              {room.status !== "cancelled" && (
                <div className={styles.postShowSubtitle}>
                  <strong>{room.title}</strong> • Hosted by {room.host.displayName || room.host.username || "Anonymous"}<br />
                  <span style={{ opacity: 0.8, fontSize: '13px', display: 'inline-block', marginTop: '8px' }}>
                    {room.status === "expired" 
                      ? "This temporary room reached its end of life and is now closed." 
                      : "This party was concluded by the host. Thanks for stopping by."}
                  </span>
                </div>
              )}

              {room.status !== "cancelled" && (
                <div className={styles.postShowMetadata}>
                  <div className={styles.postShowStat}>
                    <span className={styles.postShowStatLabel}>Started</span>
                    <span className={styles.postShowStatValue}>
                      {room.startsAt ? new Date(room.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </span>
                  </div>
                  
                  <div className={styles.postShowStat}>
                    <span className={styles.postShowStatLabel}>Ended</span>
                    <span className={styles.postShowStatValue}>
                      {(room.endedAt || room.expiresAt) ? new Date((room.endedAt || room.expiresAt)!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </span>
                  </div>
                  
                  <div className={styles.postShowStat}>
                    <span className={styles.postShowStatLabel}>Duration</span>
                    <span className={styles.postShowStatValue}>
                      {calculateRoomDuration(room.startsAt, room.endedAt, room.expiresAt)}
                    </span>
                  </div>
                </div>
              )}

              <Button onClick={() => history.push("/create")} color="violet" fullWidth size="md" className={styles.hostAgainButton}>
                Host Your Own Watch Party
              </Button>

              {context.user && (
                <Button onClick={() => history.push("/myrooms")} variant="subtle" color="gray" fullWidth size="sm" mt="sm">
                  Back to My Rooms
                </Button>
              )}
            </div>
          ) : room.status === "scheduled" ? (
            <div className={styles.postShowContainer}>
              <div className={styles.postShowTitle}>
                WAITING TO START
              </div>
              
              <div className={styles.postShowSubtitle}>
                The watch party starts in
              </div>

              <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--text-primary)", textAlign: "center", margin: "16px 0", letterSpacing: "2px", textShadow: "0 0 10px rgba(255, 255, 255, 0.2)" }}>
                {timeRemaining || "..."}
              </div>

              <div className={styles.postShowSubtitle}>
                <strong>{room.startsAt ? new Date(room.startsAt).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : "TBA"}</strong><br />
                {room.startsAt ? new Date(room.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBA"}
              </div>

              <div className={styles.postShowSubtitle} style={{ marginTop: "16px", opacity: 0.8 }}>
                We'll be ready when the party starts.
              </div>
              
              {context.user && (
                <Button onClick={() => history.push("/myrooms")} variant="subtle" color="gray" fullWidth size="sm" mt="sm">
                  Back to My Rooms
                </Button>
              )}
            </div>
          ) : (
            <>
              {admissionRequirement === "authentication" && (
                <div className={styles.formGroup}>
                  <Text ta="center" mb="lg">Sign in to join this room.</Text>
                  <Button onClick={navigateToLogin} fullWidth size="md" mb="sm" color="violet">
                    Sign In
                  </Button>
                  <Button onClick={navigateToSignup} fullWidth size="md" variant="default">
                    Create Account
                  </Button>
                </div>
              )}

              {admissionRequirement === "passcode" && (
                <div className={styles.formGroup}>
                  <Text ta="center" mb="md" fw={500} c="dimmed" display="flex" style={{ alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <IconLock size={16} /> Private Room
                  </Text>
                  <form onSubmit={(e) => { e.preventDefault(); requestAdmission(passcode); }}>
                    <PasswordInput
                      placeholder="Enter room passcode"
                      value={passcode}
                      onChange={(e) => setPasscode(e.currentTarget.value)}
                      size="md"
                      disabled={submitting}
                      data-autofocus
                    />
                    <Button
                      type="submit"
                      fullWidth
                      size="md"
                      color="violet"
                      mt="md"
                      loading={submitting}
                      disabled={!passcode}
                    >
                      Verify Passcode
                    </Button>
                  </form>
                </div>
              )}

              {admissionRequirement === "none" && (
                <Button
                  onClick={handleJoinClicked}
                  fullWidth
                  size="md"
                  color="violet"
                  loading={submitting}
                  className={styles.actionButton}
                >
                  Join Room
                </Button>
              )}
            </>
          )}

          {error && (
            <Alert icon={<IconAlertTriangle size={16} />} title="Error" color="red" variant="filled" className={styles.errorAlert}>
              {error}
            </Alert>
          )}
        </div>
      </div>
    </>
  );
}
