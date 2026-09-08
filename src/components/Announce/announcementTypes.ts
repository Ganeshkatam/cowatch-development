export type AnnouncementType = "info" | "feature" | "maintenance" | "important";

export interface PublicAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  published_at: string;
  action_label?: string | null;
  action_url?: string | null;
  target_pages: string[];
}

export function isValidActionUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  // Safe relative paths (e.g. /rooms/schedule, /myrooms, /room/new)
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }
  // Safe external https
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
