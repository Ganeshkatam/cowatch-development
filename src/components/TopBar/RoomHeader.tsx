import React, { useState } from "react";
import { Link } from "react-router-dom";
import { IconAdjustments, IconCheck, IconChevronDown, IconCopy, IconCrown, IconLock, IconLockOpen, IconSettings, IconUsers, IconX } from "@tabler/icons-react";
import { Menu, Tooltip } from "@mantine/core";
import { SignInButton } from "./TopBar";
import { HeaderSearchBar } from "./HeaderSearchBar";
import { WaitingParticipantsPopover } from "../WaitingLounge/WaitingParticipantsPopover";
import styles from "./RoomHeader.module.css";

interface RoomHeaderProps {
  roomTitle: string;
  roomStatus?: string;
  participantCount?: number;
  currentTab?: string;
  onSelectTab?: (tab: "people" | "chat") => void;
  onOpenSettings: () => void;
  onExit: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  haveLock?: boolean;
  currentMedia?: string;
  mediaDisplayName?: string;
  onOpenQuickAdd?: () => void;
  roomSetMedia?: (value: string) => void;
  playlistAdd?: (value: string) => void;
  mediaPath?: string;
  waitingList?: WaitingGuest[];
  onAdmitAll?: () => void;
  onAdmitUser?: (clientId: string) => void;
  onDeclineUser?: (clientId: string) => void;
  isOwner?: boolean;
  onLogoClick?: () => void;
  onOpenInvite?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomTitle,
  roomStatus,
  participantCount,
  currentTab,
  onSelectTab,
  onOpenSettings,
  onExit,
  isLocked,
  onToggleLock,
  haveLock,
  currentMedia,
  mediaDisplayName,
  onOpenQuickAdd,
  roomSetMedia,
  playlistAdd,
  mediaPath,
  waitingList,
  onAdmitAll,
  onAdmitUser,
  onDeclineUser,
  isOwner,
  onLogoClick,
  onOpenInvite,
}) => {
  const [copied, setCopied] = useState(false);
  const isRoomActive = roomStatus === "active" || roomStatus === "expiring";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const renderStatusBadge = () => {
    if (!roomStatus) return null;
    const status = roomStatus;
    if (status === "active") return <div className={`${styles.roomStatusBadge} ${styles.statusLive}`}><div className={styles.dot} /> LIVE</div>;
    if (status === "waiting" || status === "scheduled") return <div className={`${styles.roomStatusBadge} ${styles.statusWaiting}`}>WAITING</div>;
    if (status === "ended" || status === "expired") return <div className={`${styles.roomStatusBadge} ${styles.statusEnded}`}>{status.toUpperCase()}</div>;
    if (status === "cancelled") return <div className={`${styles.roomStatusBadge} ${styles.statusCancelled}`}>CANCELLED</div>;
    return null;
  };

  const roomIdentity = (
    <div className={styles.roomIdentity}>
      <div className={styles.roomTitleRow}>
        {renderStatusBadge()}
        {isOwner && (
          <span className={styles.hostBadge}>
            <IconCrown size={12} stroke={2.5} />
            <span>Host</span>
          </span>
        )}
        <span className={styles.roomTitle} title={roomTitle || "Watch Party Room"}>
          {roomTitle || "Watch Party Room"}
        </span>
      </div>
      <Tooltip
        label={currentMedia ? `Now Playing: ${mediaDisplayName || currentMedia} (Click to change)` : "Nothing playing (Click to add media)"}
        position="bottom"
        openDelay={300}
      >
        <button
          type="button"
          className={styles.nowPlayingSubtitle}
          onClick={onOpenQuickAdd}
          title={currentMedia ? `Playing: ${mediaDisplayName || currentMedia}` : "Add something to play"}
        >
          <span className={currentMedia ? styles.playingDot : styles.idleDot} />
          <span className={styles.nowPlayingSubtitleLabel}>{currentMedia ? "Playing" : "Nothing playing"}</span>
          {currentMedia && <span className={styles.nowPlayingSubtitleTitle}>{mediaDisplayName || currentMedia}</span>}
        </button>
      </Tooltip>
    </div>
  );

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {onLogoClick ? (
          <button type="button" className={styles.logoLink} onClick={onLogoClick} title="Exit to Home">
            <img src="/logo192.png" alt="CoWatch" className={styles.logoImg} />
            <span className={styles.logoText}>CoWatch</span>
          </button>
        ) : (
          <Link to="/" className={styles.logoLink} title="Exit to Home">
            <img src="/logo192.png" alt="CoWatch" className={styles.logoImg} />
            <span className={styles.logoText}>CoWatch</span>
          </Link>
        )}

        <div className={styles.divider} aria-hidden="true" />

        {roomIdentity}
      </div>

      <div className={styles.centerSection}>
        {roomSetMedia && playlistAdd && (
          <div className={styles.searchSection}>
            <HeaderSearchBar roomSetMedia={roomSetMedia} playlistAdd={playlistAdd} mediaPath={mediaPath} disabled={!haveLock} />
          </div>
        )}
      </div>

      <div className={styles.rightSection}>
        {onOpenInvite ? (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onOpenInvite}
            title="Invite friends"
            aria-label="Invite friends"
          >
            <IconUsers size={15} stroke={1.8} />
            <span className={styles.actionBtnLabel}>Invite</span>
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.actionBtn} ${copied ? styles.actionBtnCopied : ""}`}
            onClick={handleCopyLink}
            title={copied ? "Invite link copied to clipboard!" : "Copy room invite link"}
            aria-label="Copy room invite link"
          >
            {copied ? <IconCheck size={15} stroke={2.5} /> : <IconCopy size={15} stroke={1.8} />}
            <span className={styles.actionBtnLabel}>{copied ? "Copied" : "Invite"}</span>
          </button>
        )}

        {isOwner && waitingList && waitingList.length > 0 && (
          <WaitingParticipantsPopover waitingList={waitingList} onAdmitUser={onAdmitUser} onDeclineUser={onDeclineUser} onAdmitAll={onAdmitAll} position="bottom-end">
            <button type="button" className={styles.waitingHeaderBtn} title={`${waitingList.length} guest(s) waiting in lounge - Click to review`}>
              <div className={styles.waitingHeaderDot} />
              <IconUsers size={15} stroke={2} />
              <span className={styles.waitingHeaderCount}>{waitingList.length}</span>
            </button>
          </WaitingParticipantsPopover>
        )}

        <Menu shadow="xl" width={220} position="bottom-end" offset={8}>
          <Menu.Target>
            <button
              type="button"
              className={styles.iconOnlyBtn}
              onClick={onOpenSettings}
              aria-label={isRoomActive ? "Preferences" : "Room settings"}
              title={isRoomActive ? "Preferences" : "Room settings"}
            >
              <IconSettings size={17} stroke={1.6} />
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{isOwner ? "Host Controls" : "Room"}</Menu.Label>
            <Menu.Item leftSection={<IconSettings size={16} />} onClick={onOpenSettings}>
              {isRoomActive ? "Preferences" : "Room settings"}
            </Menu.Item>
            {isOwner && (
              <Menu.Item leftSection={<IconAdjustments size={16} />} onClick={() => {
                const cleanId = window.location.pathname.replace(/^\/watch\//, "");
                window.open(`/myrooms/${cleanId}`, "_blank");
              }}>
                {isRoomActive ? "View in Dashboard" : "Manage in Dashboard"}
              </Menu.Item>
            )}
            <Menu.Item leftSection={copied ? <IconCheck size={16} color="var(--color-live)" /> : <IconCopy size={16} />} onClick={handleCopyLink}>
              {copied ? "Link Copied!" : "Copy invite link"}
            </Menu.Item>
            {onToggleLock && (
              <Menu.Item disabled={!haveLock} leftSection={isLocked ? <IconLock size={16} color="var(--color-warning)" /> : <IconLockOpen size={16} />} onClick={onToggleLock}>
                {isLocked ? "Unlock room controls" : "Lock room controls"}
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconX size={16} />} onClick={onExit}>{isOwner ? "Exit Room Session" : "Leave room"}</Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <SignInButton />
      </div>
    </header>
  );
};
