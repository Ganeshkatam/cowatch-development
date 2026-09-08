import React, { useContext, useState, useEffect } from "react";
import { useHistory, Link } from "react-router-dom";
import { Container, Title, Text, Button, Accordion } from "@mantine/core";
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconRefresh,
  IconDeviceTv,
  IconMessageDots,
  IconLock,
  IconLink,
  IconDevices,
  IconCircleCheck,
  IconHeartFilled,
  IconFlame,
  IconStarFilled,
  IconThumbUpFilled,
  IconSparkles,
  IconArrowRight,
  IconUsers,
  IconCirclePlusFilled,
  IconVolume,
  IconUserPlus,
  IconUserCheck,
  IconMicrophone,
  IconShieldCheck,
  IconBrandYoutubeFilled,
  IconScreenShare,
  IconFile,
  IconBrowser,
} from "@tabler/icons-react";
import { SignInButton } from "../TopBar/TopBar";
import styles from "./Home.module.css";
import { MetadataContext } from "../../MetadataContext";

interface FloatingReaction {
  id: number;
  label: string;
  icon: React.ReactNode;
  leftPercent: number;
}

export const Home = () => {
  const { user } = useContext(MetadataContext);
  const history = useHistory();
  const [joinCode, setJoinCode] = useState("");

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCode.trim();
    if (!trimmed) return;

    // Handle full URL or room path or just room code
    let roomName = trimmed;
    if (roomName.includes("/watch/")) {
      roomName = roomName.split("/watch/")[1];
    } else if (roomName.startsWith("/")) {
      roomName = roomName.substring(1);
    }
    // Remove query params or hash if pasted
    roomName = roomName.split("?")[0].split("#")[0];

    if (roomName) {
      history.push(`/watch/${roomName}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlowTop} />
      <div className={styles.ambientGlowMid} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <div className={styles.badgePill}>
              <span className={styles.pulseDot} />
              Private watch rooms for you and your friends
            </div>

            <h1 className={styles.heroTitle}>
              Watch movies together, <br />
              <span className={styles.gradientText}>even miles apart.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Create a free account in seconds, invite your friends, and watch
              videos together in perfect sync. No counting down, no delay.
            </p>

            <div className={styles.actionArea}>
              <div className={styles.actionRow}>
                {user ? (
                  <>
                    <Button
                      size="lg"
                      variant="gradient"
                      gradient={{ from: "#8B5CF6", to: "#EC4899", deg: 135 }}
                      leftSection={<IconCirclePlusFilled size={20} />}
                      onClick={() => history.push("/room/new")}
                      style={{ fontWeight: 600 }}
                    >
                      Start a Watch Party
                    </Button>
                    <Button
                      size="lg"
                      variant="default"
                      component={Link}
                      to="/myrooms"
                    >
                      My Rooms
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      variant="gradient"
                      gradient={{ from: "#8B5CF6", to: "#EC4899", deg: 135 }}
                      leftSection={<IconUserPlus size={20} />}
                      onClick={() => history.push("/signup")}
                      style={{ fontWeight: 600 }}
                    >
                      Create Free Account
                    </Button>
                    <Button
                      size="lg"
                      variant="default"
                      component={Link}
                      to="/login"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>

              {/* Direct Room Code Join Bar */}
              <form onSubmit={handleJoinSubmit} className={styles.joinBar}>
                <input
                  type="text"
                  className={styles.joinInput}
                  placeholder="Have a room code or link? Paste here..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <Button
                  type="submit"
                  size="xs"
                  variant="light"
                  color="violet"
                  rightSection={<IconArrowRight size={14} />}
                >
                  Join
                </Button>
              </form>

              <div className={styles.perksRow}>
                <span className={styles.perkItem}>
                  <IconCircleCheck size={16} color="var(--color-success)" /> 100% Free account
                </span>
                <span className={styles.perkItem}>
                  <IconCircleCheck size={16} color="var(--color-success)" /> Quick email verification
                </span>
                <span className={styles.perkItem}>
                  <IconCircleCheck size={16} color="var(--color-success)" /> Save your rooms & history
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Live Theater Preview */}
          <div className={styles.previewStage}>
            <div className={styles.stageBacklight} />
            <InteractiveTheaterPreview />
          </div>
        </div>
      </section>

      {/* Section 2: Asymmetric Bento Grid (Distinctive Feature Architecture) */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Feature Highlights</span>
          <h2 className={styles.sectionTitle}>Built for genuine hangout moments</h2>
          <p className={styles.sectionDesc}>
            Everything you need for a cozy movie night, watch party, or anime marathon with friends.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          {/* Card 1: Wide Card with Live Dual-Sync Visualizer */}
          <div className={styles.bentoCardWide}>
            <div className={styles.bentoCardBody}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-violet)" }}>
                <IconRefresh size={24} />
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Synchronized Play
                </span>
              </div>
              <h3 className={styles.bentoTitle}>Always in Sync</h3>
              <p className={styles.bentoText}>
                When anyone pauses, plays, or seeks to another part of the video, everyone in the room stays synchronized.
                No countdowns needed.
              </p>
            </div>

            {/* Sync Visualizer Mock */}
            <div className={styles.syncWidget}>
              <div className={styles.syncWidgetHeader}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                  Synchronized Playback
                </span>
                <div className={styles.syncStatusPill}>
                  <span className={styles.pulseDot} />
                  <span>IN SYNC</span>
                </div>
              </div>

              <div className={styles.syncAvatarsRow}>
                <div className={styles.userSyncNode}>
                  <div className={styles.friendAvatar} style={{ background: "#8B5CF6", width: 32, height: 32 }}>You</div>
                  <div>
                    <div className={styles.syncNodeName}>Host (You)</div>
                    <div className={styles.syncNodeTime}>00:24:18</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-live)", fontSize: 12, fontWeight: 700 }}>
                  <IconCircleCheck size={16} /> Synced
                </div>

                <div className={styles.userSyncNode}>
                  <div className={styles.friendAvatar} style={{ background: "#EC4899", width: 32, height: 32 }}>M</div>
                  <div>
                    <div className={styles.syncNodeName}>Friend</div>
                    <div className={styles.syncNodeTime}>00:24:18</div>
                  </div>
                </div>
              </div>

              <div className={styles.syncLineTrack}>
                <div className={styles.syncLineGlow} />
              </div>
            </div>
          </div>

          {/* Card 2: Square Card - Voice & Reactions */}
          <div className={styles.bentoCardSquare}>
            <div className={styles.bentoCardBody}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-pink)" }}>
                <IconMicrophone size={24} />
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Voice & Video
                </span>
              </div>
              <h3 className={styles.bentoTitle}>Voice & Video Chat</h3>
              <p className={styles.bentoText}>
                Turn on your microphone or webcam while watching, and chat with friends in real time.
              </p>
            </div>

            {/* Audio Wave Visualizer Box */}
            <div className={styles.audioWaveBox}>
              <div className={styles.waveBar} style={{ animationDelay: "0s" }} />
              <div className={styles.waveBar} style={{ animationDelay: "0.2s" }} />
              <div className={styles.waveBar} style={{ animationDelay: "0.4s" }} />
              <div className={styles.waveBar} style={{ animationDelay: "0.1s" }} />
              <div className={styles.waveBar} style={{ animationDelay: "0.5s" }} />
              <div className={styles.waveBar} style={{ animationDelay: "0.3s" }} />
              <div className={styles.waveBar} style={{ animationDelay: "0.25s" }} />
            </div>
          </div>

          {/* Card 3: Security & Verified Accounts */}
          <div className={styles.bentoCardSecurity}>
            <div className={styles.bentoCardBody}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-teal)" }}>
                <IconShieldCheck size={24} />
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Room Security
                </span>
              </div>
              <h3 className={styles.bentoTitle}>Room Controls</h3>
              <p className={styles.bentoText}>
                Create rooms with passcodes, enable a waiting lounge for approvals, or set rooms as permanent.
              </p>
            </div>

            <div className={styles.securityList}>
              <div className={styles.securityItem}>
                <IconCircleCheck size={16} color="var(--color-success)" />
                <span>Verified Email Accounts</span>
              </div>
              <div className={styles.securityItem}>
                <IconLock size={16} color="var(--color-violet)" />
                <span>Optional Passcode Protection</span>
              </div>
              <div className={styles.securityItem}>
                <IconUsers size={16} color="var(--color-pink)" />
                <span>Host Waiting Lounge</span>
              </div>
            </div>
          </div>

          {/* Card 4: Wide Card - Universal Media Sources */}
          <div className={styles.bentoCardSources}>
            <div className={styles.bentoCardBody}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-violet)" }}>
                <IconDeviceTv size={24} />
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Media Sources
                </span>
              </div>
              <h3 className={styles.bentoTitle}>Supported Media</h3>
              <p className={styles.bentoText}>
                Stream from YouTube, launch a virtual browser in the cloud, share your screen, upload a video file, or paste direct URLs.
              </p>
            </div>

            <div className={styles.sourcePillRow}>
              <div className={styles.sourceBadge}>
                <IconBrandYoutubeFilled size={18} color="#EF4444" />
                <span>YouTube</span>
              </div>
              <div className={styles.sourceBadge}>
                <IconBrowser size={18} color="var(--color-violet)" />
                <span>Virtual Browser (VBrowser)</span>
              </div>
              <div className={styles.sourceBadge}>
                <IconScreenShare size={18} color="var(--color-blue)" />
                <span>Screensharing</span>
              </div>
              <div className={styles.sourceBadge}>
                <IconFile size={18} color="var(--color-teal)" />
                <span>File Upload</span>
              </div>
              <div className={styles.sourceBadge}>
                <IconLink size={18} color="var(--color-pink)" />
                <span>Direct Video URL</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Connected Horizontal Stepper Timeline */}
      <section className={styles.timelineSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>How It Works</span>
          <h2 className={styles.sectionTitle}>Get started in three easy steps</h2>
          <p className={styles.sectionDesc}>
            Everything is designed to get you watching together in less than 30 seconds.
          </p>
        </div>

        <div className={styles.timelineTrackContainer}>
          <div className={styles.timelineNodeCard}>
            <div className={styles.nodeMarker}>01</div>
            <div className={styles.nodeContentBox}>
              <h3 className={styles.nodeTitle}>Create Your Account</h3>
              <p className={styles.nodeDesc}>
                Sign up for free and verify your email. This secures your personal rooms, custom display name, and watch history.
              </p>
            </div>
          </div>

          <div className={styles.timelineNodeCard}>
            <div className={styles.nodeMarker}>02</div>
            <div className={styles.nodeContentBox}>
              <h3 className={styles.nodeTitle}>Start or Join a Room</h3>
              <p className={styles.nodeDesc}>
                Launch a room with custom passcode protection or paste a friend's room link to jump straight into the party.
              </p>
            </div>
          </div>

          <div className={styles.timelineNodeCard}>
            <div className={styles.nodeMarker}>03</div>
            <div className={styles.nodeContentBox}>
              <h3 className={styles.nodeTitle}>Invite & Enjoy in Sync</h3>
              <p className={styles.nodeDesc}>
                Select what to watch, share your link with your crew, and enjoy the show in perfect real-time synchronization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Split-Screen Interactive Experience Showcase */}
      <OccasionsShowcase />

      {/* Section 5: Two-Column FAQ */}
      <section className={styles.faqSection}>
        <div className={styles.faqLayout}>
          <div className={styles.faqSidebar}>
            <span className={styles.sectionTag} style={{ alignSelf: "flex-start" }}>
              FAQ
            </span>
            <h2 className={styles.sectionTitle} style={{ textAlign: "left" }}>
              Frequently asked questions
            </h2>
            <p className={styles.sectionDesc} style={{ textAlign: "left" }}>
              Have questions about how watch parties work? Here are quick answers to common questions.
            </p>

            <div className={styles.faqContactBox}>
              <h4 className={styles.faqContactTitle}>Still have questions?</h4>
              <p className={styles.faqContactText}>
                Learn more details in our complete documentation guide.
              </p>
              <Button
                component={Link}
                to="/faq"
                variant="light"
                color="violet"
                size="sm"
                rightSection={<IconArrowRight size={14} />}
                style={{ alignSelf: "flex-start" }}
              >
                View Full Help Center
              </Button>
            </div>
          </div>

          <div>
            <Accordion variant="separated" radius="md">
              <Accordion.Item value="account-required">
                <Accordion.Control>
                  Do I need an account to watch or host?
                </Accordion.Control>
                <Accordion.Panel>
                  Yes. Both hosts and viewers need a free CoWatch account with a verified email. This keeps all watch parties safe, prevents trolls and spam, and lets you save your rooms and profile settings.
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="is-free">
                <Accordion.Control>
                  Is CoWatch completely free?
                </Accordion.Control>
                <Accordion.Panel>
                  Yes, CoWatch is 100% free to sign up and use. You can start rooms and invite friends whenever you like.
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="devices-supported">
                <Accordion.Control>
                  What devices can we use to watch?
                </Accordion.Control>
                <Accordion.Panel>
                  CoWatch works directly in modern web browsers on desktop computers, laptops, iPads, tablets, and smartphones. No app installation is required.
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="voice-video">
                <Accordion.Control>
                  Can we talk and see each other while watching?
                </Accordion.Control>
                <Accordion.Panel>
                  Yes! You can turn on your webcam and microphone, or simply use text chat and interactive reactions.
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="privacy">
                <Accordion.Control>
                  How do I keep our room private?
                </Accordion.Control>
                <Accordion.Panel>
                  When creating a room, you can set a password or turn on the waiting lounge so you can approve guests before they enter. Only people who have your room link and password can join.
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Section 6: Ambient Cinema Call to Action Banner */}
      <div className={styles.ctaWrapper}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Ready for movie night?</h2>
          <p className={styles.ctaSubtitle}>
            Create your free account today and start watching with your friends in sync.
          </p>
          <div className={styles.ctaButtons}>
            {user ? (
              <Button
                size="lg"
                variant="gradient"
                gradient={{ from: "#8B5CF6", to: "#EC4899", deg: 135 }}
                leftSection={<IconCirclePlusFilled size={20} />}
                onClick={() => history.push("/room/new")}
              >
                Start a Watch Party
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="gradient"
                  gradient={{ from: "#8B5CF6", to: "#EC4899", deg: 135 }}
                  leftSection={<IconUserPlus size={20} />}
                  onClick={() => history.push("/signup")}
                >
                  Create Free Account
                </Button>
                <Button
                  size="lg"
                  variant="default"
                  component={Link}
                  to="/login"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* Interactive Theater Preview Subcomponent */
const CHAT_SNIPPETS = [
  { user: "Maya", text: "Wait rewind 10 seconds!" },
  { user: "Sam", text: "This scene is so good" },
  { user: "Alex", text: "Pass the popcorn please" },
  { user: "Chris", text: "Audio sync is spot on" },
];

const PREVIEW_MODES = [
  { id: "youtube", label: "YouTube", image: "/previews/youtube.jpg", title: "YouTube Video" },
  { id: "vbrowser", label: "VBrowser", image: "/screenshot_full.png", title: "Virtual Browser" },
  { id: "screenshare", label: "Screenshare", image: "/reactions_preview.png", title: "Screen Sharing" },
];

const InteractiveTheaterPreview = () => {
  const [activeMode, setActiveMode] = useState("youtube");
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(42);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [chatIndex, setChatIndex] = useState(0);

  // Playback timer simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 98 ? 10 : prev + 0.5));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Rotate simulated chat message every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setChatIndex((prev) => (prev + 1) % CHAT_SNIPPETS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const triggerReaction = (label: string, icon: React.ReactNode) => {
    const id = Date.now() + Math.random();
    const leftPercent = 20 + Math.random() * 60;
    const newReaction: FloatingReaction = { id, label, icon, leftPercent };

    setReactions((prev) => [...prev.slice(-6), newReaction]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2200);
  };

  const currentMode = PREVIEW_MODES.find((m) => m.id === activeMode) || PREVIEW_MODES[0];
  const activeChat = CHAT_SNIPPETS[chatIndex];

  return (
    <div className={styles.theaterFrame}>
      {/* Theater Topbar */}
      <div className={styles.theaterHeader}>
        <div className={styles.windowControls}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
        </div>

        <div className={styles.modeTabs}>
          {PREVIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`${styles.modeTab} ${activeMode === mode.id ? styles.modeTabActive : ""}`}
              onClick={() => setActiveMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className={styles.viewerCount}>
          <IconUsers size={14} />
          <span>4 watching</span>
        </div>
      </div>

      {/* Main Video Screen */}
      <div className={styles.theaterScreen}>
        <img
          src={currentMode.image}
          alt={currentMode.title}
          className={styles.screenMedia}
        />

        {/* Floating animated reactions */}
        {reactions.map((r) => (
          <div
            key={r.id}
            className={styles.floatingReaction}
            style={{ left: `${r.leftPercent}%` }}
          >
            <div className={styles.reactionBadge}>
              {r.icon}
              <span>{r.label}</span>
            </div>
          </div>
        ))}

        {/* Live chat message pill overlay */}
        <div className={styles.screenChatOverlay}>
          <div className={styles.chatBubble} key={chatIndex}>
            <span className={styles.chatUser}>{activeChat.user}:</span>
            <span>{activeChat.text}</span>
          </div>
        </div>

        {/* Synchronized playback scrubber overlay */}
        <div className={styles.screenBottomControls}>
          <div
            className={styles.progressBarContainer}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
              setProgress(newProgress);
            }}
          >
            <div
              className={styles.progressBarFill}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className={styles.screenControlButtons}>
            <div className={styles.controlLeft}>
              <button
                type="button"
                className={styles.miniPlayBtn}
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <IconPlayerPauseFilled size={14} />
                ) : (
                  <IconPlayerPlayFilled size={14} />
                )}
              </button>
              <span className={styles.timeText}>
                {Math.floor(progress * 0.4)}:
                {String(Math.floor((progress * 24) % 60)).padStart(2, "0")} / 42:00
              </span>
            </div>
            <IconVolume size={16} color="#aaa" />
          </div>
        </div>
      </div>

      {/* Reaction & Friends Dock */}
      <div className={styles.reactionDock}>
        <div className={styles.reactionButtonsGroup}>
          <button
            type="button"
            className={styles.reactionButton}
            onClick={() => triggerReaction("Love", <IconHeartFilled size={14} color="#EC4899" />)}
          >
            <IconHeartFilled size={14} color="#EC4899" />
            <span>Love</span>
          </button>
          <button
            type="button"
            className={styles.reactionButton}
            onClick={() => triggerReaction("Fire", <IconFlame size={14} color="#F59E0B" />)}
          >
            <IconFlame size={14} color="#F59E0B" />
            <span>Fire</span>
          </button>
          <button
            type="button"
            className={styles.reactionButton}
            onClick={() => triggerReaction("Cheers", <IconThumbUpFilled size={14} color="#3B82F6" />)}
          >
            <IconThumbUpFilled size={14} color="#3B82F6" />
            <span>Cheers</span>
          </button>
          <button
            type="button"
            className={styles.reactionButton}
            onClick={() => triggerReaction("Sparkle", <IconSparkles size={14} color="#8B5CF6" />)}
          >
            <IconSparkles size={14} color="#8B5CF6" />
            <span>Magic</span>
          </button>
        </div>

        <div className={styles.friendsStack}>
          <div className={styles.friendAvatar} style={{ background: "#8B5CF6" }}>M</div>
          <div className={styles.friendAvatar} style={{ background: "#EC4899" }}>S</div>
          <div className={styles.friendAvatar} style={{ background: "#10B981" }}>A</div>
          <div className={styles.friendAvatar} style={{ background: "#3B82F6" }}>C</div>
        </div>
      </div>
    </div>
  );
};

const OCCASIONS = [
  {
    id: "movies",
    tag: "Synchronized Playback",
    title: "Watch Movies & Shows",
    desc: "Create a private room, pick a video, and watch in sync. When anyone pauses or seeks, everyone stays on the exact same second.",
    image: "/cinema_theater_bg.jpg",
    featureNote: "Synchronized play, pause, and seek controls across all room members.",
  },
  {
    id: "youtube",
    tag: "YouTube & Playlists",
    title: "YouTube Watch Parties",
    desc: "Search YouTube or paste links directly into the room. Queue up multiple videos in the shared playlist for continuous viewing.",
    image: "/previews/youtube.jpg",
    featureNote: "Built-in YouTube search and shared playlist queue.",
  },
  {
    id: "vbrowser",
    tag: "Virtual Browser & Screenshare",
    title: "Virtual Browser & Screen Sharing",
    desc: "Launch a virtual browser running in the cloud to watch websites together, or share your own browser tab or desktop.",
    image: "/screenshot_full.png",
    featureNote: "Virtual cloud browser and desktop screensharing support.",
  },
];

const OccasionsShowcase = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const current = OCCASIONS[selectedIdx];

  return (
    <section className={styles.showcaseSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTag}>Ways to Watch</span>
        <h2 className={styles.sectionTitle}>Built for how you want to watch</h2>
        <p className={styles.sectionDesc}>
          Whether streaming YouTube videos, using the cloud browser, or watching video files together.
        </p>
      </div>

      <div className={styles.showcaseStage}>
        {/* Left Side: Interactive Selectable Tabs */}
        <div className={styles.showcaseTabsList}>
          {OCCASIONS.map((occ, idx) => (
            <button
              key={occ.id}
              type="button"
              className={`${styles.showcaseTabButton} ${idx === selectedIdx ? styles.showcaseTabActive : ""}`}
              onClick={() => setSelectedIdx(idx)}
            >
              <div className={styles.tabHeading}>
                <span>{occ.title}</span>
                {idx === selectedIdx && (
                  <span style={{ fontSize: 11, color: "var(--color-violet)", fontWeight: 700 }}>
                    ACTIVE
                  </span>
                )}
              </div>
              <p className={styles.tabPreviewText}>{occ.desc}</p>
            </button>
          ))}
        </div>

        {/* Right Side: Split-Screen Cinematic Stage */}
        <div className={styles.showcaseDisplay}>
          <img
            src={current.image}
            alt={current.title}
            className={styles.showcaseDisplayImg}
          />
          <div className={styles.showcaseOverlayTag}>
            <div style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, color: "var(--color-pink)", marginBottom: 4 }}>
              {current.tag}
            </div>
            <div>{current.featureNote}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

