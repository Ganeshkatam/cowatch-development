import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { useHistory } from "react-router-dom";
import { Title, Text, Button, Loader, Center, Group } from "@mantine/core";
import { serverPath, serverCandidates, setServerPath, addAndSavePasscode } from "../../utils/utils";
import { getAccessToken, supabase } from "../../utils/supabaseClient";
import { MetadataContext } from "../../MetadataContext";
import styles from "./MyRooms.module.css";
import { Hero } from "./Hero";
import { RoomStats } from "./RoomStats";
import { RoomsToolbar } from "./RoomsToolbar";
import { RoomCard } from "./RoomCard";
import { RoomPagination } from "./RoomPagination";
import { IconArrowLeft, IconCalendarEvent, IconCirclePlusFilled } from "@tabler/icons-react";
import { Announce } from "../Announce/Announce";

export interface RoomSummary {
  roomId: string;
  isPasscodeProtected: boolean;
  currentPasscode?: string | null;
  creationTime: string;
  roomTitle: string | null;
  roomDescription: string | null;
  coverPhoto: string | null;
  isChatDisabled: boolean;
  isSubRoom: boolean;
  isWaitingLoungeEnabled?: boolean;
  status: "waiting" | "scheduled" | "active" | "inactive" | "expiring" | "expired" | "ended" | "cancelled";
  startedAt: string | null;
  expiresAt: string | null;
  endedAt: string | null;
  isPermanent?: boolean;
  durationMinutes?: number | null;
}

const areRoomsEqual = (a: RoomSummary[], b: RoomSummary[]): boolean => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const rA = a[i];
    const rB = b[i];
    if (
      rA.roomId !== rB.roomId ||
      rA.status !== rB.status ||
      rA.roomTitle !== rB.roomTitle ||
      rA.roomDescription !== rB.roomDescription ||
      rA.expiresAt !== rB.expiresAt ||
      rA.coverPhoto !== rB.coverPhoto ||
      rA.isPermanent !== rB.isPermanent ||
      rA.isChatDisabled !== rB.isChatDisabled ||
      rA.isPasscodeProtected !== rB.isPasscodeProtected ||
      rA.currentPasscode !== rB.currentPasscode ||
      rA.isWaitingLoungeEnabled !== rB.isWaitingLoungeEnabled
    ) {
      return false;
    }
  }
  return true;
};

export const useRooms = (user: any) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const roomsRef = useRef<RoomSummary[]>([]);
  roomsRef.current = rooms;
  const isInitialLoadRef = useRef(true);

  const fetchRooms = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Always update silently if rooms already exist in memory or silent option is set
    const isSilent = options?.silent ?? (!isInitialLoadRef.current || roomsRef.current.length > 0);
    if (!isSilent && roomsRef.current.length === 0) {
      setLoading(true);
    }

    try {
      const token = await getAccessToken();
      let response: Response | undefined;
      const candidatesToTry = [serverPath, ...serverCandidates.filter((c: string) => c !== serverPath)];

      for (let i = 0; i < candidatesToTry.length; i++) {
        const candidate = candidatesToTry[i];
        try {
          const res = await fetch(`${candidate}/listRooms`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            response = res;
            if (candidate !== serverPath) {
              setServerPath(candidate);
            }
            break;
          } else {
            response = res;
          }
        } catch (fetchErr) {
          if (i === candidatesToTry.length - 1 && !response) {
            throw fetchErr;
          }
        }
      }

      if (!response || !response.ok) {
        const contentType = response?.headers.get("content-type") || "";
        let errMsg = response ? `Failed to fetch rooms (${response.status})` : "Failed to fetch rooms";
        if (contentType.includes("application/json")) {
          const errData = await response?.json().catch(() => null);
          errMsg = errData?.error?.message || errData?.error || errMsg;
        }
        throw new Error(errMsg);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Invalid response received from server. Please verify backend connection.");
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        data.forEach((r: RoomSummary) => {
          if (r.currentPasscode) {
            addAndSavePasscode(r.roomId, r.currentPasscode);
          }
        });
      }

      // Reconcile state silently: if data didn't change, preserve array reference to prevent re-render cascades
      setRooms(prev => {
        if (areRoomsEqual(prev, data)) {
          return prev;
        }
        return data;
      });
      setError(null);
    } catch (err: any) {
      // If we already have rooms loaded, do not blow up UI on background refresh failure
      if (roomsRef.current.length === 0) {
        setError(err.message);
      } else {
        console.warn("Silent background room refresh failed:", err.message);
      }
    } finally {
      isInitialLoadRef.current = false;
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(() => {
      fetchRooms({ silent: true });
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const deleteRoom = async (roomId: string) => {
    try {
      const token = await getAccessToken();

      // Clean up storage bucket files for this room
      try {
        const cleanId = roomId.startsWith("/") ? roomId.substring(1) : roomId;
        const folderPath = `${user.id}/${cleanId}`;
        const { data: files } = await supabase.storage.from("room_covers").list(folderPath);
        if (files && files.length > 0) {
          const filesToRemove = files.map(f => `${folderPath}/${f.name}`);
          await supabase.storage.from("room_covers").remove(filesToRemove);
        }
      } catch (storageErr) {
        console.warn("Storage cleanup error:", storageErr);
      }

      const response = await fetch(`${serverPath}/deleteRoom?roomId=${roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setRooms(prev => prev.filter(r => r.roomId !== roomId));
        return true;
      }
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error?.message || errData?.error || "Failed to delete room");
    } catch (e: any) {
      console.error("deleteRoom error:", e);
      throw e;
    }
  };

  const updateRoomCover = async (roomId: string, coverPhoto: string) => {
    try {
      const token = await getAccessToken();
      const response = await fetch(`${serverPath}/updateRoomCover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user?.id, token, roomId, coverPhoto })
      });
      if (response.ok) {
        setRooms(prev => prev.map(r => r.roomId === roomId ? { ...r, coverPhoto } : r));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const silentRefresh = useCallback(() => fetchRooms({ silent: true }), [fetchRooms]);

  return { rooms, loading, error, deleteRoom, updateRoomCover, refresh: silentRefresh };
};

export const MyRooms = () => {
  const { user } = useContext(MetadataContext);
  const { rooms, loading, error, deleteRoom, updateRoomCover, refresh } = useRooms(user);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");

  const [viewMode, setViewModeState] = useState<'grid' | 'stack'>(() => {
    try {
      const stored = localStorage.getItem('cowatch-room-view-mode');
      if (stored === 'grid' || stored === 'stack') return stored;
    } catch (e) { }
    return 'grid';
  });

  const setViewMode = useCallback((mode: 'grid' | 'stack') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('cowatch-room-view-mode', mode);
    } catch (e) { }
  }, []);

  const [currentPage, setCurrentPage] = useState(1);

  const history = useHistory();
  const PAGE_SIZE = 12;

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOption]);

  const filteredAndSortedRooms = useMemo(() => {
    let result = rooms;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.roomTitle?.toLowerCase().includes(q) ||
        r.roomDescription?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (sortOption === "newest") {
        return new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime();
      } else if (sortOption === "oldest") {
        return new Date(a.creationTime).getTime() - new Date(b.creationTime).getTime();
      } else if (sortOption === "title-asc") {
        return (a.roomTitle || "").localeCompare(b.roomTitle || "");
      } else if (sortOption === "title-desc") {
        return (b.roomTitle || "").localeCompare(a.roomTitle || "");
      } else if (sortOption === "expiring") {
        const aIsActive = a.status === "active" || a.status === "expiring";
        const bIsActive = b.status === "active" || b.status === "expiring";
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;
        if (aIsActive && bIsActive && a.expiresAt && b.expiresAt) {
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        }
        return 0;
      }
      return 0;
    });
    return result;
  }, [rooms, searchQuery, sortOption]);

  const activeRooms = useMemo(() => filteredAndSortedRooms.filter(r => r.status === 'active' || r.status === 'expiring'), [filteredAndSortedRooms]);
  const upcomingRooms = useMemo(() => filteredAndSortedRooms.filter(r => r.status === 'waiting' || r.status === 'scheduled'), [filteredAndSortedRooms]);
  const historyRooms = useMemo(() => filteredAndSortedRooms.filter(r => r.status === 'ended' || r.status === 'expired' || r.status === 'cancelled'), [filteredAndSortedRooms]);

  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return historyRooms.slice(startIndex, startIndex + PAGE_SIZE);
  }, [historyRooms, currentPage]);

  if (!user && !loading) {
    return (
      <div className={styles.page}>
        <Center style={{ height: '50vh' }}>
          <Text>Please sign in to view your rooms.</Text>
        </Center>
      </div>
    );
  }

  return (
    <>
      <Announce page="myrooms" />
      <div className={styles.page}>
        <div className={styles.container}>
        <div className={styles.topNav}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => {
              if (window.history.length > 1) {
                history.goBack();
              } else {
                history.push("/");
              }
            }}
          >
            <IconArrowLeft size={16} />
            <span>Back to Home</span>
          </button>
          <Button
            size="sm"
            variant="default"
            leftSection={<IconCalendarEvent size={15} />}
            onClick={() => history.push("/rooms/schedule")}
            style={{ fontWeight: 600, borderRadius: "10px" }}
          >
            Schedule Room
          </Button>
        </div>

        <Hero>
          <RoomStats rooms={rooms} />
        </Hero>

        {loading && rooms.length === 0 ? (
          <Center style={{ minHeight: "200px" }}><Loader size="lg" color="violet" /></Center>
        ) : error ? (
          <Center style={{ minHeight: "200px" }}><Text c="red">{error}</Text></Center>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", background: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border-subtle)", marginTop: "32px" }}>
            <Title order={3} mb="sm" style={{ color: "var(--text-primary)" }}>No rooms yet</Title>
            <Text c="dimmed" mb="lg">Create a room now or schedule a watch party for later.</Text>
            <Group justify="center" gap="md">
              <Button
                size="md"
                variant="gradient"
                gradient={{ from: "#8B5CF6", to: "#EC4899", deg: 135 }}
                leftSection={<IconCirclePlusFilled size={18} />}
                onClick={() => history.push("/room/new")}
                style={{ fontWeight: 600, borderRadius: "10px" }}
              >
                Create your first room
              </Button>
              <Button
                size="md"
                variant="default"
                leftSection={<IconCalendarEvent size={18} />}
                onClick={() => history.push("/rooms/schedule")}
                style={{ fontWeight: 600, borderRadius: "10px" }}
              >
                Schedule a room
              </Button>
            </Group>
          </div>
        ) : (
          <>
            <RoomsToolbar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortOption={sortOption}
              setSortOption={setSortOption}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />

            <div className={styles.roomSection}>
              {activeRooms.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                  <Title order={4} mb="md" style={{ color: "var(--text-primary)" }}>Active Rooms</Title>
                  <div className={viewMode === 'grid' ? styles.roomGrid : styles.roomList}>
                    {activeRooms.map(room => (
                      <RoomCard key={room.roomId} room={room} onDelete={deleteRoom} onRefresh={refresh} onUpdateCover={updateRoomCover} viewMode={viewMode} />
                    ))}
                  </div>
                </div>
              )}

              {upcomingRooms.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                  <Title order={4} mb="md" style={{ color: "var(--text-primary)" }}>Upcoming Rooms</Title>
                  <div className={viewMode === 'grid' ? styles.roomGrid : styles.roomList}>
                    {upcomingRooms.map(room => (
                      <RoomCard key={room.roomId} room={room} onDelete={deleteRoom} onRefresh={refresh} onUpdateCover={updateRoomCover} viewMode={viewMode} />
                    ))}
                  </div>
                </div>
              )}

              {historyRooms.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                  <Title order={4} mb="md" style={{ color: "var(--text-primary)" }}>History</Title>
                  <div className={viewMode === 'grid' ? styles.roomGrid : styles.roomList}>
                    {paginatedHistory.map(room => (
                      <RoomCard key={room.roomId} room={room} onDelete={deleteRoom} onRefresh={refresh} onUpdateCover={updateRoomCover} viewMode={viewMode} />
                    ))}
                  </div>
                  <RoomPagination
                    currentPage={currentPage}
                    pageSize={PAGE_SIZE}
                    totalItems={historyRooms.length}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}

              {filteredAndSortedRooms.length === 0 && (
                <Center style={{ minHeight: "200px" }}>
                  <Text c="dimmed">No rooms match your search.</Text>
                </Center>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};
