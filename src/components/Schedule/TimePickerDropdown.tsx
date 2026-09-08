import React, { useMemo } from "react";
import { Select } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";

interface TimePickerDropdownProps {
  value: string; // "HH:mm"
  onChange: (val: string) => void;
}

export const TimePickerDropdown: React.FC<TimePickerDropdownProps> = ({
  value,
  onChange,
}) => {
  const timeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    let hasCurrent = false;

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = h.toString().padStart(2, "0");
        const mm = m.toString().padStart(2, "0");
        const val = `${hh}:${mm}`;
        if (val === value) hasCurrent = true;
        const period = h >= 12 ? "PM" : "AM";
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const label = `${displayH}:${mm} ${period}`;
        options.push({ value: val, label });
      }
    }

    if (!hasCurrent && value && value.includes(":")) {
      const [hStr, mStr] = value.split(":");
      const h = parseInt(hStr, 10);
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      options.push({
        value,
        label: `${displayH}:${mStr} ${period}`,
      });
      options.sort((a, b) => a.value.localeCompare(b.value));
    }

    return options;
  }, [value]);

  return (
    <Select
      value={value}
      onChange={(val) => val && onChange(val)}
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
  );
};
