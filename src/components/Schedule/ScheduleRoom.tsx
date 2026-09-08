import React, { useContext, useState, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { Badge, Alert, Text, Button, Loader } from "@mantine/core";
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
  formatDate,
} from "../Create/roomCreationDomain";

import { SharedRoomFields } from "../Create/SharedRoomFields";
import { DatePickerDropdown } from "./DatePickerDropdown";
import { TimePickerDropdown } from "./TimePickerDropdown";
import createStyles from "../Create/Create.module.css";
import scheduleStyles from "./ScheduleRoom.module.css";

function getNextValidScheduleTime(): { date: string; time: string } {
  const target = new Date(Date.now() + 60 * 60 * 1000);
  const rem = target.getMinutes() % 15;
  if (rem !== 0) {
    target.setMinutes(target.getMinutes() + (15 - rem));
  }
  target.setSeconds(0, 0);
  const h = target.getHours().toString().padStart(2, "0");
  const m = target.getMinutes().toString().padStart(2, "0");
  return {
    date: formatDate(target),
    time: `${h}:${m}`,
  };
}

export const ScheduleRoom: React.FC = () => {
  const { user } = useContext(MetadataContext);
  const history = useHistory();
  const formState = useRoomFormState();
  const timezoneDisplay = useMemo(() => getLocalTimezoneDisplay(), []);

  // Default to 1 hour from current time (rounded to next 15 mins)
  const [scheduleDate, setScheduleDate] = useState<string>(() => getNextValidScheduleTime().date);
  const [scheduleTime, setScheduleTime] = useState<string>(() => getNextValidScheduleTime().time);

  // Always check the time on refresh/mount and window focus to guarantee a future timestamp
  useEffect(() => {
    const ensureFutureTime = () => {
      if (!scheduleDate || !scheduleTime) {
        const next = getNextValidScheduleTime();
        setScheduleDate(next.date);
        setScheduleTime(next.time);
        return;
      }

      const combined = new Date(`${scheduleDate}T${scheduleTime}`);
      if (isNaN(combined.getTime()) || combined.getTime() <= Date.now()) {
        const next = getNextValidScheduleTime();
        setScheduleDate(next.date);
        setScheduleTime(next.time);
      }
    };

    ensureFutureTime();
    window.addEventListener("focus", ensureFutureTime);
    const interval = setInterval(ensureFutureTime, 60000);
    return () => {
      window.removeEventListener("focus", ensureFutureTime);
      clearInterval(interval);
    };
  }, [scheduleDate, scheduleTime]);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.title = "Schedule a Watch Party - CoWatch";
  }, []);


  const handleDateChange = (val: string) => {
    setScheduleDate(val);
    setFormError("");
  };

  const handleTimeChange = (val: string) => {
    setScheduleTime(val);
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
              {/* Shared Room Fields with When section placed directly after Room Title */}
              <SharedRoomFields
                formState={formState}
                afterTitle={
                  <div className={scheduleStyles.whenCard} style={{ margin: "4px 0" }}>
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
                        <DatePickerDropdown
                          value={scheduleDate}
                          onChange={handleDateChange}
                          minDate={minDate}
                        />
                      </div>

                      <div>
                        <Text size="xs" fw={700} c="var(--text-secondary)" tt="uppercase" lts={0.5} mb={6}>
                          Time
                        </Text>
                        <TimePickerDropdown
                          value={scheduleTime}
                          onChange={handleTimeChange}
                          selectedDate={scheduleDate}
                        />
                      </div>
                    </div>

                    <div className={scheduleStyles.timezoneNote}>
                      <IconWorld size={15} />
                      <span>Your local time: {timezoneDisplay}</span>
                    </div>
                  </div>
                }
              />

              <Button
                type="submit"
                size="lg"
                variant="gradient"
                gradient={{ from: "violet", to: "grape", deg: 135 }}
                disabled={loading || !formState.roomTitle.trim()}
                leftSection={loading ? <Loader size={20} color="white" /> : <IconCalendarEvent size={20} />}
                className={createStyles.createBtnPrimary}
                fullWidth
                mt="xl"
              >
                {loading ? "Scheduling..." : "Schedule Watch Party"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
