import React, { useState, useEffect, useContext, useMemo } from "react";
import { Link, useHistory } from "react-router-dom";
import { Loader, Button } from "@mantine/core";
import {
  IconVideo,
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconCalendar,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { MetadataContext } from "../../MetadataContext";
import { useRooms, RoomSummary } from "../MyRooms/MyRooms";
import { Announce } from "../Announce/Announce";
import styles from "./HomeDashboard.module.css";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const HomeDashboard: React.FC = () => {
  const { user } = useContext(MetadataContext);
  const history = useHistory();
  const { rooms, loading } = useRooms(user);

  // Real-time digital clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time (e.g. 11:04 PM)
  const timeFormatted = useMemo(() => {
    let hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // hour '0' should be '12'
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }, [currentTime]);

  // Format full date (e.g. Tuesday, September 8)
  const dateFormatted = useMemo(() => {
    const dayName = DAYS_OF_WEEK[currentTime.getDay()];
    const monthName = MONTHS_FULL[currentTime.getMonth()];
    const dateNum = currentTime.getDate();
    return `${dayName}, ${monthName} ${dateNum}`;
  }, [currentTime]);

  // Selected date for the Daily Schedule widget
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const isSelectedDateToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate.getTime() === today.getTime();
  }, [selectedDate]);

  const handlePrevDay = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const handleResetToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
  };

  // Schedule header text: "Today, Sep 8" or "Tue, Sep 8"
  const scheduleHeaderLabel = useMemo(() => {
    const monthStr = MONTHS_SHORT[selectedDate.getMonth()];
    const dateNum = selectedDate.getDate();
    if (isSelectedDateToday) {
      return `Today, ${monthStr} ${dateNum}`;
    }
    const dayAbbr = DAYS_OF_WEEK[selectedDate.getDay()].slice(0, 3);
    return `${dayAbbr}, ${monthStr} ${dateNum}`;
  }, [selectedDate, isSelectedDateToday]);

  // Filter rooms for the selected date
  const dayRooms = useMemo(() => {
    if (!rooms || rooms.length === 0) return [];
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();

    return rooms.filter((r) => {
      // Check scheduledStartsAt
      const scheduledRaw = (r as any).scheduledStartsAt || r.startedAt;
      if (scheduledRaw) {
        const d = new Date(scheduledRaw);
        if (
          d.getFullYear() === selectedYear &&
          d.getMonth() === selectedMonth &&
          d.getDate() === selectedDay
        ) {
          return true;
        }
      }

      // If selected date is today, also include active or waiting rooms
      if (isSelectedDateToday && (r.status === "active" || r.status === "waiting")) {
        return true;
      }

      return false;
    });
  }, [rooms, selectedDate, isSelectedDateToday]);

  const handleEnterRoom = (room: RoomSummary) => {
    const cleanRoomId = room.roomId.startsWith("/") ? room.roomId.substring(1) : room.roomId;
    history.push(`/watch/${cleanRoomId}`);
  };

  return (
    <>
      <Announce page="home" />
      <div className={styles.dashboardContainer}>
        {/* Real-time Clock Header */}
        <div className={styles.clockSection}>
          <div className={styles.clockTime}>{timeFormatted}</div>
          <div className={styles.clockDate}>{dateFormatted}</div>
        </div>

        {/* Primary Action Tiles */}
        <div className={styles.actionsGrid}>
          {/* New Room */}
          <Link to="/room/new" className={styles.actionTile} title="Start a new instant watch party">
            <div className={`${styles.squircleBtn} ${styles.orangeBtn}`}>
              <IconVideo size={34} stroke={1.8} />
            </div>
            <span className={styles.tileLabel}>New room</span>
          </Link>

          {/* Join Room */}
          <Link to="/join" className={styles.actionTile} title="Join a watch party by room code or link">
            <div className={`${styles.squircleBtn} ${styles.blueBtn}`}>
              <IconPlus size={34} stroke={2.2} />
            </div>
            <span className={styles.tileLabel}>Join</span>
          </Link>

          {/* Schedule Room */}
          <Link to="/rooms/schedule" className={styles.actionTile} title="Schedule a future watch party">
            <div className={`${styles.squircleBtn} ${styles.blueBtn}`}>
              <div className={styles.calendarTileIcon}>
                <span className={styles.calendarDateNum}>{currentTime.getDate()}</span>
                <span className={styles.calendarMonthStr}>{MONTHS_SHORT[currentTime.getMonth()]}</span>
              </div>
            </div>
            <span className={styles.tileLabel}>Schedule</span>
          </Link>
        </div>

        {/* Daily Schedule Card */}
        <div className={styles.scheduleCard}>
          <div className={styles.cardHeader}>
            <div className={styles.headerTitleWrapper}>
              <span className={styles.headerTitle}>{scheduleHeaderLabel}</span>
            </div>
            <button
              type="button"
              className={styles.headerIconBtn}
              onClick={() => history.push("/myrooms")}
              title="Open all rooms"
            >
              <IconExternalLink size={16} stroke={1.8} />
            </button>
          </div>

          <div className={styles.navRow}>
            <div className={styles.navLeft}>
              <button
                type="button"
                className={`${styles.todayBtn} ${isSelectedDateToday ? styles.todayBtnActive : ""}`}
                onClick={handleResetToday}
              >
                Today
              </button>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={handlePrevDay}
                aria-label="Previous day"
                title="Previous day"
              >
                <IconChevronLeft size={16} stroke={2} />
              </button>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={handleNextDay}
                aria-label="Next day"
                title="Next day"
              >
                <IconChevronRight size={16} stroke={2} />
              </button>
            </div>
          </div>

          <div className={styles.cardBody}>
            {loading ? (
              <Loader size="sm" color="violet" />
            ) : dayRooms.length === 0 ? (
              <div className={styles.emptyState}>
                {/* Clean beach umbrella / deckchair empty state illustration matching Zoom */}
                <svg className={styles.emptyStateSvg} viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Beach shadow */}
                  <ellipse cx="80" cy="92" rx="44" ry="10" fill="currentColor" fillOpacity="0.08" />
                  {/* Lounge chair base */}
                  <path d="M58 84L76 86L98 84" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.35" />
                  <path d="M64 78L78 86L92 78" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4" />
                  <path d="M68 86L66 92M88 86L90 92" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.3" />
                  {/* Umbrella pole */}
                  <path d="M80 32L80 88" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.5" />
                  {/* Umbrella canopy */}
                  <path d="M80 18L44 48C56 50 68 50 80 48C92 50 104 50 116 48L80 18Z" fill="#A78BFA" fillOpacity="0.5" />
                  <path d="M80 18L80 48" stroke="#8B5CF6" strokeWidth="2" strokeOpacity="0.6" />
                  <path d="M80 18L60 49" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.4" />
                  <path d="M80 18L100 49" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.4" />
                  {/* Umbrella finial top */}
                  <circle cx="80" cy="18" r="2.5" fill="#8B5CF6" />
                </svg>
                <div className={styles.emptyStateText}>No events scheduled.</div>
              </div>
            ) : (
              <div className={styles.eventsList}>
                {dayRooms.map((room) => {
                  const isLive = room.status === "active";
                  const cleanRoomId = room.roomId.startsWith("/") ? room.roomId.substring(1) : room.roomId;
                  return (
                    <div key={room.roomId} className={styles.eventItem}>
                      <div className={styles.eventInfo}>
                        <span className={styles.eventTitle}>{room.roomTitle || "Watch Party"}</span>
                        <div className={styles.eventMeta}>
                          {isLive && (
                            <span className={styles.liveBadge}>
                              <span className={styles.liveDot} /> Live
                            </span>
                          )}
                          <span>Room ID: {cleanRoomId}</span>
                          {room.durationMinutes && <span>{room.durationMinutes} min</span>}
                        </div>
                      </div>
                      <Button
                        size="xs"
                        color="violet"
                        variant={isLive ? "filled" : "light"}
                        leftSection={<IconPlayerPlayFilled size={12} />}
                        onClick={() => handleEnterRoom(room)}
                      >
                        {isLive ? "Enter" : "Start"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => history.push("/myrooms")}
            >
              View all rooms &gt;
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
