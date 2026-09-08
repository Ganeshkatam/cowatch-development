import React, { useState, useEffect, useCallback } from "react";
import { serverPath } from "../../utils/utils";
import { PublicAnnouncement } from "./announcementTypes";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { AnnouncementDrawer } from "./AnnouncementDrawer";

const DISMISSED_STORAGE_KEY = "cowatch_dismissed_announcements";

interface AnnounceProps {
  page?: "home" | "myrooms" | "room" | "join" | "all";
}

function loadDismissedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id) => typeof id === "string"));
    }
  } catch (err) {
    // Non-fatal: Storage disabled or malformed JSON
  }
  return new Set();
}

function persistDismissedId(id: string, currentSet: Set<string>): Set<string> {
  const nextSet = new Set(currentSet);
  nextSet.add(id);

  try {
    // Trim to 50 most recent to prevent unbounded growth
    const arrayToPersist = Array.from(nextSet).slice(-50);
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(arrayToPersist));
  } catch (err) {
    // Non-fatal: QuotaExceededError or private browsing
  }

  return nextSet;
}

export const Announce: React.FC<AnnounceProps> = ({ page = "all" }) => {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissedIds());
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchAnnouncements() {
      try {
        const response = await fetch(
          `${serverPath}/api/announcements?page=${encodeURIComponent(page)}`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted && Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
      } catch (err) {
        // Fail-safe closed: ignore network errors
      }
    }

    fetchAnnouncements();

    return () => {
      isMounted = false;
    };
  }, [page]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => persistDismissedId(id, prev));
  }, []);

  const visibleAnnouncements = announcements.filter(
    (item) => !dismissedIds.has(item.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const primaryAnnouncement = visibleAnnouncements[0];

  return (
    <>
      <AnnouncementBanner
        announcement={primaryAnnouncement}
        onDismiss={handleDismiss}
        onOpenDrawer={() => setDrawerOpen(true)}
        totalCount={visibleAnnouncements.length}
      />

      <AnnouncementDrawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        announcements={visibleAnnouncements}
        onDismiss={handleDismiss}
      />
    </>
  );
};

export default Announce;
