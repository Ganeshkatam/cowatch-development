import React, { useState, useEffect, useRef } from "react";
import { useHistory, Link } from "react-router-dom";
import { Loader } from "@mantine/core";
import { IconArrowRight, IconDeviceTv, IconX, IconLock, IconKey } from "@tabler/icons-react";
import styles from "./JoinRoomInput.module.css";
import { TopBar } from "../TopBar/TopBar";
import { Announce } from "../Announce/Announce";
import { serverPath, setServerPath, serverCandidates } from "../../utils/utils";
import { safeGetSession } from "../../utils/supabaseClient";

export interface ParsedRoomInput {
  roomId: string;
  passcode?: string;
  invite?: string;
}

export const parseRoomInput = (raw: string): ParsedRoomInput => {
  let cleaned = raw.trim();
  if (!cleaned) return { roomId: "" };

  let passcode: string | undefined;
  let invite: string | undefined;

  // Extract query parameters if present
  if (cleaned.includes("?")) {
    const queryPart = cleaned.split("?")[1].split("#")[0];
    const params = new URLSearchParams(queryPart);
    passcode = params.get("passcode") || params.get("password") || undefined;
    invite = params.get("invite") || params.get("inviteToken") || undefined;
  }

  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//i, "");

  // Remove query and hash from path
  const pathWithoutQuery = cleaned.split("?")[0].split("#")[0];

  // If there's a pathname, parse segments
  if (pathWithoutQuery.includes("/")) {
    const segments = pathWithoutQuery.split("/").filter(Boolean);
    // Look for segment directly after 'watch' or 'join'
    const keywordIdx = segments.findIndex((s) => s.toLowerCase() === "watch" || s.toLowerCase() === "join");
    if (keywordIdx !== -1 && segments[keywordIdx + 1]) {
      return {
        roomId: segments[keywordIdx + 1].replace(/^[/?#]+|[/?#]+$/g, ""),
        passcode,
        invite,
      };
    }
    // Otherwise take the last segment
    if (segments.length > 0) {
      return {
        roomId: segments[segments.length - 1].replace(/^[/?#]+|[/?#]+$/g, ""),
        passcode,
        invite,
      };
    }
  }

  return {
    roomId: pathWithoutQuery.replace(/^[/?#]+|[/?#]+$/g, ""),
    passcode,
    invite,
  };
};

export const extractRoomCode = (raw: string): string => {
  return parseRoomInput(raw).roomId;
};

export const JoinRoomInput: React.FC = () => {
  const [roomInput, setRoomInput] = useState("");
  const [passcode, setPasscode] = useState("");
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [inviteToken, setInviteToken] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passcodeInputRef = useRef<HTMLInputElement>(null);
  const history = useHistory();

  useEffect(() => {
    document.title = "Join Watch Party - CoWatch";
  }, []);

  useEffect(() => {
    if (requiresPasscode && passcodeInputRef.current) {
      passcodeInputRef.current.focus();
    }
  }, [requiresPasscode]);

  const attemptDirectJoin = async (targetRoomId: string, providedPasscode?: string, queryInvite?: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const sessionData = await safeGetSession(1000);
      const token = sessionData?.data?.session?.access_token;
      const uid = sessionData?.data?.session?.user?.id;

      const candidatesToTry = [
        serverPath,
        ...serverCandidates.filter((c: string) => c !== serverPath),
      ];

      let res: Response | undefined;
      for (let i = 0; i < candidatesToTry.length; i++) {
        const candidate = candidatesToTry[i];
        try {
          const attempt = await fetch(`${candidate}/api/room/verifyPasscode`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId: targetRoomId,
              passcode: providedPasscode || "",
              uid,
              token,
            }),
          });
          const contentType = attempt.headers.get("content-type") || "";
          if (attempt.ok || attempt.status === 403 || attempt.status === 404 || contentType.includes("application/json")) {
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
        setError("Network error. Unable to reach backend server.");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.admissionToken) {
        // Direct admission successful
        window.sessionStorage.setItem(`admissionToken_${targetRoomId}`, data.admissionToken);
        const queryParams = new URLSearchParams();
        if (queryInvite || inviteToken) {
          queryParams.set("invite", (queryInvite || inviteToken)!);
        }
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
        history.push(`/watch/${encodeURIComponent(targetRoomId)}${queryString}`);
        return;
      }

      if (data.error === "PASSCODE_REQUIRED") {
        setRequiresPasscode(true);
        setActiveRoomId(targetRoomId);
        if (queryInvite) setInviteToken(queryInvite);
        setError(null);
        return;
      }

      if (data.error === "INVALID_PASSCODE") {
        setRequiresPasscode(true);
        setActiveRoomId(targetRoomId);
        if (queryInvite) setInviteToken(queryInvite);
        setError("Incorrect passcode. Please check and try again.");
        return;
      }

      if (data.error === "ROOM_NOT_FOUND" || res.status === 404) {
        setError("Room not found. Please verify the room code or link.");
        return;
      }

      if (data.error === "ROOM_SCHEDULED") {
        setError("This room is scheduled for a future time and has not started yet.");
        return;
      }

      if (data.error === "ROOM_ENDED") {
        history.push(`/join/${encodeURIComponent(targetRoomId)}`);
        return;
      }

      if (data.error === "RATE_LIMIT_EXCEEDED" || res.status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
        return;
      }

      setError(data.error || "Failed to join room. Please try again.");
    } catch (e) {
      console.error("Join direct error:", e);
      setError("Network error. Please check your internet connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseRoomInput(roomInput);
    if (!parsed.roomId) {
      setError("Please enter a valid room code or link.");
      return;
    }

    const cleanRoomId = parsed.roomId.startsWith("/") ? parsed.roomId.substring(1) : parsed.roomId;
    if (parsed.invite) {
      setInviteToken(parsed.invite);
    }

    // Attempt direct join with any passcode extracted from the URL
    void attemptDirectJoin(cleanRoomId, parsed.passcode, parsed.invite);
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Please enter the room passcode.");
      return;
    }
    void attemptDirectJoin(activeRoomId, passcode.trim(), inviteToken);
  };

  const handleResetToCodeInput = () => {
    setRequiresPasscode(false);
    setPasscode("");
    setError(null);
  };

  return (
    <>
      <TopBar />
      <Announce page="join" />
      <div className={styles.container}>
        <div className={styles.ambientGlow} />
        <div className={styles.ambientGlowSecondary} />

        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            {requiresPasscode ? (
              <IconLock size={32} stroke={1.75} />
            ) : (
              <IconDeviceTv size={32} stroke={1.75} />
            )}
          </div>

          <h1 className={styles.title}>
            {requiresPasscode ? "Passcode Required" : "Join Watch Party"}
          </h1>
          <p className={styles.subtitle}>
            {requiresPasscode
              ? "This room is protected. Enter the passcode provided by your host to jump into the room."
              : "Enter a room code or paste an invite link to jump directly into the session."}
          </p>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {!requiresPasscode ? (
            <form onSubmit={handleInitialSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="roomCode" className={styles.label}>
                  Room Code or Link
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="roomCode"
                    type="text"
                    className={styles.input}
                    placeholder="e.g. movie-night or cowatch-dev.vercel.app/watch/..."
                    value={roomInput}
                    onChange={(e) => {
                      setRoomInput(e.target.value);
                      if (error) setError(null);
                    }}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    disabled={submitting}
                  />
                  {roomInput.trim() && !submitting && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => setRoomInput("")}
                      aria-label="Clear input"
                    >
                      <IconX size={16} />
                    </button>
                  )}
                </div>
                <span className={styles.hintText}>
                  Tip: You can paste any room link or type the room ID directly.
                </span>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!roomInput.trim() || submitting}
              >
                {submitting ? (
                  <Loader size="xs" color="white" />
                ) : (
                  <>
                    <span>Join Room</span>
                    <IconArrowRight size={18} stroke={2.5} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasscodeSubmit} className={styles.form}>
              <div className={styles.roomCodeBadge}>
                <IconKey size={13} stroke={2} />
                <span>Room: {activeRoomId}</span>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="passcode" className={styles.label}>
                  Passcode
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="passcode"
                    ref={passcodeInputRef}
                    type="password"
                    className={styles.input}
                    placeholder="Enter room passcode"
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      if (error) setError(null);
                    }}
                    autoComplete="current-password"
                    disabled={submitting}
                  />
                  {passcode && !submitting && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => setPasscode("")}
                      aria-label="Clear passcode"
                    >
                      <IconX size={16} />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!passcode.trim() || submitting}
              >
                {submitting ? (
                  <Loader size="xs" color="white" />
                ) : (
                  <>
                    <span>Enter Watch Party</span>
                    <IconArrowRight size={18} stroke={2.5} />
                  </>
                )}
              </button>

              <button
                type="button"
                className={styles.changeCodeBtn}
                onClick={handleResetToCodeInput}
                disabled={submitting}
              >
                Enter a different room code
              </button>
            </form>
          )}

          <div className={styles.footerNote}>
            <span>Want to host instead?</span>{" "}
            <Link to="/room/new" className={styles.footerLink}>
              Create a new room
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
