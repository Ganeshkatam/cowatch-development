import React, { useMemo } from "react";
import { Select, SegmentedControl, Group } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";

interface TimePickerDropdownProps {
  value: string; // "HH:mm" in 24-hour format
  onChange: (val: string) => void;
  selectedDate?: string; // "YYYY-MM-DD"
}

export const TimePickerDropdown: React.FC<TimePickerDropdownProps> = ({
  value,
  onChange,
  selectedDate,
}) => {
  // Parse current 24-hour value into 12h parts
  const { period, hour12, minuteStr, val12h } = useMemo(() => {
    let h24 = 14;
    let m = "00";
    if (value && value.includes(":")) {
      const parts = value.split(":");
      h24 = parseInt(parts[0], 10) || 0;
      m = parts[1] || "00";
    }

    const p: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const v12 = `${h12.toString().padStart(2, "0")}:${m}`;

    return {
      period: p,
      hour12: h12,
      minuteStr: m,
      val12h: v12,
    };
  }, [value]);

  // Generate 12-hour options: 12:00, 12:15, ... 11:45
  const timeOptions = useMemo(() => {
    const options: { value: string; label: string; disabled?: boolean }[] = [];
    let hasCurrent = false;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
    const isToday = selectedDate === todayStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Standard sequence: 12:00, 12:15, 12:30, 12:45, 1:00 ... 11:45
    const hoursOrder = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    for (const h of hoursOrder) {
      for (let m = 0; m < 60; m += 15) {
        const hh = h.toString().padStart(2, "0");
        const mm = m.toString().padStart(2, "0");
        const valKey = `${hh}:${mm}`;
        if (valKey === val12h) hasCurrent = true;

        // Calculate 24-hour equivalent under the current period to check if past
        const h24Equiv = period === "PM" ? (h % 12) + 12 : (h % 12);
        const isPast = isToday && (h24Equiv * 60 + m) <= currentMinutes;

        options.push({
          value: valKey,
          label: `${h}:${mm}`,
          disabled: isPast,
        });
      }
    }

    // If current value is not standard 15-minute slot (e.g. 2:07), insert it
    if (!hasCurrent && val12h) {
      const [hStr, mStr] = val12h.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const h24Equiv = period === "PM" ? (h % 12) + 12 : (h % 12);
      const isPast = isToday && (h24Equiv * 60 + m) <= currentMinutes;

      options.push({
        value: val12h,
        label: `${h}:${mStr}`,
        disabled: isPast,
      });
      options.sort((a, b) => a.value.localeCompare(b.value));
    }

    return options;
  }, [val12h, period, selectedDate]);

  // When user selects a 12h time from the dropdown
  const handle12hChange = (selected12h: string | null) => {
    if (!selected12h) return;
    const [hStr, mStr] = selected12h.split(":");
    const h12 = parseInt(hStr, 10);
    const h24 = period === "PM" ? (h12 % 12) + 12 : (h12 % 12);
    onChange(`${h24.toString().padStart(2, "0")}:${mStr}`);
  };

  // When user toggles AM or PM
  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    if (newPeriod === period) return;
    const h24 = newPeriod === "PM" ? (hour12 % 12) + 12 : (hour12 % 12);
    onChange(`${h24.toString().padStart(2, "0")}:${minuteStr}`);
  };

  return (
    <Group gap={8} wrap="nowrap" align="stretch" style={{ width: "100%" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Select
          value={val12h}
          onChange={handle12hChange}
          data={timeOptions}
          searchable
          maxDropdownHeight={260}
          leftSection={<IconClock size={18} color="var(--color-violet)" />}
          size="md"
          styles={{
            input: {
              backgroundColor: "var(--surface-secondary)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
              fontWeight: 600,
              height: "44px",
              borderRadius: "10px",
            },
            dropdown: {
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              borderRadius: "12px",
              boxShadow: "0 16px 36px rgba(0, 0, 0, 0.45)",
            },
            option: {
              fontSize: "13.5px",
              fontWeight: 500,
            },
          }}
        />
      </div>

      <SegmentedControl
        value={period}
        onChange={(val) => handlePeriodChange(val as "AM" | "PM")}
        data={[
          { label: "AM", value: "AM" },
          { label: "PM", value: "PM" },
        ]}
        color="violet"
        radius="md"
        size="sm"
        styles={{
          root: {
            backgroundColor: "var(--surface-secondary)",
            border: "1px solid var(--border-subtle)",
            height: "44px",
            padding: "3px",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          },
          label: {
            fontWeight: 700,
            fontSize: "12.5px",
            padding: "6px 12px",
            color: "var(--text-secondary)",
          },
          indicator: {
            boxShadow: "0 2px 8px rgba(139, 92, 246, 0.4)",
          },
        }}
      />
    </Group>
  );
};
