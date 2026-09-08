import React from "react";
import { Link } from "react-router-dom";
import { IconX, IconArrowRight, IconLayersLinked } from "@tabler/icons-react";
import { PublicAnnouncement, isValidActionUrl } from "./announcementTypes";
import styles from "./Announce.module.css";

interface AnnouncementBannerProps {
  announcement: PublicAnnouncement;
  onDismiss: (id: string) => void;
  onOpenDrawer?: () => void;
  totalCount?: number;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcement,
  onDismiss,
  onOpenDrawer,
  totalCount = 1,
}) => {
  const isInternal =
    announcement.action_url &&
    announcement.action_url.startsWith("/") &&
    !announcement.action_url.startsWith("//");

  const isSafeUrl = isValidActionUrl(announcement.action_url);

  const renderBadge = () => {
    switch (announcement.type) {
      case "feature":
        return <span className={styles.badgeFeature}>✦ NEW</span>;
      case "important":
        return <span className={styles.badgeImportant}>ALERT</span>;
      case "maintenance":
        return <span className={styles.badgeMaintenance}>MAINTENANCE</span>;
      case "info":
      default:
        return <span className={styles.badgeInfo}>NOTICE</span>;
    }
  };

  return (
    <div className={styles.bannerSurface} role="region" aria-label="Announcement">
      <div className={styles.bannerContent}>
        {/* Left: Badge, Title, Message */}
        <div className={styles.bannerTextGroup}>
          {renderBadge()}
          <span className={styles.bannerTitle}>{announcement.title}</span>
          <span className={styles.bannerSeparator}>•</span>
          <span className={styles.bannerMessage}>{announcement.message}</span>
        </div>

        {/* Right: Actions, Multi-count, Dismiss */}
        <div className={styles.bannerActionGroup}>
          {isSafeUrl && announcement.action_label && (
            isInternal ? (
              <Link to={announcement.action_url!} className={styles.actionBtn}>
                <span>{announcement.action_label}</span>
                <IconArrowRight size={13} stroke={2.5} />
              </Link>
            ) : (
              <a
                href={announcement.action_url!}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtn}
              >
                <span>{announcement.action_label}</span>
                <IconArrowRight size={13} stroke={2.5} />
              </a>
            )
          )}

          {totalCount > 1 && onOpenDrawer && (
            <button
              type="button"
              onClick={onOpenDrawer}
              className={styles.viewAllBtn}
              title="View all active announcements"
            >
              <span>View all ({totalCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDismiss(announcement.id)}
            className={styles.dismissBtn}
            aria-label="Dismiss announcement"
            title="Dismiss"
          >
            <IconX size={15} stroke={2} />
          </button>
        </div>
      </div>
    </div>
  );
};
