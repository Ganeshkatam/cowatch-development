import React, { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useHistory, useLocation } from "react-router-dom";
import { Loader, Button } from "@mantine/core";
import { IconMovieOff, IconArrowLeft } from "@tabler/icons-react";
import { serverPath, setServerPath, serverCandidates, calculateRoomDuration } from "../../utils/utils";
import { MetadataContext } from "../../MetadataContext";
import styles from "./JoinRoom.module.css";
import { TopBar } from "../TopBar/TopBar";
import { Announce } from "../Announce/Announce";
import { safeGetSession } from "../../utils/supabaseClient";

import { RoomStage, RoomMetadata } from "./components/RoomStage";
import { HostConsole } from "./components/HostConsole";
import { AdmissionConsole } from "./components/AdmissionConsole";
import { ScheduledConsole } from "./components/ScheduledConsole";
import { PostShowConsole } from "./components/PostShowConsole";

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
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Determine if current user is the host/owner of this room
  const isHost = Boolean(
    room?.access?.isOwner ||
    (context.user && room?.host?.id && String(room.host.id).toLowerCase() === String(context.user.id).toLowerCase()) ||
    (context.user && (room as any)?.owner_id && String((room as any).owner_id).toLowerCase() === String(context.user.id).toLowerCase()) ||
    (context.user && room?.host?.username && context.user.user_metadata?.username && room.host.username.toLowerCase() === context.user.user_metadata.username.toLowerCase()) ||
    (context.user && room?.host?.displayName && context.displayName && room.host.displayName.toLowerCase() === context.displayName.toLowerCase()) ||
    (context.user && room?.host?.displayName && context.profile?.display_name && room.host.displayName.toLowerCase() === context.profile.display_name.toLowerCase()) ||
    (context.user && room?.host?.username && context.profile?.username && room.host.username.toLowerCase() === context.profile.username.toLowerCase())
  );

  // Determine Derived Admission Requirement (Guests only; host always bypasses)
  const admissionRequirement: "none" | "passcode" | "authentication" = useMemo(() => {
    if (isHost) return "none";
    if (room?.access?.requiresAuthentication && !context.user) return "authentication";
    if (room?.access?.requiresPasscode) return "passcode";
    return "none";
  }, [isHost, room?.access, context.user]);

  // Canonical Session Duration Label
  const canonicalDuration = useMemo(() => {
    if (!room) return "";
    if (room.durationMinutes && room.durationMinutes > 0) {
      const h = Math.floor(room.durationMinutes / 60);
      const m = room.durationMinutes % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }
    if (room.startsAt && (room.endedAt || room.expiresAt)) {
      return calculateRoomDuration(room.startsAt, room.endedAt, room.expiresAt);
    }
    return "";
  }, [room]);

  useEffect(() => {
    fetchMetadata();
  }, [roomId, context.user?.id]);

  // Scheduled countdown timer
  useEffect(() => {
    if (!room || room.status !== "scheduled" || !room.startsAt) return;

    const interval = setInterval(() => {
      const start = new Date(room.startsAt!).getTime();
      const now = Date.now();
      const diff = start - now;

      if (diff <= 0) {
        setTimeRemaining("00:00:00");
        clearInterval(interval);
        // Refresh metadata when scheduled start time is reached
        fetchMetadata();
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [room]);

  const fetchMetadata = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionData = await safeGetSession(1000).catch(() => null);
      const token = sessionData?.data?.session?.access_token;
      const uid = sessionData?.data?.session?.user?.id || context.user?.id;

      const candidatesToTry = [
        serverPath,
        ...serverCandidates.filter((c: string) => c !== serverPath),
      ];
      let res: Response | undefined;
      for (let i = 0; i < candidatesToTry.length; i++) {
        const candidate = candidatesToTry[i];
        try {
          const queryStr = uid ? `?uid=${encodeURIComponent(uid)}` : "";
          const attempt = await fetch(`${candidate}/api/room/metadata/${roomId}${queryStr}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const contentType = attempt.headers.get("content-type") || "";
          if (attempt.ok || attempt.status === 404 || contentType.includes("application/json")) {
            res = attempt;
            if (candidate !== serverPath) {
              setServerPath(candidate);
            }
            break;
          }
        } catch {
          // Continue to next server candidate
        }
      }

      if (!res) {
        setError("Network error. Unable to connect to screening server.");
        return;
      }
      if (!res.ok) {
        if (res.status === 404) {
          setError("Room not found. This watch party may have been removed.");
        } else if (res.status === 503) {
          setError("Screening server is temporarily unavailable. Please try again shortly.");
        } else {
          setError("Failed to load room details.");
        }
        return;
      }
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
      } else {
        setError("Invalid screening room metadata.");
      }
    } catch (e) {
      console.error("fetchMetadata error:", e);
      setError("Network error. Unable to reach server.");
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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          roomId,
          passcode: isHost ? "" : (providedPasscode !== undefined ? providedPasscode : passcode),
          uid: context.user?.id,
          token: token,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 503 || data.error === "ADMISSION_SERVICE_UNAVAILABLE") {
          setError("Room access is temporarily unavailable. Please try again shortly.");
        } else if (data.error === "INVALID_PASSCODE") {
          setError("Incorrect passcode.");
        } else if (data.error === "RATE_LIMIT_EXCEEDED") {
          setError("Too many attempts. Try again later.");
        } else if (data.error === "PASSCODE_REQUIRED") {
          setError("This room requires a passcode.");
        } else {
          setError("Access denied.");
        }
        setSubmitting(false);
        return;
      }

      // Success - save token and navigate to watch room
      if (data.admissionToken) {
        window.sessionStorage.setItem(`admissionToken_${roomId}`, data.admissionToken);
        history.replace(`/watch/${roomId}`);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to verify admission. Please try again.");
      setSubmitting(false);
    }
  };

  const handleJoinClicked = () => {
    if (isHost || admissionRequirement === "none") {
      requestAdmission();
    }
  };

  const handleStartWatchParty = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const sessionData = await safeGetSession(1000);
      const token = sessionData?.data?.session?.access_token;
      const uid = sessionData?.data?.session?.user?.id || context.user?.id;

      // Start the room lifecycle authoritatively before entering the room
      const startRes = await fetch(`${serverPath}/startRoom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          roomId,
          uid,
          token,
        }),
      });

      if (!startRes.ok) {
        const startData = await startRes.json().catch(() => null);
        throw new Error(startData?.error || "Failed to start room.");
      }

      await requestAdmission();
    } catch (err: any) {
      console.error("handleStartWatchParty error:", err);
      setError(err.message || "Failed to start watch party.");
      setSubmitting(false);
    }
  };

  const handleStartEarly = async () => {
    await handleStartWatchParty();
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    }).catch(console.error);
  };

  const navigateToLogin = () => {
    history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
  };

  const navigateToSignup = () => {
    history.push(`/signup?redirect=${encodeURIComponent(location.pathname)}`);
  };

  // Cinematic Loading State
  if (loading) {
    return (
      <>
        <TopBar hideNewRoom={true} />
        <div className={styles.statusScreenContainer}>
          <div className={styles.ambientGlowContainer}>
            <div className={styles.ambientGlowLeft} />
            <div className={styles.ambientGlowRight} />
          </div>
          <Loader color="violet" size="lg" />
        </div>
      </>
    );
  }

  // Cinematic Error / Unavailable Screen
  if (error && !room) {
    return (
      <>
        <TopBar hideNewRoom={true} />
        <div className={styles.statusScreenContainer}>
          <div className={styles.ambientGlowContainer}>
            <div className={styles.ambientGlowLeft} />
            <div className={styles.ambientGlowRight} />
          </div>
          <IconMovieOff size={48} color="#94a3b8" stroke={1.5} />
          <h1 className={styles.statusScreenTitle}>Screening Unavailable</h1>
          <p className={styles.statusScreenMessage}>{error}</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Button onClick={fetchMetadata} variant="filled" color="violet" size="md">
              Try Again
            </Button>
            <Button
              onClick={() => history.push(context.user ? "/myrooms" : "/")}
              variant="light"
              color="gray"
              size="md"
              leftSection={<IconArrowLeft size={16} />}
            >
              {context.user ? "Back to My Rooms" : "Return Home"}
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (!room) return null;

  const isTerminal =
    room.status === "ended" ||
    room.status === "expired" ||
    room.status === "cancelled";

  return (
    <>
      <TopBar hideNewRoom={true} />
      <Announce page="join" />
      <div className={styles.lobbyContainer}>
        {/* Ambient Theater Lighting */}
        <div className={styles.ambientGlowContainer}>
          <div className={styles.ambientGlowLeft} />
          <div className={styles.ambientGlowRight} />
        </div>

        <div className={styles.lobbyGrid}>
          {/* Left: Immersive Room Stage (Direct visual surface, no card) */}
          <RoomStage
            room={room}
            isHost={isHost}
            durationLabel={canonicalDuration}
          />

          {/* Right: Purpose-Built Command / Admission Console */}
          {isTerminal ? (
            <PostShowConsole
              status={room.status as "ended" | "expired" | "cancelled"}
              startedAt={room.startedAt || room.startsAt}
              endedAt={room.endedAt}
              durationLabel={canonicalDuration}
              isHost={isHost}
              roomId={roomId}
              onNavigateHome={() => history.push(context.user ? "/myrooms" : "/")}
              onNavigateNewRoom={() => history.push("/room/new")}
            />
          ) : room.status === "scheduled" ? (
            <ScheduledConsole
              roomId={roomId}
              isHost={isHost}
              scheduledStartsAt={room.startsAt || ""}
              timeRemaining={timeRemaining}
              submitting={submitting}
              onStartEarly={handleStartEarly}
              onCopyInvite={handleCopyInviteLink}
              copiedInvite={copiedInvite}
              error={error}
            />
          ) : isHost ? (
            <HostConsole
              roomId={roomId}
              roomTitle={room.title}
              roomStatus={room.status}
              durationMinutes={room.durationMinutes}
              durationLabel={canonicalDuration}
              isPermanent={!room.durationMinutes || room.durationMinutes <= 0}
              submitting={submitting}
              onStartWatchParty={handleStartWatchParty}
              onEnterActiveRoom={handleJoinClicked}
              onCopyInvite={handleCopyInviteLink}
              copiedInvite={copiedInvite}
              isWaitingLoungeEnabled={room.access?.isWaitingLoungeEnabled ?? false}
              error={error}
            />
          ) : (
            <AdmissionConsole
              roomId={roomId}
              requirement={admissionRequirement}
              passcode={passcode}
              onPasscodeChange={setPasscode}
              onSubmit={() => requestAdmission()}
              submitting={submitting}
              error={error}
              isWaitingLoungeEnabled={room.access?.isWaitingLoungeEnabled ?? false}
              onNavigateLogin={navigateToLogin}
              onNavigateSignup={navigateToSignup}
            />
          )}
        </div>
      </div>
    </>
  );
}
