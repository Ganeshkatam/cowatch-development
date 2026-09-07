import React, { useContext, useState } from "react";
import { createRoom } from "../TopBar/TopBar";
import {
  TextInput,
  Textarea,
  PasswordInput,
  Button,
  Switch,
  Container,
  Paper,
  Title,
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
  IconMessage,
  IconPlayerPlay,
  IconClock,
} from "@tabler/icons-react";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 10%, rgba(139, 92, 246, 0.12) 0%, transparent 60%), var(--bg-app)",
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <Container size="sm" style={{ width: "100%", maxWidth: "560px" }}>
        <Button
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => history.push("/rooms")}
          mb="md"
          style={{ alignSelf: "flex-start" }}
        >
          Back to My Rooms
        </Button>

        <Paper
          withBorder
          p={32}
          radius="xl"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 48px rgba(0, 0, 0, 0.3)",
          }}
        >
          <Title order={2} ta="center" mb="xs" fw={800} style={{ color: "var(--text-primary)" }}>
            Create a New Room
          </Title>
          <Text size="sm" c="dimmed" ta="center" mb="xl">
            Configure your room settings below. You can update these settings anytime while the room is active.
          </Text>

          {error && (
            <Alert color="red" mb="lg" title="Notice">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="xl">
              {/* Section 1: Room Identity */}
              <Box>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="md">
                  Room Identity
                </Text>
                <Stack gap="md">
                  <TextInput
                    label="Room Title"
                    required
                    withAsterisk
                    placeholder="e.g. Movie Night with Friends"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    maxLength={50}
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
                    <Text size="sm" fw={500} mb={6}>
                      Cover Photo
                    </Text>
                    <Group align="center" gap="md">
                      <Box
                        style={{
                          width: 160,
                          height: 90,
                          borderRadius: 10,
                          overflow: "hidden",
                          backgroundColor: "var(--bg-base)",
                          border: "1px solid var(--border-subtle)",
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
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
                      </Box>
                      <Stack gap="xs">
                        <FileButton onChange={handleCoverChange} accept="image/png,image/jpeg,image/webp">
                          {(props) => (
                            <Button
                              variant="default"
                              size="sm"
                              leftSection={<IconPhotoPlus size={16} />}
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
                        <Text size="xs" c="dimmed">
                          PNG, JPG, WebP up to 5MB
                        </Text>
                      </Stack>
                    </Group>
                  </Box>
                </Stack>
              </Box>

              <Divider />

              {/* Section 2: Security & Protection */}
              <Box>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="md">
                  Security
                </Text>
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
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="md">
                  Room Behavior
                </Text>
                <Stack gap="sm">
                  <Box
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Box>
                        <Group gap="xs">
                          <IconMessage size={16} color="var(--mantine-color-violet-4)" />
                          <Text fw={600} size="sm">
                            Live Chat
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" mt={2}>
                          Allow viewers to send text messages and reactions
                        </Text>
                      </Box>
                      <Switch
                        checked={!isChatDisabled}
                        onChange={(e) => setIsChatDisabled(!e.currentTarget.checked)}
                        color="violet"
                        size="md"
                      />
                    </Group>
                  </Box>

                  <Box
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Box>
                        <Group gap="xs">
                          <IconPlayerPlay size={16} color="var(--mantine-color-violet-4)" />
                          <Text fw={600} size="sm">
                            Host Controls Only
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" mt={2}>
                          Only room creators and hosts can control playback
                        </Text>
                      </Box>
                      <Switch
                        checked={lock}
                        onChange={(e) => setLock(e.currentTarget.checked)}
                        color="violet"
                        size="md"
                      />
                    </Group>
                  </Box>

                  <Box
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Box>
                        <Group gap="xs">
                          <IconClock size={16} color="var(--mantine-color-violet-4)" />
                          <Text fw={600} size="sm">
                            Permanent Room
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" mt={2}>
                          Never expires automatically (temporary rooms expire in 3 hours)
                        </Text>
                      </Box>
                      <Switch
                        checked={isPermanent}
                        onChange={(e) => setIsPermanent(e.currentTarget.checked)}
                        color="violet"
                        size="md"
                      />
                    </Group>
                  </Box>
                </Stack>
              </Box>

              <Button
                type="submit"
                size="lg"
                variant="gradient"
                gradient={{ from: "violet", to: "grape", deg: 135 }}
                disabled={loading || !roomTitle.trim()}
                leftSection={loading ? <Loader size={20} color="white" /> : <IconCirclePlusFilled size={20} />}
                mt="md"
                radius="md"
                style={{ height: "48px" }}
              >
                {loading ? "Creating Room..." : "Create Room"}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </div>
  );
};
