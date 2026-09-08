import React, { useState } from "react";
import {
  TextInput,
  Textarea,
  PasswordInput,
  Switch,
  Text,
  FileButton,
  Group,
  Stack,
  Select,
  Button,
} from "@mantine/core";
import {
  IconPhotoPlus,
  IconTrash,
  IconLock,
  IconPlus,
} from "@tabler/icons-react";
import type { RoomFormState } from "./roomCreationDomain";
import styles from "./Create.module.css";

export interface DurationSelectProps {
  formState: RoomFormState;
  className?: string;
}

export const DurationSelect: React.FC<DurationSelectProps> = ({ formState, className }) => {
  if (formState.isPermanent) return null;

  return (
    <div className={className}>
      <Text fw={500} size="sm" c="var(--text-primary)" mb={6}>
        Session Duration
      </Text>
      <Select
        value={formState.durationMinutes}
        onChange={(val) => val && formState.setDurationMinutes(val)}
        data={[
          { value: "30", label: "30 minutes" },
          { value: "60", label: "1 hour" },
          { value: "120", label: "2 hours" },
          { value: "180", label: "3 hours" },
          { value: "300", label: "5 hours" },
          { value: "360", label: "6 hours" },
          { value: "720", label: "12 hours" },
          { value: "1440", label: "24 hours" },
        ]}
        size="md"
        styles={{
          input: {
            backgroundColor: "var(--surface-secondary)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
          },
        }}
      />
      <div className={styles.inputHelp}>
        <span>The expiration countdown starts only when you start the watch party.</span>
      </div>
    </div>
  );
};

interface SharedRoomFieldsProps {
  formState: RoomFormState;
  afterTitle?: React.ReactNode;
  hideDuration?: boolean;
}

export const SharedRoomFields: React.FC<SharedRoomFieldsProps> = ({
  formState,
  afterTitle,
  hideDuration = false,
}) => {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState<boolean>(
    Boolean(formState.roomDescription && formState.roomDescription.trim().length > 0)
  );

  const showDescription =
    isDescriptionOpen || Boolean(formState.roomDescription && formState.roomDescription.trim().length > 0);

  return (
    <Stack gap="lg">
      {/* Room Title */}
      <div>
        <TextInput
          label="Room Title"
          placeholder="e.g. Saturday Movie Night, Anime Marathon"
          required
          value={formState.roomTitle}
          onChange={(e) => formState.setRoomTitle(e.target.value)}
          maxLength={50}
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

      {afterTitle}

      {/* Description + Cover side by side */}
      <div className={styles.twoColRow}>
        <div>
          {!showDescription ? (
            <button
              type="button"
              className={styles.addFieldLink}
              onClick={() => setIsDescriptionOpen(true)}
            >
              <IconPlus size={14} />
              <span>Add Description</span>
            </button>
          ) : (
            <div>
              <Group justify="space-between" align="center" mb={6}>
                <Text size="sm" fw={500} c="var(--text-primary)">
                  Description (Optional)
                </Text>
                <button
                  type="button"
                  className={styles.removeFieldLink}
                  onClick={() => {
                    formState.setRoomDescription("");
                    setIsDescriptionOpen(false);
                  }}
                >
                  <IconTrash size={13} />
                  <span>Remove</span>
                </button>
              </Group>
              <Textarea
                placeholder="What are we watching? Bring snacks!"
                value={formState.roomDescription}
                onChange={(e) => formState.setRoomDescription(e.target.value)}
                maxLength={200}
                rows={2}
                autoFocus
                styles={{
                  input: {
                    backgroundColor: "var(--surface-secondary)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  },
                }}
              />
              <div className={styles.inputHelp}>
                <span>Visible to invited guests</span>
                <span>{formState.roomDescription.length}/200</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <Text size="sm" fw={500} c="var(--text-primary)" mb={6}>
            Cover Photo (Optional)
          </Text>
          <div className={styles.coverUploadBox}>
            {formState.coverPreview ? (
              <div className={styles.coverThumbSmall}>
                <img src={formState.coverPreview} alt="Cover preview" />
              </div>
            ) : null}
            <Group gap="sm">
              <FileButton onChange={formState.handleCoverChange} accept="image/png,image/jpeg,image/webp">
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    color="violet"
                    size="xs"
                    leftSection={<IconPhotoPlus size={16} />}
                  >
                    {formState.coverPreview ? "Change" : "Upload"}
                  </Button>
                )}
              </FileButton>
              {formState.coverPreview && (
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={formState.handleRemoveCover}
                  leftSection={<IconTrash size={14} />}
                >
                  Remove
                </Button>
              )}
            </Group>
          </div>
          <Text size="xs" c="dimmed" mt={4}>
            16:9, max 1MB (PNG, JPG, WebP)
          </Text>
        </div>
      </div>

      {/* Passcode (and Duration if not hidden) */}
      {hideDuration ? (
        <div>
          <PasswordInput
            label="Room Passcode (Optional)"
            placeholder="Leave empty for public access"
            value={formState.passcode}
            onChange={(e) => formState.setPasscode(e.target.value)}
            size="md"
            leftSection={<IconLock size={18} color="var(--text-muted)" />}
            styles={{
              input: {
                backgroundColor: "var(--surface-secondary)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-primary)",
              },
            }}
          />
          <div className={styles.inputHelp}>
            <span>Anyone with the room link will need this passcode to enter</span>
          </div>
        </div>
      ) : (
        <div className={styles.twoColRow}>
          <div>
            <PasswordInput
              label="Room Passcode (Optional)"
              placeholder="Leave empty for public access"
              value={formState.passcode}
              onChange={(e) => formState.setPasscode(e.target.value)}
              size="md"
              leftSection={<IconLock size={18} color="var(--text-muted)" />}
              styles={{
                input: {
                  backgroundColor: "var(--surface-secondary)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                },
              }}
            />
            <div className={styles.inputHelp}>
              <span>Anyone with the room link will need this passcode to enter</span>
            </div>
          </div>

          <DurationSelect formState={formState} />
        </div>
      )}

      {/* Party Settings */}
      <div className={styles.settingsGroup}>
        <div className={styles.settingRow}>
          <div>
            <Text fw={500} size="sm" c="var(--text-primary)">
              Host Controls Only
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Only the host can control playback
            </Text>
          </div>
          <Switch
            checked={formState.lock}
            onChange={(e) => formState.setLock(e.currentTarget.checked)}
            color="violet"
            size="md"
          />
        </div>

        <div className={styles.settingRow}>
          <div>
            <Text fw={500} size="sm" c="var(--text-primary)">
              Waiting Lounge
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Require host approval before entry
            </Text>
          </div>
          <Switch
            checked={formState.isWaitingLoungeEnabled}
            onChange={(e) => formState.setIsWaitingLoungeEnabled(e.currentTarget.checked)}
            color="violet"
            size="md"
          />
        </div>

        <div className={styles.settingRow}>
          <div>
            <Text fw={500} size="sm" c="var(--text-primary)">
              Disable In-Room Chat
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Turn off text chat during the watch party
            </Text>
          </div>
          <Switch
            checked={formState.isChatDisabled}
            onChange={(e) => formState.setIsChatDisabled(e.currentTarget.checked)}
            color="violet"
            size="md"
          />
        </div>

        <div className={styles.settingRow}>
          <div>
            <Text fw={500} size="sm" c="var(--text-primary)">
              Make room permanent
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              Room stays available until manually ended
            </Text>
          </div>
          <Switch
            checked={formState.isPermanent}
            onChange={(e) => formState.setIsPermanent(e.currentTarget.checked)}
            color="violet"
            size="md"
          />
        </div>
      </div>
    </Stack>
  );
};
