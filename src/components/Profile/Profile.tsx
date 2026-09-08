import React, { useContext, useEffect, useState } from "react";
import { Modal, Button, Avatar, Switch, Text, Tabs, TextInput, SegmentedControl } from "@mantine/core";
import { useHistory } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { serverPath, openFileSelector } from "../../utils/utils";
import { MetadataContext } from "../../MetadataContext";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCircleCheckFilled,
  IconKeyFilled,
  IconLogout,
  IconTrashFilled,
  IconUpload,
  IconSettings,
  IconUser,
  IconLock,
  IconPencil,
} from "@tabler/icons-react";
import { useAppearance } from "../../theme/ThemeProvider";
import styles from "./Profile.module.css";

const AppearanceSelector = () => {
  const { appearance, setAppearance } = useAppearance();
  return (
    <SegmentedControl
      value={appearance}
      onChange={(value) => setAppearance(value as any)}
      data={[
        { label: "Light", value: "light" },
        { label: "Mantine", value: "mantine" },
        { label: "System", value: "system" },
      ]}
      color="violet"
    />
  );
};

export const Profile: React.FC = () => {
  const metadata = useContext(MetadataContext);
  const { user, profile, displayName: ctxDisplayName, avatarUrl: ctxAvatarUrl, setMetadata } = metadata;
  const history = useHistory();

  const [resetDisabled, setResetDisabled] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [originalDisplayName, setOriginalDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const [prefShowChatColumn, setPrefShowChatColumn] = useState(true);
  const [prefShowPeopleColumn, setPrefShowPeopleColumn] = useState(false);
  const [prefDisableChatSound, setPrefDisableChatSound] = useState(false);
  const [prefCameraOn, setPrefCameraOn] = useState(false);
  const [prefMicOn, setPrefMicOn] = useState(false);

  // Sync profile safely when context updates, avoiding infinite loops
  useEffect(() => {
    if (user) {
      const effectiveName =
        ctxDisplayName && ctxDisplayName !== "Guest"
          ? ctxDisplayName
          : (profile?.display_name || user.email?.split("@")[0] || "");

      setDisplayName((prev) => prev || effectiveName);
      setOriginalDisplayName(effectiveName);

      if (profile) {
        setPrefShowChatColumn(profile.pref_show_chat_column ?? true);
        setPrefShowPeopleColumn(profile.pref_show_people_column ?? false);
        setPrefDisableChatSound(profile.pref_disable_chat_sound ?? false);
        setPrefCameraOn(profile.pref_camera_on ?? false);
        setPrefMicOn(profile.pref_mic_on ?? false);
      }
    }
  }, [user, profile, ctxDisplayName]);

  const handleBack = () => {
    if (window.history.length > 1) {
      history.goBack();
    } else {
      history.push("/");
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const resetPassword = async () => {
    try {
      if (user?.email) {
        await supabase.auth.resetPasswordForEmail(user.email);
        setResetDisabled(true);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const uploadAvatar = async () => {
    if (!user) return;
    const prevAvatarUrl = ctxAvatarUrl;
    try {
      const files = await openFileSelector("image/*");
      if (!files || files.length === 0) return;
      const file = files[0];
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        alert("Only JPG, PNG, and WebP images are allowed.");
        return;
      }
      // 1MB limit (matches Supabase bucket configuration)
      if (file.size > 1 * 1024 * 1024) {
        alert("Image must be smaller than 1MB.");
        return;
      }

      const uniqueTimestamp = Date.now();
      const filePath = `${user.id}/profile_${uniqueTimestamp}.${fileExt}`;

      // Optimistically update the UI with a local preview instantly
      const previewUrl = URL.createObjectURL(file);
      setMetadata({ avatarUrl: previewUrl });

      // Clean up previous avatars in the user's folder
      const { data: existingFiles } = await supabase.storage.from("avatars").list(user.id);
      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map((x) => `${user.id}/${x.name}`);
        const { error: removeError } = await supabase.storage.from("avatars").remove(filesToRemove);
        if (removeError) {
          console.warn("Avatar cleanup warning:", removeError);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update public.profiles authoritative source FIRST
      const { error: dbError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("DB update failed:", dbError);
        throw dbError;
      }

      // Update auth.users metadata SECOND
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      // Update Context locally with final public URL
      setMetadata({ avatarUrl: publicUrl });
    } catch (e: any) {
      console.error("Avatar upload failed:", e);
      alert("Failed to upload avatar: " + (e.message || e));
      setMetadata({ avatarUrl: prevAvatarUrl });
    }
  };

  const saveDisplayName = async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed.length > 50) return;

    const fallbackName =
      user.user_metadata?.display_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.user_metadata?.name?.trim() ||
      profile?.username ||
      user.email?.split("@")[0] ||
      "User";
    const finalDisplayName = trimmed || fallbackName;

    const prevName = ctxDisplayName;
    setDisplayName(finalDisplayName);
    setOriginalDisplayName(finalDisplayName);
    setIsEditingName(false);
    setMetadata({ displayName: finalDisplayName });

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: finalDisplayName,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to save display name:", error);
      setDisplayName(prevName);
      setOriginalDisplayName(prevName);
      setIsEditingName(true);
      setMetadata({ displayName: prevName });
    } else {
      try {
        await supabase.auth.updateUser({
          data: { display_name: finalDisplayName },
        });
      } catch (authErr) {
        console.warn("Failed to sync auth display name:", authErr);
      }
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    if (key === "pref_camera_on") setPrefCameraOn(value);
    if (key === "pref_mic_on") setPrefMicOn(value);
    if (key === "pref_show_chat_column") setPrefShowChatColumn(value);
    if (key === "pref_show_people_column") setPrefShowPeopleColumn(value);
    if (key === "pref_disable_chat_sound") setPrefDisableChatSound(value);

    if (!user) return;

    await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        [key]: value,
        updated_at: new Date().toISOString(),
      });

    if (key === "pref_show_chat_column") window.localStorage.setItem("cowatch-showchatcolumn", value ? "1" : "0");
    if (key === "pref_show_people_column") window.localStorage.setItem("cowatch-showpeoplecolumn", value ? "1" : "0");
    if (key === "pref_disable_chat_sound") {
      const settingsStr = window.localStorage.getItem("cowatch-setting") || "{}";
      try {
        const settings = JSON.parse(settingsStr);
        settings.disableChatSound = value;
        window.localStorage.setItem("cowatch-setting", JSON.stringify(settings));
      } catch (e) {}
    }
  };

  const deleteAccount = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    await fetch(serverPath + "/api/account/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "/";
  };

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.topNav}>
            <button type="button" className={styles.backBtn} onClick={handleBack}>
              <IconArrowLeft size={16} />
              <span>Back to Home</span>
            </button>
          </div>
          <div className={styles.card} style={{ textAlign: "center", padding: "60px 20px" }}>
            <Text size="lg" c="var(--text-secondary)">
              Please sign in to view your settings.
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Modal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Your Account"
        centered
        overlayProps={{ blur: 5, color: "var(--overlay-scrim)", opacity: 1 }}
      >
        <div style={{ padding: "10px 0" }}>
          <p style={{ color: "var(--text-primary)", marginBottom: "10px" }}>
            Are you sure you want to delete your account? This action is permanent and cannot be undone.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9em", marginBottom: "20px" }}>
            This permanently deletes your CoWatch account, profile, preferences, and uploaded profile picture.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <Button variant="subtle" color="gray" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={deleteAccount}>
              Yes, Delete My Account
            </Button>
          </div>
        </div>
      </Modal>

      <div className={styles.container}>
        <div className={styles.topNav}>
          <button type="button" className={styles.backBtn} onClick={handleBack}>
            <IconArrowLeft size={16} />
            <span>Back to Home</span>
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.bgGlow} />

          <div className={styles.cardContent}>
            <h1 className={styles.pageTitle}>Account Settings</h1>

            {/* Profile Header */}
            <div className={styles.profileHeader}>
              <Avatar size={96} src={ctxAvatarUrl} className={styles.avatar} />
              <div className={styles.profileMeta}>
                <div className={styles.displayNameRow}>
                  <span className={styles.displayName}>
                    {originalDisplayName || ctxDisplayName || user.email?.split("@")[0]}
                  </span>
                  {user.user_metadata?.email_verified && (
                    <IconCircleCheckFilled title="Verified" color="var(--color-success)" size={18} />
                  )}
                </div>
                <span className={styles.emailText}>{user.email}</span>
              </div>

              <div className={styles.headerActions}>
                <Button
                  className={styles.uploadBtn}
                  leftSection={<IconUpload size={16} />}
                  onClick={uploadAvatar}
                  variant="light"
                  color="violet"
                >
                  {ctxAvatarUrl ? "Change Picture" : "Upload Picture"}
                </Button>
              </div>
            </div>

            <Tabs
              defaultValue={window.localStorage.getItem("cowatch-profile-tab") || "general"}
              onChange={(value) => {
                if (value) window.localStorage.setItem("cowatch-profile-tab", value);
              }}
              color="violet"
            >
              <Tabs.List grow className={styles.tabsList}>
                <Tabs.Tab value="general" leftSection={<IconUser size={16} />}>
                  General
                </Tabs.Tab>
                <Tabs.Tab value="preferences" leftSection={<IconSettings size={16} />}>
                  Preferences
                </Tabs.Tab>
                <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
                  Security
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="general">
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <Text
                      size="sm"
                      fw={500}
                      mb={5}
                      c="var(--text-secondary)"
                      style={{ textTransform: "uppercase", letterSpacing: "1px" }}
                    >
                      Display name
                    </Text>
                    <Text size="xs" c="dimmed" mb="sm">
                      This is the name other people see in CoWatch.
                    </Text>
                    {isEditingName ? (
                      <TextInput
                        autoFocus
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onBlur={() => {
                          setIsEditingName(false);
                          saveDisplayName();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setIsEditingName(false);
                            saveDisplayName();
                          }
                        }}
                        maxLength={50}
                        placeholder="Enter a display name"
                        styles={{
                          input: {
                            backgroundColor: "var(--bg-surface)",
                            border: "1px solid var(--color-violet)",
                            color: "var(--text-primary)",
                            height: "45px",
                          },
                        }}
                      />
                    ) : (
                      <TextInput
                        readOnly
                        value={displayName || originalDisplayName || ctxDisplayName || ""}
                        placeholder="Enter a display name"
                        onClick={() => setIsEditingName(true)}
                        rightSection={<IconPencil size={16} stroke={1.5} color="var(--text-muted)" />}
                        styles={{
                          input: {
                            backgroundColor: "var(--bg-elevated)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            height: "45px",
                            cursor: "pointer",
                          },
                        }}
                      />
                    )}
                  </div>
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="preferences">
                <div className={styles.sectionCard}>
                  <Text
                    size="sm"
                    fw={600}
                    c="dimmed"
                    style={{ textTransform: "uppercase", letterSpacing: "1px", marginBottom: "-4px" }}
                  >
                    Media
                  </Text>

                  <div className={styles.responsiveRowWithSwitch}>
                    <div className={styles.responsiveRowText}>
                      <Text size="md" fw={500} c="var(--text-primary)">
                        Camera on by default
                      </Text>
                      <Text size="xs" c="dimmed">
                        Start video automatically when joining a room.
                      </Text>
                    </div>
                    <Switch
                      size="lg"
                      className="custom-switch"
                      color="violet"
                      checked={prefCameraOn}
                      onChange={(e) => updatePreference("pref_camera_on", e.currentTarget.checked)}
                    />
                  </div>

                  <div className={`${styles.responsiveRowWithSwitch} ${styles.rowDivider}`}>
                    <div className={styles.responsiveRowText}>
                      <Text size="md" fw={500} c="var(--text-primary)">
                        Microphone on by default
                      </Text>
                      <Text size="xs" c="dimmed">
                        Start microphone automatically when joining a room.
                      </Text>
                    </div>
                    <Switch
                      size="lg"
                      className="custom-switch"
                      color="violet"
                      checked={prefMicOn}
                      onChange={(e) => updatePreference("pref_mic_on", e.currentTarget.checked)}
                    />
                  </div>

                  <Text
                    size="sm"
                    fw={600}
                    c="dimmed"
                    style={{ textTransform: "uppercase", letterSpacing: "1px", marginBottom: "-4px", marginTop: "4px" }}
                  >
                    General
                  </Text>

                  <div className={styles.responsiveRowWithSwitch}>
                    <div className={styles.responsiveRowText}>
                      <Text size="md" fw={500} c="var(--text-primary)">
                        Show Chat Column
                      </Text>
                      <Text size="xs" c="dimmed">
                        Display the chat sidebar by default when joining rooms.
                      </Text>
                    </div>
                    <Switch
                      size="lg"
                      className="custom-switch"
                      color="violet"
                      checked={prefShowChatColumn}
                      onChange={(e) => updatePreference("pref_show_chat_column", e.currentTarget.checked)}
                    />
                  </div>

                  <div className={styles.responsiveRowWithSwitch}>
                    <div className={styles.responsiveRowText}>
                      <Text size="md" fw={500} c="var(--text-primary)">
                        Show People Column
                      </Text>
                      <Text size="xs" c="dimmed">
                        Display the participant list by default.
                      </Text>
                    </div>
                    <Switch
                      size="lg"
                      className="custom-switch"
                      color="violet"
                      checked={prefShowPeopleColumn}
                      onChange={(e) => updatePreference("pref_show_people_column", e.currentTarget.checked)}
                    />
                  </div>

                  <div className={styles.responsiveRowWithSwitch}>
                    <div className={styles.responsiveRowText}>
                      <Text size="md" fw={500} c="var(--text-primary)">
                        Disable Chat Sound
                      </Text>
                      <Text size="xs" c="dimmed">
                        Mute notification sounds for new chat messages.
                      </Text>
                    </div>
                    <Switch
                      size="lg"
                      className="custom-switch"
                      color="violet"
                      checked={prefDisableChatSound}
                      onChange={(e) => updatePreference("pref_disable_chat_sound", e.currentTarget.checked)}
                    />
                  </div>

                  <div className={styles.responsiveRow} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", marginTop: "4px" }}>
                    <div className={styles.responsiveRowText}>
                      <Text size="md" fw={500} c="var(--text-primary)">
                        Appearance
                      </Text>
                      <Text size="xs" c="dimmed">
                        Customize your visual interface theme.
                      </Text>
                    </div>
                    <AppearanceSelector />
                  </div>
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="security">
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Authentication & Session Card */}
                  <div className={styles.sectionCard}>
                    <Text
                      size="sm"
                      fw={600}
                      c="dimmed"
                      style={{
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: "-4px",
                      }}
                    >
                      Authentication & Session
                    </Text>

                    <div className={`${styles.responsiveRow} ${styles.rowDivider}`}>
                      <div className={styles.responsiveRowText}>
                        <Text size="md" fw={500} c="var(--text-primary)">
                          Password
                        </Text>
                        <Text size="xs" c="dimmed">
                          Send a secure password reset link to {user.email || "your registered email"}.
                        </Text>
                      </div>
                      <Button
                        disabled={resetDisabled}
                        leftSection={<IconKeyFilled size={15} />}
                        variant="light"
                        color="violet"
                        size="sm"
                        style={{ flexShrink: 0 }}
                        onClick={resetPassword}
                      >
                        Reset Password
                      </Button>
                    </div>

                    <div className={styles.responsiveRow}>
                      <div className={styles.responsiveRowText}>
                        <Text size="md" fw={500} c="var(--text-primary)">
                          Active Session
                        </Text>
                        <Text size="xs" c="dimmed">
                          Sign out of your active CoWatch account on this browser.
                        </Text>
                      </div>
                      <Button
                        leftSection={<IconLogout size={15} stroke={1.5} />}
                        variant="outline"
                        color="gray"
                        size="sm"
                        style={{
                          flexShrink: 0,
                          borderColor: "var(--border-strong)",
                          color: "var(--text-secondary)",
                        }}
                        onClick={onSignOut}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone Card */}
                  <div className={styles.dangerCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "-4px" }}>
                      <IconAlertTriangle size={16} color="var(--color-danger)" />
                      <Text
                        size="sm"
                        fw={600}
                        c="var(--color-danger)"
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        Danger Zone
                      </Text>
                    </div>

                    <div className={styles.responsiveRow}>
                      <div className={styles.responsiveRowText}>
                        <Text size="md" fw={500} c="var(--text-primary)">
                          Delete Account
                        </Text>
                        <Text size="xs" c="dimmed">
                          Permanently delete your account, saved preferences, rooms, and profile picture. This action cannot be undone.
                        </Text>
                      </div>
                      <Button
                        leftSection={<IconTrashFilled size={15} />}
                        color="red"
                        variant="filled"
                        size="sm"
                        style={{ flexShrink: 0 }}
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </Tabs.Panel>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};
