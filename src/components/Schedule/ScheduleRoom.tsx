import React, { useContext, useState, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { Badge, Alert, TextInput, Text } from "@mantine/core";
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconWorld,
} from "@tabler/icons-react";
import { MetadataContext } from "../../MetadataContext";
import {
  useRoomFormState,
  submitRoomCreation,
  getLocalTimezoneDisplay,
  getSchedulePresets,
  formatDate,
} from "../Create/roomCreationDomain";
import { RoomCreationModeSwitcher } from "../Create/RoomCreationModeSwitcher";
import { SharedRoomFields } from "../Create/SharedRoomFields";
import { SharedRoomPreview } from "../Create/SharedRoomPreview";
import createStyles from "../Create/Create.module.css";
import scheduleStyles from "./ScheduleRoom.module.css";

export const ScheduleRoom: React.FC = () => {
  const { user } = useContext(MetadataContext);
  const history = useHistory();
  const formState = useRoomFormState();

  const presets = useMemo(() => getSchedulePresets(), []);
  const timezoneDisplay = useMemo(() => getLocalTimezoneDisplay(), []);

  // Default to the first preset (e.g. Tonight 8:00 PM or Tomorrow)
  const defaultPreset = presets[0] || {
    date: formatDate(new Date()),
    time: "20:00",
  };
  const [scheduleDate, setScheduleDate] = useState<string>(defaultPreset.date);
  const [scheduleTime, setScheduleTime] = useState<string>(defaultPreset.time);
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(0);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.title = "Schedule a Watch Party - CoWatch";
  }, []);

  // Format a friendly display string for the live preview card
  const formattedScheduleDisplay = useMemo(() => {
    if (!scheduleDate || !scheduleTime) return "";
    try {
      const combined = new Date(`${scheduleDate}T${scheduleTime}`);
      if (isNaN(combined.getTime())) return "";
      const dateStr = combined.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeStr = combined.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${dateStr} · ${timeStr}`;
    } catch {
      return "";
    }
  }, [scheduleDate, scheduleTime]);

  const handleApplyPreset = (preset: { date: string; time: string }, index: number) => {
    setScheduleDate(preset.date);
    setScheduleTime(preset.time);
    setActivePresetIndex(index);
    setFormError("");
  };

  const handleDateChange = (val: string) => {
    setScheduleDate(val);
    setActivePresetIndex(null);
    setFormError("");
  };

  const handleTimeChange = (val: string) => {
    setScheduleTime(val);
    setActivePresetIndex(null);
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!scheduleDate || !scheduleTime) {
      setFormError("Please select both a date and time for the scheduled party.");
      return;
    }

    const combined = new Date(`${scheduleDate}T${scheduleTime}`);
    if (isNaN(combined.getTime())) {
      setFormError("Invalid date or time selected.");
      return;
    }

    if (combined.getTime() <= Date.now()) {
      setFormError("Scheduled start time must be in the future.");
      return;
    }

    setLoading(true);

    try {
      const video = new URLSearchParams(window.location.search).get("video") ?? "";
      const { finalRoomId } = await submitRoomCreation({
        user,
        formState,
        scheduledStartsAt: combined.toISOString(),
        video,
      });

      // Scheduled rooms redirect directly to the host's Room Details management console
      history.push(`/myrooms/${finalRoomId}`);
    } catch (err: any) {
      console.error("Schedule room error:", err);
      setFormError(err.message || "Failed to schedule room.");
      setLoading(false);
    }
  };

  const minDate = useMemo(() => formatDate(new Date()), []);

  return (
    <div className={createStyles.pageWrapper}>
      <div className={createStyles.container}>
        {/* Top Navigation */}
        <div className={createStyles.topNav}>
          <button
            type="button"
            className={createStyles.breadcrumbLink}
            onClick={() => history.push("/myrooms")}
          >
            <IconArrowLeft size={16} />
            <span>Back to My Rooms</span>
          </button>
          <Badge variant="light" color="violet" size="lg" radius="sm">
            Schedule Party
          </Badge>
        </div>

        {/* Mode Switcher */}
        <RoomCreationModeSwitcher activeMode="schedule" />

        {/* Responsive Grid Layout */}
        <div className={createStyles.layoutGrid}>
          {/* Left Column: Form Configuration */}
          <div className={createStyles.formCard}>
            <div className={createStyles.formHeader}>
              <h1 className={createStyles.formTitle}>Schedule a Watch Party</h1>
              <p className={createStyles.formSubtitle}>
                Plan the moment. We'll handle the room.
              </p>
            </div>

            {(formError || formState.error) && (
              <Alert color="red" mb="lg" title="Notice">
                {formError || formState.error}
              </Alert>
            )}

            <form id="schedule-room-form" onSubmit={handleSubmit}>
              {/* Top Hero Section: When (Date & Time) */}
              <div className={scheduleStyles.whenCard}>
                <div className={scheduleStyles.whenHeader}>
                  <div className={scheduleStyles.whenIconWrap}>
                    <IconCalendarEvent size={20} />
                  </div>
                  <span className={scheduleStyles.whenTitle}>When</span>
                </div>

                <div className={scheduleStyles.dateTimeGrid}>
                  <div>
                    <Text size="xs" fw={700} c="var(--text-secondary)" tt="uppercase" lts={0.5} mb={6}>
                      Date
                    </Text>
                    <TextInput
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={minDate}
                      required
                      size="md"
                      styles={{
                        input: {
                          backgroundColor: "var(--surface-secondary)",
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        },
                      }}
                    />
                  </div>

                  <div>
                    <Text size="xs" fw={700} c="var(--text-secondary)" tt="uppercase" lts={0.5} mb={6}>
                      Time
                    </Text>
                    <TextInput
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      required
                      size="md"
                      styles={{
                        input: {
                          backgroundColor: "var(--surface-secondary)",
                          borderColor: "var(--border-subtle)",
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        },
                      }}
                    />
                  </div>
                </div>

                <div className={scheduleStyles.timezoneNote}>
                  <IconWorld size={15} />
                  <span>Your local time: {timezoneDisplay}</span>
                </div>

                {presets.length > 0 && (
                  <div className={scheduleStyles.presetsRow}>
                    <span className={scheduleStyles.presetsLabel}>Quick Presets:</span>
                    {presets.map((preset, idx) => (
                      <button
                        key={preset.label}
                        type="button"
                        className={`${scheduleStyles.presetChip} ${
                          activePresetIndex === idx ? scheduleStyles.presetChipActive : ""
                        }`}
                        onClick={() => handleApplyPreset(preset, idx)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared Room Fields (Identity, Security, Party Settings) */}
              <SharedRoomFields formState={formState} />
            </form>
          </div>

          {/* Right Column: Live Room Card Preview */}
          <SharedRoomPreview
            formState={formState}
            mode="schedule"
            scheduledDisplay={formattedScheduleDisplay}
            loading={loading}
            submitLabel="Schedule Watch Party"
            submitIcon={<IconCalendarEvent size={20} />}
            formId="schedule-room-form"
          />
        </div>
      </div>
    </div>
  );
};
