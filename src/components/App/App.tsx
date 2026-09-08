import type MediasoupClient from "mediasoup-client";
import React from "react";
import { Alert, Loader, Overlay, Select, Title, Tabs, Text } from "@mantine/core";
import io, { Socket } from "socket.io-client";
import {
  formatSpeed,
  iceServers,
  isMobile,
  serverPath,
  testAutoplay,
  openFileSelector,
  getOrCreateClientId,
  getOrCreateSessionId,
  calculateMedian,
  isYouTube,
  isMagnet,
  isHttp,
  isHls,
  isScreenShare,
  isFileShare,
  isVBrowser,
  isDash,
  VIDEO_MAX_HEIGHT_CSS,
  createUuid,
  softWhite,
  getSavedPasscodes,
  addAndSavePasscode,
  getRoomUrl,
  decodeEntities,
} from "../../utils/utils";
import { examples } from "../../utils/examples";
import { generateName } from "../../utils/generateName";
import { Chat, ChatComponent } from "../Chat/Chat";
import { VBrowser } from "../VBrowser/VBrowser";
import { VideoChat, VideoChatErrorBoundary } from "../VideoChat/VideoChat";
import { getCurrentSettings } from "../Settings/LocalSettings";
import { MultiStreamModal } from "../Modal/MultiStreamModal";
import { Controls } from "../Controls/Controls";
import { VBrowserModal } from "../Modal/VBrowserModal";
import { SettingsModal } from "../Settings/SettingsModal";
import { ErrorModal } from "../Modal/ErrorModal";
import { PasscodeModal } from "../Modal/PasscodeModal";
import { ScreenShareModal } from "../Modal/ScreenShareModal";
import { FileShareModal } from "../Modal/FileShareModal";
import type { User } from "@supabase/supabase-js";
import { supabase, safeGetSession } from "../../utils/supabaseClient";
import { SubtitleModal } from "../Modal/SubtitleModal";
import { MiniLiveRoomPopover } from "../Modal/MiniLiveRoomPopover";
import { WaitingLounge } from "../WaitingLounge/WaitingLounge";
import { WaitingLoungeBanner } from "../WaitingLounge/WaitingLoungeBanner";
import { HTML } from "./HTML";
import { YouTube } from "./YouTube";
import styles from "./App.module.css";
import { EmptyWatchState, NonPlayableMediaState } from "./EmptyWatchState";
import { RoomHeader } from "../TopBar/RoomHeader";
import { WaitingForHostOverlay } from "../WaitingForHost/WaitingForHostOverlay";
import { MediaDock } from "./MediaDock";
import config from "../../config";
import { MetadataContext } from "../../MetadataContext";
import { ActionIcon, Badge, Button } from "@mantine/core";
import {
  IconAntennaBars5,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconKeyboardFilled,
  IconLink,
  IconMessage,
  IconUserScreen,
  IconUsersGroup,
  IconVolume,
  IconX,
} from "@tabler/icons-react";
import type WebTorrent from "webtorrent";
import type Hls from "hls.js";
import { type MediaPlayerClass } from "dashjs";
import { type Torrent } from "webtorrent";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: any;
    YT: YT.JsApi;
    cowatch: {
      ourStream: MediaStream | undefined;
      videoRefs: HTMLVideoElementDict;
      audioRefs?: HTMLAudioElementDict;
      videoPCs: PCDict;
      remoteStreams: Record<string, MediaStream>;
      webtorrent?: WebTorrent.Instance;
      hls?: Hls;
      dash?: MediaPlayerClass;
    };
  }
}

window.cowatch = {
  ourStream: undefined,
  videoRefs: {},
  audioRefs: {},
  videoPCs: {},
  remoteStreams: {},
};

const clientId = getOrCreateClientId();

interface AppProps {

  urlRoomId?: string;
}

interface AppState {
  state: "starting" | "connected";
  roomMedia: string;
  roomSubtitle: string;
  roomPaused: boolean;
  roomLoop: boolean;
  participants: any[];
  rosterUpdateTS: Number;
  chat: ChatMessage[];
  playlist: PlaylistVideo[];
  tsMap: NumberDict;
  nameMap: StringDict;
  pictureMap: StringDict;
  myName: string;
  myPicture: string;
  loading: boolean;
  scrollTimestamp: number;
  unreadCount: number;
  fullScreen: boolean;
  controlsTimestamp: number;
  watchOptions: SearchResult[];
  isVBrowser: boolean;
  isAutoPlayable: boolean;
  downloaded: number;
  total: number;
  speed: number;
  connections: number;
  fileSelection: {
    name: string;
    url: string;
    length: number;
    playFn?: () => void;
  }[];
  overlayMsg: string;
  isErrorAuth: boolean;
  settings: Settings;
  vBrowserResolution: string;
  vBrowserQuality: string;
  isVBrowserLarge: boolean;
  nonPlayableMedia: boolean;
  currentTab: string;
  isSubscribeModalOpen: boolean;
  isVBrowserModalOpen: boolean;
  isScreenShareModalOpen: boolean;
  isFileShareModalOpen: boolean;
  isSubtitleModalOpen: boolean;
  isMultiSelectModalOpen: boolean;
  copiedRoomLink: boolean;
  roomLock: string;
  controller?: string;
  savedPasscodes: StringDict;
  roomId: string;
  errorMessage: string;
  successMessage: string;
  warningMessage: string;
  isChatDisabled: boolean;
  showChatColumn: boolean;
  showPeopleColumn: boolean;
  owner: string | undefined;

  passcode: string | undefined;
  inviteLink: string;
  roomTitle: string;
  roomDescription: string | undefined;
  mediaPath: string | undefined;
  roomPlaybackRate: number;
  isLiveStream: boolean;
  settingsModalOpen: boolean;
  uploadController: AbortController | undefined;
  waitingLoungeState: WaitingLoungeState | null;
  waitingList: WaitingGuest[];
  isWaitingLoungeEnabled: boolean;
  isRoomMinimized: boolean;
  // Room lifecycle state (authoritative from server)
  roomStatus: string;
  roomStartedAt: string | null;
  roomExpiresAt: string | null;
  roomIsPermanent: boolean;
  roomDurationMinutes: number | null;
  roomServerNow: number | null;
}

export class App extends React.Component<AppProps, AppState> {
  static contextType = MetadataContext;
  declare context: React.ContextType<typeof MetadataContext>;
  state: AppState = {
    state: "starting",
    roomMedia: "",
    roomPaused: false,
    roomSubtitle: "",
    roomLoop: false,
    participants: [],
    rosterUpdateTS: Date.now(),
    chat: [],
    playlist: [],
    tsMap: {},
    nameMap: {},
    pictureMap: {},
    myName: "",
    myPicture: "",
    loading: true,
    scrollTimestamp: 0,
    unreadCount: 0,
    fullScreen: false,
    controlsTimestamp: 0,
    watchOptions: [],
    isVBrowser: false,
    isAutoPlayable: true,
    downloaded: 0,
    total: 0,
    speed: 0,
    connections: 0,
    fileSelection: [],
    overlayMsg: "",
    isErrorAuth: false,
    settings: {},
    vBrowserResolution: "1280x720@30",
    vBrowserQuality: "1",
    isVBrowserLarge: false,
    nonPlayableMedia: false,
    currentTab:
      new URLSearchParams(window.location.search).get("tab") ?? "people",
    isSubscribeModalOpen: false,
    isVBrowserModalOpen: false,
    isScreenShareModalOpen: false,
    isFileShareModalOpen: false,
    isSubtitleModalOpen: false,
    isMultiSelectModalOpen: false,
    copiedRoomLink: false,
    roomLock: "",
    controller: "",
    roomId: "",
    savedPasscodes: {},
    errorMessage: "",
    successMessage: "",
    warningMessage: "",
    isChatDisabled: false,
    showChatColumn: isMobile()
      ? true
      : Boolean(
        Number(
          window.localStorage.getItem("cowatch-showchatcolumn") ?? "1",
        ),
      ),
    showPeopleColumn: isMobile()
      ? false
      : Boolean(
        Number(
          window.localStorage.getItem("cowatch-showpeoplecolumn") ?? "0",
        ),
      ),
    owner: undefined,

    passcode: undefined,
    inviteLink: "",
    roomTitle: "",
    roomDescription: "",
    mediaPath: undefined,
    roomPlaybackRate: 0,
    isLiveStream: false,
    settingsModalOpen: false,
    uploadController: undefined,
    waitingLoungeState: null,
    waitingList: [],
    isWaitingLoungeEnabled: false,
    isRoomMinimized: false,
    // Room lifecycle initial state
    roomStatus: "waiting",
    roomStartedAt: null,
    roomExpiresAt: null,
    roomIsPermanent: false,
    roomDurationMinutes: null,
    roomServerNow: null,
  };
  private hasLostFocus = false;
  private exitIntentCooldownUntil = 0;
  private focusRestoreTimeout: number | null = null;
  private isLeaving = false;
  private videoChatRef = React.createRef<VideoChat>();
  socket: Socket = null!;
  mediasoupPubSocket: Socket | null = null;
  mediasoupSubSocket: Socket | null = null;
  ytDebounce = true;
  localStreamToPublish?: MediaStream;
  isLocalStreamAFile = false;
  publisherConns: PCDict = {};
  consumerConn?: RTCPeerConnection;
  progressUpdater?: number;
  heartbeat: number | undefined = undefined;
  startingTimer: any = null;
  YouTubeInterface: YouTube = new YouTube(null);
  HTMLInterface: HTML = new HTML("leftVideo");
  Player = () => {
    if (this.usingYoutube()) {
      return this.YouTubeInterface;
    } else {
      return this.HTMLInterface;
    }
  };

  isActiveRoom = (): boolean => {
    return (
      this.state.state === "connected" &&
      !this.state.waitingLoungeState?.inLounge &&
      !this.state.isErrorAuth &&
      Boolean(this.state.roomId) &&
      !this.isLeaving
    );
  };

  requestLeave = () => {
    this.confirmLeave();
  };

  handleReturnToRoom = () => {
    this.hasLostFocus = false;
    if (this.focusRestoreTimeout) {
      window.clearTimeout(this.focusRestoreTimeout);
      this.focusRestoreTimeout = null;
    }
    this.setState({ isRoomMinimized: false });
  };

  debounceRestore = () => {
    if (this.focusRestoreTimeout) {
      window.clearTimeout(this.focusRestoreTimeout);
    }
    this.focusRestoreTimeout = window.setTimeout(() => {
      this.focusRestoreTimeout = null;
      if (!this.isLeaving && this.isActiveRoom() && this.state.isRoomMinimized) {
        this.setState({ isRoomMinimized: false });
      }
    }, 100);
  };

  confirmLeave = () => {
    this.isLeaving = true;
    if (this.focusRestoreTimeout) {
      window.clearTimeout(this.focusRestoreTimeout);
      this.focusRestoreTimeout = null;
    }
    this.setState({ isRoomMinimized: false });
    try {
      if (window.cowatch?.ourStream) {
        window.cowatch.ourStream.getTracks().forEach((t) => t.stop());
        window.cowatch.ourStream = undefined;
      }
      if (this.socket) {
        this.socket.emit("CMD:leaveVideo");
        this.socket.disconnect();
      }
    } catch (e) {
      console.warn("[App] Error during leave cleanup:", e);
    }
    window.location.href = "/";
  };

  handleVisibilityChange = () => {
    if (this.isLeaving || !this.isActiveRoom()) return;

    if (document.hidden) {
      this.hasLostFocus = true;
      if (this.focusRestoreTimeout) {
        window.clearTimeout(this.focusRestoreTimeout);
        this.focusRestoreTimeout = null;
      }
      if (!this.state.isRoomMinimized) {
        this.setState({ isRoomMinimized: true });
      }
    } else {
      if (this.hasLostFocus || this.state.isRoomMinimized) {
        this.hasLostFocus = false;
        this.debounceRestore();
      }
    }
  };

  handleWindowBlur = () => {
    if (this.isLeaving || !this.isActiveRoom()) return;
    this.hasLostFocus = true;
    if (this.focusRestoreTimeout) {
      window.clearTimeout(this.focusRestoreTimeout);
      this.focusRestoreTimeout = null;
    }
    if (!this.state.isRoomMinimized) {
      this.setState({ isRoomMinimized: true });
    }
  };

  handleWindowFocus = () => {
    if (this.isLeaving || !this.isActiveRoom()) return;
    if (this.hasLostFocus || this.state.isRoomMinimized) {
      this.hasLostFocus = false;
      this.debounceRestore();
    }
  };

  handleMouseLeave = (e: MouseEvent) => {
    if (this.isLeaving || !this.isActiveRoom()) return;
    if (e.clientY <= 0) {
      const now = Date.now();
      if (now >= this.exitIntentCooldownUntil && !this.state.isRoomMinimized) {
        this.exitIntentCooldownUntil = now + 5000;
        this.setState({ isRoomMinimized: true });
      }
    }
  };

  isMicEnabled = (): boolean => {
    if (this.videoChatRef.current) {
      return this.videoChatRef.current.getAudioWebRTC();
    }
    const ourStream = (window as any).cowatch?.ourStream;
    return Boolean(
      ourStream &&
      ourStream.getAudioTracks()[0] &&
      ourStream.getAudioTracks()[0].enabled
    );
  };

  isVideoEnabled = (): boolean => {
    if (this.videoChatRef.current) {
      return this.videoChatRef.current.getVideoWebRTC();
    }
    const ourStream = (window as any).cowatch?.ourStream;
    return Boolean(
      ourStream &&
      ourStream.getVideoTracks()[0] &&
      ourStream.getVideoTracks()[0].enabled
    );
  };

  handleToggleMic = async () => {
    if (this.videoChatRef.current) {
      await this.videoChatRef.current.toggleAudioWebRTC();
    } else {
      const ourStream = (window as any).cowatch?.ourStream;
      if (ourStream) {
        const audioTrack = ourStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
        }
      }
    }
    this.forceUpdate();
  };

  handleToggleVideo = async () => {
    if (this.videoChatRef.current) {
      await this.videoChatRef.current.toggleVideoWebRTC();
    } else {
      const ourStream = (window as any).cowatch?.ourStream;
      if (ourStream) {
        const videoTrack = ourStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
        }
      }
    }
    this.forceUpdate();
  };

  chatRef = React.createRef<ChatComponent>();

  async componentDidMount() {
    if (this.context.displayName && this.context.displayName !== this.state.myName) {
      this.updateName(this.context.displayName);
    }
    const mountPicture = this.context.avatarUrl || this.state.myPicture;
    if (mountPicture) {
      this.updatePicture(mountPicture);
    }
    document.onfullscreenchange = this.onFullScreenChange;
    document.onkeydown = this.onKeydown;

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("blur", this.handleWindowBlur);
    window.addEventListener("focus", this.handleWindowFocus);
    document.addEventListener("mouseleave", this.handleMouseLeave);

    // Send heartbeat to the server
    this.heartbeat = window.setInterval(
      () => {
        fetch(serverPath + "/ping");
      },
      10 * 60 * 1000,
    );

    const canAutoplay = await testAutoplay();
    this.setState({ isAutoPlayable: canAutoplay });
    this.loadSettings();
    this.loadYouTube();
    this.init();
  }

  componentWillUnmount() {
    document.removeEventListener("fullscreenchange", this.onFullScreenChange);
    document.removeEventListener("keydown", this.onKeydown);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("blur", this.handleWindowBlur);
    window.removeEventListener("focus", this.handleWindowFocus);
    document.removeEventListener("mouseleave", this.handleMouseLeave);
    window.clearInterval(this.heartbeat);
    if (this.focusRestoreTimeout) {
      window.clearTimeout(this.focusRestoreTimeout);
      this.focusRestoreTimeout = null;
    }
    if (this.startingTimer) {
      window.clearTimeout(this.startingTimer);
      this.startingTimer = null;
    }
  }

  init = async () => {
    let roomId = this.props.urlRoomId || "";

    this.setState({ roomId }, () => {
      this.join(roomId);
    });
  };

  join = async (roomId: string) => {
    const cleanRoomId = (roomId || "").trim();
    if (!cleanRoomId) {
      this.setState({ state: "connected", overlayMsg: "Invalid room identifier." });
      return;
    }

    if (this.startingTimer) {
      window.clearTimeout(this.startingTimer);
    }
    this.startingTimer = window.setTimeout(() => {
      if (this.state.state === "starting") {
        console.warn("Room connection starting state timed out (2500ms); forcing connected state.");
        this.setState({ state: "connected" });
      }
    }, 2500);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      // Check for ?invite= token and preserve it in sessionStorage if provided
      const urlInvite = urlParams.get("invite");
      const sessionInviteKey = `cowatch-invite-${cleanRoomId}`;
      let inviteCredential = "";
      try {
        inviteCredential = window.sessionStorage?.getItem(sessionInviteKey) || "";
      } catch {
        // sessionStorage may be blocked in some private contexts
      }

      if (urlInvite) {
        try {
          const redeemRes = await fetch(`${serverPath}/redeemInvite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: cleanRoomId, token: urlInvite }),
          });
          if (redeemRes.ok) {
            const redeemData = await redeemRes.json();
            if (redeemData?.inviteCredential) {
              inviteCredential = redeemData.inviteCredential;
              try {
                window.sessionStorage?.setItem(sessionInviteKey, inviteCredential);
              } catch {
                // ignore
              }
            }
          }
        } catch (inviteErr) {
          console.warn("Error redeeming invite:", inviteErr);
        } finally {
          urlParams.delete("invite");
          const remainingQuery = urlParams.toString();
          const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "");
          window.history.replaceState({}, "", cleanUrl);
        }
      }

      let shard = "";
      try {
        const response = await fetch(serverPath + "/resolveShard/" + encodeURIComponent(cleanRoomId), {
          signal: AbortSignal.timeout(1500),
        });
        shard = (await response.text()) || "";
      } catch (e) {
        console.warn("Shard resolution error, defaulting to shard 0:", e);
      }

      let token: string | undefined;
      let uid: string | undefined;
      try {
        const sessionData = await safeGetSession(1000);
        token = sessionData?.data?.session?.access_token;
        uid = sessionData?.data?.session?.user?.id;
      } catch (e) {
        console.warn("Session retrieval error:", e);
      }

      const admissionToken = window.sessionStorage?.getItem(`admissionToken_${cleanRoomId}`) || "";

      // Connect to room namespace (URL-encoded to prevent invalid character/space errors)
      const safeNamespace = encodeURIComponent(cleanRoomId);
      const socket = io(serverPath + "/" + safeNamespace, {
        transports: ["websocket", "polling"],
        query: {
          clientId,
          shard,
          roomId: cleanRoomId,
        },
        auth: {
          sessionId: getOrCreateSessionId(),
          uid,
          token,
          inviteCredential,
          admissionToken,
        },
      });
      this.socket = socket;

      socket.on("connect", async () => {
        if (this.startingTimer) {
          window.clearTimeout(this.startingTimer);
          this.startingTimer = null;
        }
        this.setState({
          state: "connected",
          overlayMsg: "",
          errorMessage: "",
          successMessage: "",
          warningMessage: "",
        });
        // Use the name in our state, generate one if empty
        const currentName = this.context.displayName || this.state.myName || (await generateName());
        this.updateName(currentName);
        const currentPicture = this.context.avatarUrl || this.state.myPicture;
        if (currentPicture) {
          this.updatePicture(currentPicture);
        }
        this.loadSignInData(this.context.user);
        // Re-join video chat if we were in it before the reconnection
        if (window.cowatch.ourStream) {
          socket.emit("CMD:joinVideo");
        }
      });
      socket.on("connect_error", (err: any) => {
        console.error("Socket connect_error:", err);
        if (this.startingTimer) {
          window.clearTimeout(this.startingTimer);
          this.startingTimer = null;
        }

        const authErrors = [
          "UNAUTHORIZED",
          "ADMISSION_EXPIRED",
          "ROOM_NOT_JOINABLE",
          "ROOM_NOT_FOUND",
          "passcode",
          "password"
        ];
        if (authErrors.includes(err.message)) {
          // Route all admission failures back to the UX boundary for proper state display
          window.location.assign(`/join/${cleanRoomId}`);
          return;
        }

        this.setState({ state: "connected" });
        if (err.message === "Invalid namespace") {
          this.setState({ overlayMsg: "Couldn't load this room." });
        } else {
          this.setState({ overlayMsg: err?.message ?? "An error occurred connecting to room." });
        }
      });
      socket.on("disconnect", (reason) => {
        if (reason === "io server disconnect") {
          // the disconnection was initiated by the server, you need to reconnect manually
          this.setState({ overlayMsg: "Disconnected from server." });
        } else {
          // else the socket will automatically try to reconnect
          // Use the alert pill since it's less disruptive
          this.setState({ warningMessage: "Reconnecting..." });
        }
      });
      socket.on("errorMessage", (err: string) => {
        this.setState({ errorMessage: err });
        setTimeout(() => {
          this.setState({ errorMessage: "" });
        }, 3000);
      });
      socket.on("successMessage", (success: string) => {
        this.setState({ successMessage: success });
        setTimeout(() => {
          this.setState({ successMessage: "" });
        }, 3000);
      });
      socket.on("kicked", () => {
        window.location.assign("/");
      });
      socket.on("REC:play", (data?: any) => {
        if (
          data &&
          typeof data === "object" &&
          typeof data.ts === "number" &&
          isFinite(data.ts) &&
          data.ts >= 0
        ) {
          if (this.hasDuration() && !this.state.isLiveStream) {
            const curr = this.Player().getCurrentTime();
            if (typeof curr === "number" && Math.abs(curr - data.ts) > 0.25) {
              this.Player().seekVideo(data.ts);
            }
          }
        }
        this.localPlay();
      });
      socket.on("REC:pause", (data?: any) => {
        this.localPause();
        if (
          data &&
          typeof data === "object" &&
          typeof data.ts === "number" &&
          isFinite(data.ts) &&
          data.ts >= 0
        ) {
          if (this.hasDuration() && !this.state.isLiveStream) {
            this.Player().seekVideo(data.ts);
          }
        }
      });
      socket.on("REC:seek", (data: number) => {
        this.localSeek(data);
      });
      socket.on("REC:playbackRate", (data: number) => {
        this.setState({ roomPlaybackRate: data });
        if (data > 0) {
          this.Player().setPlaybackRate(data);
        }
      });
      socket.on("REC:subtitle", (data: string) => {
        this.setState({ roomSubtitle: data }, () => {
          this.Player().loadSubtitles(data);
        });
      });
      socket.on("REC:loop", (data: boolean) => {
        this.setState({ roomLoop: data });
      });
      socket.on("REC:changeController", (data: string) => {
        this.setState({ controller: data });
      });
      socket.on("REC:host", async (data: HostState) => {
        let currentMedia = data.video || "";
        if (this.playingScreenShare() && !isScreenShare(currentMedia)) {
          this.stopPublishingLocalStream();
        }
        if (this.playingFileShare() && !isFileShare(currentMedia)) {
          this.stopPublishingLocalStream();
        }
        if (this.playingVBrowser() && !isVBrowser(currentMedia)) {
          this.stopVBrowser();
        }
        if (this.playingScreenShare() && isScreenShare(currentMedia)) {
          // Ignore, it's probably a reconnection
          return;
        }
        if (this.playingFileShare() && isFileShare(currentMedia)) {
          // Ignore, it's probably a reconnection
          return;
        }
        if (
          this.playingVBrowser() &&
          this.getVBrowserHost() &&
          isVBrowser(currentMedia)
        ) {
          // Ignore, it's probably a reconnection
          return;
        }
        this.setState(
          {
            roomMedia: currentMedia,
            roomPaused: data.paused,
            roomSubtitle: data.subtitle,
            roomLoop: data.loop,
            roomPlaybackRate: data.playbackRate,
            loading: Boolean(data.video),
            nonPlayableMedia: false,
            isVBrowserLarge: data.isVBrowserLarge,
            vBrowserResolution: "1280x720@30",
            vBrowserQuality: "1",
            controller: data.controller,
            isLiveStream: false,
          },
          async () => {
            const leftVideo = this.HTMLInterface.getVideoEl();

            // Stop all players
            // Unless the user is sharing a file, because we play it in leftVideo and capture stream
            if (!this.isLocalStreamAFile) {
              this.HTMLInterface.pauseVideo();
            }
            this.YouTubeInterface.stopVideo();

            if (!this.isLocalStreamAFile) {
              this.Player().clearState();
            }
            if (data.subtitle) {
              this.Player().loadSubtitles(data.subtitle);
            }
            if (data.playbackRate) {
              this.Player().setPlaybackRate(data.playbackRate);
            }

            if (
              this.playingScreenShare() ||
              this.playingFileShare() ||
              this.playingVBrowser()
            ) {
              console.log(
                "exiting REC:host since we are using webRTC (fileshare, screenshare, or vbrowser). Check setupRTCConnections()",
              );
              if (!(this.playingVBrowser() && !this.getVBrowserHost())) {
                // Remove the loader unless we're waiting for a vbrowser
                this.setLoadingFalse();
              }
              return;
            }
            if (this.usingYoutube() && !this.YouTubeInterface.isReady()) {
              console.log(
                "YT player not ready, initializing and retrying via ensureYouTubePlayerReady",
              );
              this.ensureYouTubePlayerReady(() => {
                if (this.usingYoutube()) {
                  this.socket?.emit("CMD:askHost");
                }
              });
              setTimeout(() => {
                if (this.usingYoutube() && !this.YouTubeInterface.isReady()) {
                  this.ensureYouTubePlayerReady();
                }
              }, 1000);
              return;
            }
            const src = data.video;
            const time = data.videoTS;
            if (isMagnet(src)) {
              // WebTorrent
              if (!window.cowatch.webtorrent) {
                const WebTorrent = //@ts-expect-error
                  (await import("webtorrent/dist/webtorrent.min.js")).default;
                window.cowatch.webtorrent = new WebTorrent();
                const reg = await navigator.serviceWorker?.register("/sw.min.js");
                const worker = reg.active || reg.waiting || reg.installing;
                const checkState = (worker: ServiceWorker | null) => {
                  if (worker?.state === "activated") {
                    return window.cowatch.webtorrent?.createServer({
                      controller: reg,
                    });
                  }
                  return null;
                };
                if (!checkState(worker)) {
                  worker?.addEventListener("statechange", ({ target }) =>
                    checkState(target as ServiceWorker),
                  );
                }
              }
              await new Promise(async (resolve) => {
                const finish = (torrent: Torrent) => {
                  // Got torrent metadata!
                  console.log("Client is downloading:", torrent.infoHash);

                  // Torrents can contain many files.
                  const files = torrent.files;
                  const fileIndex = new URLSearchParams(src).get("fileIndex");
                  // Try to find a single large file to play
                  let target;
                  if (fileIndex != null && fileIndex !== "") {
                    target = files[Number(fileIndex)];
                  }
                  if (!target) {
                    // Open the selector
                    // Selecting a file sets a new URL with the fileIndex set so we go through again
                    this.setMultiSelectModal(true);
                    this.setFileSelection(
                      files.map((f: WebTorrent.TorrentFile, i: number) => ({
                        name: f.name,
                        url: src + `&fileIndex=${i}`,
                        length: f.length,
                      })),
                    );
                  } else {
                    //@ts-expect-error
                    target.streamTo(leftVideo);
                  }
                  resolve(undefined);
                };
                let target = await window.cowatch.webtorrent?.get(src);
                if (!target) {
                  target = window.cowatch.webtorrent?.add(src, {
                    announce: [
                      "wss://tracker.btorrent.xyz",
                      "wss://tracker.openwebtorrent.com",
                    ],
                    destroyStoreOnDestroy: true,
                    maxWebConns: 4,
                    path: "/tmp/webtorrent/",
                    storeCacheSlots: 20,
                    strategy: "sequential",
                    // noPeersIntervalTime: 30,
                  });
                }
                if (target?.ready) {
                  finish(target);
                } else {
                  target?.on("ready", () => {
                    finish(target);
                  });
                }
              });
            } else if (isDash(src)) {
              if (!window.cowatch.dash) {
                const Dash = await import("dashjs");
                window.cowatch.dash = Dash.MediaPlayer().create();
                window.cowatch.dash.on("streamInitialized", (_e: any) => {
                  // for a live stream:
                  // html.currenttime is time since stream start
                  // html.duration is infinite
                  // player.duration is the seekable range
                  const isLiveStream = this.Player().getDuration() >= Infinity;
                  console.log("DASH stream initialized: isLive %s", isLiveStream);
                  this.setState({
                    isLiveStream,
                  });
                });
              }
              window.cowatch.dash.initialize(leftVideo, src);
            } else if (isHls(src) && window.MediaSource) {
              // Prefer using hls.js if MediaSource Extensions are supported
              // otherwise fallback to native HLS support using video tag (i.e. iPhones)
              if (!window.cowatch.hls) {
                const Hls = (await import("hls.js")).default;
                window.cowatch.hls = new Hls();
                window.cowatch.hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
                  const isLiveStream = data.details.live;
                  this.setState({ isLiveStream });
                  console.log("HLS level loaded: isLive %s", isLiveStream);
                });
              }
              window.cowatch.hls.loadSource(src);
              window.cowatch.hls.attachMedia(leftVideo);
            }
            // else if (isMpegTs(src)) {
            //   const mpegts = (await import('mpegts.js')).default;
            //   let player = mpegts.createPlayer({
            //     type: 'mse', // could also be mpegts, m2ts, flv
            //     // isLive: true,
            //     url: src,
            //   });
            //   player.attachMediaElement(leftVideo);
            //   player.load();
            //   player.play();
            // }
            else {
              await this.Player().setSrcAndTime(src, time);
            }
            // Start this video
            if (!data.paused) {
              this.localPlay();
            }
            // Do right before playing
            leftVideo?.addEventListener(
              "canplay",
              () => {
                this.setLoadingFalse();
                let ts = undefined;
                // WebTorrent and Hls and Dash reset position back to 0 so set it back here
                if (
                  isMagnet(src) ||
                  isHls(src) ||
                  isDash(src) ||
                  this.state.isLiveStream
                ) {
                  ts = time;
                }
                // Resync to leader since the loading might have taken some time
                this.localSeek(ts);
                if (this.state.uploadController) {
                  // Jump back to the start of the video
                  this.roomSeek(0);
                }
                if (data.playbackRate) {
                  // Set playback rate again since it might have been lost
                  console.log("setting playback rate again", data.playbackRate);
                  this.Player().setPlaybackRate(data.playbackRate);
                }
              },
              { once: true },
            );

            // Progress updater
            window.clearInterval(this.progressUpdater);
            this.setState({ downloaded: 0, total: 0, speed: 0 });
            if (currentMedia.includes("/stream?torrent=magnet")) {
              this.progressUpdater = window.setInterval(async () => {
                const response = await fetch(
                  currentMedia.replace("/stream", "/progress"),
                );
                const data = await response.json();
                this.setState({
                  downloaded: data.downloaded,
                  total: data.total,
                  speed: data.speed,
                  connections: data.connections,
                });
              }, 1000);
            }
            if (isMagnet(currentMedia)) {
              this.progressUpdater = window.setInterval(async () => {
                const client = window.cowatch.webtorrent;
                if (client) {
                  this.setState({
                    downloaded: client.torrents[0]?.downloaded,
                    total: client.torrents[0]?.length,
                    speed: client.torrents[0]?.downloadSpeed,
                    connections: client.torrents[0]?.numPeers,
                  });
                }
              }, 1000);
            }
          },
        );
      });
      socket.on("REC:chat", (data: ChatMessage) => {
        if (
          !getCurrentSettings().disableChatSound &&
          !data.system &&
          ((document.visibilityState && document.visibilityState !== "visible") ||
            this.state.currentTab !== "chat")
        ) {
          new Audio("/clearly.mp3").play();
        }
        this.state.chat.push(data);
        if (this.state.chat.length > 100) {
          this.state.chat.shift();
        }
        this.setState({
          chat: this.state.chat,
          scrollTimestamp: Date.now(),
          unreadCount:
            this.state.currentTab === "chat"
              ? this.state.unreadCount
              : this.state.unreadCount + 1,
        });
      });
      socket.on("REC:editMessage", (data: ChatMessage) => {
        const { chat } = this.state;
        const msgIndex = chat.findIndex((m) => m.dbId === data.dbId);
        if (msgIndex === -1) {
          return;
        }
        chat[msgIndex] = { ...chat[msgIndex], ...data };
        this.setState({ chat });
      });
      socket.on("REC:addReaction", (data: Reaction) => {
        const { chat } = this.state;
        const msgIndex = chat.findIndex(
          (m) => m.id === data.msgId && m.timestamp === data.msgTimestamp,
        );
        if (msgIndex === -1) {
          return;
        }
        const msg = chat[msgIndex];
        msg.reactions = msg.reactions || {};
        msg.reactions[data.value] = msg.reactions[data.value] || [];
        msg.reactions[data.value].push(data.user);
        this.setState({ chat }, () => {
          // if we add a reaction to the last message we need to scroll down
          // or else the reaction icon might be hidden
          if (
            msgIndex === chat.length - 1 &&
            this.chatRef.current?.state.isNearBottom
          ) {
            this.chatRef.current?.scrollToBottom();
          }
        });
      });
      socket.on("REC:removeReaction", (data: Reaction) => {
        const { chat } = this.state;
        const msg = chat.find(
          (m) => m.id === data.msgId && m.timestamp === data.msgTimestamp,
        );
        if (!msg || !msg.reactions?.[data.value]) {
          return;
        }
        msg.reactions[data.value] = msg.reactions[data.value].filter(
          (id) => id !== data.user,
        );
        this.setState({ chat });
      });
      socket.on("REC:tsMap", (data: NumberDict) => {
        this.setState({ tsMap: data }, () => {
          // Dual-tier zero-latency synchronization engine
          // Keeps viewers locked frame-accurately to the room leader
          if (
            !this.state.isLiveStream &&
            this.hasDuration() &&
            this.state.roomPlaybackRate === 0 &&
            !this.playingScreenShare() &&
            !this.playingFileShare() &&
            !this.playingVBrowser()
          ) {
            const isHost = Boolean(this.state.owner && clientId === this.state.owner);
            if (!isHost) {
              const leader = this.getLeaderTime();
              const myTs =
                typeof data[clientId] === "number" && isFinite(data[clientId])
                  ? data[clientId]
                  : this.Player().getCurrentTime();

              if (
                typeof leader === "number" &&
                isFinite(leader) &&
                leader >= 0 &&
                typeof myTs === "number" &&
                isFinite(myTs)
              ) {
                const delta = leader - myTs; // Positive = we are behind leader; Negative = ahead

                if (this.state.roomPaused) {
                  // If paused, ensure exact frame alignment if drift exceeds 200ms
                  if (Math.abs(delta) > 0.2) {
                    this.Player().seekVideo(leader);
                  }
                } else {
                  // Active playback synchronization
                  // Tier 1: Hard snap if desync exceeds 0.85s
                  if (Math.abs(delta) > 0.85) {
                    this.Player().seekVideo(leader);
                    this.Player().setPlaybackRate(1.0);
                    if (this.Player().shouldPlay()) {
                      this.localPlay();
                    }
                  } else if (Math.abs(delta) >= 0.08) {
                    // Tier 2: Sub-second continuous pacing between 80ms and 850ms
                    let targetRate = 1.0;
                    if (delta > 0) {
                      // Behind: accelerate up to 1.25x to quickly close gap
                      targetRate = Math.min(1.0 + delta * 0.35, 1.25);
                    } else {
                      // Ahead: decelerate down to 0.85x to let leader catch up
                      targetRate = Math.max(1.0 + delta * 0.35, 0.85);
                    }
                    targetRate = Number(targetRate.toFixed(2));
                    if (Math.abs(this.Player().getPlaybackRate() - targetRate) >= 0.02) {
                      this.Player().setPlaybackRate(targetRate);
                    }
                  } else {
                    // Within 80ms deadband: synchronized, restore standard rate
                    if (this.Player().getPlaybackRate() !== 1.0) {
                      this.Player().setPlaybackRate(1.0);
                    }
                  }
                }
              }
            }
          }
          if (this.state.roomSubtitle) {
            const sharer = this.state.participants.find((p) => p.isScreenShare);
            if (sharer && sharer.id !== clientId) {
              // Sync only if someone is sharing and it's not us
              const sharerTime = this.state.tsMap[sharer.id];
              this.Player().syncSubtitles(sharerTime);
            }
          }
        });
      });
      socket.on("REC:nameMap", (data: StringDict) => {
        this.setState({ nameMap: data });
      });
      socket.on("REC:pictureMap", (data: StringDict) => {
        this.setState({ pictureMap: data });
      });
      socket.on("REC:lock", (data: string) => {
        this.setState({ roomLock: data });
      });
      socket.on("roster", (data: any[]) => {
        this.setState({ participants: data, rosterUpdateTS: Date.now() }, () => {
          this.setupRTCConnections();
        });
      });
      socket.on("chatinit", (data: ChatMessage[]) => {
        this.setState({ chat: data, scrollTimestamp: Date.now() });
      });
      socket.on("playlist", (data: PlaylistVideo[]) => {
        this.setState({ playlist: data });
      });
      socket.on(
        "signalSS",
        async (data: {
          msg: { ice: any; sdp: any };
          from: string;
          sharer: boolean;
        }) => {
          config.NODE_ENV === "development" && console.log(data);
          // Handle messages received from signaling server
          const msg = data.msg;
          const from = data.from;
          // Determine whether the message came from the sharer or the sharee
          const pc = (
            data.sharer ? this.consumerConn : this.publisherConns[from]
          ) as RTCPeerConnection;
          if (msg.ice !== undefined) {
            pc.addIceCandidate(new RTCIceCandidate(msg.ice));
          } else if (msg.sdp && msg.sdp.type === "offer") {
            // console.log('offer');
            // TODO Currently ios/Safari cannot handle this property, so remove it from the offer
            const _sdp = msg.sdp.sdp
              .split("\n")
              .filter((line: string) => {
                return line.trim() !== "a=extmap-allow-mixed";
              })
              .join("\n");
            msg.sdp.sdp = _sdp;
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            // Allow stereo audio
            answer.sdp = answer.sdp?.replace(
              "useinbandfec=1",
              "useinbandfec=1; stereo=1; maxaveragebitrate=510000",
            );
            // console.log(answer.sdp);
            // Allow multichannel audio if Chromium
            //@ts-expect-error
            const isChromium = Boolean(window.chrome);
            if (isChromium) {
              answer.sdp = answer.sdp
                ?.replace("opus/48000/2", "multiopus/48000/6")
                .replace(
                  "useinbandfec=1",
                  "channel_mapping=0,4,1,2,3,5; num_streams=4; coupled_streams=2;maxaveragebitrate=510000;minptime=10;useinbandfec=1",
                );
            }
            await pc.setLocalDescription(answer);
            this.sendSignalSS(from, { sdp: pc.localDescription }, !data.sharer);
          } else if (msg.sdp && msg.sdp.type === "answer") {
            pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          }
        },
      );
      socket.on("REC:getRoomState", this.handleRoomState);
      socket.on("REC:roomStarted", (data: any) => {
        console.log("[App] REC:roomStarted received:", data);
        this.setState({
          roomStatus: data.status || "active",
          roomStartedAt: data.startedAt || null,
          roomExpiresAt: data.expiresAt || null,
          roomIsPermanent: Boolean(data.isPermanent),
          roomDurationMinutes: data.durationMinutes ?? null,
          roomServerNow: data.serverNow || null,
        });
      });
      socket.on("REC:waitingLounge", (data: WaitingLoungeState) => {
        const wasInLounge = this.state.waitingLoungeState?.inLounge;
        this.setState({ waitingLoungeState: data }, () => {
          if (wasInLounge && !data.inLounge) {
            console.log("[App] REC:waitingLounge admitted user, initializing media");
            this.ensureYouTubePlayerReady();
            this.socket?.emit("CMD:askHost");
            this.socket?.emit("CMD:getRoomState");
          }
        });
      });
      socket.on("REC:waitingList", (data: WaitingGuest[]) => {
        this.setState({ waitingList: data || [] });
      });
      socket.on("REC:waitingLoungeEnabled", (data: { enabled: boolean }) => {
        this.setState({ isWaitingLoungeEnabled: data.enabled });
      });
      window.setInterval(() => {
        if (this.state.roomMedia) {
          const curr = this.Player().getCurrentTime();
          if (typeof curr === "number" && isFinite(curr) && curr >= 0) {
            const toSend = this.getRoomTSToSet(curr);
            this.socket.emit("CMD:ts", toSend);
          }
        }
      }, 500);
    } catch (criticalErr) {
      console.error("Critical error in join:", criticalErr);
      if (this.startingTimer) {
        window.clearTimeout(this.startingTimer);
        this.startingTimer = null;
      }
      this.setState({ state: "connected", overlayMsg: "Failed to connect to room." });
    }
  };

  setFileSelection = (
    data: { name: string; url: string; length: number; playFn?: () => void }[],
  ) => {
    this.setState({ fileSelection: data });
  };

  setMultiSelectModal = (isMultiSelectModalOpen: boolean) => {
    this.setState({ isMultiSelectModalOpen });
  };

  resetMultiSelect = () => {
    this.setState({ isMultiSelectModalOpen: false, fileSelection: [] });
  };

  loadSettings = async () => {
    // Load settings from localstorage
    let settings = getCurrentSettings();
    this.setState({ settings });
  };

  loadSignInData = async (user: User | null | undefined) => {
    if (user && this.socket) {
      this.updateUid(user);
    }
  };

  componentDidUpdate(prevProps: any, prevState: AppState) {
    const contextName = this.context.displayName || "";
    const contextPicture = this.context.avatarUrl || "";
    if (contextName && contextName !== this.state.myName) {
      this.updateName(contextName);
    }
    if (contextPicture !== this.state.myPicture) {
      this.updatePicture(contextPicture);
    }

    // If user just transitioned from Waiting Lounge to Admitted Room, initialize player and ask host state
    if (prevState?.waitingLoungeState?.inLounge && !this.state.waitingLoungeState?.inLounge) {
      console.log("[App] Admitted from waiting lounge in componentDidUpdate, initializing media");
      this.ensureYouTubePlayerReady();
      this.socket?.emit("CMD:askHost");
      this.socket?.emit("CMD:getRoomState");
    }

    // If admitted and using YouTube, ensure player is ready
    if (!this.state.waitingLoungeState?.inLounge && this.usingYoutube() && (!this.YouTubeInterface || !this.YouTubeInterface.isReady())) {
      this.ensureYouTubePlayerReady();
    }
  }

  private ytInitInProgress = false;

  ensureYouTubePlayerReady = (callback?: () => void) => {
    if (this.YouTubeInterface && this.YouTubeInterface.isReady()) {
      callback?.();
      return;
    }
    if (this.ytInitInProgress) {
      return;
    }
    const el = document.getElementById("leftYt");
    if (!el) {
      setTimeout(() => this.ensureYouTubePlayerReady(callback), 150);
      return;
    }
    if (!window.YT || !window.YT.Player) {
      return;
    }

    try {
      this.ytInitInProgress = true;
      const ytPlayer = new window.YT.Player("leftYt", {
        events: {
          onReady: () => {
            console.log("[App] YouTube player onReady initialized successfully");
            this.ytInitInProgress = false;
            this.YouTubeInterface = new YouTube(ytPlayer);
            this.setState({ loading: false });
            callback?.();
            if (this.usingYoutube()) {
              console.log("[App] requesting host data again after ytReady");
              this.socket?.emit("CMD:askHost");
            }
          },
          onStateChange: (e: any) => {
            if (
              this.usingYoutube() &&
              e.data === window.YT?.PlayerState?.CUED
            ) {
              this.setState({ loading: false });
            }
            if (
              this.usingYoutube() &&
              e.data === window.YT?.PlayerState?.ENDED
            ) {
              console.log(e.data, e.target.getVideoUrl());
              this.onVideoEnded(e.target.getVideoUrl());
            }
            if (
              this.ytDebounce &&
              ((e.data === window.YT?.PlayerState?.PLAYING &&
                this.state.roomPaused) ||
                (e.data === window.YT?.PlayerState?.PAUSED &&
                  !this.state.roomPaused))
            ) {
              this.ytDebounce = false;
              if (e.data === window.YT?.PlayerState?.PLAYING) {
                this.socket.emit("CMD:play");
                this.localPlay();
              } else {
                this.socket.emit("CMD:pause");
                this.localPause();
              }
              window.setTimeout(() => (this.ytDebounce = true), 500);
            }
          },
        },
      });
    } catch (e) {
      this.ytInitInProgress = false;
      console.warn("[App] Error initializing YouTube player:", e);
    }
  };

  loadYouTube = () => {
    // This code loads the IFrame Player API code asynchronously.
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => {
      console.warn("YouTube iframe API failed to load");
      this.setState({ loading: false });
    };
    document.body.append(tag);
    window.onYouTubeIframeAPIReady = () => {
      this.ensureYouTubePlayerReady();
    };
  };

  // Functions for managing room settings
  getInviteLink = () => {
    return getRoomUrl(this.state.roomId);
  };

  handleRoomState = (data: any) => {
    this.setIsChatDisabled(data.isChatDisabled);
    this.setOwner(data.owner);
    this.setPasscode(data.passcode);
    this.setRoomTitle(data.roomTitle);
    this.setRoomDescription(data.roomDescription);
    this.setMediaPath(data.mediaPath);
    if (data.isWaitingLoungeEnabled !== undefined) {
      this.setState({ isWaitingLoungeEnabled: data.isWaitingLoungeEnabled });
    }
    // Lifecycle fields from server (authoritative)
    if (data.status !== undefined) {
      this.setState({
        roomStatus: data.status,
        roomStartedAt: data.startedAt || null,
        roomExpiresAt: data.expiresAt || null,
        roomIsPermanent: Boolean(data.isPermanent),
        roomDurationMinutes: data.durationMinutes ?? null,
        roomServerNow: data.serverNow || null,
      });
    }
    this.setInviteLink(this.getInviteLink());
    window.history.replaceState("", "", this.getInviteLink());
  };

  setOwner = (owner: string) => {
    this.setState({ owner });
  };
  setPasscode = (passcode: string | undefined) => {
    this.setState({ passcode });
  };
  setInviteLink = (inviteLink: string) => {
    this.setState({ inviteLink });
  };
  setRoomTitle = (roomTitle: string) => {
    this.setState({ roomTitle });
  };
  setRoomDescription = (roomDescription: string | undefined) => {
    this.setState({ roomDescription });
  };
  setMediaPath = (mediaPath: string | undefined) => {
    this.setState({ mediaPath });
  };

  admitWaitingUser = (clientId: string) => {
    this.socket?.emit("CMD:admitUser", { clientId });
  };

  declineWaitingUser = (clientId: string) => {
    this.socket?.emit("CMD:declineUser", { clientId });
  };

  admitAllWaitingUsers = () => {
    this.socket?.emit("CMD:admitAll");
  };

  setIsWaitingLoungeEnabled = (enabled: boolean) => {
    this.socket?.emit("CMD:setWaitingLounge", { enabled });
    this.setState({ isWaitingLoungeEnabled: enabled });
  };

  setRoomLock = async (locked: boolean) => {
    this.socket.emit("CMD:lock", { locked });
  };

  haveLock = () => {
    if (!this.state.roomLock) {
      return true;
    }
    const isOwner = Boolean(this.state.owner && this.context.user?.id === this.state.owner);
    return this.context.user?.id === this.state.roomLock || isOwner;
  };

  toggleLock = () => {
    this.setRoomLock(!Boolean(this.state.roomLock));
  };

  focusHeaderSearch = () => {
    window.dispatchEvent(new CustomEvent("cowatch:focus-search"));
    const el = document.getElementById("cowatch-header-search");
    el?.focus();
  };

  handleCopyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    this.setState({ copiedRoomLink: true });
    setTimeout(() => this.setState({ copiedRoomLink: false }), 2000);
  };

  setIsChatDisabled = (val: boolean) => this.setState({ isChatDisabled: val });

  clearChat = async () => {
    this.socket.emit("CMD:deleteChatMessages", {});
  };

  startConvert = async (sourceUrl?: string) => {
    let stream = new ReadableStream();
    let file: File;
    if (!sourceUrl) {
      const files = await openFileSelector();
      if (!files) {
        return;
      }
      file = files[0];
      // Start uploading stream
      stream = file.stream();
    }
    const uuid = createUuid();
    const convertPath = this.context.convertPath;
    // const convertPath = 'https://azure.howardchung.net:5001';
    let convertUrl = convertPath + "/" + uuid + ".m3u8";
    convertUrl += sourceUrl ? "?url=" + encodeURIComponent(sourceUrl) : "";
    // Wait for the playlist to get generated
    const poll = async () => {
      let ok = false;
      let i = 0;
      while (!ok && i < 30) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const resp = await fetch(convertUrl);
        ok = resp.ok;
        i += 1;
      }
      // Same URL but GET
      this.roomSetMedia(convertUrl);
    };
    poll();
    const reader = stream.getReader();
    const start = Date.now();
    let bytes = 0;
    const ws = new WebSocket(convertUrl.replace("http", "ws"));
    ws.onmessage = async (_ev) => {
      // Server sends a message whenever it wants next chunk
      const { done, value } = await reader.read();
      if (value) {
        ws.send(value);
      }
      if (done) {
        ws.close();
      }
      const end = Date.now();
      bytes += value?.length ?? 0;
      this.setState({
        downloaded: bytes,
        total: file?.size,
        speed: done ? 0 : bytes / ((end - start) / 1000),
        connections: 1,
      });
    };
    ws.onclose = () => {
      this.setState({ uploadController: undefined });
    };
    const controller = new AbortController();
    controller.signal.onabort = (_ev) => {
      ws.close();
    };
    this.setState({
      uploadController: controller,
    });
    // Note: If using fetch we can't read the response until the request completes
    // await fetch(convertUrl, {
    //   method: 'POST',
    //   body: stream,
    //   signal: this.state.uploadController?.signal,
    //   //@ts-expect-error
    //   duplex: 'half',
    // });
  };

  startFileShare = async (useMediaSoup: boolean) => {
    const files = await openFileSelector();
    if (!files) {
      return;
    }
    const file = files[0];
    this.Player().clearState();
    const leftVideo = this.HTMLInterface.getVideoEl();
    leftVideo.src = URL.createObjectURL(file);
    leftVideo.play();
    //@ts-expect-error
    this.localStreamToPublish = leftVideo?.captureStream();
    this.isLocalStreamAFile = true;
    if (this.localStreamToPublish) {
      this.socket.emit("CMD:joinScreenShare", {
        file: true,
        mediasoup: useMediaSoup,
      });
    }
  };

  startScreenShare = async (useMediaSoup: boolean) => {
    if (navigator.mediaDevices.getDisplayMedia) {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        //@ts-expect-error
        video: { height: 720, logicalSurface: true },
        audio: {
          autoGainControl: false,
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000,
          sampleSize: 16,
        },
      });
      this.localStreamToPublish = stream;
      this.isLocalStreamAFile = false;
      this.socket.emit("CMD:joinScreenShare", {
        file: false,
        mediasoup: useMediaSoup,
      });
    }
  };

  // Share the video to mediasoup
  publishMediasoup = async (mediasoupURL: string) => {
    const localStream = this.localStreamToPublish;
    let device: MediasoupClient.types.Device = null as any;
    let producerTransport: MediasoupClient.types.Transport = null as any;

    // =========== socket.io ==========
    const connectSocket = (mediasoupURL: string) => {
      return new Promise<void>((resolve, reject) => {
        this.mediasoupPubSocket = io(mediasoupURL, {
          transports: ["websocket"],
        });

        const socket = this.mediasoupPubSocket;
        socket?.on("connect", function () {
          console.log("PUBLISH: connected to socket.io");
          resolve();
        });
        socket?.on("error", function (err) {
          console.error("PUBLISH: socket.io ERROR:", err);
          reject(err);
        });
      });
    };

    const sendRequest = (type: string, data: any) => {
      return new Promise<any>((resolve, reject) => {
        const socket = this.mediasoupPubSocket;
        socket?.emit(type, data, (err: any, response: any) => {
          if (!err) {
            // Success response, so pass the mediasoup response to the local Room.
            resolve(response);
          } else {
            reject(err);
          }
        });
      });
    };

    async function publish() {
      // --- get transport info ---
      console.log("PUBLISH: --- createProducerTransport --");
      const params = await sendRequest("createProducerTransport", {});
      console.log("PUBLISH: transport params:", params);
      producerTransport = device.createSendTransport(params);
      console.log("PUBLISH: createSendTransport:", producerTransport);

      // --- join & start publish --
      producerTransport.on(
        "connect",
        async (
          {
            dtlsParameters,
          }: { dtlsParameters: MediasoupClient.types.DtlsParameters },
          callback: () => void,
          errback: (error: Error) => void,
        ) => {
          console.log("PUBLISH: --transport connect");
          sendRequest("connectProducerTransport", {
            dtlsParameters: dtlsParameters,
          })
            .then(callback)
            .catch(errback);
        },
      );

      producerTransport.on(
        "produce",
        async (
          {
            kind,
            rtpParameters,
          }: {
            kind: string;
            rtpParameters: MediasoupClient.types.RtpParameters;
          },
          callback: ({ id }: { id: string }) => void,
          errback: (error: Error) => void,
        ) => {
          console.log("PUBLISH: --transport produce");
          try {
            const { id } = await sendRequest("produce", {
              transportId: producerTransport.id,
              kind,
              rtpParameters,
            });
            callback({ id });
          } catch (err: any) {
            errback(err);
          }
        },
      );

      // producerTransport.on('connectionstatechange', (state: string) => {
      //   switch (state) {
      //     case 'connecting':
      //       console.log('PUBLISH: connecting');
      //       break;

      //     case 'connected':
      //       console.log('PUBLISH: connected');
      //       break;

      //     case 'failed':
      //       console.log('PUBLISH: failed');
      //       producerTransport.close();
      //       break;

      //     default:
      //       break;
      //   }
      // });

      const videoTrack = localStream?.getVideoTracks()[0];
      if (videoTrack) {
        const trackParams = { track: videoTrack };
        await producerTransport.produce(trackParams);
      }
      const audioTrack = localStream?.getAudioTracks()[0];
      if (audioTrack) {
        const trackParams = { track: audioTrack };
        await producerTransport.produce(trackParams);
      }
    }

    async function loadDevice(
      routerRtpCapabilities: MediasoupClient.types.RtpCapabilities,
    ) {
      const { Device } = await import("mediasoup-client");
      device = new Device();
      await device.load({ routerRtpCapabilities });
    }

    await connectSocket(mediasoupURL);
    // --- get capabilities --
    const data = await sendRequest("getRouterRtpCapabilities", {});
    console.log("PUBLISH: getRouterRtpCapabilities:", data);
    await loadDevice(data);
    await publish();
  };

  // Play the video from MediaSoup
  subscribeMediasoup = async (mediaSoupURL: string) => {
    let device: MediasoupClient.types.Device = null as any;
    let consumerTransport: MediasoupClient.types.Transport = null as any;
    // =========== socket.io ==========

    const connectSocket = () => {
      return new Promise<void>((resolve, reject) => {
        this.mediasoupSubSocket = io(mediaSoupURL, {
          transports: ["websocket"],
        });
        const socket = this.mediasoupSubSocket;
        socket?.on("connect", function () {
          console.log("SUBSCRIBE: connected to socket.io");
          resolve();
        });
        socket?.on("error", function (err) {
          console.error("SUBSCRIBE: socket.io ERROR:", err);
          reject(err);
        });
        socket?.on("newProducer", async function (message) {
          console.log("SUBSCRIBE: socket.io newProducer:", message);
          if (consumerTransport) {
            // start consume
            if (message.kind === "video") {
              await consumeAndResume(message.kind);
            } else if (message.kind === "audio") {
              await consumeAndResume(message.kind);
            }
          }
        });

        // socket?.on('producerClosed', function (message) {
        //   console.log('socket.io producerClosed:', message);
        //   const localId = message.localId;
        //   const remoteId = message.remoteId;
        //   const kind = message.kind;
        //   if (kind === 'video') {
        //     if (videoConsumer) {
        //       videoConsumer.close();
        //       videoConsumer = null;
        //     }
        //   } else if (kind === 'audio') {
        //     if (audioConsumer) {
        //       audioConsumer.close();
        //       audioConsumer = null;
        //     }
        //   }
        // });
      });
    };

    const sendRequest = (type: string, data: any) => {
      return new Promise<any>((resolve, reject) => {
        const socket = this.mediasoupSubSocket;
        socket?.emit(type, data, (err: Error, response: any) => {
          if (!err) {
            // Success response, so pass the mediasoup response to the local Room.
            resolve(response);
          } else {
            reject(err);
          }
        });
      });
    };

    // =========== media handling ==========
    const addRemoteTrack = (track: MediaStreamTrack) => {
      let video = this.HTMLInterface.getVideoEl();
      if (video.srcObject) {
        // Track already exists, add it
        (video.srcObject as MediaStream).addTrack(track);
      } else {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(track);
        video.srcObject = mediaStream;
      }
      this.localPlay();
    };

    async function consumeAndResume(kind: string) {
      const consumer = await consume(consumerTransport, kind);
      if (consumer) {
        console.log("SUBSCRIBE: -- track exist, consumer ready. kind=" + kind);
        if (kind === "video") {
          console.log("SUBSCRIBE: -- resume kind=" + kind);
          sendRequest("resume", { kind: kind })
            .then(() => {
              console.log("SUBSCRIBE: resume OK");
              return consumer;
            })
            .catch((err) => {
              console.error("SUBSCRIBE: resume ERROR:", err);
              return consumer;
            });
        } else {
          console.log("SUBSCRIBE: -- do not resume kind=" + kind);
        }
      } else {
        console.log("SUBSCRIBE: -- no consumer yet. kind=" + kind);
        return null;
      }
    }

    async function loadDevice(
      routerRtpCapabilities: MediasoupClient.types.RtpCapabilities,
    ) {
      try {
        const { Device } = await import("mediasoup-client");
        device = new Device();
        await device.load({ routerRtpCapabilities });
      } catch (error: any) {
        if (error.name === "UnsupportedError") {
          console.error("browser not supported");
        }
      }
    }

    async function consume(
      transport: MediasoupClient.types.Transport,
      trackKind: string,
    ) {
      console.log("SUBSCRIBE: --start of consume --kind=" + trackKind);
      const { rtpCapabilities } = device;
      const data = await sendRequest("consume", {
        rtpCapabilities: rtpCapabilities,
        kind: trackKind,
      }).catch((err) => {
        console.error("SUBSCRIBE: ERROR:", err);
      });
      const { producerId, id, kind, rtpParameters } = data;

      if (producerId) {
        let codecOptions = {};
        const consumer = await transport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
          //@ts-expect-error
          codecOptions,
        });

        addRemoteTrack(consumer.track);
        console.log("SUBSCRIBE: --end of consume");
        return consumer;
      } else {
        console.warn("SUBSCRIBE: ---remote producer NOT READY");
        return null;
      }
    }

    async function subscribe() {
      console.log("SUBSCRIBE: ---createConsumerTransport --");
      const params = await sendRequest("createConsumerTransport", {});
      console.log("SUBSCRIBE: transport params:", params);
      consumerTransport = device.createRecvTransport(params);
      console.log("SUBSCRIBE: createConsumerTransport:", consumerTransport);

      // --- join & start watching
      consumerTransport.on(
        "connect",
        async (
          {
            dtlsParameters,
          }: { dtlsParameters: MediasoupClient.types.DtlsParameters },
          callback: () => void,
          errback: (err: Error) => void,
        ) => {
          console.log("SUBSCRIBE: ---consumer transport connect");
          sendRequest("connectConsumerTransport", {
            dtlsParameters: dtlsParameters,
          })
            .then(callback)
            .catch(errback);
        },
      );

      // consumerTransport.on('connectionstatechange', (state: string) => {
      //   switch (state) {
      //     case 'connecting':
      //       console.log('SUBSCRIBE: connecting');
      //       break;

      //     case 'connected':
      //       console.log('SUBSCRIBE: connected');
      //       break;

      //     case 'failed':
      //       console.log('SUBSCRIBE: failed');
      //       consumerTransport.close();
      //       break;

      //     default:
      //       break;
      //   }
      // });

      await consumeAndResume("video");
      await consumeAndResume("audio");
    }

    // Clear the srcobject so we load our stream when received
    const leftVideo = this.HTMLInterface.getVideoEl();
    leftVideo.srcObject = null;
    await connectSocket();
    // --- get capabilities --
    const data = await sendRequest("getRouterRtpCapabilities", {});
    console.log("getRouterRtpCapabilities:", data);
    await loadDevice(data);
    await subscribe();
  };

  stopPublishingLocalStream = async () => {
    if (this.localStreamToPublish) {
      this.socket.emit("CMD:leaveScreenShare");
      // We don't actually need to unmute if it's a fileshare but this is fine
      this.localSetMute(false);
    }
    this.localStreamToPublish &&
      this.localStreamToPublish.getTracks().forEach((track) => {
        track.stop();
      });
    this.localStreamToPublish = undefined;
    if (this.consumerConn) {
      this.consumerConn.close();
      this.consumerConn = undefined;
    }
    Object.values(this.publisherConns).forEach((pc) => {
      pc.close();
    });
    this.publisherConns = {};
    this.isLocalStreamAFile = false;
    if (this.mediasoupPubSocket) {
      this.mediasoupPubSocket.close();
      this.mediasoupPubSocket = null;
    }
    if (this.mediasoupSubSocket) {
      this.mediasoupSubSocket.close();
      this.mediasoupSubSocket = null;
    }
  };

  setupRTCConnections = async () => {
    if (!this.playingScreenShare() && !this.playingFileShare()) {
      return;
    }
    const sharer = this.state.participants.find((p) => p.isScreenShare);
    const selfId = getOrCreateClientId();
    const localTrack = this.localStreamToPublish?.getVideoTracks()[0];
    if (localTrack && !localTrack.onended) {
      // Stop sharing if the local stream stops
      localTrack.onended = () => this.stopPublishingLocalStream();
    }
    if (this.state.roomMedia.includes("@")) {
      let prefix = "screenshare://";
      if (this.playingFileShare()) {
        prefix = "fileshare://";
      }
      const unprefixed = this.state.roomMedia.replace(prefix, "");
      const mediasoupURL = unprefixed.split("@")[1];
      if (sharer?.id === selfId && this.mediasoupPubSocket == null) {
        await this.publishMediasoup(mediasoupURL);
      }
      // If we're not sharing a file, also start watching
      // avoid duplicate watching if the socket already exists
      if (!this.isLocalStreamAFile && this.mediasoupSubSocket == null) {
        await this.subscribeMediasoup(mediasoupURL);
      }
      return;
    }

    // We're the sharer, create a connection to each other member
    if (sharer?.id === selfId) {
      // Delete and close any connections that aren't in the current member list (maybe someone disconnected)
      // This allows them to rejoin later
      const clientIds = new Set(this.state.participants.map((p) => p.id));
      Object.entries(this.publisherConns).forEach(([key, value]) => {
        if (!clientIds.has(key)) {
          value.close();
          delete this.publisherConns[key];
        }
      });

      this.state.participants.forEach((user) => {
        const id = user.id;
        if (id === selfId && this.isLocalStreamAFile) {
          // Don't set up a connection to ourselves if sharing file
          return;
        }
        if (!this.publisherConns[id]) {
          // Set up the RTCPeerConnection for sharing media to each member
          const pc = new RTCPeerConnection({ iceServers: iceServers() });
          this.publisherConns[id] = pc;
          this.localStreamToPublish?.getTracks().forEach((track) => {
            if (this.localStreamToPublish != null) {
              pc.addTrack(track, this.localStreamToPublish);
            }
          });
          pc.onicecandidate = (event) => {
            // We generated an ICE candidate, send it to peer
            if (event.candidate) {
              this.sendSignalSS(id, { ice: event.candidate }, true);
            }
          };
          pc.onnegotiationneeded = async () => {
            // Start connection for peer's video
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.sendSignalSS(id, { sdp: pc.localDescription }, true);
          };
        }
      });
    }
    // We're a watcher, establish connection to sharer
    // If screensharing, sharer also does this
    // If filesharing, sharer does not do this since we use leftVideo
    if (sharer && !this.consumerConn && !this.isLocalStreamAFile) {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      this.consumerConn = pc;
      pc.onicecandidate = (event) => {
        // We generated an ICE candidate, send it to sharer
        if (event.candidate) {
          this.sendSignalSS(sharer.id, { ice: event.candidate });
        }
      };
      pc.ontrack = (event: RTCTrackEvent) => {
        if (event.receiver) {
          try {
            if ("playoutDelayHint" in event.receiver) {
              (event.receiver as any).playoutDelayHint = 0;
            }
            if ("jitterBufferTarget" in event.receiver) {
              (event.receiver as any).jitterBufferTarget = 0;
            }
          } catch (e) { }
        }
        // Mount the stream from sharer
        // console.log(stream);
        const leftVideo = this.HTMLInterface.getVideoEl();
        if (leftVideo) {
          leftVideo.src = "";
          leftVideo.srcObject = event.streams[0];
          this.localPlay();
        }
      };
    }
  };

  startVBrowser = async (options: { size: string }) => {
    this.socket.emit("CMD:startVBrowser", { options });
  };

  stopVBrowser = async () => {
    this.socket.emit("CMD:stopVBrowser");
  };

  changeController = async (value: string | null) => {
    // console.log(data);
    this.socket.emit("CMD:changeController", value);
  };

  sendSignalSS = async (to: string, data: any, sharer?: boolean) => {
    // console.log('sendSS', to, data);
    this.socket.emit("signalSS", { to, msg: data, sharer });
  };

  usingYoutube = () => {
    return isYouTube(this.state.roomMedia);
  };

  usingNative = () => {
    // Anything that uses HTML Video (e.g. not YouTube, Vimeo, or other embedded JS player)
    return !this.usingYoutube();
  };

  hasDuration = () => {
    // Youtube, link, or magnet, etc. Has a defined runtime (not WebRTC)
    return isHttp(this.state.roomMedia) || isMagnet(this.state.roomMedia);
  };

  playingScreenShare = () => {
    return isScreenShare(this.state.roomMedia);
  };

  playingFileShare = () => {
    return isFileShare(this.state.roomMedia);
  };

  playingVBrowser = () => {
    return isVBrowser(this.state.roomMedia);
  };

  getVBrowserPass = () => {
    return this.state.roomMedia.replace("vbrowser://", "").split("@")[0];
  };

  getVBrowserHost = () => {
    return this.state.roomMedia.replace("vbrowser://", "").split("@")[1];
  };

  isPauseDisabled = () => {
    return this.playingScreenShare() || this.playingVBrowser();
  };

  localSeek = (customTime?: number) => {
    // Jump to the leader's position, or a custom one
    let target = customTime ?? this.getLeaderTime();
    // For live this is the offset from the leading edge (negative)
    if (this.state.isLiveStream) {
      target = this.Player().getDuration() + (customTime ?? 0);
    }
    if (typeof target === "number" && isFinite(target) && target >= 0) {
      console.log("syncing self to leader or custom:", target);
      this.Player().seekVideo(target);
      if (!this.state.roomPaused && this.Player().shouldPlay()) {
        this.localPlay();
      }
      this.refreshControls();
    }
  };

  localPlay = async () => {
    if (!this.state.roomMedia) {
      return;
    }
    const canAutoplay = this.state.isAutoPlayable || (await testAutoplay());
    this.setState(
      { roomPaused: false, isAutoPlayable: canAutoplay },
      async () => {
        if (
          !this.state.isAutoPlayable ||
          (this.localStreamToPublish && !this.isLocalStreamAFile)
        ) {
          console.log("auto-muting to allow autoplay or screenshare host");
          this.localSetMute(true);
        } else {
          this.localSetMute(false);
        }
        try {
          await this.Player().playVideo();
        } catch (e: any) {
          console.warn(e, e.name);
          if (e.name === "NotSupportedError" && this.usingNative()) {
            this.setState({ loading: false, nonPlayableMedia: true });
          }
        }
      },
    );
  };

  localPause = () => {
    this.setState({ roomPaused: true }, async () => {
      this.Player().pauseVideo();
    });
  };

  localSetMute = (muted: boolean) => {
    this.Player().setMute(muted);
    this.refreshControls();
  };

  localSetVolume = (volume: number) => {
    this.Player().setVolume(volume);
    this.refreshControls();
  };

  localSubtitleModal = () => {
    // Native player uses subtitle modal.
    if (this.usingNative()) {
      this.setState({ isSubtitleModalOpen: true });
    }
  };

  roomSetPlaybackRate = (rate: number) => {
    // emit an event to the server
    this.socket.emit("CMD:playbackRate", rate);
  };

  roomSetLoop = (loop: boolean) => {
    this.socket.emit("CMD:loop", loop);
  };

  roomTogglePlay = () => {
    if (!this.haveLock()) {
      return;
    }
    if (this.isPauseDisabled()) {
      return;
    }
    const shouldPlay = this.Player().shouldPlay();
    if (shouldPlay) {
      this.socket.emit("CMD:play");
      this.localPlay();
    } else {
      this.socket.emit("CMD:pause");
      this.localPause();
    }
  };

  roomSeek = (time: number) => {
    let target = time;
    target = Math.max(target, 0);
    this.Player().seekVideo(target);
    const toSend = this.getRoomTSToSet(target);
    this.socket.emit("CMD:seek", toSend);
  };

  getRoomTSToSet = (time: number) => {
    let target = time;
    // In live case, can't just send video time because clients may have different durations
    // Take the passed time and compute the offset from the end time (negative)
    // Each client should use this value to compute the time to set when starting playback
    if (this.state.isLiveStream) {
      target = time - this.Player().getDuration();
    }
    // Otherwise just return the time
    return target;
  };

  onFullScreenChange = () => {
    this.setState({ fullScreen: Boolean(document.fullscreenElement) });
    setTimeout(() => this.chatRef.current?.scrollToBottom(), 100);
  };

  onKeydown = (e: any) => {
    if (!document.activeElement || document.activeElement.tagName === "BODY") {
      if (e.key === " ") {
        e.preventDefault();
        this.roomTogglePlay();
      } else if (e.key === "ArrowRight") {
        this.roomSeek(this.Player().getCurrentTime() + 10);
      } else if (e.key === "ArrowLeft") {
        this.roomSeek(this.Player().getCurrentTime() - 10);
      } else if (e.key === "t") {
        this.localFullScreen(false);
      } else if (e.key === "f") {
        this.localFullScreen(true);
      } else if (e.key === "m") {
        this.localToggleMute();
      }
    }
  };

  localFullScreen = async (bVideoOnly: boolean) => {
    // Default: fullscreen the body (theater mode)
    let container = document.body as HTMLElement;
    if (bVideoOnly || isMobile()) {
      if (this.playingVBrowser() && !isMobile()) {
        // vbrowser needs to fullscreen the control wrapper div
        // Can't really control the VBrowser on mobile anyway, so just fullscreen the video
        container = document.getElementById("leftVideoParent") as HTMLElement;
      } else {
        // fullscreen just the video
        container = this.Player().getVideoEl();
      }
    }
    if (
      !container.requestFullscreen &&
      //@ts-expect-error
      container.webkitEnterFullScreen
    ) {
      // e.g. iPhone doesn't allow requestFullscreen
      //@ts-expect-error
      container.webkitEnterFullscreen();
      return;
    }
    if (!document.fullscreenElement) {
      // not currently in fullscreen
      await container.requestFullscreen();
    } else {
      // e.g. switching from video fullscreen to theater mode
      const bChangeElements = document.fullscreenElement !== container;
      await document.exitFullscreen();
      if (bChangeElements) {
        await container.requestFullscreen();
      }
    }
  };

  localToggleMute = () => {
    this.localSetMute(!this.Player().isMuted());
  };

  roomSetMedia = (value: string) => {
    this.socket.emit("CMD:host", value);
  };

  roomPlaylistPlay = (index: number) => {
    this.roomSetMedia(this.state.playlist[index]?.url);
    this.roomPlaylistDelete(index);
  };

  roomPlaylistAdd = (value: string) => {
    this.socket.emit("CMD:playlistAdd", value);
  };

  roomPlaylistMove = (index: number, toIndex: number) => {
    this.socket.emit("CMD:playlistMove", { index, toIndex });
  };

  roomPlaylistDelete = (index: number) => {
    this.socket.emit("CMD:playlistDelete", index);
  };

  updateName = (name: string) => {
    this.setState((prev) => ({
      myName: name,
      nameMap: {
        ...prev.nameMap,
        [clientId]: name,
      },
    }));
    this.socket?.emit("CMD:name", name);
  };

  updatePicture = (url: string) => {
    this.setState((prev) => ({
      myPicture: url,
      pictureMap: {
        ...prev.pictureMap,
        [clientId]: url,
      },
    }));
    this.socket?.emit("CMD:picture", url);
  };

  updateUid = async (user: User) => {
    const uid = user.id;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    this.socket?.emit("CMD:uid", { uid, token });
  };

  getMediaDisplayName = (input?: string) => {
    if (!input) {
      return "";
    }
    // Check if in playlist
    const playlistItem = this.state.playlist?.find((p) => p.url === input);
    if (playlistItem?.name && playlistItem.name !== input) {
      return decodeEntities(playlistItem.name);
    }
    // Check if in examples
    const exampleItem = examples.find((e) => e.url === input);
    if (exampleItem?.name && exampleItem.name !== input) {
      return decodeEntities(exampleItem.name);
    }
    if (input.startsWith("screenshare://")) {
      const sharer = this.state.participants.find((user) => user.isScreenShare);
      return this.state.nameMap[sharer?.id ?? ""] + "'s screen";
    }
    if (input.startsWith("fileshare://")) {
      const sharer = this.state.participants.find((user) => user.isScreenShare);
      return this.state.nameMap[sharer?.id ?? ""] + "'s file";
    }
    if (input.startsWith("vbrowser://")) {
      return "Virtual Browser" + (this.state.isVBrowserLarge ? "+" : "");
    }
    if (isMagnet(input)) {
      const magnetParsed = new URLSearchParams(input);
      const index = magnetParsed.get("fileIndex");
      return magnetParsed.get("dn") + (index != null ? ` (file ${index})` : "");
    }
    if (input.includes("/stream?torrent=magnet")) {
      const search = new URL(input).search;
      const searchParsed = new URLSearchParams(search);
      const magnetUrl = searchParsed.get("torrent") ?? "";
      const magnetParsed = new URLSearchParams(magnetUrl);
      const index = searchParsed.get("fileIndex");
      return (
        (magnetParsed.get("dn") ?? searchParsed.get("dn")) +
        (index != null ? ` (file ${index})` : "")
      );
    }
    if (input.includes("/proxy")) {
      const urlParsed = new URLSearchParams(input);
      const displayName = urlParsed.get("displayName");
      if (displayName) {
        return displayName;
      }
    }
    // Extract friendly filename from URL if possible
    try {
      if (isHttp(input)) {
        const parsedUrl = new URL(input);
        const segments = parsedUrl.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
          const lastSeg = segments[segments.length - 1];
          if (lastSeg.includes(".")) {
            return decodeURIComponent(lastSeg);
          }
        }
      }
    } catch { }
    return input;
  };

  setLoadingFalse = () => {
    this.setState({ loading: false });
  };

  getLeaderTime = () => {
    const selfId = getOrCreateClientId();
    const tsEntries = Object.entries(this.state.tsMap || {}).filter(
      ([_, ts]) => typeof ts === "number" && !isNaN(ts) && isFinite(ts) && ts >= 0,
    );

    // If room has an owner/host and their timestamp is reported, prioritize owner's time
    if (this.state.owner) {
      const ownerParticipant = this.state.participants.find(
        (p) => p.id === this.state.owner,
      );
      if (
        ownerParticipant &&
        typeof this.state.tsMap[ownerParticipant.id] === "number" &&
        isFinite(this.state.tsMap[ownerParticipant.id])
      ) {
        return this.state.tsMap[ownerParticipant.id];
      }
    }

    // Filter out our own timestamp if other peers have valid timestamps
    const otherEntries = tsEntries.filter(([id]) => id !== selfId);
    const validTimestamps = (otherEntries.length > 0 ? otherEntries : tsEntries).map(
      ([_, ts]) => ts,
    );

    if (validTimestamps.length > 0) {
      if (validTimestamps.length > 2) {
        return calculateMedian([...validTimestamps]);
      }
      return Math.max(...validTimestamps);
    }

    // Fallback to local player's current time if no remote timestamps available
    const localTime = this.Player().getCurrentTime();
    return typeof localTime === "number" && isFinite(localTime) ? localTime : 0;
  };

  onVideoEnded = (url: string) => {
    this.localPause();
    // check if looping is on, if so set time back to 0 and restart
    if (this.state.roomLoop) {
      this.localSeek(0);
      this.localPlay();
      return;
    }
    if (this.state.playlist.length) {
      // Pass the url of the video at the time this video was started
      this.socket.emit("CMD:playlistNext", url);
      return;
    }
    // Play next fileIndex
    const re = /&fileIndex=(\d+)$/;
    const match = re.exec(this.state.roomMedia);
    if (match) {
      const fileIndex = match[1];
      const nextNum = Number(fileIndex) + 1;
      const nextUrl = this.state.roomMedia.replace(
        /&fileIndex=(\d+)$/,
        `&fileIndex=${nextNum}`,
      );
      this.roomSetMedia(nextUrl);
    }
  };

  refreshControls = () => {
    this.setState({ controlsTimestamp: Date.now() });
  };

  setSettingsModalOpen = (settingsModalOpen: boolean) => {
    this.setState({ settingsModalOpen });
  };

  render() {
    if (this.state.waitingLoungeState?.inLounge) {
      return (
        <WaitingLounge
          state={this.state.waitingLoungeState}
          roomId={this.state.roomId}
          roomTitle={this.state.roomTitle}
          onLeave={() => {
            this.socket?.emit("CMD:leaveLounge");
            window.location.href = "/";
          }}
        />
      );
    }

    const sharer = this.state.participants.find((p) => p.isScreenShare);
    const playlist = this.state.playlist;
    const controls = (
      <Controls
        key={this.state.controlsTimestamp}
        video={this.state.roomMedia}
        paused={this.state.roomPaused}
        roomPlaybackRate={this.state.roomPlaybackRate}
        isLiveStream={this.state.isLiveStream}
        muted={this.Player().isMuted()}
        volume={this.Player().getVolume()}
        subtitled={this.Player().isSubtitled()}
        currentTime={this.Player().getCurrentTime()}
        duration={this.Player().getDuration()}
        disabled={!this.haveLock()}
        leaderTime={this.hasDuration() ? this.getLeaderTime() : undefined}
        isPauseDisabled={this.isPauseDisabled()}
        playbackRate={this.Player().getPlaybackRate()}
        isYouTube={this.usingYoutube()}
        timeRanges={this.Player().getTimeRanges()}
        loop={this.state.roomLoop}
        roomSetLoop={this.roomSetLoop}
        roomTogglePlay={this.roomTogglePlay}
        roomSeek={this.roomSeek}
        roomSetPlaybackRate={this.roomSetPlaybackRate}
        localFullScreen={this.localFullScreen}
        localToggleMute={this.localToggleMute}
        localSubtitleModal={this.localSubtitleModal}
        localSetVolume={this.localSetVolume}
        localSeek={this.localSeek}
        localSetSubtitleMode={this.Player().setSubtitleMode}
        roomPlaylistPlay={this.roomPlaylistPlay}
        playlist={this.state.playlist}
      />
    );
    return (
      <React.Fragment>
        {Boolean(this.state.owner && this.context.user?.id === this.state.owner) &&
          this.state.waitingList &&
          this.state.waitingList.length > 0 && (
            <WaitingLoungeBanner
              waitingList={this.state.waitingList}
              onAdmitAll={this.admitAllWaitingUsers}
              onAdmitUser={this.admitWaitingUser}
              onDeclineUser={this.declineWaitingUser}
              onOpenPeople={() => this.setState({ currentTab: "people", showChatColumn: true, showPeopleColumn: true })}
            />
          )}
        {this.state.isMultiSelectModalOpen && (
          <MultiStreamModal
            streams={this.state.fileSelection}
            setMedia={this.roomSetMedia}
            resetMultiSelect={this.resetMultiSelect}
            startConvert={this.startConvert}
          />
        )}
        {this.state.isVBrowserModalOpen && (
          <VBrowserModal
            closeModal={() => this.setState({ isVBrowserModalOpen: false })}
            startVBrowser={this.startVBrowser}
          />
        )}
        {this.state.isScreenShareModalOpen && (
          <ScreenShareModal
            closeModal={() => this.setState({ isScreenShareModalOpen: false })}
            startScreenShare={this.startScreenShare}
          />
        )}
        {this.state.isFileShareModalOpen && (
          <FileShareModal
            closeModal={() => this.setState({ isFileShareModalOpen: false })}
            startFileShare={this.startFileShare}
            startConvert={this.startConvert}
          />
        )}
        {this.state.isSubtitleModalOpen && (
          <SubtitleModal
            closeModal={() => this.setState({ isSubtitleModalOpen: false })}
            socket={this.socket}
            roomSubtitle={this.state.roomSubtitle}
            roomMedia={this.state.roomMedia}
            haveLock={this.haveLock}
            getMediaDisplayName={this.getMediaDisplayName}
            setSubtitleMode={this.Player().setSubtitleMode}
            getSubtitleMode={this.Player().getSubtitleMode}
          />
        )}
        <MiniLiveRoomPopover
          visible={this.state.isRoomMinimized && this.isActiveRoom()}
          roomTitle={this.state.roomTitle}
          currentMedia={this.state.roomMedia}
          mediaDisplayName={this.getMediaDisplayName(this.state.roomMedia)}
          participantCount={this.state.participants.length}
          isMicEnabled={this.isMicEnabled()}
          isVideoEnabled={this.isVideoEnabled()}
          onReturnToRoom={this.handleReturnToRoom}
          onToggleMic={this.handleToggleMic}
          onToggleVideo={this.handleToggleVideo}
          onLeaveRoom={this.confirmLeave}
        />

        {this.state.state === "starting" && (
          <Overlay
            fixed
            zIndex={2000}
            backgroundOpacity={0.96}
            color="var(--bg-app, #08090D)"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
            }}
          >
            <Loader color="violet" size="lg" />
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "6px" }}>
              <Title
                order={3}
                style={{
                  color: "var(--text-main, #ffffff)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                Connecting to room...
              </Title>
              <Text c="dimmed" size="sm">
                Synchronizing media stage and participants
              </Text>
            </div>
          </Overlay>
        )}

        {this.state.roomStatus === "waiting" && this.state.state !== "starting" && (
          <WaitingForHostOverlay
            roomId={this.state.roomId}
            roomTitle={this.state.roomTitle}
            owner={this.state.owner}
            roomStatus={this.state.roomStatus}
            roomDurationMinutes={this.state.roomDurationMinutes}
            roomIsPermanent={this.state.roomIsPermanent}
            participantCount={this.state.participants.length}
            socket={this.socket}
          />
        )}

        {this.state.overlayMsg && <ErrorModal error={this.state.overlayMsg} />}
        <SettingsModal
          modalOpen={this.state.settingsModalOpen}
          setModalOpen={this.setSettingsModalOpen}
          roomLock={this.state.roomLock}
          setRoomLock={this.setRoomLock}
          socket={this.socket}
          roomId={this.state.roomId}
          isChatDisabled={this.state.isChatDisabled}
          setIsChatDisabled={this.setIsChatDisabled}
          owner={this.state.owner}
          setOwner={this.setOwner}


          inviteLink={this.state.inviteLink}
          passcode={this.state.passcode}
          setPasscode={this.setPasscode}
          clearChat={this.clearChat}
          roomTitle={this.state.roomTitle}
          setRoomTitle={this.setRoomTitle}
          roomDescription={this.state.roomDescription}
          setRoomDescription={this.setRoomDescription}
          mediaPath={this.state.mediaPath}
          setMediaPath={this.setMediaPath}
          isWaitingLoungeEnabled={this.state.isWaitingLoungeEnabled}
          setIsWaitingLoungeEnabled={this.setIsWaitingLoungeEnabled}
        />
        {this.state.errorMessage && (
          <Alert
            title="Error"
            color="red"
            style={{
              position: "fixed",
              bottom: "10px",
              right: "10px",
              zIndex: 1000,
            }}
          >
            {this.state.errorMessage}
          </Alert>
        )}
        {this.state.successMessage && (
          <Alert
            title="Success"
            color="green"
            style={{
              position: "fixed",
              bottom: "10px",
              right: "10px",
              zIndex: 1000,
            }}
          >
            {this.state.successMessage}
          </Alert>
        )}
        {this.state.warningMessage && (
          <Alert
            color="yellow"
            // header={this.state.warningMessage}
            style={{
              position: "fixed",
              top: "10px",
              left: "50%",
              transform: "translate(-50%, 0)",
              zIndex: 1000,
            }}
          >
            {this.state.warningMessage}
          </Alert>
        )}
        {!this.state.fullScreen && (
          <RoomHeader
            roomTitle={this.state.roomTitle}
            participantCount={this.state.participants.length}
            currentTab={this.state.currentTab as "people" | "chat"}
            onSelectTab={(tab) => {
              if (this.state.currentTab === tab && this.state.showChatColumn) {
                const newVal = !this.state.showChatColumn;
                this.setState({ showChatColumn: newVal });
              } else {
                this.setState({ currentTab: tab, showChatColumn: true });
              }
            }}
            onOpenSettings={() => this.setSettingsModalOpen(true)}
            onExit={this.confirmLeave}
            onLogoClick={this.confirmLeave}
            isLocked={Boolean(this.state.roomLock)}
            onToggleLock={this.toggleLock}
            haveLock={this.haveLock()}
            currentMedia={this.state.roomMedia}
            mediaDisplayName={this.getMediaDisplayName(this.state.roomMedia)}
            onOpenQuickAdd={this.focusHeaderSearch}
            roomSetMedia={this.roomSetMedia}
            playlistAdd={this.roomPlaylistAdd}
            mediaPath={this.state.mediaPath}
            waitingList={this.state.waitingList}
            onAdmitAll={this.admitAllWaitingUsers}
            onAdmitUser={this.admitWaitingUser}
            onDeclineUser={this.declineWaitingUser}
            isOwner={Boolean(this.state.owner && this.context.user?.id === this.state.owner)}
          />
        )}
        {
          <div className={styles.mobileStack}>
            <div
              className={
                (this.state.fullScreen
                  ? styles.fullHeightColumnFullscreen
                  : styles.fullHeightColumn) +
                " " +
                styles.leftColumn
              }
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  position: "relative",
                  gap: "4px",
                }}
              >
                {!this.state.fullScreen &&
                  (this.playingVBrowser() ||
                    this.state.uploadController ||
                    this.localStreamToPublish) && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      {this.localStreamToPublish && (
                        <Button
                          size="xs"
                          color="red"
                          onClick={this.stopPublishingLocalStream}
                          leftSection={<IconX size={14} />}
                        >
                          Stop Share
                        </Button>
                      )}
                      {this.playingVBrowser() && (
                        <>
                          <Button
                            size="xs"
                            color="red"
                            disabled={!this.haveLock()}
                            onClick={this.stopVBrowser}
                            leftSection={<IconX size={14} />}
                          >
                            Stop VBrowser
                          </Button>
                          <Select
                            size="xs"
                            leftSection={<IconKeyboardFilled size={14} />}
                            value={this.state.controller}
                            placeholder="No controller"
                            clearable
                            onChange={this.changeController}
                            disabled={!this.haveLock()}
                            data={this.state.participants.map((p) => ({
                              label: this.state.nameMap[p.id] || p.id,
                              value: p.id,
                            }))}
                          />
                          <Select
                            size="xs"
                            leftSection={<IconUserScreen size={14} />}
                            disabled={!this.haveLock()}
                            value={this.state.vBrowserResolution}
                            onChange={(value) =>
                              this.setState({
                                vBrowserResolution: value!,
                              })
                            }
                            data={[
                              {
                                label: "1080p (Plus only)",
                                value: "1920x1080@30",
                                disabled: !this.state.isVBrowserLarge,
                              },
                              {
                                label: "720p",
                                value: "1280x720@30",
                              },
                              {
                                label: "576p",
                                value: "1024x576@60",
                              },
                              {
                                label: "486p",
                                value: "864x486@60",
                              },
                              {
                                label: "360p",
                                value: "640x360@60",
                              },
                            ]}
                          />
                          <Select
                            size="xs"
                            leftSection={<IconAntennaBars5 size={14} />}
                            disabled={!this.haveLock()}
                            value={this.state.vBrowserQuality}
                            onChange={(value) => {
                              this.setState({
                                vBrowserQuality: value!,
                              });
                            }}
                            data={[
                              { label: "Eco (0.25x)", value: "0.25" },
                              { label: "Low (0.5x)", value: "0.5" },
                              { label: "Standard (1x)", value: "1" },
                              { label: "High (1.5x)", value: "1.5" },
                              { label: "Ultra (2x)", value: "2" },
                            ]}
                          />
                        </>
                      )}
                      {this.state.uploadController && (
                        <Button
                          size="xs"
                          color="red"
                          onClick={() => {
                            this.state.uploadController?.abort();
                          }}
                          leftSection={<IconX size={14} />}
                        >
                          Stop Convert
                        </Button>
                      )}
                    </div>
                  )}
                <div style={{ flexGrow: 1, position: "relative" }}>
                  <div className={styles.playerContainer}>
                    {!this.state.isAutoPlayable && this.state.roomMedia && (
                      <Overlay className={styles.flexCenter}>
                        <Button
                          onClick={() => {
                            this.setState({ isAutoPlayable: true });
                            this.localSetMute(false);
                            this.localSetVolume(1);
                          }}
                          leftSection={<IconVolume />}
                          size="xl"
                        >
                          Unmute
                        </Button>
                      </Overlay>
                    )}
                    {(this.state.loading ||
                      !this.state.roomMedia ||
                      this.state.nonPlayableMedia) &&
                      !this.state.isLiveStream && (
                        <div
                          id="loader"
                          className={`${styles.videoContent} ${styles.flexCenter}`}
                        >
                          {this.state.loading && (Boolean(this.state.roomMedia) || this.playingVBrowser()) && (
                            <div
                              className={styles.flexCenter}
                              style={{
                                flexDirection: "column",
                              }}
                            >
                              <Loader />
                              <div>
                                {this.playingVBrowser()
                                  ? "Launching virtual browser. This can take up to a minute."
                                  : ""}
                              </div>
                            </div>
                          )}
                          {!this.state.roomMedia && (
                            <EmptyWatchState
                              haveLock={this.haveLock()}
                              onOpenAddMedia={this.focusHeaderSearch}
                            />
                          )}
                          {!this.state.loading &&
                            this.state.nonPlayableMedia && (
                              <NonPlayableMediaState />
                            )}
                        </div>
                      )}
                    <iframe
                      style={{
                        display:
                          this.usingYoutube() && !this.state.loading
                            ? "block"
                            : "none",
                      }}
                      title="YouTube"
                      id="leftYt"
                      className={styles.videoContent}
                      allowFullScreen
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                      src="https://www.youtube.com/embed/?enablejsapi=1&controls=0&rel=0"
                    />
                    {this.playingVBrowser() &&
                      this.getVBrowserPass() &&
                      this.getVBrowserHost() ? (
                      <VBrowser
                        username={clientId}
                        password={this.getVBrowserPass()}
                        hostname={this.getVBrowserHost()}
                        controlling={this.state.controller === clientId}
                        resolution={this.state.vBrowserResolution}
                        quality={this.state.vBrowserQuality}
                        doPlay={this.localPlay}
                        setResolution={(data: string) =>
                          this.setState({ vBrowserResolution: data })
                        }
                        setQuality={(data: string) => {
                          this.setState({ vBrowserQuality: data });
                        }}
                        isMobile={isMobile()}
                      />
                    ) : (
                      <video
                        style={{
                          display:
                            (this.usingNative() && !this.state.loading) ||
                              this.state.fullScreen
                              ? "block"
                              : "none",
                          width: "100%",
                          maxHeight: VIDEO_MAX_HEIGHT_CSS,
                        }}
                        id="leftVideo"
                        onEnded={(e) => this.onVideoEnded(e.currentTarget.src)}
                        playsInline
                        onClick={this.roomTogglePlay}
                      ></video>
                    )}
                    {Boolean(this.state.total) && (
                      <div
                        style={{
                          color: softWhite,
                          fontWeight: 400,
                          fontSize: 10,
                          lineHeight: "8px",
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          zIndex: 1,
                        }}
                      >
                        {Math.min(
                          (this.state.downloaded / this.state.total) * 100,
                          100,
                        ).toFixed(2) +
                          "% - " +
                          formatSpeed(this.state.speed) +
                          " - " +
                          this.state.connections +
                          " connections"}
                      </div>
                    )}

                    <MediaDock
                      haveLock={this.haveLock()}
                      onOpenScreenShare={() =>
                        this.setState({ isScreenShareModalOpen: true })
                      }
                      onOpenVBrowser={() =>
                        this.setState({ isVBrowserModalOpen: true })
                      }
                      onOpenFileShare={() =>
                        this.setState({ isFileShareModalOpen: true })
                      }
                      onOpenQuickAdd={this.focusHeaderSearch}
                      playlist={playlist}
                      onPlayPlaylistItem={this.roomPlaylistPlay}
                      onDeletePlaylistItem={this.roomPlaylistDelete}
                      onMovePlaylistItem={(from, to) =>
                        this.roomPlaylistMove(from, to)
                      }
                      roomMedia={this.state.roomMedia}
                      paused={this.state.roomPaused}
                      onStopMedia={() => this.roomSetMedia("")}
                      isScreenSharing={Boolean(this.localStreamToPublish)}
                      onStopScreenShare={this.stopPublishingLocalStream}
                      isPlayingVBrowser={this.playingVBrowser()}
                      onStopVBrowser={this.stopVBrowser}
                      isLocked={Boolean(this.state.roomLock)}
                      onToggleLock={this.toggleLock}
                      isFullScreen={this.state.fullScreen}
                      onToggleFullScreen={() =>
                        this.localFullScreen(!this.state.fullScreen)
                      }
                    />
                  </div>
                </div>
                {this.state.roomMedia && controls}
                {!isMobile() && (
                  <div className={styles.expandButton}>
                    <ActionIcon
                      onClick={() => {
                        const newVal = !this.state.showChatColumn;
                        this.setState({
                          showChatColumn: newVal,
                        });
                        window.localStorage.setItem(
                          "cowatch-showchatcolumn",
                          Number(newVal).toString(),
                        );
                      }}
                    >
                      {this.state.showChatColumn ? (
                        <IconChevronRight size={16} />
                      ) : (
                        <IconChevronLeft size={16} />
                      )}
                    </ActionIcon>
                  </div>
                )}
              </div>
            </div>
            <div
              className={`${(this.state.fullScreen
                ? styles.fullHeightColumnFullscreen
                : styles.fullHeightColumn) +
                " " +
                styles.rightColumn +
                (!this.state.showChatColumn
                  ? " " + styles.rightColumnCollapsed
                  : "")
                }`}
            >
              <Tabs
                keepMounted={true}
                value={this.state.currentTab}
                onChange={(val) => this.setState({ currentTab: val ?? "people" })}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 0%",
                  flexGrow: 1,
                  width: "100%",
                  minHeight: 0,
                  marginTop: "8px",
                  overflow: "hidden",
                }}
              >
                <Tabs.List style={{ display: "flex", width: "100%", flexShrink: 0 }}>
                  <Tabs.Tab
                    value="people"
                    leftSection={<IconUsersGroup size={16} />}
                    rightSection={
                      Boolean(this.state.owner && this.context.user?.id === this.state.owner) &&
                        this.state.waitingList &&
                        this.state.waitingList.length > 0 ? (
                        <Badge size="xs" color="violet" variant="filled" circle>
                          {this.state.waitingList.length}
                        </Badge>
                      ) : undefined
                    }
                    style={{ flexGrow: 1 }}
                  >
                    People ({this.state.participants.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="chat"
                    leftSection={<IconMessage size={16} />}
                    style={{ flexGrow: 1 }}
                  >
                    Messages
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel
                  value="people"
                  style={{
                    flex: "1 1 0%",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    overflowY: "auto",
                    marginTop: "8px",
                    padding: "8px",
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <VideoChatErrorBoundary>
                    <VideoChat
                      ref={this.videoChatRef}
                      socket={this.socket}
                      participants={this.state.participants}
                      nameMap={this.state.nameMap}
                      pictureMap={this.state.pictureMap}
                      tsMap={this.state.tsMap}
                      rosterUpdateTS={this.state.rosterUpdateTS}
                      owner={this.state.owner}
                      getLeaderTime={this.getLeaderTime}
                      roomId={this.state.roomId}
                      waitingList={this.state.waitingList}
                      onAdmitUser={this.admitWaitingUser}
                      onDeclineUser={this.declineWaitingUser}
                      onAdmitAll={this.admitAllWaitingUsers}
                      isOwner={Boolean(this.state.owner && this.context.user?.id === this.state.owner)}
                    />
                  </VideoChatErrorBoundary>
                </Tabs.Panel>
                <Tabs.Panel
                  value="chat"
                  style={{
                    flex: "1 1 0%",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    marginTop: "8px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  <Chat
                    chat={this.state.chat}
                    nameMap={this.state.nameMap}
                    pictureMap={this.state.pictureMap}
                    socket={this.socket}
                    scrollTimestamp={this.state.scrollTimestamp}
                    getMediaDisplayName={this.getMediaDisplayName}
                    isChatDisabled={this.state.isChatDisabled}
                    owner={this.state.owner}
                    ref={this.chatRef}
                    hide={!this.state.showChatColumn}
                    clearChat={this.clearChat}
                    onEdit={(messageId, newMessage) => {
                      this.socket.emit("CMD:editMessage", { messageId, newMessage });
                    }}
                  />
                </Tabs.Panel>
              </Tabs>
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px 14px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
                onClick={this.handleCopyRoomLink}
                title="Click to copy room link"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <IconLink size={16} color="var(--color-violet)" />
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {this.state.copiedRoomLink
                      ? "Room link copied!"
                      : "Copy room link"}
                  </span>
                </div>
                {this.state.copiedRoomLink ? (
                  <IconCheck size={16} color="var(--color-live)" />
                ) : (
                  <IconCopy size={16} color="var(--text-muted)" />
                )}
              </div>
            </div>
          </div>
        }
      </React.Fragment>
    );
  }
}
