import React, { useState, useRef, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  Badge,
  Button,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Textarea,
  Switch,
  PasswordInput,
  Divider,
  Group,
  Stack,
  Text,
  Box,
  FileButton,
  Tooltip,
  Alert,
} from "@mantine/core";
import {
  IconTrash,
  IconCopy,
  IconPlayerPlayFilled,
  IconSettings,
  IconLock,
  IconLockOpen,
  IconMessage,
  IconPhotoPlus,
  IconDots,
  IconPlayerStop,
  IconHourglassHigh,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconInfinity,
} from "@tabler/icons-react";
import { type RoomSummary } from "./MyRooms";
import {
  getRoomUrl,
  serverPath,
  addAndSavePasscode,
  getSavedPasscodes,
  removeSavedPasscode,
} from "../../utils/utils";
import { supabase, getAccessToken } from "../../utils/supabaseClient";
import styles from "./MyRooms.module.css";

// --- Pure Helpers ---

const getComputedState = (room: RoomSummary) => {
  if (room.status === "expired") return "Expired";
  if (room.status === "ended") return "Ended";
  if (room.isPermanent) return "Permanent";
  if (!room.expiresAt) return "Permanent";
  const now = Date.now();
  const exp = new Date(room.expiresAt).getTime();
  if (exp <= now) return "Expired";
  return "Active";
};

const RoomStatusBadge = ({ status, isPermanent }: { status: string; isPermanent: boolean }) => {
  if (status === "active") return <Badge color="teal" variant="filled" size="sm">● ACTIVE</Badge>;
  if (status === "expiring") return <Badge color="orange" variant="filled" size="sm">● EXPIRING SOON</Badge>;
  if (status === "expired" || status === "ended") return <Badge color="gray" variant="filled" size="sm">● ENDED</Badge>;
  if (status === "scheduled") return <Badge color="blue" variant="filled" size="sm">● SCHEDULED</Badge>;
  return <Badge color="yellow" variant="filled" size="sm">● INACTIVE</Badge>;
};

const formatTimeLeft = (expiresAt: string | null, status: string, isPermanent: boolean) => {
  if (status === "expired" || status === "ended") return <span className={styles.lifecycleText}>Room ended</span>;
  if (isPermanent) {
    return (
      <span className={styles.lifecycleBadge}>
        <IconInfinity size={13} color="var(--color-teal)" />
        <span>Permanent</span>
      </span>
    );
  }
  if (status !== "active" && status !== "expiring") return <span className={styles.lifecycleText}>Inactive</span>;

  if (!expiresAt) return null;

  const now = Date.now();
  const diff = new Date(expiresAt).getTime() - now;

  if (diff <= 0) return <span className={styles.lifecycleText}>Expired</span>;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (status === "expiring") {
    return (
      <span className={styles.lifecycleExpiring}>
        <IconHourglassHigh size={13} />
        <span>{minutes}m remaining</span>
      </span>
    );
  }

  return (
    <span className={styles.lifecycleBadge}>
      <IconClock size={13} color="var(--color-violet)" />
      <span>Expires in {hours > 0 ? `${hours}h ` : ''}{minutes}m</span>
    </span>
  );
};

// --- Shared Edit Modal ---
export const EditRoomModal = ({
  room,
  opened,
  onClose,
  onSuccess,
}: {
  room: RoomSummary;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const computedState = getComputedState(room);
  const isExpired = Boolean(
    computedState === "Expired" ||
    computedState === "Ended" ||
    room.status === "expired" ||
    room.status === "ended" ||
    (!room.isPermanent && room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now())
  );

  const cleanId = room.roomId.startsWith("/") ? room.roomId.substring(1) : room.roomId;
  const initialPasscode =
    room.currentPasscode ||
    getSavedPasscodes()[room.roomId] ||
    getSavedPasscodes()[cleanId] ||
    getSavedPasscodes()[`/${cleanId}`] ||
    "";

  const [title, setTitle] = useState(room.roomTitle || "");
  const [description, setDescription] = useState(room.roomDescription || "");
  const [isPermanent, setIsPermanent] = useState(Boolean(room.isPermanent));
  const [isChatDisabled, setIsChatDisabled] = useState(room.isChatDisabled || false);

  // Password management
  const [currentPassword, setCurrentPassword] = useState(initialPasscode);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [copiedCurrentPassword, setCopiedCurrentPassword] = useState(false);
  const [removeProtection, setRemoveProtection] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(room.coverPhoto || null);
  const [removeCover, setRemoveCover] = useState(false);

  useEffect(() => {
    if (opened) {
      const saved =
        room.currentPasscode ||
        getSavedPasscodes()[room.roomId] ||
        getSavedPasscodes()[cleanId] ||
        getSavedPasscodes()[`/${cleanId}`] ||
        "";
      setCurrentPassword(saved);
      setShowCurrentPassword(false);
      setCopiedCurrentPassword(false);
      setRemoveProtection(false);
      setPassword("");
      setPasswordConfirm("");
      setError("");
      setTitle(room.roomTitle || "");
      setDescription(room.roomDescription || "");
      setIsPermanent(Boolean(room.isPermanent));
      setIsChatDisabled(room.isChatDisabled || false);
      setCoverPreview(room.coverPhoto || null);
      setCoverFile(null);
      setRemoveCover(false);
    }
  }, [opened, room, cleanId]);

  const handleCopyCurrentPassword = () => {
    if (!currentPassword) return;
    navigator.clipboard.writeText(currentPassword);
    setCopiedCurrentPassword(true);
    setTimeout(() => setCopiedCurrentPassword(false), 2000);
  };

  const handleFileChange = (payload: File | null) => {
    if (isExpired) return;
    if (payload) {
      if (payload.size > 5 * 1024 * 1024) {
        setError("Cover photo too large (max 5MB).");
        return;
      }
      setCoverFile(payload);
      setCoverPreview(URL.createObjectURL(payload));
      setRemoveCover(false);
    }
  };

  const handleRemoveCover = () => {
    if (isExpired) return;
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
  };

  const handleSave = async () => {
    if (isExpired) {
      setError("This room has expired and can no longer be edited.");
      return;
    }
    setError("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Room title is required.");
      return;
    }
    if (trimmedTitle.length > 50) {
      setError("Room title must be under 50 characters.");
      return;
    }
    if (description.length > 500) {
      setError("Description must be under 500 characters.");
      return;
    }
    if (!removeProtection && password && password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const token = await getAccessToken();
      if (!user) throw new Error("Not logged in");

      let finalCoverUrl = room.coverPhoto;

      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const safeRoomId = room.roomId.startsWith("/") ? room.roomId.substring(1) : room.roomId;
        const folderPath = `${user.id}/${safeRoomId}`;

        // Clean up old cover files in folder to prevent orphans
        try {
          const { data: oldFiles } = await supabase.storage.from('room_covers').list(folderPath);
          if (oldFiles && oldFiles.length > 0) {
            await supabase.storage.from('room_covers').remove(oldFiles.map(f => `${folderPath}/${f.name}`));
          }
        } catch (_) {}

        const filePath = `${folderPath}/cover.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('room_covers')
          .upload(filePath, coverFile, { upsert: true });
        
        if (uploadError) {
          throw uploadError;
        }
        
        const { data: publicUrlData } = supabase.storage.from('room_covers').getPublicUrl(filePath);
        finalCoverUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      const payloadPassword = removeProtection ? "" : (password ? password.trim() : undefined);

      const response = await fetch(`${serverPath}/updateRoomSettings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.id,
          token,
          roomId: room.roomId,
          roomTitle: trimmedTitle,
          roomDescription: description,
          isPermanent,
          isChatDisabled,
          removePassword: removeProtection,
          password: payloadPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save room settings");

      if (removeProtection) {
        removeSavedPasscode(room.roomId);
        setCurrentPassword("");
      } else if (password) {
        addAndSavePasscode(room.roomId, password.trim());
        setCurrentPassword(password.trim());
      }

      if (removeCover && room.coverPhoto) {
        await fetch(`${serverPath}/updateRoomCover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.id, token, roomId: room.roomId, coverPhoto: null }),
        });
      } else if (coverFile && finalCoverUrl && finalCoverUrl !== room.coverPhoto) {
         await fetch(`${serverPath}/updateRoomCover`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ uid: user.id, token, roomId: room.roomId, coverPhoto: finalCoverUrl }),
         });
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to update room settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      title={
        <Box>
          <Text fw={700} size="lg" c="var(--text-primary)">
            Edit Room
          </Text>
          <Text size="xs" c="dimmed" mt={2}>
            Update how your room appears and behaves.
          </Text>
        </Box>
      }
      size={640}
      radius="lg"
      padding={0}
      styles={{
        content: {
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          maxHeight: "calc(90dvh)",
          display: "flex",
          flexDirection: "column",
          width: "100%",
        },
        header: {
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "16px 20px",
          color: "var(--text-primary)",
        },
        body: {
          padding: 0,
          display: "flex",
          flexDirection: "column",
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "hidden",
        },
        close: {
          color: "var(--text-secondary)",
        },
      }}
    >
      {/* SCROLLABLE FORM BODY */}
      <Box
        style={{
          padding: "20px",
          overflowY: "auto",
          flex: "1 1 auto",
          overscrollBehavior: "contain",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {isExpired && (
          <Alert color="red" variant="light" title="Room Closed" icon={<IconAlertCircle size={16} />}>
            This room has expired or ended. Closed rooms can no longer be edited.
          </Alert>
        )}
        {error && (
          <Alert color="red" variant="light" title="Error" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        {/* ROOM IDENTITY */}
        <Box style={isExpired ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="md">
            Room Identity
          </Text>
          <Stack gap="md">
            <TextInput
              label="Room Title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              maxLength={50}
              required
              disabled={isExpired}
              placeholder="Enter room title..."
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              maxLength={500}
              autosize
              minRows={2}
              maxRows={4}
              disabled={isExpired}
              placeholder="What is this watch party about? (optional)"
            />

            <Box>
              <Text size="sm" fw={500} mb={6}>Cover Photo</Text>
              <Group align="flex-start" gap="md" wrap="wrap">
                <Box
                  style={{
                    width: 160,
                    height: 90,
                    maxWidth: "100%",
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-base)',
                    border: '1px solid var(--border-subtle)',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      alt="Cover Preview"
                    />
                  ) : (
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      No cover
                    </Text>
                  )}
                </Box>
                {!isExpired && (
                  <Stack gap="xs" justify="center" style={{ flex: "1 1 180px" }}>
                    <Group gap="xs">
                      <FileButton onChange={handleFileChange} accept="image/png,image/jpeg,image/webp">
                        {(props) => (
                          <Button variant="default" size="xs" {...props}>
                            Change cover
                          </Button>
                        )}
                      </FileButton>
                      {coverPreview && (
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          onClick={handleRemoveCover}
                        >
                          Remove
                        </Button>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      Recommended 16:9 ratio (PNG, JPG, WEBP, max 5MB).
                    </Text>
                  </Stack>
                )}
              </Group>
            </Box>
          </Stack>
        </Box>

        <Divider style={{ borderColor: "var(--border-subtle)" }} />

        {/* ROOM BEHAVIOR */}
        <Box style={isExpired ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="md">
            Room Behavior
          </Text>
          <Stack gap="lg">
            <Group justify="space-between" align="center" wrap="nowrap" gap="md">
              <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
                <Text fw={500}>Permanent Room</Text>
                <Text size="sm" c="dimmed">No automatic expiration</Text>
              </Box>
              <Switch
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.currentTarget.checked)}
                color="violet"
                size="md"
                disabled={isExpired}
                style={{ flexShrink: 0 }}
              />
            </Group>

            <Group justify="space-between" align="center" wrap="nowrap" gap="md">
              <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
                <Text fw={500}>Chat Enabled</Text>
                <Text size="sm" c="dimmed">Allow participants to send messages in this room</Text>
              </Box>
              <Switch
                checked={!isChatDisabled}
                onChange={(e) => setIsChatDisabled(!e.currentTarget.checked)}
                color="violet"
                size="md"
                disabled={isExpired}
                style={{ flexShrink: 0 }}
              />
            </Group>
          </Stack>
        </Box>

        <Divider style={{ borderColor: "var(--border-subtle)" }} />

        {/* PASSWORD PROTECTION */}
        <Box style={isExpired ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
          <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="xs">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1}>
              Password Protection
            </Text>
            {room.isPasscodeProtected && !removeProtection ? (
              <Badge color="violet" variant="light" leftSection={<IconLock size={12} />}>
                Protected
              </Badge>
            ) : removeProtection ? (
              <Badge color="red" variant="light" leftSection={<IconLockOpen size={12} />}>
                Will Be Removed
              </Badge>
            ) : (
              <Badge color="gray" variant="light" leftSection={<IconLockOpen size={12} />}>
                Unprotected
              </Badge>
            )}
          </Group>

          <Stack gap="md">
            {room.isPasscodeProtected && (
              <Box
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                {currentPassword ? (
                  <Stack gap="xs">
                    <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase">Current Password</Text>
                      <Button
                        variant="subtle"
                        color={removeProtection ? "violet" : "red"}
                        size="xs"
                        disabled={isExpired}
                        onClick={() => {
                          setRemoveProtection(!removeProtection);
                          if (!removeProtection) {
                            setPassword("");
                            setPasswordConfirm("");
                          }
                        }}
                      >
                        {removeProtection ? "Keep Password Protection" : "Remove Password"}
                      </Button>
                    </Group>
                    <TextInput
                      readOnly
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      rightSectionWidth={74}
                      rightSection={
                        <Group gap={4} pr={6}>
                          <Tooltip label={showCurrentPassword ? "Hide password" : "Show password"} withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              aria-label="Toggle password visibility"
                            >
                              {showCurrentPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={copiedCurrentPassword ? "Copied!" : "Copy password"} withArrow>
                            <ActionIcon
                              variant="subtle"
                              color={copiedCurrentPassword ? "green" : "gray"}
                              size="sm"
                              onClick={handleCopyCurrentPassword}
                              aria-label="Copy current password"
                            >
                              {copiedCurrentPassword ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      }
                      styles={{
                        input: {
                          fontFamily: showCurrentPassword ? "inherit" : "monospace",
                          letterSpacing: showCurrentPassword ? "normal" : "2px",
                        },
                      }}
                    />
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                      <Group gap={6}>
                        <IconLock size={16} color="var(--mantine-color-violet-6)" />
                        <Text size="sm" fw={500}>Room is password-protected</Text>
                      </Group>
                      <Button
                        variant="subtle"
                        color={removeProtection ? "violet" : "red"}
                        size="xs"
                        disabled={isExpired}
                        onClick={() => {
                          setRemoveProtection(!removeProtection);
                          if (!removeProtection) {
                            setPassword("");
                            setPasswordConfirm("");
                          }
                        }}
                      >
                        {removeProtection ? "Keep Protection" : "Remove Password"}
                      </Button>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {removeProtection
                        ? "Password protection will be removed when you save changes."
                        : "Passcode is securely encrypted. Enter a new password below to update and view it, or click Remove Password to disable protection."}
                    </Text>
                  </Stack>
                )}
              </Box>
            )}

            {removeProtection ? (
              <Text size="sm" c="red" fw={500}>
                Password protection will be removed when you click Save Changes.
              </Text>
            ) : (
              <Stack gap="sm">
                <Text size="xs" c="dimmed">
                  {room.isPasscodeProtected
                    ? "Enter a new password to change or update protection. Leave blank to keep current settings."
                    : "Enter a password to require guests to enter a passcode before joining. Leave blank for an open room."}
                </Text>
                <PasswordInput
                  label={room.isPasscodeProtected ? "New password" : "Set password"}
                  placeholder={room.isPasscodeProtected ? "Leave blank to keep current" : "Enter password (optional)"}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  disabled={isExpired}
                />
                {password.length > 0 && (
                  <PasswordInput
                    label="Confirm password"
                    placeholder="Confirm new password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.currentTarget.value)}
                    disabled={isExpired}
                  />
                )}
              </Stack>
            )}
          </Stack>
        </Box>
      </Box>

      {/* FIXED / STICKY FOOTER */}
      <Box
        style={{
          padding: "14px 20px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated)",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <Button variant="default" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          loading={isSaving}
          disabled={isExpired}
          color="violet"
        >
          Save Changes
        </Button>
      </Box>
    </Modal>
  );
};

// --- Shared Action Hook ---
const useRoomActions = (room: RoomSummary, onDelete: (id: string) => void, onRefresh?: () => void, onUpdateCover?: (id: string, url: string) => void) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [endModalOpened, setEndModalOpened] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const history = useHistory();

  const handleCopy = () => {
    navigator.clipboard.writeText(getRoomUrl(room.roomId)).catch(console.error);
  };

  const handleDeleteClick = () => {
    setDeleteModalOpened(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(room.roomId);
      setDeleteModalOpened(false);
    } catch (err: any) {
      setActionError(err.message || "Failed to delete room");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEndRoomClick = () => {
    setEndModalOpened(true);
  };

  const confirmEndRoom = async () => {
    setIsEnding(true);
    try {
      const token = await getAccessToken();
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Please log in");
      const response = await fetch(`${serverPath}/endRoom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.data.user.id,
          token,
          roomId: room.roomId,
        }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Invalid response from server");
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || "Failed to end room");
      }
      setEndModalOpened(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (e: any) {
      setActionError(e.message || "Failed to end room");
    } finally {
      setIsEnding(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUpdateCover) return;
    
    const computedState = getComputedState(room);
    if (computedState === 'Expired' || computedState === 'Ended' || room.status === 'expired' || room.status === 'ended' || (!room.isPermanent && room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now())) {
      setActionError("Expired rooms cannot be edited.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      if (file.size > 5 * 1024 * 1024) throw new Error("Cover photo too large (max 5MB).");

      const fileExt = file.name.split('.').pop();
      const safeRoomId = room.roomId.startsWith("/") ? room.roomId.substring(1) : room.roomId;
      const folderPath = `${user.id}/${safeRoomId}`;

      // Clean up old cover files in folder to prevent orphans
      try {
        const { data: oldFiles } = await supabase.storage.from('room_covers').list(folderPath);
        if (oldFiles && oldFiles.length > 0) {
          await supabase.storage.from('room_covers').remove(oldFiles.map(f => `${folderPath}/${f.name}`));
        }
      } catch (_) {}

      const filePath = `${folderPath}/cover.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('room_covers').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage.from('room_covers').getPublicUrl(filePath);
      onUpdateCover(room.roomId, `${publicUrlData.publicUrl}?t=${Date.now()}`);
    } catch (e: any) {
      setActionError(e.message || "Failed to upload cover photo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const computedState = getComputedState(room);
  const isPermanent = computedState === 'Permanent';
  const urlPath = `/watch/${room.roomId.replace(/^\//, '')}`;
  const detailsPath = `/rooms/${room.roomId}`;

  const renderPrimary = () => {
    if (computedState === 'Expired' || computedState === 'Ended') {
      return (
        <Button
          variant="default"
          onClick={() => history.push(detailsPath)}
          radius="md"
          className={styles.cardPrimaryBtn}
        >
          Details
        </Button>
      );
    }
    return (
      <Button
        variant="gradient"
        gradient={{ from: "violet", to: "grape", deg: 135 }}
        onClick={() => history.push(urlPath)}
        leftSection={<IconPlayerPlayFilled size={14} />}
        radius="md"
        className={styles.cardPrimaryBtn}
      >
        Open Room
      </Button>
    );
  };

  const renderSecondary = () => {
    if (computedState === 'Expired' || computedState === 'Ended') return null;
    return (
      <Button
        variant="default"
        onClick={() => history.push(detailsPath)}
        radius="md"
        className={styles.cardSecondaryBtn}
      >
        Details
      </Button>
    );
  };

  const renderMenuItems = () => {
    const items = [];
    items.push(
      <Menu.Item key="copy" leftSection={<IconCopy size={14} />} onClick={handleCopy}>
        Copy Room Link
      </Menu.Item>
    );

    if (computedState !== 'Expired' && computedState !== 'Ended') {
      items.push(<Menu.Divider key="div1" />);

      items.push(
        <Menu.Item key="settings" leftSection={<IconSettings size={14} />} onClick={() => setEditModalOpened(true)}>
          Edit Room
        </Menu.Item>
      );
      items.push(
        <Menu.Item key="end" leftSection={<IconPlayerStop size={14} />} onClick={handleEndRoomClick}>
          End Room
        </Menu.Item>
      );
    }

    items.push(<Menu.Divider key="div2" />);
    items.push(
      <Menu.Item key="delete" color="red" leftSection={<IconTrash size={14} />} onClick={handleDeleteClick}>
        Delete Room
      </Menu.Item>
    );
    return items;
  };

  const renderModals = () => (
    <>
      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title="Delete Room"
        centered
      >
        <Text size="sm" mb="lg">
          Are you sure you want to delete <strong>{room.roomTitle || room.roomId}</strong> forever? All messages and room settings will be lost.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteModalOpened(false)}>
            Keep Room
          </Button>
          <Button color="red" onClick={confirmDelete} loading={isDeleting}>
            Delete Room
          </Button>
        </Group>
      </Modal>

      {/* END ROOM CONFIRMATION MODAL */}
      <Modal
        opened={endModalOpened}
        onClose={() => setEndModalOpened(false)}
        title="End Watch Party"
        centered
      >
        <Text size="sm" mb="lg">
          Are you sure you want to end <strong>{room.roomTitle || room.roomId}</strong>? Guests will no longer be able to watch or join this room.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setEndModalOpened(false)}>
            Cancel
          </Button>
          <Button color="orange" onClick={confirmEndRoom} loading={isEnding}>
            End Room
          </Button>
        </Group>
      </Modal>

      {/* ERROR / NOTICE MODAL */}
      <Modal
        opened={Boolean(actionError)}
        onClose={() => setActionError(null)}
        title="Notice"
        centered
      >
        <Text size="sm" mb="lg">
          {actionError}
        </Text>
        <Group justify="flex-end">
          <Button onClick={() => setActionError(null)} color="violet">
            OK
          </Button>
        </Group>
      </Modal>

      {/* EDIT ROOM MODAL */}
      <EditRoomModal
        room={room}
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
          else window.location.reload();
        }}
      />
    </>
  );

  return {
    isUploading,
    fileInputRef,
    handleFileUpload,
    renderPrimary,
    renderSecondary,
    renderMenuItems,
    renderModals,
  };
};

// --- View Components ---

const GridRoomCard = ({
  room,
  onDelete,
  onRefresh,
  onUpdateCover,
}: {
  room: RoomSummary;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
  onUpdateCover?: (id: string, url: string) => void;
}) => {
  const actions = useRoomActions(room, onDelete, onRefresh, onUpdateCover);
  const isPermanent = Boolean(room.isPermanent);
  const isClosed = Boolean(room.status === 'expired' || room.status === 'ended' || (!isPermanent && room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now()));
  const creationDate = new Date(room.creationTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className={styles.gridCard}>
      <div className={styles.gridCardCover}>
        {room.coverPhoto ? (
          <img src={room.coverPhoto} alt="Room Cover" className={styles.cover} />
        ) : (
          <div className={styles.coverPlaceholder}>WATCH PARTY</div>
        )}

        <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 10 }}>
          <RoomStatusBadge status={room.status} isPermanent={isPermanent} />
        </div>

        {!isClosed && onUpdateCover && (
          <>
            <ActionIcon
              variant="filled" color="dark" size="md" radius="md" loading={actions.isUploading}
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={(e) => { e.stopPropagation(); actions.fileInputRef.current?.click(); }}
            >
              <IconPhotoPlus size={16} color="white" />
            </ActionIcon>
            <input type="file" accept="image/*" ref={actions.fileInputRef} style={{ display: 'none' }} onChange={actions.handleFileUpload} />
          </>
        )}
      </div>

      <div className={styles.gridCardBody}>
        <h3 className={styles.roomTitle} title={room.roomTitle || "Watch Party Room"}>
          {room.roomTitle || "Watch Party Room"}
        </h3>
        <div className={styles.roomDescription}>
          {room.roomDescription || "No description provided."}
        </div>

        <div className={styles.roomMetadata}>
          <div className={styles.metaBadge}>
            {room.isPasscodeProtected ? (
              <>
                <IconLock size={12} color="var(--color-violet)" />
                <span>Protected</span>
              </>
            ) : (
              <>
                <IconLockOpen size={12} color="var(--text-muted)" />
                <span>Public</span>
              </>
            )}
          </div>
          <div className={styles.metaBadge}>
            <IconMessage size={12} color="var(--text-muted)" />
            <span>{room.isChatDisabled ? 'Chat off' : 'Chat on'}</span>
          </div>
          <div className={styles.metaDate}>{creationDate}</div>
        </div>

        <div className={styles.roomLifecycle}>
          {formatTimeLeft(room.expiresAt, room.status, isPermanent)}
        </div>
      </div>

      <div className={styles.roomActionsBar}>
        <div className={styles.actionButtons}>
          {actions.renderPrimary()}
          {actions.renderSecondary()}
        </div>
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="lg" radius="md" className={styles.cardDotsBtn}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {actions.renderMenuItems()}
          </Menu.Dropdown>
        </Menu>
      </div>

      {actions.renderModals()}
    </div>
  );
};

const StackRoomCard = ({
  room,
  onDelete,
  onRefresh,
  onUpdateCover,
}: {
  room: RoomSummary;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
  onUpdateCover?: (id: string, url: string) => void;
}) => {
  const actions = useRoomActions(room, onDelete, onRefresh, onUpdateCover);
  const isPermanent = Boolean(room.isPermanent);
  const isClosed = Boolean(room.status === 'expired' || room.status === 'ended' || (!isPermanent && room.expiresAt && new Date(room.expiresAt).getTime() <= Date.now()));
  const creationDate = new Date(room.creationTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className={styles.stackCard}>
      <div className={styles.stackCardCover}>
        {room.coverPhoto ? (
          <img src={room.coverPhoto} alt="Room Cover" className={styles.cover} />
        ) : (
          <div className={styles.coverPlaceholder}>WATCH PARTY</div>
        )}

        {!isClosed && onUpdateCover && (
          <>
            <ActionIcon
              variant="filled" color="dark" size="sm" radius="md" loading={actions.isUploading}
              style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={(e) => { e.stopPropagation(); actions.fileInputRef.current?.click(); }}
            >
              <IconPhotoPlus size={14} color="white" />
            </ActionIcon>
            <input type="file" accept="image/*" ref={actions.fileInputRef} style={{ display: 'none' }} onChange={actions.handleFileUpload} />
          </>
        )}
      </div>

      <div className={styles.stackCardContent}>
        <div className={styles.stackCardHeader}>
          <div className={styles.stackCardTitleBox}>
            <h3 className={styles.roomTitle} title={room.roomTitle || "Watch Party Room"}>
              {room.roomTitle || "Watch Party Room"}
            </h3>
            <div className={styles.roomDescription}>
              {room.roomDescription || "No description provided."}
            </div>
          </div>

          <div className={styles.stackCardLifecycleBox}>
            <RoomStatusBadge status={room.status} isPermanent={isPermanent} />
            {formatTimeLeft(room.expiresAt, room.status, isPermanent)}
          </div>
        </div>

        <div className={styles.stackCardBottom}>
          <div className={styles.roomMetadata} style={{ marginBottom: 0 }}>
            <div className={styles.metaItemValue}>
              {room.isPasscodeProtected ? (
                <>
                  <IconLock size={14} /> Protected
                </>
              ) : (
                <>
                  <IconLockOpen size={14} /> Public
                </>
              )}
            </div>
            <div className={styles.metaItemValue}>
              <IconMessage size={14} /> {room.isChatDisabled ? 'Chat disabled' : 'Chat enabled'}
            </div>
            <div className={styles.metaItemValue}>
              Created {creationDate}
            </div>
          </div>

          <div className={styles.actionButtons}>
            {actions.renderPrimary()}
            {actions.renderSecondary()}
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="lg" radius="md">
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {actions.renderMenuItems()}
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>
      </div>

      {actions.renderModals()}
    </div>
  );
};

// --- Main Wrapper ---

export const RoomCard = ({
  room,
  onDelete,
  onRefresh,
  onUpdateCover,
  viewMode,
}: {
  room: RoomSummary;
  onDelete: (id: string) => void;
  onRefresh?: () => void;
  onUpdateCover?: (id: string, url: string) => void;
  viewMode: 'grid' | 'stack';
}) => {
  if (viewMode === 'stack') {
    return <StackRoomCard room={room} onDelete={onDelete} onRefresh={onRefresh} onUpdateCover={onUpdateCover} />;
  }
  return <GridRoomCard room={room} onDelete={onDelete} onRefresh={onRefresh} onUpdateCover={onUpdateCover} />;
};
