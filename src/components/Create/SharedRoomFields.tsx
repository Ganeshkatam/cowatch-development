import React from "react";
import {
  TextInput,
  Textarea,
  PasswordInput,
  Switch,
  Text,
  FileButton,
  Group,
  Stack,
  Box,
  Divider,
  Select,
  Button,
} from "@mantine/core";
import {
  IconPhotoPlus,
  IconTrash,
  IconLock,
  IconPlayerPlay,
  IconArmchair,
  IconClock,
  IconInfinity,
  IconMessage,
} from "@tabler/icons-react";
import type { RoomFormState } from "./roomCreationDomain";
import styles from "./Create.module.css";

interface SharedRoomFieldsProps {
  formState: RoomFormState;
}

export const SharedRoomFields: React.FC<SharedRoomFieldsProps> = ({ formState }) => {
  return (
    <Stack gap="xl">
      {/* Section 1: Room Identity */}
      <Box>
        <div className={styles.sectionHeader}>Room Identity</div>
        <Stack gap="md">
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
            <div className={styles.inputHelp}>
              <span>A clear, memorable name for your party</span>
              <span>{formState.roomTitle.length}/50</span>
            </div>
          </div>

          <div>
            <Textarea
              label="Description (Optional)"
              placeholder="What are we watching? Bring snacks!"
              value={formState.roomDescription}
              onChange={(e) => formState.setRoomDescription(e.target.value)}
              maxLength={200}
              rows={2}
              styles={{
                input: {
                  backgroundColor: "var(--surface-secondary)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                },
              }}
            />
            <div className={styles.inputHelp}>
              <span>Visible to invited guests on the preview card</span>
              <span>{formState.roomDescription.length}/200</span>
            </div>
          </div>

          <div>
            <Text size="sm" fw={600} c="var(--text-primary)" mb={6}>
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
                      {formState.coverPreview ? "Change Cover" : "Upload Cover Image"}
                    </Button>
                  )}
                </FileButton>
                {formState.coverPreview && (
                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={formState.handleRemoveCover}
                    leftSection={<IconTrash size={16} />}
                  >
                    Remove
                  </Button>
                )}
              </Group>
            </div>
            <Text size="xs" c="dimmed" mt={4}>
              Recommended ratio 16:9, max file size 1MB (PNG, JPG, WebP)
            </Text>
          </div>
        </Stack>
      </Box>

      <Divider />

      {/* Section 2: Access & Security */}
      <Box>
        <div className={styles.sectionHeader}>Access & Security</div>
        <Stack gap="md">
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
        </Stack>
      </Box>

      <Divider />

      {/* Section 3: Party Settings */}
      <Box>
        <div className={styles.sectionHeader}>Party Settings</div>
        <Stack gap="md">
          <div className={styles.switchCard}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="md" wrap="nowrap">
                <div className={styles.switchIconWrap}>
                  <IconPlayerPlay size={18} />
                </div>
                <div>
                  <Text fw={600} size="sm" c="var(--text-primary)">
                    Host Controls Only
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    Only room creators and hosts can control playback and seek
                  </Text>
                </div>
              </Group>
              <Switch
                checked={formState.lock}
                onChange={(e) => formState.setLock(e.currentTarget.checked)}
                color="violet"
                size="md"
              />
            </Group>
          </div>

          <div className={styles.switchCard}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="md" wrap="nowrap">
                <div className={styles.switchIconWrap}>
                  <IconArmchair size={18} />
                </div>
                <div>
                  <Text fw={600} size="sm" c="var(--text-primary)">
                    Waiting Lounge
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    Require host approval before participants can enter the room
                  </Text>
                </div>
              </Group>
              <Switch
                checked={formState.isWaitingLoungeEnabled}
                onChange={(e) => formState.setIsWaitingLoungeEnabled(e.currentTarget.checked)}
                color="violet"
                size="md"
              />
            </Group>
          </div>

          <div className={styles.switchCard}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="md" wrap="nowrap">
                <div className={styles.switchIconWrap}>
                  <IconMessage size={18} />
                </div>
                <div>
                  <Text fw={600} size="sm" c="var(--text-primary)">
                    Disable In-Room Chat
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    Turn off text chat during the watch party
                  </Text>
                </div>
              </Group>
              <Switch
                checked={formState.isChatDisabled}
                onChange={(e) => formState.setIsChatDisabled(e.currentTarget.checked)}
                color="violet"
                size="md"
              />
            </Group>
          </div>

          <div className={styles.switchCard}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="md" wrap="nowrap">
                <div className={styles.switchIconWrap}>
                  {formState.isPermanent ? <IconInfinity size={18} /> : <IconClock size={18} />}
                </div>
                <div>
                  <Text fw={600} size="sm" c="var(--text-primary)">
                    No automatic expiration
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    Room stays available until manually ended or deleted
                  </Text>
                </div>
              </Group>
              <Switch
                checked={formState.isPermanent}
                onChange={(e) => formState.setIsPermanent(e.currentTarget.checked)}
                color="violet"
                size="md"
              />
            </Group>
          </div>

          {!formState.isPermanent && (
            <div className={styles.switchCard}>
              <Group gap="md" wrap="nowrap" mb="xs">
                <div className={styles.switchIconWrap}>
                  <IconClock size={18} />
                </div>
                <div style={{ flex: "1 1 auto" }}>
                  <Text fw={600} size="sm" c="var(--text-primary)">
                    Session Duration
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    How long the room stays active once the host starts it
                  </Text>
                </div>
              </Group>
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
                styles={{
                  input: {
                    backgroundColor: "var(--surface-secondary)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  },
                }}
              />
              <Text size="xs" c="dimmed" mt={6}>
                The expiration countdown starts only when you start the watch party.
              </Text>
            </div>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};
