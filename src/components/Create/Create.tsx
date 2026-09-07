import React, { useContext, useState } from "react";
import { createRoom } from "../TopBar/TopBar";
import {
  TextInput,
  Textarea,
  PasswordInput,
  Button,
  Switch,
  Badge,
  Text,
  Alert,
  Loader,
  FileButton,
  Group,
  Stack,
  Box,
  Divider,
} from "@mantine/core";
import { supabase, getAccessToken } from "../../utils/supabaseClient";
import { serverPath, addAndSavePasscode } from "../../utils/utils";
import { MetadataContext } from "../../MetadataContext";
import { useHistory } from "react-router-dom";
import {
  IconCirclePlusFilled,
  IconArrowLeft,
  IconPhotoPlus,
  IconTrash,
  IconLock,
  IconLockOpen,
  IconMessage,
  IconPlayerPlay,
  IconClock,
  IconInfinity,
  IconInfoCircle,
  IconArmchair,
} from "@tabler/icons-react";
import styles from "./Create.module.css";

export const Create = () => {
  const { user } = useContext(MetadataContext);
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [roomTitle, setRoomTitle] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [passcode, setPasscode] = useState("");

  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const [lock, setLock] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);
  const [isWaitingLoungeEnabled, setIsWaitingLoungeEnabled] = useState(false);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleCoverChange = (file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Cover photo too large (max 5MB).");
        return;
      }
      setError("");
      setCoverPhotoFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveCover = () => {
    setCoverPhotoFile(null);
    setCoverPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle.trim()) {
      setError("Room title is required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const roomName = await createRoom(
        user,
        false,
        new URLSearchParams(window.location.search).get("video") ?? "",
        {
          roomTitle: roomTitle.trim(),
          roomDescription: roomDescription || undefined,
          passcode: passcode || undefined,
          isPermanent,
          isChatDisabled,
          isWaitingLoungeEnabled,
          lock,
          noRedirect: true,
        }
      );

      if (passcode) {
        addAndSavePasscode(roomName, passcode);
      }

      if (coverPhotoFile && user) {
        if (coverPhotoFile.size > 5 * 1024 * 1024) {
          console.error("Cover photo too large (max 5MB).");
        } else {
          const fileExt = coverPhotoFile.name.split('.').pop();
          const safeRoomId = roomName.startsWith("/") ? roomName.substring(1) : roomName;
          const filePath = `${user.id}/${safeRoomId}/cover.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('room_covers')
            .upload(filePath, coverPhotoFile);
            
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('room_covers').getPublicUrl(filePath);
            await fetch(`${serverPath}/updateRoomCover`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uid: user.id,
                token: await getAccessToken(),
                roomId: roomName,
                coverPhoto: publicUrlData.publicUrl
              })
            }).catch(e => console.error("Failed to update room cover", e));
          } else {
            console.error("Cover upload failed", uploadError);
          }
        }
      }

      const finalRoomId = roomName.startsWith("/") ? roomName.substring(1) : roomName;
      window.location.assign(`/watch/${finalRoomId}`);
    } catch (err: any) {
      console.error("Room creation error:", err);
      setError(err.message || "Failed to create room.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Top Navigation */}
        <div className={styles.topNav}>
          <button
            type="button"
            className={styles.breadcrumbLink}
            onClick={() => history.push("/rooms")}
          >
            <IconArrowLeft size={16} />
            <span>Back to My Rooms</span>
          </button>
          <Badge variant="light" color="violet" size="lg" radius="sm">
            New Watch Party
          </Badge>
        </div>

        {/* Responsive Grid Layout */}
        <div className={styles.layoutGrid}>
          {/* Left Column: Form Configuration */}
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Create a New Room</h1>
              <p className={styles.formSubtitle}>
                Configure your room identity, access security, and preferences. You can update these settings anytime while the room is active.
              </p>
            </div>

            {error && (
              <Alert color="red" mb="lg" title="Notice">
                {error}
              </Alert>
            )}

            <form id="create-room-form" onSubmit={handleSubmit}>
              <Stack gap="xl">
                {/* Section 1: Room Identity */}
                <Box>
                  <div className={styles.sectionHeader}>Room Identity</div>
                  <Stack gap="md">
                    <TextInput
                      label="Room Title"
                      required
                      withAsterisk
                      placeholder="e.g. Movie Night with Friends"
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      maxLength={50}
                      size="md"
                    />

                    <Textarea
                      label="Room Description"
                      placeholder="e.g. Watching some movies together!"
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      maxLength={120}
                      autosize
                      minRows={2}
                    />

                    <Box>
                      <Text size="sm" fw={500} mb={8}>
                        Cover Photo
                      </Text>
                      <div className={styles.coverUploadBox}>
                        <div className={styles.coverThumbSmall}>
                          {coverPreview ? (
                            <img
                              src={coverPreview}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              alt="Cover Preview"
                            />
                          ) : (
                            <Text size="xs" c="dimmed" ta="center" px="xs">
                              No cover selected
                            </Text>
                          )}
                        </div>
                        <Stack gap="xs" style={{ flex: 1 }}>
                          <Group gap="xs">
                            <FileButton onChange={handleCoverChange} accept="image/png,image/jpeg,image/webp">
                              {(props) => (
                                <Button
                                  variant="default"
                                  size="xs"
                                  leftSection={<IconPhotoPlus size={14} />}
                                  {...props}
                                >
                                  {coverPreview ? "Change Photo" : "Upload Photo"}
                                </Button>
                              )}
                            </FileButton>
                            {coverPreview && (
                              <Button
                                variant="subtle"
                                color="red"
                                size="xs"
                                leftSection={<IconTrash size={14} />}
                                onClick={handleRemoveCover}
                              >
                                Remove
                              </Button>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed">
                            PNG, JPG, WebP up to 5MB (16:9 ratio recommended)
                          </Text>
                        </Stack>
                      </div>
                    </Box>
                  </Stack>
                </Box>

                <Divider />

                {/* Section 2: Security & Protection */}
                <Box>
                  <div className={styles.sectionHeader}>Security</div>
                  <PasswordInput
                    label="Room Passcode (Optional)"
                    description="Leave empty for an open public room, or set a password to require guests to authenticate."
                    placeholder="Enter passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    leftSection={<IconLock size={16} color="var(--mantine-color-dimmed)" />}
                  />
                </Box>

                <Divider />

                {/* Section 3: Room Behavior & Preferences */}
                <Box>
                  <div className={styles.sectionHeader}>Room Behavior</div>
                  <Stack gap="sm">
                    <div className={styles.switchCard}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap="md" wrap="nowrap">
                          <div className={styles.switchIconWrap}>
                            <IconMessage size={18} />
                          </div>
                          <div>
                            <Text fw={600} size="sm" c="var(--text-primary)">
                              Live Chat
                            </Text>
                            <Text size="xs" c="dimmed" mt={2}>
                              Allow viewers to send messages and reactions in real-time
                            </Text>
                          </div>
                        </Group>
                        <Switch
                          checked={!isChatDisabled}
                          onChange={(e) => setIsChatDisabled(!e.currentTarget.checked)}
                          color="violet"
                          size="md"
                        />
                      </Group>
                    </div>

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
                          checked={lock}
                          onChange={(e) => setLock(e.currentTarget.checked)}
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
                          checked={isWaitingLoungeEnabled}
                          onChange={(e) => setIsWaitingLoungeEnabled(e.currentTarget.checked)}
                          color="violet"
                          size="md"
                        />
                      </Group>
                    </div>

                    <div className={styles.switchCard}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap="md" wrap="nowrap">
                          <div className={styles.switchIconWrap}>
                            {isPermanent ? <IconInfinity size={18} /> : <IconClock size={18} />}
                          </div>
                          <div>
                            <Text fw={600} size="sm" c="var(--text-primary)">
                              Permanent Room
                            </Text>
                            <Text size="xs" c="dimmed" mt={2}>
                              Never expires automatically (temporary rooms expire in 3 hours)
                            </Text>
                          </div>
                        </Group>
                        <Switch
                          checked={isPermanent}
                          onChange={(e) => setIsPermanent(e.currentTarget.checked)}
                          color="violet"
                          size="md"
                        />
                      </Group>
                    </div>
                  </Stack>
                </Box>

                {/* Submit button inside form (convenient on tablet & mobile) */}
                <Button
                  type="submit"
                  size="lg"
                  variant="gradient"
                  gradient={{ from: "violet", to: "grape", deg: 135 }}
                  disabled={loading || !roomTitle.trim()}
                  leftSection={loading ? <Loader size={20} color="white" /> : <IconCirclePlusFilled size={20} />}
                  mt="md"
                  className={styles.createBtnPrimary}
                >
                  {loading ? "Creating Room..." : "Create Room"}
                </Button>
              </Stack>
            </form>
          </div>

          {/* Right Column: Interactive Live Preview Card */}
          <div className={styles.previewColumn}>
            <div className={styles.previewCard}>
              <div className={styles.previewHeaderBar}>
                <Group gap="xs" align="center">
                  <div className={styles.pulsingDot} />
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1}>
                    Live Room Preview
                  </Text>
                </Group>
                <Badge
                  variant="light"
                  color={passcode ? "yellow" : "teal"}
                  size="xs"
                  leftSection={passcode ? <IconLock size={11} /> : <IconLockOpen size={11} />}
                >
                  {passcode ? "Protected" : "Public"}
                </Badge>
              </div>

              <div className={styles.previewBanner}>
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    className={styles.previewCoverImg}
                    alt="Room Cover"
                  />
                ) : null}
                <div className={styles.previewScrim} />
                <div className={styles.previewBannerInfo}>
                  <h3 className={styles.previewRoomTitle}>
                    {roomTitle.trim() || "Untitled Room"}
                  </h3>
                  <p className={styles.previewRoomDescription}>
                    {roomDescription.trim() || "A shared space to watch videos together in sync with friends."}
                  </p>
                </div>
              </div>

              <div className={styles.previewBody}>
                <div className={styles.previewBadgesRow}>
                  <Badge
                    variant="outline"
                    color={isPermanent ? "teal" : "orange"}
                    size="sm"
                    leftSection={isPermanent ? <IconInfinity size={12} /> : <IconClock size={12} />}
                  >
                    {isPermanent ? "Permanent Room" : "3-Hour Session"}
                  </Badge>
                  <Badge
                    variant="outline"
                    color={isWaitingLoungeEnabled ? "grape" : "gray"}
                    size="sm"
                    leftSection={<IconArmchair size={12} />}
                  >
                    {isWaitingLoungeEnabled ? "Lounge Active" : "Direct Entry"}
                  </Badge>
                  <Badge
                    variant="outline"
                    color={!isChatDisabled ? "violet" : "gray"}
                    size="sm"
                    leftSection={<IconMessage size={12} />}
                  >
                    {!isChatDisabled ? "Chat Enabled" : "Chat Disabled"}
                  </Badge>
                  <Badge
                    variant="outline"
                    color={lock ? "indigo" : "cyan"}
                    size="sm"
                    leftSection={<IconPlayerPlay size={12} />}
                  >
                    {lock ? "Host Controls" : "Open Controls"}
                  </Badge>
                </div>

                <div className={styles.previewInfoNote}>
                  <IconInfoCircle size={18} color="var(--color-violet)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    Once created, you will get an instant invite link and room code to share with friends.
                  </span>
                </div>

                <Button
                  type="submit"
                  form="create-room-form"
                  size="lg"
                  variant="gradient"
                  gradient={{ from: "violet", to: "grape", deg: 135 }}
                  disabled={loading || !roomTitle.trim()}
                  leftSection={loading ? <Loader size={20} color="white" /> : <IconCirclePlusFilled size={20} />}
                  className={styles.createBtnPrimary}
                  fullWidth
                >
                  {loading ? "Creating Room..." : "Create Room"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
