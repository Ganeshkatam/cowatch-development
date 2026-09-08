import React from "react";
import { useHistory } from "react-router-dom";
import { IconPlayerPlay, IconCalendarEvent } from "@tabler/icons-react";
import styles from "./Create.module.css";

interface RoomCreationModeSwitcherProps {
  activeMode: "now" | "schedule";
}

export const RoomCreationModeSwitcher: React.FC<RoomCreationModeSwitcherProps> = ({ activeMode }) => {
  const history = useHistory();

  return (
    <div className={styles.modeSwitcherContainer}>
      <button
        type="button"
        className={`${styles.modeButton} ${activeMode === "now" ? styles.modeButtonActive : ""}`}
        onClick={() => {
          if (activeMode !== "now") {
            history.push("/room/new");
          }
        }}
        aria-pressed={activeMode === "now"}
      >
        <div className={styles.modeIconWrap}>
          <IconPlayerPlay size={18} />
        </div>
        <div className={styles.modeTextWrap}>
          <div className={styles.modeTitle}>Start Now</div>
          <div className={styles.modeSubtitle}>Launch an active room immediately</div>
        </div>
      </button>

      <button
        type="button"
        className={`${styles.modeButton} ${activeMode === "schedule" ? styles.modeButtonActive : ""}`}
        onClick={() => {
          if (activeMode !== "schedule") {
            history.push("/rooms/schedule");
          }
        }}
        aria-pressed={activeMode === "schedule"}
      >
        <div className={styles.modeIconWrap}>
          <IconCalendarEvent size={18} />
        </div>
        <div className={styles.modeTextWrap}>
          <div className={styles.modeTitle}>Schedule for Later</div>
          <div className={styles.modeSubtitle}>Plan a future date and time</div>
        </div>
      </button>
    </div>
  );
};
