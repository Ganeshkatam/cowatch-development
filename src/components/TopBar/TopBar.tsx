import React, { useCallback, useContext } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { serverPath, addAndSavePasscode } from "../../utils/utils";
import { getAccessToken, supabase } from "../../utils/supabaseClient";
import { Avatar, Button, Menu, Group } from "@mantine/core";
import type { User } from "@supabase/supabase-js";
import styles from "./TopBar.module.css";
import { MetadataContext } from "../../MetadataContext";
import {
  IconCirclePlusFilled,
  IconDatabase,
  IconLogout,
  IconSettings,
  IconCheck,
  IconDeviceDesktop,
  IconSun,
  IconMoon,
  IconCalendarEvent,
  IconDeviceTv,
} from "@tabler/icons-react";
import { useAppearance } from "../../theme/ThemeProvider";

export const ThemeMenuItems = () => {
  const { appearance, setAppearance } = useAppearance();
  return (
    <>
      <Menu.Label>Theme</Menu.Label>
      <Menu.Item
        onClick={() => setAppearance("system")}
        leftSection={<IconDeviceDesktop size={16} stroke={1.5} />}
        rightSection={appearance === "system" ? <IconCheck size={14} stroke={2.5} color="var(--color-violet)" /> : null}
      >
        System
      </Menu.Item>
      <Menu.Item
        onClick={() => setAppearance("light")}
        leftSection={<IconSun size={16} stroke={1.5} />}
        rightSection={appearance === "light" ? <IconCheck size={14} stroke={2.5} color="var(--color-violet)" /> : null}
      >
        Light
      </Menu.Item>
      <Menu.Item
        onClick={() => setAppearance("mantine")}
        leftSection={<IconMoon size={16} stroke={1.5} />}
        rightSection={appearance === "mantine" ? <IconCheck size={14} stroke={2.5} color="var(--color-violet)" /> : null}
      >
        Dark
      </Menu.Item>
    </>
  );
};

export async function createRoom(
  user: User | null | undefined,
  openNewTab: boolean | undefined,
  video: string = "",
  options: {
    roomTitle: string;
    roomDescription?: string;
    passcode?: string;
    isPermanent?: boolean;
    durationMinutes?: number;
    isChatDisabled?: boolean;
    isWaitingLoungeEnabled?: boolean;
    lock?: boolean;
    scheduledStartsAt?: string;
    noRedirect?: boolean;
  }
) {
  const uid = user?.id;
  const token = await getAccessToken();
  const response = await fetch(serverPath + "/createRoom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, token, video, ...options }),
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Server returned an invalid response. Please check your backend connection.");
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  const { name } = data;
  if (options.passcode && name) addAndSavePasscode(name, options.passcode);
  if (options?.noRedirect) return name;
  const safeName = name.startsWith("/") ? name.substring(1) : name;
  if (openNewTab) window.open(`/watch/${safeName}`);
  else window.location.assign(`/watch/${safeName}`);
}

export const NewRoomButton = (props: { size?: string; openNewTab?: boolean }) => {
  const history = useHistory();
  const onClick = useCallback(() => history.push("/room/new"), [history]);
  return (
    <Button
      size={props.size || "sm"}
      variant="gradient"
      gradient={{ from: "#8B5CF6", to: "#EC4899", deg: 135 }}
      onClick={onClick}
      leftSection={<IconCirclePlusFilled size={16} />}
      style={{ fontWeight: 600, borderRadius: "10px" }}
    >
      New Room
    </Button>
  );
};

export class SignInButton extends React.Component {
  static contextType = MetadataContext;
  declare context: React.ContextType<typeof MetadataContext>;

  render() {
    if (this.context.user) {
      return (
        <Menu shadow="xl" width={240} position="bottom-end" offset={8}>
          <Menu.Target>
            <button type="button" className={styles.avatarBtn} aria-label="Open account menu" title="Account">
              <Avatar src={this.context.avatarUrl} size={32} radius="xl" />
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <div style={{ padding: "8px 10px 10px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Avatar size={36} radius="xl" src={this.context.avatarUrl} />
              <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "13.5px",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {this.context.displayName}
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {this.context.user?.email}
                </div>
              </div>
            </div>
            <Menu.Divider />
            <Menu.Label>Account</Menu.Label>
            <Menu.Item component={Link} to="/account/profile" leftSection={<IconSettings size={16} stroke={1.5} />}>
              Account settings
            </Menu.Item>
            <Menu.Item component={Link} to="/myrooms" leftSection={<IconDatabase size={16} stroke={1.5} />}>
              My rooms
            </Menu.Item>
            <Menu.Item component={Link} to="/rooms/schedule" leftSection={<IconCalendarEvent size={16} stroke={1.5} />}>
              Schedule room
            </Menu.Item>
            <Menu.Divider />
            <ThemeMenuItems />
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={16} stroke={1.5} />}
              onClick={async () => {
                await supabase.auth.signOut();
              }}
            >
              Sign out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      );
    }

    return (
      <Group gap="xs">
        <Button component={Link} to="/login" variant="subtle" color="gray" size="sm">
          Sign in
        </Button>
        <Button
          component={Link}
          to="/signup"
          variant="gradient"
          gradient={{ from: "#8B5CF6", to: "#EC4899", deg: 135 }}
          size="sm"
          style={{ fontWeight: 600, borderRadius: "10px" }}
        >
          Start Free
        </Button>
      </Group>
    );
  }
}

export const TopBar = (props: {
  hideNewRoom?: boolean;
  hideSignin?: boolean;
  roomTitle?: string;
  roomStatus?: string;
}) => {
  const context = useContext(MetadataContext);
  const location = useLocation();
  const path = location.pathname;

  const renderStatusBadge = () => {
    if (!props.roomStatus) return null;
    const status = props.roomStatus;
    if (status === "active") {
      return (
        <div className={`${styles.roomStatusBadge} ${styles.statusLive}`}>
          <div className={styles.dot} /> LIVE
        </div>
      );
    }
    if (status === "waiting" || status === "scheduled") {
      return (
        <div className={`${styles.roomStatusBadge} ${styles.statusWaiting}`}>
          WAITING
        </div>
      );
    }
    if (status === "ended" || status === "expired") {
      return (
        <div className={`${styles.roomStatusBadge} ${styles.statusEnded}`}>
          {status.toUpperCase()}
        </div>
      );
    }
    if (status === "cancelled") {
      return (
        <div className={`${styles.roomStatusBadge} ${styles.statusCancelled}`}>
          CANCELLED
        </div>
      );
    }
    return null;
  };

  return (
    <header className={styles.topBarHeader}>
      <div className={styles.topBarContainer}>
        {/* Left Section: Brand Logo + Name + optional Room Breadcrumb */}
        <div className={styles.leftSection}>
          <Link to="/" className={styles.brandGroup}>
            <img className={`cowatch-brand-logo ${styles.logo}`} src="/logo192.png" alt="CoWatch" />
            <span className={styles.brandName}>CoWatch</span>
          </Link>

          {props.roomTitle && (
            <>
              <span className={styles.breadcrumbDivider}>/</span>
              <div className={styles.roomHeaderContext}>
                {renderStatusBadge()}
                <span className={styles.roomHeaderTitle} title={props.roomTitle}>
                  {props.roomTitle}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Center Navigation Links (shown when not in room playback) */}
        {!props.roomTitle && (
          <nav className={styles.centerNav} aria-label="Main Navigation">
            {context.user ? (
              <>
                <Link
                  to="/myrooms"
                  className={`${styles.navItem} ${path.startsWith("/myrooms") ? styles.navItemActive : ""}`}
                >
                  <IconDatabase size={15} />
                  <span>My Rooms</span>
                </Link>
                <Link
                  to="/rooms/schedule"
                  className={`${styles.navItem} ${path === "/rooms/schedule" ? styles.navItemActive : ""}`}
                >
                  <IconCalendarEvent size={15} />
                  <span>Schedule</span>
                </Link>
                <Link
                  to="/join"
                  className={`${styles.navItem} ${path.startsWith("/join") ? styles.navItemActive : ""}`}
                >
                  <IconDeviceTv size={15} />
                  <span>Join</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/join"
                  className={`${styles.navItem} ${path.startsWith("/join") ? styles.navItemActive : ""}`}
                >
                  <IconDeviceTv size={15} />
                  <span>Join Room</span>
                </Link>
                <Link
                  to="/faq"
                  className={`${styles.navItem} ${path === "/faq" ? styles.navItemActive : ""}`}
                >
                  <span>FAQ</span>
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Right Actions */}
        <div className={styles.actionsGroup}>
          {!props.hideNewRoom && context.user && <NewRoomButton size="sm" />}
          {!props.hideSignin && <SignInButton />}
        </div>
      </div>
    </header>
  );
};
