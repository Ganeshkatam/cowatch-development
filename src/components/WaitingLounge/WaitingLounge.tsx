import React from "react";
import {
  IconMovie,
  IconClock,
  IconInfoCircle,
  IconUserX,
  IconLogout,
  IconDoorExit,
} from "@tabler/icons-react";
import { getDefaultPicture, getColorForStringHex } from "../../utils/utils";
import styles from "./WaitingLounge.module.css";

interface WaitingLoungeProps {
  state: WaitingLoungeState;
  roomId: string;
  roomTitle?: string;
  onLeave: () => void;
}

export const WaitingLounge: React.FC<WaitingLoungeProps> = ({
  state,
  roomId,
  roomTitle,
  onLeave,
}) => {
  const hostName = state.host?.name || "Host";
  const hostPicture =
    state.host?.picture ||
    getDefaultPicture(hostName, getColorForStringHex(hostName));
  const isHostOnline = Boolean(state.host?.online);

  if (state.rejected) {
    return (
      <div className={styles.loungeContainer}>
        <div className={styles.loungeCard}>
          <div className={styles.glowTopBar} style={{ background: "#EF4444" }} />
          
          <div className={styles.brandHeader}>
            <img src="/logo192.png" alt="CoWatch" className={styles.brandLogo} />
            <span className={styles.brandName}>CoWatch Lounge</span>
          </div>

          <div className={styles.rejectedIconCenter}>
            <IconUserX size={34} stroke={1.75} />
          </div>

          <h1 className={styles.rejectedTitle}>Admission Declined</h1>
          
          {roomTitle && (
            <div className={styles.roomTag}>
              <IconMovie size={14} color="#A78BFA" />
              <span>{roomTitle}</span>
            </div>
          )}

          <p className={styles.subtitle}>
            The room host was unable to let you into this session. You may return to the main dashboard or check with the room organizer.
          </p>

          <button
            type="button"
            className={styles.returnHomeButton}
            onClick={() => {
              window.location.href = "/home";
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loungeContainer}>
      <div className={styles.loungeCard}>
        <div className={styles.glowTopBar} />

        <div className={styles.brandHeader}>
          <img src="/logo192.png" alt="CoWatch" className={styles.brandLogo} />
          <span className={styles.brandName}>CoWatch</span>
        </div>

        <div className={styles.radarContainer}>
          <div className={styles.radarPulse1} />
          <div className={styles.radarPulse2} />
          <div className={styles.radarPulse3} />
          <div className={styles.radarCenter}>
            <IconClock size={28} stroke={1.75} />
          </div>
        </div>

        <h1 className={styles.title}>Waiting Lounge</h1>

        {roomTitle ? (
          <div className={styles.roomTag}>
            <IconMovie size={14} color="#A78BFA" />
            <span>{roomTitle}</span>
          </div>
        ) : (
          <div className={styles.roomTag}>
            <span>Room: {roomId}</span>
          </div>
        )}

        <p className={styles.subtitle}>
          The host has been notified of your arrival. You will enter automatically as soon as your admission is approved.
        </p>

        <div className={styles.bentoGrid}>
          <div className={`${styles.bentoTile} ${styles.bentoTileFull}`}>
            <img
              src={hostPicture}
              alt={hostName}
              className={styles.hostAvatar}
              onError={(e) => {
                const target = e.currentTarget;
                const fallback = getDefaultPicture(
                  hostName,
                  getColorForStringHex(hostName)
                );
                if (target.src !== fallback) {
                  target.src = fallback;
                }
              }}
            />
            <div className={styles.hostMeta}>
              <span className={styles.hostName}>{hostName}</span>
              <div className={styles.hostStatus}>
                <span
                  className={`${styles.statusDot} ${
                    isHostOnline ? styles.statusDotOnline : styles.statusDotOffline
                  }`}
                />
                <span>{isHostOnline ? "Host is present in room" : "Host is away"}</span>
              </div>
            </div>
          </div>

          <div className={styles.bentoTile}>
            <div className={`${styles.bentoStat} ${styles.bentoStatHighlight}`}>
              #{state.position || 1}
            </div>
            <div className={styles.bentoLabel}>Your Position</div>
          </div>

          <div className={styles.bentoTile}>
            <div className={styles.bentoStat}>{state.waitingCount || 1}</div>
            <div className={styles.bentoLabel}>Waiting in Queue</div>
          </div>
        </div>

        <div className={styles.waitingTip}>
          <IconInfoCircle size={18} style={{ flexShrink: 0 }} />
          <span>Keep this window open. Media and chat will load instantly once admitted.</span>
        </div>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.leaveButton}
            onClick={onLeave}
          >
            Leave Lounge
          </button>
        </div>
      </div>
    </div>
  );
};
