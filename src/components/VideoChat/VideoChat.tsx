import React from "react";
import { ActionIcon, Button } from "@mantine/core";
import { Socket } from "socket.io-client";

import {
  formatTimestamp,
  getOrCreateClientId,
  getColorForStringHex,
  getDefaultPicture,
  iceServers,
  softWhite,
} from "../../utils/utils";
import { UserMenu } from "../UserMenu/UserMenu";
import { MetadataContext } from "../../MetadataContext";
import {
  IconCheck,
  IconChevronRight,
  IconDotsVertical,
  IconMicrophone,
  IconMicrophoneOff,
  IconScreenShare,
  IconUserPlus,
  IconVideo,
  IconVideoOff,
  IconX,
} from "@tabler/icons-react";
import styles from "./VideoChat.module.css";
import { InviteModal } from "../Modal/InviteModal";
import { WaitingParticipantsPopover } from "../WaitingLounge/WaitingParticipantsPopover";

interface VideoChatProps {
  socket: Socket;
  participants: User[];
  pictureMap: StringDict;
  nameMap: StringDict;
  tsMap: NumberDict;
  rosterUpdateTS: Number;
  hide?: boolean;
  owner: string | undefined;
  getLeaderTime: () => number;
  roomId?: string;
  onOpenInviteModal?: () => void;
  waitingList?: WaitingGuest[];
  onAdmitUser?: (clientId: string) => void;
  onDeclineUser?: (clientId: string) => void;
  onAdmitAll?: () => void;
  isOwner?: boolean;
}

export class VideoChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || "Video chat error" };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("VideoChat error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: "8px" }}>
            Video chat encountered an issue
          </p>
          <Button
            size="xs"
            variant="light"
            color="violet"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry Video Chat
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
  ...({ latency: 0 } as any),
};

const optimizeReceiver = (receiver: RTCRtpReceiver) => {
  try {
    if ("playoutDelayHint" in receiver) {
      (receiver as any).playoutDelayHint = 0;
    }
    if ("jitterBufferTarget" in receiver) {
      (receiver as any).jitterBufferTarget = 0;
    }
  } catch (e) {}
};

export class VideoChat extends React.Component<VideoChatProps> {
  static contextType = MetadataContext;
  declare context: React.ContextType<typeof MetadataContext>;

  socket = this.props.socket;

  // Stores remote MediaStreams keyed by peer clientId so they survive
  // the race between ontrack firing and the <video> ref being mounted.
  private remoteStreams: Record<string, MediaStream> = {};
  private audioRefs: Record<string, HTMLAudioElement> = {};
  private pendingCandidates: Record<string, RTCIceCandidateInit[]> = {};

  state = {
    copied: false,
    isInviteModalOpen: false,
  };

  private handleOpenInvite = () => {
    if (this.props.onOpenInviteModal) {
      this.props.onOpenInviteModal();
    } else {
      this.setState({ isInviteModalOpen: true });
    }
  };

  private handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private lastPrefCameraOn: boolean = false;
  private lastPrefMicOn: boolean = false;

  componentDidMount() {
    this.lastPrefCameraOn = this.context.profile?.pref_camera_on ?? false;
    this.lastPrefMicOn = this.context.profile?.pref_mic_on ?? false;
    this.socket?.on("signal", this.handleSignal);

    // Sync any pre-existing remoteStreams from global cowatch state or active PCs
    if (window.cowatch?.remoteStreams) {
      Object.assign(this.remoteStreams, window.cowatch.remoteStreams);
    }

    // Also recover any streams directly from existing RTCPeerConnection receivers
    if (window.cowatch?.videoPCs) {
      const selfId = getOrCreateClientId();
      Object.entries(window.cowatch.videoPCs).forEach(([id, pc]: [string, any]) => {
        if (id === selfId) return;
        if (pc && pc.getReceivers) {
          const tracks = pc.getReceivers().map((r: any) => r.track).filter(Boolean);
          if (tracks.length > 0) {
            let stream = window.cowatch.remoteStreams?.[id] || this.remoteStreams[id];
            if (!stream) {
              stream = new MediaStream(tracks);
            } else {
              tracks.forEach((t: MediaStreamTrack) => {
                if (!stream.getTracks().includes(t)) stream.addTrack(t);
              });
            }
            this.remoteStreams[id] = stream;
            if (window.cowatch.remoteStreams) {
              window.cowatch.remoteStreams[id] = stream;
            }
          }
        }
      });
    }

    // If ourStream is already initialized, establish or refresh connections
    if (window.cowatch?.ourStream) {
      this.updateWebRTC();
    }
  }

  componentWillUnmount() {
    this.socket?.off("signal", this.handleSignal);
  }

  componentDidUpdate(prevProps: VideoChatProps) {
    if (this.props.socket !== prevProps.socket) {
      this.socket = this.props.socket;
      prevProps.socket?.off("signal", this.handleSignal);
      this.socket?.on("signal", this.handleSignal);
    }

    if (this.props.rosterUpdateTS !== prevProps.rosterUpdateTS) {
      this.updateWebRTC();
    }

    const currentPrefCamera = this.context.profile?.pref_camera_on ?? false;
    if (this.lastPrefCameraOn !== currentPrefCamera) {
      this.lastPrefCameraOn = currentPrefCamera;
      // If we are in a room and the preference diverges from our current stream state, apply the preference change
      if (window.cowatch.ourStream && currentPrefCamera !== Boolean(this.getVideoWebRTC())) {
        this.toggleVideoWebRTC();
      }
    }

    const currentPrefMic = this.context.profile?.pref_mic_on ?? false;
    if (this.lastPrefMicOn !== currentPrefMic) {
      this.lastPrefMicOn = currentPrefMic;
      // If we are in a room and the preference diverges from our current stream state, apply the preference change
      if (window.cowatch.ourStream && currentPrefMic !== Boolean(this.getAudioWebRTC())) {
        this.toggleAudioWebRTC();
      }
    }
  }

  emitUserMute = () => {
    this.socket.emit("CMD:userMute", { isMuted: !this.getAudioWebRTC() });
  };

  createPeerConnection = (id: string): RTCPeerConnection => {
    const ourStream = window.cowatch.ourStream;
    const videoPCs = window.cowatch.videoPCs;
    const videoRefs = window.cowatch.videoRefs;
    const selfId = getOrCreateClientId();

    if (videoPCs[id]) {
      try {
        videoPCs[id].close();
      } catch (e) {}
      delete videoPCs[id];
    }

    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    videoPCs[id] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(id, { ice: event.candidate });
      }
    };

    pc.ontrack = (event: RTCTrackEvent) => {
      if (event.receiver) {
        optimizeReceiver(event.receiver);
      }
      console.log(`[VideoChat] ontrack event from ${id} (${event.track.kind})`);
      let existing = window.cowatch.remoteStreams?.[id] || this.remoteStreams[id];
      if (!existing) {
        existing = new MediaStream();
      }

      if (event.track && !existing.getTracks().some((t) => t.id === event.track.id)) {
        existing.addTrack(event.track);
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!existing.getTracks().some((t) => t.id === track.id)) {
            existing.addTrack(track);
          }
        });
      }

      this.remoteStreams[id] = existing;
      if (window.cowatch.remoteStreams) {
        window.cowatch.remoteStreams[id] = existing;
      }

      event.track.onunmute = () => {
        console.log(`[VideoChat] Track unmuted from ${id} (${event.track.kind})`);
        this.forceUpdate();
      };
      event.track.onmute = () => {
        console.log(`[VideoChat] Track muted from ${id} (${event.track.kind})`);
        this.forceUpdate();
      };
      event.track.onended = () => {
        this.forceUpdate();
      };

      if (videoRefs && videoRefs[id]) {
        try {
          if (videoRefs[id].srcObject !== existing) {
            videoRefs[id].srcObject = existing;
          }
          videoRefs[id].play().catch(() => {});
        } catch (e) {
          console.warn(`[VideoChat] Error mounting remote stream to video element for ${id}:`, e);
        }
      }

      const audioRef = window.cowatch?.audioRefs?.[id] || this.audioRefs[id];
      if (audioRef) {
        try {
          if (audioRef.srcObject !== existing) {
            audioRef.srcObject = existing;
          }
          audioRef.play().catch(() => {});
        } catch (e) {
          console.warn(`[VideoChat] Error mounting remote stream to audio element for ${id}:`, e);
        }
      }

      this.forceUpdate();
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[VideoChat] ICE state for ${id}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "failed") {
        console.warn(`[VideoChat] ICE connection to ${id} failed, tearing down`);
        try {
          pc.close();
        } catch (e) {}
        delete videoPCs[id];
        delete this.remoteStreams[id];
        if (window.cowatch.remoteStreams) {
          delete window.cowatch.remoteStreams[id];
        }
        if (window.cowatch.audioRefs) {
          delete window.cowatch.audioRefs[id];
        }
        delete this.audioRefs[id];
      }
    };

    // Perfect negotiation: onnegotiationneeded triggers for any peer when tracks change
    let isMakingOffer = false;
    pc.onnegotiationneeded = async () => {
      try {
        if (isMakingOffer || pc.signalingState !== "stable") return;
        isMakingOffer = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== "stable") return;
        if (offer.sdp) {
          offer.sdp = offer.sdp.replace(/useinbandfec=1/g, "useinbandfec=1;minptime=10");
        }
        await pc.setLocalDescription(offer);
        this.sendSignal(id, { sdp: pc.localDescription });
      } catch (e) {
        console.warn("[VideoChat] Negotiation error:", e);
      } finally {
        isMakingOffer = false;
      }
    };

    // Attach our outgoing tracks if ourStream is present
    if (ourStream) {
      ourStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, ourStream);
        } catch (e) {
          console.warn(`[VideoChat] Could not add track (${track.kind}) to pc ${id}:`, e);
        }
      });
    }

    return pc;
  };

  handleSignal = async (data: any) => {
    try {
      const msg = data.msg;
      const from = data.from;
      if (!from || !msg) return;

      let pc = window.cowatch.videoPCs[from];

      // Handle offer: create PC if missing or closed/failed
      if (msg.sdp && msg.sdp.type === "offer") {
        if (!pc || pc.connectionState === "closed" || pc.connectionState === "failed") {
          pc = this.createPeerConnection(from);
        }

        const isOfferer = getOrCreateClientId() < from;
        // Perfect negotiation glare resolution: if we are impolite (isOfferer=true), ignore collision
        // If we are polite (isOfferer=false), rollback local offer to accept incoming offer
        if (pc.signalingState !== "stable") {
          if (isOfferer) {
            console.log("[VideoChat] Impolite peer ignoring offer collision from", from);
            return;
          }
          console.log("[VideoChat] Polite peer rolling back for incoming offer from", from);
          await pc.setLocalDescription({ type: "rollback" } as any).catch(() => {});
        }

        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        pc.getReceivers().forEach(optimizeReceiver);

        // Drain any pending ICE candidates for this peer
        if (this.pendingCandidates[from] && this.pendingCandidates[from].length > 0) {
          for (const cand of this.pendingCandidates[from]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn("[VideoChat] Error adding drained ICE candidate:", e);
            }
          }
          delete this.pendingCandidates[from];
        }

        const answer = await pc.createAnswer();
        if (answer.sdp) {
          answer.sdp = answer.sdp.replace(/useinbandfec=1/g, "useinbandfec=1;minptime=10");
        }
        await pc.setLocalDescription(answer);
        this.sendSignal(from, { sdp: pc.localDescription });
        return;
      }

      // Handle answer
      if (msg.sdp && msg.sdp.type === "answer") {
        if (!pc) return;
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          pc.getReceivers().forEach(optimizeReceiver);

          if (this.pendingCandidates[from] && this.pendingCandidates[from].length > 0) {
            for (const cand of this.pendingCandidates[from]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn("[VideoChat] Error adding drained ICE candidate:", e);
              }
            }
            delete this.pendingCandidates[from];
          }
        }
        return;
      }

      // Handle ICE candidate
      if (msg.ice !== undefined) {
        if (!pc || !pc.remoteDescription) {
          if (!this.pendingCandidates[from]) {
            this.pendingCandidates[from] = [];
          }
          this.pendingCandidates[from].push(msg.ice);
          return;
        }

        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.ice));
        } catch (e) {
          console.warn("[VideoChat] Error adding ICE candidate:", e);
        }
      }
    } catch (err) {
      console.error("[VideoChat] Error in handleSignal:", err);
    }
  };

  setupWebRTC = async () => {
    try {
      let stream: MediaStream | null = null;

      const prefCameraOn = this.context.profile?.pref_camera_on ?? true;
      const prefMicOn = this.context.profile?.pref_mic_on ?? true;

      try {
        stream = await navigator?.mediaDevices?.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
          video: prefCameraOn ? { width: { ideal: 640 }, height: { ideal: 480 } } : true,
        });
      } catch (camErr) {
        console.warn(
          "[VideoChat] Failed initial getUserMedia with audio+video, falling back to audio-only:",
          camErr,
        );
        try {
          stream = await navigator?.mediaDevices?.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
            video: false,
          });
        } catch (audioErr) {
          console.warn("[VideoChat] Audio-only with constraints failed, trying basic audio:", audioErr);
          try {
            stream = await navigator?.mediaDevices?.getUserMedia({
              audio: true,
              video: false,
            });
          } catch (finalErr) {
            console.warn("[VideoChat] getUserMedia completely denied or unavailable:", finalErr);
          }
        }
      }

      if (stream) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = prefMicOn;
        }
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = prefCameraOn;
        }
        window.cowatch.ourStream = stream;
      } else {
        window.cowatch.ourStream = new MediaStream([]);
      }

      // alert server we've joined video chat
      this.socket?.emit("CMD:joinVideo");
      this.emitUserMute();
      this.updateWebRTC();
      this.forceUpdate();
    } catch (err) {
      console.error("Critical error in setupWebRTC:", err);
    }
  };

  stopWebRTC = () => {
    try {
      const ourStream = window.cowatch.ourStream;
      const videoPCs = window.cowatch.videoPCs;
      if (ourStream) {
        ourStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      window.cowatch.ourStream = undefined;
      Object.keys(videoPCs).forEach((key) => {
        try {
          videoPCs[key]?.close();
        } catch (e) {}
        delete videoPCs[key];
      });
      this.remoteStreams = {};
      if (window.cowatch.remoteStreams) {
        window.cowatch.remoteStreams = {};
      }
      if (window.cowatch.audioRefs) {
        window.cowatch.audioRefs = {};
      }
      this.audioRefs = {};
      this.pendingCandidates = {};
      this.socket?.emit("CMD:leaveVideo");
      this.forceUpdate();
    } catch (err) {
      console.error("Critical error in stopWebRTC:", err);
    }
  };

  addTrackToAllPCs = (track: MediaStreamTrack) => {
    const ourStream = window.cowatch.ourStream;
    const videoPCs = window.cowatch.videoPCs;
    const selfId = getOrCreateClientId();
    if (!ourStream) return;

    Object.entries(videoPCs).forEach(([id, pc]: [string, any]) => {
      if (id === selfId) return;
      try {
        const senders = pc.getSenders();
        const existingSender = senders.find((s: any) => s.track && s.track.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track).catch((e: any) => {
            console.warn(`[VideoChat] Error replacing track on PC for ${id}:`, e);
          });
        } else {
          pc.addTrack(track, ourStream);
        }
      } catch (e) {
        console.warn(`[VideoChat] Error updating track on PC for ${id}:`, e);
      }
    });
  };

  toggleVideoWebRTC = async () => {
    const ourStream = window.cowatch.ourStream;
    if (!ourStream) return;
    const videoTrack = ourStream.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = stream.getVideoTracks()[0];
        if (newTrack) {
          ourStream.addTrack(newTrack);
          this.addTrackToAllPCs(newTrack);
        }
      } catch (e) {
        console.warn("Failed to acquire video track dynamically", e);
      }
    }
    this.forceUpdate();
  };

  getVideoWebRTC = () => {
    const ourStream = window.cowatch.ourStream;
    return Boolean(ourStream && ourStream.getVideoTracks()[0]?.enabled);
  };

  toggleAudioWebRTC = async () => {
    const ourStream = window.cowatch.ourStream;
    if (!ourStream) return;
    const audioTrack = ourStream.getAudioTracks()[0];

    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
        });
        const newTrack = stream.getAudioTracks()[0];
        if (newTrack) {
          ourStream.addTrack(newTrack);
          this.addTrackToAllPCs(newTrack);
        }
      } catch (e) {
        console.warn("Failed to acquire audio track dynamically", e);
      }
    }
    this.emitUserMute();
    this.forceUpdate();
  };

  getAudioWebRTC = () => {
    const ourStream = window.cowatch.ourStream;
    return Boolean(
      ourStream &&
      ourStream.getAudioTracks()[0] &&
      ourStream.getAudioTracks()[0].enabled
    );
  };

  updateWebRTC = () => {
    try {
      const ourStream = window.cowatch.ourStream;
      const videoPCs = window.cowatch.videoPCs;
      const videoRefs = window.cowatch.videoRefs;
      if (!ourStream) {
        // We haven't started video chat, exit
        return;
      }
      const selfId = getOrCreateClientId();

      // Delete and close any connections that aren't in the current member list (maybe someone disconnected)
      // This allows them to rejoin later
      const clientIds = new Set(
        this.props.participants.filter((p) => p.isVideoChat).map((p) => p.id),
      );
      Object.entries(videoPCs).forEach(([key, value]) => {
        if (key !== selfId && !clientIds.has(key)) {
          try {
            value.close();
          } catch (e) {}
          delete videoPCs[key];
          delete this.remoteStreams[key];
          if (window.cowatch.remoteStreams) {
            delete window.cowatch.remoteStreams[key];
          }
          if (window.cowatch.audioRefs) {
            delete window.cowatch.audioRefs[key];
          }
          delete this.audioRefs[key];
          delete this.pendingCandidates[key];
        }
      });

      this.props.participants.forEach((user) => {
        const id = user.id;
        if (!user.isVideoChat) {
          return;
        }
        if (id === selfId) {
          if (!videoPCs[id]) {
            videoPCs[id] = new RTCPeerConnection();
          }
          if (videoRefs && videoRefs[id] && ourStream) {
            try {
              if (videoRefs[id].srcObject !== ourStream) {
                videoRefs[id].srcObject = ourStream;
              }
            } catch (e) {
              console.warn("Could not set local stream on video element:", e);
            }
          }
          return;
        }

        // Get or create RTCPeerConnection for remote peer if missing
        let pc = videoPCs[id];
        if (!pc || pc.connectionState === "closed" || pc.connectionState === "failed") {
          this.createPeerConnection(id);
        } else if (ourStream) {
          // Ensure all local tracks are attached to the existing peer connection
          const currentSenders = pc.getSenders();
          ourStream.getTracks().forEach((track) => {
            const existingSender = currentSenders.find(
              (s: RTCRtpSender) => s.track && s.track.kind === track.kind,
            );
            if (existingSender) {
              if (existingSender.track !== track) {
                existingSender.replaceTrack(track).catch((e: any) => {
                  console.warn(`[VideoChat] Error replacing track on pc ${id}:`, e);
                });
              }
            } else {
              try {
                pc.addTrack(track, ourStream);
              } catch (e) {
                console.warn(`[VideoChat] Error adding track on existing pc ${id}:`, e);
              }
            }
          });
        }
      });
    } catch (err) {
      console.error("Critical error in updateWebRTC:", err);
    }
  };

  sendSignal = async (to: string, data: any) => {
    console.log("send", to, data);
    this.socket.emit("signal", { to, msg: data });
  };

  render() {
    const {
      participants,
      pictureMap,
      nameMap,
      tsMap,
      socket,
      owner,
      waitingList,
      onAdmitUser,
      onDeclineUser,
      onAdmitAll,
      isOwner,
    } = this.props;
    const ourStream = window.cowatch.ourStream;
    const videoRefs = window.cowatch.videoRefs;
    const selfId = getOrCreateClientId();

    return (
      <div className={styles.container}>
        {isOwner && waitingList && waitingList.length > 0 && (
          <div className={styles.waitingSection}>
            <div className={styles.waitingHeader}>
              <WaitingParticipantsPopover
                waitingList={waitingList}
                onAdmitUser={onAdmitUser}
                onDeclineUser={onDeclineUser}
                onAdmitAll={onAdmitAll}
                position="bottom-start"
              >
                <div
                  className={styles.waitingHeaderTitle}
                  style={{ cursor: "pointer" }}
                  title="Click to view waiting participants popover"
                >
                  <span>Waiting Lounge</span>
                  <span className={styles.waitingBadge}>{waitingList.length}</span>
                </div>
              </WaitingParticipantsPopover>
              {onAdmitAll && (
                <button
                  type="button"
                  className={styles.waitingAdmitAllBtn}
                  onClick={onAdmitAll}
                  title="Admit all waiting guests"
                >
                  Admit All
                </button>
              )}
            </div>

            <div className={styles.waitingList}>
              {waitingList.map((guest) => {
                const guestName = guest.name || "Guest";
                const guestAvatar =
                  guest.picture ||
                  getDefaultPicture(
                    guestName,
                    getColorForStringHex(guest.clientId)
                  );

                return (
                  <div key={guest.clientId} className={styles.waitingRow}>
                    <img
                      src={guestAvatar}
                      alt={guestName}
                      className={styles.waitingAvatar}
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getDefaultPicture(
                          guestName,
                          getColorForStringHex(guest.clientId)
                        );
                        if (target.src !== fallback) {
                          target.src = fallback;
                        }
                      }}
                    />
                    <div className={styles.waitingMeta}>
                      <span className={styles.waitingName} title={guestName}>
                        {guestName}
                      </span>
                      <span className={styles.waitingTime}>Waiting to join</span>
                    </div>

                    <div className={styles.waitingActions}>
                      {onAdmitUser && (
                        <button
                          type="button"
                          className={styles.admitBtn}
                          onClick={() => onAdmitUser(guest.clientId)}
                          title={`Admit ${guestName}`}
                          aria-label={`Admit ${guestName}`}
                        >
                          <IconCheck size={14} stroke={2.5} />
                        </button>
                      )}
                      {onDeclineUser && (
                        <button
                          type="button"
                          className={styles.declineBtn}
                          onClick={() => onDeclineUser(guest.clientId)}
                          title={`Decline ${guestName}`}
                          aria-label={`Decline ${guestName}`}
                        >
                          <IconX size={14} stroke={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className={styles.tilesGrid}>
          {participants.map((p) => {
            const isSelf = p.id === selfId;
          const displayName =
            (isSelf ? this.context.displayName : null) ||
            nameMap[p.id] ||
            p.id;
          const rawPhoto = isSelf
            ? pictureMap[p.id] || this.context.avatarUrl
            : pictureMap[p.id];
          const fallbackPhoto = getDefaultPicture(
            displayName,
            getColorForStringHex(p.id),
          );
          const userPhoto = rawPhoto || fallbackPhoto;

          const isSelfInCall = Boolean(isSelf && ourStream);
          const isSelfVideoActive = Boolean(isSelfInCall && this.getVideoWebRTC());
          const isPeerInCall = Boolean(!isSelf && p.isVideoChat);
          const remoteStream =
            window.cowatch?.remoteStreams?.[p.id] || this.remoteStreams[p.id];
          // Only show the video element if we actually have a remote stream
          // with active video tracks. Otherwise show the avatar placeholder
          // to avoid displaying a black rectangle.
          const peerHasVideoStream = Boolean(
            isPeerInCall &&
            remoteStream &&
            remoteStream.getVideoTracks().some((t) => t.readyState === "live" || t.enabled)
          );
          const showVideoFeed = isSelf ? isSelfVideoActive : peerHasVideoStream;

          return (
            <div key={p.id} className={styles.videoTile}>
              {/* Dedicated audio element for remote participants to guarantee continuous voice playback */}
              {!isSelf && p.isVideoChat && remoteStream && (
                <audio
                  ref={(el) => {
                    if (el) {
                      this.audioRefs[p.id] = el;
                      if (window.cowatch?.audioRefs) {
                        window.cowatch.audioRefs[p.id] = el;
                      }
                      if (el.srcObject !== remoteStream) {
                        el.srcObject = remoteStream;
                      }
                      el.play().catch(() => {
                        const unlock = () => {
                          el.play().catch(() => {});
                          window.removeEventListener("click", unlock);
                          window.removeEventListener("touchstart", unlock);
                        };
                        window.addEventListener("click", unlock, { once: true });
                        window.addEventListener("touchstart", unlock, { once: true });
                      });
                    } else {
                      delete this.audioRefs[p.id];
                      if (window.cowatch?.audioRefs) {
                        delete window.cowatch.audioRefs[p.id];
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={Boolean(p.isMuted)}
                />
              )}

              {(isSelfInCall || p.isVideoChat) && (
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs[p.id] = el;
                      if (isSelf && ourStream && el.srcObject !== ourStream) {
                        try {
                          el.srcObject = ourStream;
                        } catch (e) {
                          console.warn("Error assigning srcObject to local video:", e);
                        }
                      }
                      // Apply any remote stream that arrived before or after this ref was mounted
                      const stream =
                        window.cowatch?.remoteStreams?.[p.id] || this.remoteStreams[p.id];
                      if (!isSelf && stream && el.srcObject !== stream) {
                        try {
                          el.srcObject = stream;
                          el.play().catch(() => {});
                        } catch (e) {
                          console.warn("Error assigning remote stream on ref mount:", e);
                        }
                      }
                    } else {
                      delete videoRefs[p.id];
                    }
                  }}
                  className={styles.videoElement}
                  style={{
                    display: showVideoFeed ? "block" : "none",
                    transform: `scaleX(${isSelf ? "-1" : "1"})`,
                  }}
                  autoPlay
                  playsInline
                  muted={true}
                  data-id={p.id}
                />
              )}

              {!showVideoFeed && (
                <div className={styles.avatarPlaceholder}>
                  <img
                    className={styles.largeAvatar}
                    src={userPhoto}
                    alt={displayName}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== fallbackPhoto) {
                        target.src = fallbackPhoto;
                      }
                    }}
                  />
                  {isSelf && !ourStream && (
                    <Button
                      size="xs"
                      variant="gradient"
                      gradient={{ from: "violet", to: "indigo", deg: 45 }}
                      radius="md"
                      onClick={this.setupWebRTC}
                      leftSection={<IconVideo size={14} />}
                      className={styles.joinCallBtn}
                      style={{ marginTop: "4px" }}
                    >
                      Join Video Call
                    </Button>
                  )}
                  {isSelf && ourStream && !isSelfVideoActive && (
                    <span className={styles.cameraOffNotice}>Camera is turned off</span>
                  )}
                  {!isSelf && (
                    <span className={styles.peerStatusNotice}>
                      {p.isVideoChat
                        ? remoteStream
                          ? "Camera is turned off"
                          : "Connecting..."
                        : "Watching"}
                    </span>
                  )}
                </div>
              )}

              {/* Top Bar: Participant Name and Options Menu */}
              <div className={styles.tileTopBar}>
                <div className={styles.nameBadge} title={displayName}>
                  <div className={styles.statusDot} />
                  <span className={styles.nameText}>{displayName}</span>
                  {isSelf && <span className={styles.youBadge}>You</span>}
                </div>

                {!isSelf && Boolean(owner && owner === this.context.user?.id) && (
                  <UserMenu
                    displayName={displayName}
                    disabled={false}
                    socket={socket}
                    userToManage={p.id}
                    trigger={
                      <button
                        type="button"
                        className={styles.menuTrigger}
                        title="User options"
                      >
                        <IconDotsVertical size={15} />
                      </button>
                    }
                  />
                )}
              </div>

              {/* Bottom Bar: Timestamp and Video/Audio Controls */}
              <div className={styles.tileBottomBar}>
                <div className={styles.timeBadge}>
                  Watching {tsMap[p.id] ? formatTimestamp(tsMap[p.id]) : "0:00"}
                </div>

                <div className={styles.controlsBadge}>
                  {isSelf && ourStream && (
                    <div className={styles.controlPill}>
                      <ActionIcon
                        size="sm"
                        radius="sm"
                        color={this.getVideoWebRTC() ? "green" : "red"}
                        variant="filled"
                        onClick={this.toggleVideoWebRTC}
                        title={this.getVideoWebRTC() ? "Turn camera off" : "Turn camera on"}
                      >
                        {this.getVideoWebRTC() ? (
                          <IconVideo size={13} />
                        ) : (
                          <IconVideoOff size={13} />
                        )}
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        radius="sm"
                        color={this.getAudioWebRTC() ? "green" : "red"}
                        variant="filled"
                        onClick={this.toggleAudioWebRTC}
                        title={this.getAudioWebRTC() ? "Mute mic" : "Unmute mic"}
                      >
                        {this.getAudioWebRTC() ? (
                          <IconMicrophone size={13} />
                        ) : (
                          <IconMicrophoneOff size={13} />
                        )}
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        radius="sm"
                        color="red"
                        variant="subtle"
                        onClick={this.stopWebRTC}
                        title="Leave video call"
                      >
                        <IconX size={13} />
                      </ActionIcon>
                    </div>
                  )}

                  {isSelf && !ourStream && (
                    <ActionIcon
                      size="sm"
                      radius="sm"
                      color="violet"
                      variant="light"
                      onClick={this.setupWebRTC}
                      title="Join video call"
                    >
                      <IconVideo size={13} />
                    </ActionIcon>
                  )}

                  {!isSelf && (
                    <div className={styles.peerIndicators}>
                      {p.isVideoChat && (
                        <div className={styles.indicatorItem} title="Camera connected">
                          <IconVideo size={13} color="var(--color-live)" />
                        </div>
                      )}
                      {p.isMuted ? (
                        <div className={styles.indicatorItem} title="Microphone muted">
                          <IconMicrophoneOff size={13} color="var(--color-danger, #EF4444)" />
                        </div>
                      ) : p.isVideoChat ? (
                        <div className={styles.indicatorItem} title="Microphone on">
                          <IconMicrophone size={13} color="var(--color-live)" />
                        </div>
                      ) : null}
                      {p.isScreenShare && (
                        <div className={styles.indicatorItem} title="Sharing screen">
                          <IconScreenShare size={13} color="#60A5FA" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

          <div
            className={`${styles.inviteCard} ${
              participants.length % 2 !== 0
                ? styles.inviteCardCompanion
                : styles.inviteCardFull
            }`}
            onClick={this.handleOpenInvite}
            role="button"
            tabIndex={0}
            title="Click to invite friends"
          >
            <div
              className={styles.inviteIconBadge}
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--color-violet)",
              }}
            >
              <IconUserPlus size={18} />
            </div>
            <div className={styles.inviteMeta}>
              <span className={styles.inviteTitle}>
                Invite people
              </span>
              <span className={styles.inviteSubtitle}>
                Share a link to bring friends into the room
              </span>
            </div>
            <IconChevronRight className={styles.inviteChevron} size={16} color="var(--text-muted)" />
          </div>
        </div>

        {this.state.isInviteModalOpen && (
          <InviteModal
            roomId={this.props.roomId || ""}
            closeInviteModal={() => this.setState({ isInviteModalOpen: false })}
          />
        )}
      </div>
    );
  }
}
