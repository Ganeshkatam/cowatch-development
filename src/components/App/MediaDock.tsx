import React from "react";
import {
  IconBrowser,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconDots,
  IconFile,
  IconLink,
  IconList,
  IconLock,
  IconLockOpen,
  IconMaximize,
  IconMinimize,
  IconPlus,
  IconScreenShare,
  IconX,
} from "@tabler/icons-react";
import { Menu } from "@mantine/core";
import ChatVideoCard from "../ChatVideoCard/ChatVideoCard";
import styles from "./MediaDock.module.css";
import { findPlaylistVideoByUrl } from "../../../server/utils/playlist";

interface MediaDockProps {
  isVBrowserEnabled?: boolean;
  haveLock: boolean;
  onOpenScreenShare: () => void;
  onOpenVBrowser: () => void;
  onOpenFileShare: () => void;
  onOpenQuickAdd: () => void;
  playlist: PlaylistVideo[];
  onPlayPlaylistItem: (index: number) => void;
  onDeletePlaylistItem: (index: number) => void;
  onMovePlaylistItem: (from: number, to: number) => void;
  roomMedia?: string;
  onStopMedia?: () => void;
  isScreenSharing?: boolean;
  onStopScreenShare?: () => void;
  isPlayingVBrowser?: boolean;
  onStopVBrowser?: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  paused?: boolean;
}

export const MediaDock: React.FC<MediaDockProps> = ({
  isVBrowserEnabled,
  haveLock,
  onOpenScreenShare,
  onOpenVBrowser,
  onOpenFileShare,
  onOpenQuickAdd,
  playlist,
  onPlayPlaylistItem,
  onDeletePlaylistItem,
  onMovePlaylistItem,
  roomMedia,
  onStopMedia,
  isScreenSharing,
  onStopScreenShare,
  isPlayingVBrowser,
  onStopVBrowser,
  isLocked,
  onToggleLock,
  isFullScreen,
  onToggleFullScreen,
  paused = false,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [openMenus, setOpenMenus] = React.useState(0);
  const isPlaying = Boolean(roomMedia) && !paused;

  // Collapse while playing if media is loaded
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(
    Boolean(roomMedia) && !paused
  );

  const autoCollapseTimer = React.useRef<NodeJS.Timeout | null>(null);

  // When roomMedia or playback state changes
  React.useEffect(() => {
    if (!roomMedia) {
      setIsCollapsed(false);
      return;
    }
    if (isPlaying) {
      setIsCollapsed(true);
    }
  }, [isPlaying, Boolean(roomMedia)]);

  const clearTimer = React.useCallback(() => {
    if (autoCollapseTimer.current) {
      clearTimeout(autoCollapseTimer.current);
      autoCollapseTimer.current = null;
    }
  }, []);

  const scheduleAutoCollapse = React.useCallback(() => {
    clearTimer();
    if (isPlaying && openMenus === 0 && !isCollapsed) {
      autoCollapseTimer.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 3500);
    }
  }, [isPlaying, openMenus, isCollapsed, clearTimer]);

  React.useEffect(() => {
    if (!isCollapsed && isPlaying && openMenus === 0) {
      scheduleAutoCollapse();
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isCollapsed, isPlaying, openMenus, scheduleAutoCollapse, clearTimer]);

  const handleMenuOpen = () => {
    setOpenMenus((c) => c + 1);
    clearTimer();
  };

  const handleMenuClose = () => {
    setOpenMenus((c) => Math.max(0, c - 1));
    scheduleAutoCollapse();
  };

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (Boolean(roomMedia) && isCollapsed) {
    return (
      <button
        type="button"
        className={styles.collapsedPill}
        onClick={() => setIsCollapsed(false)}
        title="Show media dock"
      >
        <IconChevronUp size={14} stroke={2.5} />
        <span>Media</span>
      </button>
    );
  }

  return (
    <div
      className={styles.dockContainer}
      onMouseEnter={clearTimer}
      onMouseLeave={scheduleAutoCollapse}
    >
      {/* Prioritized single stop button (VBrowser > ScreenShare > Standard Media) */}
      {isPlayingVBrowser && onStopVBrowser ? (
        <button
          type="button"
          className={styles.stopBtn}
          onClick={onStopVBrowser}
          disabled={!haveLock}
          title="Stop Virtual Browser"
        >
          <IconX size={15} />
          <span>Stop VBrowser</span>
        </button>
      ) : isScreenSharing && onStopScreenShare ? (
        <button
          type="button"
          className={styles.stopBtn}
          onClick={onStopScreenShare}
          title="Stop Screenshare"
        >
          <IconX size={15} />
          <span>Stop Share</span>
        </button>
      ) : Boolean(roomMedia) && onStopMedia ? (
        <button
          type="button"
          className={styles.stopBtn}
          onClick={onStopMedia}
          disabled={!haveLock}
          title={
            haveLock
              ? "Stop playback and remove media"
              : "Controls locked by host"
          }
        >
          <IconX size={15} />
          <span>Stop playback</span>
        </button>
      ) : null}

      {/* Add Media Dropdown Menu */}
      <Menu
        shadow="xl"
        width={260}
        position="top-start"
        offset={10}
        onOpen={handleMenuOpen}
        onClose={handleMenuClose}
      >
        <Menu.Target>
          <button
            type="button"
            className={styles.addMediaBtn}
            disabled={!haveLock}
            title={haveLock ? "Add media to room" : "Controls locked by host"}
          >
            <IconPlus size={16} stroke={2.5} />
            <span>Add media</span>
            <IconChevronDown size={14} stroke={1.5} />
          </button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Add to watch party</Menu.Label>

          <Menu.Item
            leftSection={<IconScreenShare size={18} color="#60A5FA" />}
            onClick={onOpenScreenShare}
          >
            <div className={styles.menuItemWithDesc}>
              <span className={styles.menuItemTitle}>Share screen</span>
              <span className={styles.menuItemDesc}>Stream your screen or tab</span>
            </div>
          </Menu.Item>

          {isVBrowserEnabled && (
            <Menu.Item
              leftSection={<IconBrowser size={18} color="#34D399" />}
              onClick={onOpenVBrowser}
            >
              <div className={styles.menuItemWithDesc}>
                <span className={styles.menuItemTitle}>Browser</span>
                <span className={styles.menuItemDesc}>Browse the web together</span>
              </div>
            </Menu.Item>
          )}

          <Menu.Item
            leftSection={<IconFile size={18} color="#A78BFA" />}
            onClick={onOpenFileShare}
          >
            <div className={styles.menuItemWithDesc}>
              <span className={styles.menuItemTitle}>Upload file</span>
              <span className={styles.menuItemDesc}>Play a local video</span>
            </div>
          </Menu.Item>

          <Menu.Item
            leftSection={<IconLink size={18} color="#F472B6" />}
            onClick={onOpenQuickAdd}
          >
            <div className={styles.menuItemWithDesc}>
              <span className={styles.menuItemTitle}>Video URL / Search</span>
              <span className={styles.menuItemDesc}>Paste link or search media</span>
            </div>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Playlist Button & Dropdown */}
      <Menu
        shadow="xl"
        width={340}
        position="top"
        offset={10}
        onOpen={handleMenuOpen}
        onClose={handleMenuClose}
      >
        <Menu.Target>
          <button type="button" className={styles.dockBtn} title="View playlist">
            <IconList size={16} />
            <span>Playlist</span>
            <span className={styles.badge}>{playlist.length}</span>
          </button>
        </Menu.Target>
        <Menu.Dropdown
          style={{
            maxHeight: 380,
            overflowY: playlist.length > 0 ? "auto" : "visible",
          }}
        >
          <Menu.Label>Room Playlist ({playlist.length})</Menu.Label>
          {playlist.length === 0 && (
            <Menu.Item disabled>There are no items in the playlist.</Menu.Item>
          )}
          {playlist.map((item: PlaylistVideo, index: number) => {
            const videoItem = { ...item };
            if (Boolean(videoItem.img)) {
              videoItem.type = "youtube";
            }
            const isActive = roomMedia && findPlaylistVideoByUrl([videoItem], roomMedia) !== undefined;
            return (
              <Menu.Item 
                key={index} 
                closeMenuOnClick={false}
                className={isActive ? styles.activePlaylistItem : undefined}
              >
                <ChatVideoCard
                  video={videoItem}
                  index={index}
                  controls
                  onPlay={onPlayPlaylistItem}
                  onPlayNext={(idx) => onMovePlaylistItem(idx, 0)}
                  onRemove={onDeletePlaylistItem}
                  disabled={!haveLock}
                />
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>

      {/* More Options Menu */}
      <Menu
        shadow="xl"
        width={200}
        position="top-end"
        offset={10}
        onOpen={handleMenuOpen}
        onClose={handleMenuClose}
      >
        <Menu.Target>
          <button type="button" className={styles.iconBtn} title="More actions">
            <IconDots size={16} />
          </button>
        </Menu.Target>
        <Menu.Dropdown>
          {onToggleFullScreen && (
            <Menu.Item
              leftSection={
                isFullScreen ? (
                  <IconMinimize size={16} />
                ) : (
                  <IconMaximize size={16} />
                )
              }
              onClick={onToggleFullScreen}
            >
              {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
            </Menu.Item>
          )}
          {onToggleLock && (
            <Menu.Item
              disabled={!haveLock}
              leftSection={
                isLocked ? (
                  <IconLock size={16} color="var(--color-warning)" />
                ) : (
                  <IconLockOpen size={16} />
                )
              }
              onClick={onToggleLock}
            >
              {isLocked ? "Unlock controls" : "Lock controls"}
            </Menu.Item>
          )}
          <Menu.Item
            leftSection={
              copied ? (
                <IconCheck size={16} color="var(--color-live)" />
              ) : (
                <IconCopy size={16} />
              )
            }
            onClick={handleCopyLink}
          >
            {copied ? "Link Copied!" : "Copy room link"}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Collapse button when media is loaded */}
      {Boolean(roomMedia) && (
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={() => setIsCollapsed(true)}
          title="Collapse media dock"
        >
          <IconChevronDown size={16} stroke={2} />
        </button>
      )}
    </div>
  );
};
