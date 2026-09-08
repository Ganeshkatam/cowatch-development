import React, { useState, useEffect, useMemo } from "react";
import {
  Popover,
  UnstyledButton,
  Text,
  ActionIcon,
  Group,
} from "@mantine/core";
import {
  IconCalendarEvent,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import styles from "./ScheduleRoom.module.css";

interface DatePickerDropdownProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  minDate?: string; // YYYY-MM-DD
}

function parseDateString(str: string): Date {
  if (!str) return new Date();
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "Select date";
  const target = parseDateString(dateStr);
  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let prefix = "";
  if (diffDays === 0) prefix = "Today · ";
  else if (diffDays === 1) prefix = "Tomorrow · ";

  const formatted = target.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${prefix}${formatted}`;
}

export const DatePickerDropdown: React.FC<DatePickerDropdownProps> = ({
  value,
  onChange,
  minDate,
}) => {
  const [opened, setOpened] = useState(false);

  // Initialize view date to the month/year of current value or today
  const [viewDate, setViewDate] = useState<Date>(() => parseDateString(value));

  // Whenever value changes externally (e.g. from preset chips), sync viewDate
  useEffect(() => {
    if (value) {
      setViewDate(parseDateString(value));
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const todayStr = formatDateString(new Date());
  const effectiveMin = minDate || todayStr;

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Check if we can go to previous month
  const canGoPrev = useMemo(() => {
    const minD = parseDateString(effectiveMin);
    const prevMonthLastDay = new Date(year, month, 0);
    return prevMonthLastDay >= minD;
  }, [effectiveMin, year, month]);

  // Compute calendar days
  const calendarCells = useMemo(() => {
    const cells: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isSelected: boolean;
      isToday: boolean;
    }[] = [];

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dStr = formatDateString(d);
      cells.push({
        dayNumber: dayNum,
        dateStr: dStr,
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false,
        isToday: dStr === todayStr,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dStr = formatDateString(dateObj);
      const isPast = dStr < effectiveMin;
      cells.push({
        dayNumber: d,
        dateStr: dStr,
        isCurrentMonth: true,
        isDisabled: isPast,
        isSelected: dStr === value,
        isToday: dStr === todayStr,
      });
    }

    // Trailing days to fill the grid up to multiple of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      const dStr = formatDateString(dateObj);
      cells.push({
        dayNumber: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false,
        isToday: dStr === todayStr,
      });
    }

    return cells;
  }, [year, month, value, effectiveMin, todayStr]);

  const handleSelectDay = (dStr: string, isDisabled: boolean) => {
    if (isDisabled) return;
    onChange(dStr);
    setOpened(false);
  };

  const handleQuickPreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dStr = formatDateString(d);
    onChange(dStr);
    setViewDate(d);
    setOpened(false);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      offset={6}
      shadow="xl"
      radius="md"
      width={320}
    >
      <Popover.Target>
        <UnstyledButton
          onClick={() => setOpened((o) => !o)}
          className={`${styles.pickerTrigger} ${opened ? styles.pickerTriggerOpened : ""}`}
        >
          <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
            <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
              <IconCalendarEvent size={18} color="var(--color-violet)" style={{ flexShrink: 0 }} />
              <Text size="sm" fw={600} truncate c="var(--text-primary)">
                {formatDisplayDate(value)}
              </Text>
            </Group>
            <IconChevronDown
              size={16}
              color="var(--text-muted)"
              style={{
                flexShrink: 0,
                transform: opened ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
          </Group>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown className={styles.calendarDropdown}>
        {/* Quick Shortcuts */}
        <div className={styles.shortcutsRow}>
          <button
            type="button"
            className={styles.shortcutBtn}
            onClick={() => handleQuickPreset(0)}
          >
            Today
          </button>
          <button
            type="button"
            className={styles.shortcutBtn}
            onClick={() => handleQuickPreset(1)}
          >
            Tomorrow
          </button>
          <button
            type="button"
            className={styles.shortcutBtn}
            onClick={() => {
              const now = new Date();
              const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
              handleQuickPreset(daysUntilSat);
            }}
          >
            This Weekend
          </button>
        </div>

        {/* Month Navigation */}
        <div className={styles.calendarHeader}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            aria-label="Previous month"
          >
            <IconChevronLeft size={16} />
          </ActionIcon>
          <span className={styles.monthTitle}>{monthName}</span>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <IconChevronRight size={16} />
          </ActionIcon>
        </div>

        {/* Weekday Labels */}
        <div className={styles.weekdaysRow}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className={styles.weekdayLabel}>
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className={styles.daysGrid}>
          {calendarCells.map((cell, idx) => {
            let cellClass = styles.dayCell;
            if (cell.isSelected) cellClass += ` ${styles.daySelected}`;
            else if (cell.isToday) cellClass += ` ${styles.dayToday}`;
            else if (!cell.isCurrentMonth) cellClass += ` ${styles.dayOutside}`;
            else if (cell.isDisabled) cellClass += ` ${styles.dayDisabled}`;

            return (
              <button
                key={`${cell.dateStr}-${idx}`}
                type="button"
                className={cellClass}
                disabled={cell.isDisabled || !cell.isCurrentMonth}
                onClick={() =>
                  cell.isCurrentMonth &&
                  handleSelectDay(cell.dateStr, cell.isDisabled)
                }
              >
                {cell.dayNumber}
              </button>
            );
          })}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
};
