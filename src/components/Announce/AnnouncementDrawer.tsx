import React from "react";
import { Drawer } from "@mantine/core";
import { Link } from "react-router-dom";
import { IconX, IconArrowRight } from "@tabler/icons-react";
import { PublicAnnouncement, isValidActionUrl } from "./announcementTypes";
import styles from "./Announce.module.css";

interface AnnouncementDrawerProps {
  opened: boolean;
  onClose: () => void;
  announcements: PublicAnnouncement[];
  onDismiss: (id: string) => void;
}

export const AnnouncementDrawer: React.FC<AnnouncementDrawerProps> = ({
  opened,
  onClose,
  announcements,
  onDismiss,
}) => {
  const renderBadge = (type: string) => {
    switch (type) {
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={<span className={styles.drawerTitle}>Announcements</span>}
      overlayProps={{ opacity: 0.6, blur: 4 }}
      classNames={{
        content: styles.drawerContent,
        header: styles.drawerHeader,
      }}
    >
      <div className={styles.drawerBody}>
        {announcements.length === 0 ? (
          <div className={styles.emptyNotice}>
            <span>No other active announcements.</span>
          </div>
        ) : (
          <div className={styles.announcementList}>
            {announcements.map((item) => {
              const isInternal =
                item.action_url &&
                item.action_url.startsWith("/") &&
                !item.action_url.startsWith("//");
              const isSafe = isValidActionUrl(item.action_url);

              return (
                <div key={item.id} className={styles.drawerItem}>
                  <div className={styles.drawerItemHeader}>
                    <div className={styles.drawerItemMeta}>
                      {renderBadge(item.type)}
                      <span className={styles.drawerItemDate}>
                        {formatDate(item.published_at)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismiss(item.id)}
                      className={styles.itemDismissBtn}
                      title="Dismiss"
                      aria-label="Dismiss this announcement"
                    >
                      <IconX size={14} />
                    </button>
                  </div>

                  <h3 className={styles.drawerItemTitle}>{item.title}</h3>
                  <p className={styles.drawerItemMessage}>{item.message}</p>

                  {isSafe && item.action_label && (
                    <div className={styles.drawerItemAction}>
                      {isInternal ? (
                        <Link
                          to={item.action_url!}
                          onClick={onClose}
                          className={styles.drawerActionBtn}
                        >
                          <span>{item.action_label}</span>
                          <IconArrowRight size={13} stroke={2.5} />
                        </Link>
                      ) : (
                        <a
                          href={item.action_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.drawerActionBtn}
                        >
                          <span>{item.action_label}</span>
                          <IconArrowRight size={13} stroke={2.5} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
};
