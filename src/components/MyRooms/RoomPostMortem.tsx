import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { Button, Text, Loader, ActionIcon } from "@mantine/core";
import { IconCopy, IconPlayerStop, IconHistory, IconSettings, IconMessage, IconUsers } from "@tabler/icons-react";
import { calculateRoomDuration, serverPath } from "../../utils/utils";
import styles from "./RoomPostMortem.module.css";
import { RoomDetailsData } from "./RoomDetails";

interface RoomPostMortemProps {
  room: RoomDetailsData;
}

export function RoomPostMortem({ room }: RoomPostMortemProps) {
  const history = useHistory();
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDuplicate = async () => {
    setDuplicating(true);
    setError(null);
    try {
      const res = await fetch(`${serverPath}/api/room/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRoomId: room.roomId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to duplicate room");
      }
      history.push(`/myrooms/${data.roomId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setDuplicating(false);
    }
  };

  const getVisibilityText = () => {
    if (room.isPasscodeProtected) return "Private (Passcode Protected)";
    return "Public";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.label}>Room History</div>
        <div className={styles.title}>{room.roomTitle}</div>
        <div className={styles.hostedOn}>
          Hosted on {new Date(room.creationTime).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
        </div>
        
        <div className={styles.statusEnded}>
          ● {room.status.toUpperCase()}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Started</span>
          <span className={styles.statValue}>
            {room.startedAt ? new Date(room.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Ended</span>
          <span className={styles.statValue}>
            {(room.endedAt || room.expiresAt) ? new Date((room.endedAt || room.expiresAt)!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Duration</span>
          <span className={styles.statValue}>
            {calculateRoomDuration(room.startedAt, room.endedAt, room.expiresAt)}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Chat Messages</span>
          <span className={styles.statValue}>
            {room.chatSummary?.messagesCount ?? 0}
          </span>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <div className={styles.settingsHeader}>
          <IconSettings size={18} /> Historical Settings
        </div>
        
        <div className={styles.settingsRow}>
          <span className={styles.settingsRowLabel}>Description</span>
          <span className={styles.settingsRowValue}>{room.roomDescription || "—"}</span>
        </div>

        <div className={styles.settingsRow}>
          <span className={styles.settingsRowLabel}>Visibility</span>
          <span className={styles.settingsRowValue}>{getVisibilityText()}</span>
        </div>
        
        <div className={styles.settingsRow}>
          <span className={styles.settingsRowLabel}>Chat</span>
          <span className={styles.settingsRowValue}>{room.isChatDisabled ? "Disabled" : "Enabled"}</span>
        </div>
      </div>

      <div className={styles.primaryAction}>
        {error && <Text c="red" size="sm" mb="sm" ta="center">{error}</Text>}
        <Button 
          onClick={handleDuplicate} 
          loading={duplicating}
          size="lg" 
          fullWidth 
          color="violet"
          leftSection={<IconCopy size={20} />}
        >
          Host Again
        </Button>
      </div>
    </div>
  );
}
