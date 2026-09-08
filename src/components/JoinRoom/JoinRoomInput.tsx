import React, { useState, useEffect } from "react";
import { useHistory, Link } from "react-router-dom";
import { IconArrowRight, IconDeviceTv, IconX } from "@tabler/icons-react";
import styles from "./JoinRoomInput.module.css";
import { TopBar } from "../TopBar/TopBar";

export const extractRoomCode = (raw: string): string => {
  let cleaned = raw.trim();
  if (!cleaned) return "";

  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//i, "");

  // If there's a pathname, grab the last non-empty segment before query params or hash
  if (cleaned.includes("/")) {
    const withoutQuery = cleaned.split("?")[0].split("#")[0];
    const segments = withoutQuery.split("/").filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  }

  // Otherwise remove any query/hash/slashes
  return cleaned.split("?")[0].split("#")[0].replace(/^[/?#]+|[/?#]+$/g, "");
};

export const JoinRoomInput: React.FC = () => {
  const [roomCode, setRoomCode] = useState("");
  const history = useHistory();

  useEffect(() => {
    document.title = "Join Watch Party - CoWatch";
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = extractRoomCode(roomCode);
    if (sanitized) {
      history.push(`/join/${encodeURIComponent(sanitized)}`);
    }
  };

  return (
    <>
      <TopBar hideJoin />
      <div className={styles.container}>
        <div className={styles.ambientGlow} />
        <div className={styles.ambientGlowSecondary} />
        
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <IconDeviceTv size={32} stroke={1.75} />
          </div>
          
          <h1 className={styles.title}>Join Watch Party</h1>
          <p className={styles.subtitle}>
            Enter a room code or paste an invite link to jump directly into the session.
          </p>
          
          <form onSubmit={handleJoin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="roomCode" className={styles.label}>
                Room Code or Link
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="roomCode"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. movie-night or cowatch.app/join/..."
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
                {roomCode.trim() && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setRoomCode("")}
                    aria-label="Clear input"
                  >
                    <IconX size={16} />
                  </button>
                )}
              </div>
              <span className={styles.hintText}>
                Tip: You can paste the complete invitation link from your host.
              </span>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={!roomCode.trim()}
            >
              <span>Continue</span>
              <IconArrowRight size={18} stroke={2.5} />
            </button>
          </form>

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
