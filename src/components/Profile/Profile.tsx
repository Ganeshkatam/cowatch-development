import React, { useContext, useEffect, useState } from "react";
import { Modal, Button, Avatar, Switch, Text, TextInput, SegmentedControl } from "@mantine/core";
import { useHistory, useLocation, useParams, Link } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { serverPath, openFileSelector } from "../../utils/utils";
import { MetadataContext } from "../../MetadataContext";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCamera,
  IconCheck,
  IconCircleCheckFilled,
  IconKeyFilled,
  IconLock,
  IconLogout,
  IconPencil,
  IconSettings,
  IconTrashFilled,
  IconUpload,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useAppearance } from "../../theme/ThemeProvider";
import { DEFAULT_AVATARS } from "../../utils/defaultAvatars";
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
  const { section } = useParams<{ section?: string }>();
  const history = useHistory();
  const location = useLocation();

  const getActiveTab = (): "profile" | "preferences" | "security" => {
    const raw = (section || location.pathname.split("/").filter(Boolean).pop() || "").toLowerCase();
    if (raw === "preferences") return "preferences";
    if (raw === "security" || raw === "login-and-security") return "security";
    return "profile";
  };

  const activeTab = getActiveTab();

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

  // Sync profile safely when context updates
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

  const handleTabChange = (tab: "profile" | "preferences" | "security") => {
    const targetUrl =
      tab === "preferences"
        ? "/account/preferences"
        : tab === "security"
        ? "/account/security"
        : "/account/profile";
    if (location.pathname !== targetUrl) {
      history.push(targetUrl);
    }
  };

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

  const selectDefaultAvatar = async (avatarUrl: string) => {
    if (!user) return;
    const prevAvatarUrl = ctxAvatarUrl;
    try {
      setMetadata({ avatarUrl });

      const { error: dbError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });
    } catch (e: any) {
      console.error("Avatar selection failed:", e);
      alert("Failed to update avatar: " + (e.message || e));
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

  const cancelEditDisplayName = () => {
    setDisplayName(originalDisplayName);
    setIsEditingName(false);
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
          <div className={styles.mainCard} style={{ textAlign: "center", padding: "60px 20px" }}>
            <Text size="lg" c="var(--text-secondary)">
              Please sign in to view your settings.
            </Text>
          </div>
        </div>
      </div>
    );
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Recently";

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
        {/* Top bar with back button */}
        <div className={styles.topNav}>
          <button type="button" className={styles.backBtn} onClick={handleBack}>
            <IconArrowLeft size={16} />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Canva-inspired 2-column layout */}
        <div className={styles.settingsLayout}>
          {/* Left Navigation Sidebar */}
          <aside className={styles.sidebar}>
            <h2 className={styles.sidebarTitle}>Settings</h2>

            {/* Account Category */}
            <div className={styles.navGroup}>
              <span className={styles.navGroupHeader}>Account</span>
              <Link
                to="/account/profile"
                className={`${styles.navItem} ${activeTab === "profile" ? styles.navItemActive : ""}`}
              >
                <span className={styles.navIcon}>
                  <IconUser size={18} stroke={1.75} />
                </span>
                <span>Your profile</span>
              </Link>
            </div>

            {/* App Experience Category */}
            <div className={styles.navGroup}>
              <span className={styles.navGroupHeader}>App experience</span>
              <Link
                to="/account/preferences"
                className={`${styles.navItem} ${activeTab === "preferences" ? styles.navItemActive : ""}`}
              >
                <span className={styles.navIcon}>
                  <IconSettings size={18} stroke={1.75} />
                </span>
                <span>Preferences</span>
              </Link>
            </div>

            {/* Security & Sign In Category */}
            <div className={styles.navGroup}>
              <span className={styles.navGroupHeader}>Security & sign in</span>
              <Link
                to="/account/security"
                className={`${styles.navItem} ${activeTab === "security" ? styles.navItemActive : ""}`}
              >
                <span className={styles.navIcon}>
                  <IconLock size={18} stroke={1.75} />
                </span>
                <span>Login & security</span>
              </Link>
            </div>
          </aside>

          {/* Right Content Canvas */}
          <main className={styles.mainCard}>
            <div className={styles.ambientGradient} />

            <div className={styles.contentWrapper}>
              {/* TAB 1: YOUR PROFILE */}
              {activeTab === "profile" && (
                <div key="profile" className={styles.tabTransitionPane}>
                  <div className={styles.contentHeader}>
                    <span className={styles.breadcrumbCategory}>Your profile</span>
                    <h1 className={styles.contentTitle}>Your profile</h1>
                    <p className={styles.contentSubtitle}>
                      Manage how you appear across CoWatch rooms and conversations.
                    </p>
                  </div>

                  {/* Compact CoWatch Identity Banner */}
                  <div className={styles.identityBanner}>
                    <div className={styles.bannerHeaderText}>
                      <h3 className={styles.bannerTitle}>Your CoWatch profile</h3>
                      <p className={styles.bannerSubtitle}>
                        Your identity across watch rooms and conversations.
                      </p>
                    </div>

                    <div className={styles.bannerProfileRow}>
                      <div className={styles.bannerUserGroup}>
                        <div
                          className={styles.avatarContainer}
                          onClick={uploadAvatar}
                          title="Click to change profile picture"
                          role="button"
                          tabIndex={0}
                        >
                          <Avatar size={84} src={ctxAvatarUrl} className={styles.avatar} />
                          <div className={styles.cameraBadge}>
                            <IconCamera size={14} />
                          </div>
                        </div>

                        <div className={styles.bannerMeta}>
                          <div className={styles.bannerDisplayNameRow}>
                            <span className={styles.bannerDisplayName}>
                              {originalDisplayName || ctxDisplayName || user.email?.split("@")[0]}
                            </span>
                            {user.user_metadata?.email_verified && (
                              <IconCircleCheckFilled title="Verified" color="var(--color-success)" size={18} />
                            )}
                          </div>
                          <span className={styles.bannerEmail}>{user.email}</span>
                        </div>
                      </div>

                      <Button
                        className={styles.changePictureBtn}
                        leftSection={<IconUpload size={15} />}
                        onClick={uploadAvatar}
                        variant="light"
                        color="violet"
                      >
                        Change picture
                      </Button>
                    </div>

                    <div className={styles.defaultAvatarsSection}>
                      <div className={styles.defaultAvatarsHeader}>
                        <span className={styles.defaultAvatarsTitle}>Choose a cinema avatar</span>
                        <span className={styles.defaultAvatarsSubtitle}>Select one of the 5 standard styles or upload your own</span>
                      </div>
                      <div className={styles.defaultAvatarsList}>
                        {DEFAULT_AVATARS.map((avatar) => {
                          const isSelected = ctxAvatarUrl === avatar.url;
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              className={`${styles.defaultAvatarItem} ${isSelected ? styles.defaultAvatarItemActive : ""}`}
                              onClick={() => selectDefaultAvatar(avatar.url)}
                              title={avatar.name}
                              aria-label={`Select ${avatar.name} avatar`}
                            >
                              <img src={avatar.url} alt={avatar.name} className={styles.defaultAvatarThumb} />
                              {isSelected && (
                                <div className={styles.defaultAvatarCheck}>
                                  <IconCheck size={11} stroke={3} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Profile Section */}
                  <div className={styles.section}>
                    <h2 className={styles.sectionHeading}>Profile</h2>
                    <div className={styles.settingsTable}>
                      {/* Display Name Row */}
                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Display name</span>
                          <span className={styles.settingDescription}>
                            This name is visible to participants in watch rooms and chat.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          {isEditingName ? (
                            <div className={styles.inlineEditWrapper}>
                              <TextInput
                                autoFocus
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void saveDisplayName();
                                  if (e.key === "Escape") cancelEditDisplayName();
                                }}
                                maxLength={50}
                                placeholder="Enter display name"
                                size="sm"
                                styles={{
                                  input: {
                                    backgroundColor: "var(--bg-surface)",
                                    border: "1px solid var(--color-violet, #7d2ae8)",
                                    color: "var(--text-primary)",
                                    width: "220px",
                                  },
                                }}
                              />
                              <Button
                                size="xs"
                                color="violet"
                                onClick={saveDisplayName}
                                leftSection={<IconCheck size={14} />}
                                className={styles.actionPillBtn}
                              >
                                Save
                              </Button>
                              <Button
                                size="xs"
                                variant="subtle"
                                color="gray"
                                onClick={cancelEditDisplayName}
                                leftSection={<IconX size={14} />}
                                className={styles.actionPillBtn}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className={styles.inlineEditWrapper}>
                              <span className={styles.settingTextValue}>
                                {displayName || originalDisplayName || ctxDisplayName || "Not set"}
                              </span>
                              <Button
                                size="xs"
                                variant="light"
                                color="violet"
                                onClick={() => setIsEditingName(true)}
                                leftSection={<IconPencil size={13} />}
                                className={styles.actionPillBtn}
                              >
                                Edit
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Email Row */}
                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Email</span>
                          <span className={styles.settingDescription}>
                            Your primary email address for signing in and notifications.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <span className={styles.settingTextValue}>{user.email}</span>
                          {user.user_metadata?.email_verified && (
                            <span className={styles.statusChip}>
                              <IconCircleCheckFilled size={14} />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Member Since Row */}
                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Member since</span>
                          <span className={styles.settingDescription}>
                            The date your CoWatch account was created.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <span className={styles.settingTextValue}>{memberSince}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Section */}
                  <div className={styles.section} style={{ marginTop: "12px" }}>
                    <h2 className={styles.sectionHeading}>Account</h2>
                    <div className={styles.settingsTable}>
                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Delete account</span>
                          <span className={styles.settingDescription}>
                            Permanently delete your CoWatch account, active rooms, and history.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <Button
                            size="xs"
                            variant="subtle"
                            color="red"
                            onClick={() => setDeleteConfirmOpen(true)}
                            leftSection={<IconTrashFilled size={14} />}
                            className={styles.actionPillBtn}
                          >
                            Delete account
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PREFERENCES */}
              {activeTab === "preferences" && (
                <div key="preferences" className={styles.tabTransitionPane}>
                  <div className={styles.contentHeader}>
                    <span className={styles.breadcrumbCategory}>App experience</span>
                    <h1 className={styles.contentTitle}>Preferences</h1>
                    <p className={styles.contentSubtitle}>
                      Configure your media defaults, watch room layout, and interface appearance.
                    </p>
                  </div>

                  {/* Media Defaults */}
                  <div className={styles.section}>
                    <h2 className={styles.sectionHeading}>Media defaults</h2>
                    <div className={styles.settingsTable}>
                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Camera on by default</span>
                          <span className={styles.settingDescription}>
                            Start video automatically when joining a watch room.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <Switch
                            size="md"
                            color="violet"
                            checked={prefCameraOn}
                            onChange={(e) => updatePreference("pref_camera_on", e.currentTarget.checked)}
                          />
                        </div>
                      </div>

                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Microphone on by default</span>
                          <span className={styles.settingDescription}>
                            Start microphone automatically when joining a watch room.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <Switch
                            size="md"
                            color="violet"
                            checked={prefMicOn}
                            onChange={(e) => updatePreference("pref_mic_on", e.currentTarget.checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Watch Room Interface */}
                  <div className={styles.section} style={{ marginTop: "12px" }}>
                    <h2 className={styles.sectionHeading}>Watch room interface</h2>
                    <div className={styles.settingsTable}>
                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Show chat column</span>
                          <span className={styles.settingDescription}>
                            Display the chat sidebar automatically when joining rooms.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <Switch
                            size="md"
                            color="violet"
                            checked={prefShowChatColumn}
                            onChange={(e) => updatePreference("pref_show_chat_column", e.currentTarget.checked)}
                          />
                        </div>
                      </div>

                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Show people column</span>
                          <span className={styles.settingDescription}>
                            Display the participant list by default when joining rooms.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <Switch
                            size="md"
                            color="violet"
                            checked={prefShowPeopleColumn}
                            onChange={(e) => updatePreference("pref_show_people_column", e.currentTarget.checked)}
                          />
                        </div>
                      </div>

                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Disable chat sound</span>
                          <span className={styles.settingDescription}>
                            Mute notification sounds for new incoming chat messages.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <Switch
                            size="md"
                            color="violet"
                            checked={prefDisableChatSound}
                            onChange={(e) => updatePreference("pref_disable_chat_sound", e.currentTarget.checked)}
                          />
                        </div>
                      </div>

                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Appearance theme</span>
                          <span className={styles.settingDescription}>
                            Select your visual interface appearance (Light, Mantine dark, or System).
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <AppearanceSelector />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LOGIN & SECURITY */}
              {activeTab === "security" && (
                <div key="security" className={styles.tabTransitionPane}>
                  <div className={styles.contentHeader}>
                    <span className={styles.breadcrumbCategory}>Security & sign in</span>
                    <h1 className={styles.contentTitle}>Login & security</h1>
                    <p className={styles.contentSubtitle}>
                      Manage authentication credentials, active sessions, and account protection.
                    </p>
                  </div>

                  {/* Authentication & Session */}
                  <div className={styles.section}>
                    <h2 className={styles.sectionHeading}>Authentication & Session</h2>
                    <div className={styles.settingsTable}>
                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Password</span>
                          <span className={styles.settingDescription}>
                            Send a secure password reset link to {user.email || "your registered email"}.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <Button
                            disabled={resetDisabled}
                            leftSection={<IconKeyFilled size={14} />}
                            variant="light"
                            color="violet"
                            size="xs"
                            onClick={resetPassword}
                            className={styles.actionPillBtn}
                          >
                            {resetDisabled ? "Reset Link Sent" : "Reset Password"}
                          </Button>
                        </div>
                      </div>

                      <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>Active session</span>
                          <span className={styles.settingDescription}>
                            Sign out of your active CoWatch session on this browser.
                          </span>
                        </div>
                        <div className={styles.settingValueCol}>
                          <Button
                            leftSection={<IconLogout size={14} stroke={1.5} />}
                            variant="outline"
                            color="gray"
                            size="xs"
                            onClick={onSignOut}
                            className={styles.actionPillBtn}
                          >
                            Sign Out
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className={styles.dangerSection}>
                    <div className={styles.dangerHeader}>
                      <IconAlertTriangle size={17} />
                      <span>Danger zone</span>
                    </div>

                    <div className={styles.settingRow} style={{ borderBottom: "none", paddingBottom: 0 }}>
                      <div className={styles.settingInfo}>
                        <span className={styles.settingLabel}>Delete account</span>
                        <span className={styles.settingDescription}>
                          Permanently delete your account, saved preferences, rooms, and profile picture. This action cannot be undone.
                        </span>
                      </div>
                      <div className={styles.settingValueCol}>
                        <Button
                          leftSection={<IconTrashFilled size={14} />}
                          color="red"
                          variant="filled"
                          size="xs"
                          onClick={() => setDeleteConfirmOpen(true)}
                          className={styles.actionPillBtn}
                        >
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
