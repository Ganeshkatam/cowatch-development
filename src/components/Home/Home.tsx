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
              Start a private room in seconds, invite your friends, and watch
              videos together in perfect sync. No counting down, no delay, and
              no sign-up needed for guests.
            </p>

            <div className={styles.actionArea}>
              <div className={styles.actionRow}>
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

                {!user && <SignInButton />}
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
                  <IconCircleCheck size={16} color="var(--color-success)" /> Free to use
                </span>
                <span className={styles.perkItem}>
                  <IconCircleCheck size={16} color="var(--color-success)" /> No downloads required
                </span>
                <span className={styles.perkItem}>
                  <IconCircleCheck size={16} color="var(--color-success)" /> Guests join with 1 click
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

      {/* Feature Pillars: Plain English */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Why You Will Love It</span>
          <h2 className={styles.sectionTitle}>Built for genuine hangout moments</h2>
          <p className={styles.sectionDesc}>
            Everything you need for a cozy movie night, watch party, or anime marathon with friends.
          </p>
        </div>

        <div className={styles.featureGrid}>
          <FeatureCard
            icon={<IconRefresh size={26} />}
            title="Always in Perfect Sync"
            text="When anyone hits pause, play, or rewinds to catch a missed joke, everyone moves together instantly. No more counting down 3, 2, 1 over the phone."
          />
          <FeatureCard
            icon={<IconDeviceTv size={26} />}
            title="Watch Anything You Like"
            text="Paste a YouTube link, stream your favorite video files, or share your screen directly with the group."
          />
          <FeatureCard
            icon={<IconMessageDots size={26} />}
            title="Talk, Laugh, and React"
            text="Turn on your webcam and mic or send live messages and instant reactions. It feels like everyone is sharing the same couch."
          />
          <FeatureCard
            icon={<IconLock size={26} />}
            title="Your Own Private Space"
            text="Lock your room with a password or turn on the waiting lounge so only your invited friends can enter."
          />
          <FeatureCard
            icon={<IconLink size={26} />}
            title="Zero Setup for Friends"
            text="Send your friends a room link and they can join immediately with one tap, without creating an account or downloading an app."
          />
          <FeatureCard
            icon={<IconDevices size={26} />}
            title="Works on Every Screen"
            text="Join from your laptop, desktop, iPad, tablet, or phone right in any modern web browser."
          />
        </div>
      </section>

      {/* How It Works: 3 Steps */}
      <section className={styles.sectionContainer} style={{ paddingTop: 20 }}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Simple as 1-2-3</span>
          <h2 className={styles.sectionTitle}>How to start watching</h2>
          <p className={styles.sectionDesc}>
            Get your party started in less than 30 seconds with no complex settings.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h3 className={styles.stepTitle}>Start a Room</h3>
            <p className={styles.stepDesc}>
              Click "Start a Watch Party" to launch your personal private room. You can give it a title and optional password.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h3 className={styles.stepTitle}>Pick What to Watch</h3>
            <p className={styles.stepDesc}>
              Choose a YouTube video, drop in a web stream link, or select a video file right from your device.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h3 className={styles.stepTitle}>Invite & Enjoy</h3>
            <p className={styles.stepDesc}>
              Copy your room link and send it to your friends. Grab your snacks and enjoy the show together in sync.
            </p>
          </div>
        </div>
      </section>

      {/* Occasions / Scenarios */}
      <section className={styles.sectionContainer} style={{ paddingTop: 20 }}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Made For You</span>
          <h2 className={styles.sectionTitle}>Great for every kind of hangout</h2>
          <p className={styles.sectionDesc}>
            Stay close with the people who matter most, wherever they are in the world.
          </p>
        </div>

        <div className={styles.occasionsGrid}>
          <div className={styles.occasionCard}>
            <img
              src="/cinema_theater_bg.jpg"
              alt="Movie theater date"
              className={styles.occasionImg}
            />
            <div className={styles.occasionBody}>
              <h4 className={styles.occasionTitle}>Long-Distance Movie Dates</h4>
              <p className={styles.occasionDesc}>
                Feel close even when miles apart. Pick a series, turn on webcams, and make weekend movie nights a tradition.
              </p>
            </div>
          </div>

          <div className={styles.occasionCard}>
            <img
              src="/previews/spring.jpg"
              alt="Anime binge with friends"
              className={styles.occasionImg}
            />
            <div className={styles.occasionBody}>
              <h4 className={styles.occasionTitle}>Weekend Anime & Show Binges</h4>
              <p className={styles.occasionDesc}>
                Gather your group chat for new episode drops, season finales, and favorite comedy specials.
              </p>
            </div>
          </div>

          <div className={styles.occasionCard}>
            <img
              src="/previews/bunny.jpg"
              alt="Study and chill session"
              className={styles.occasionImg}
            />
            <div className={styles.occasionBody}>
              <h4 className={styles.occasionTitle}>Study Groups & Hangouts</h4>
              <p className={styles.occasionDesc}>
                Stream coding tutorials, study music playlists, or share your screen to collaborate on class projects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className={styles.sectionContainer} style={{ paddingTop: 20 }}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Questions & Answers</span>
          <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
          <p className={styles.sectionDesc}>
            Everything you need to know about watching together.
          </p>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Accordion variant="separated" radius="md">
            <Accordion.Item value="account-required">
              <Accordion.Control>
                Do my friends need to create an account to join?
              </Accordion.Control>
              <Accordion.Panel>
                No. Your friends can simply click your shared room link and join as guests right away without signing up or creating an account.
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="is-free">
              <Accordion.Control>
                Is CoWatch free to use?
              </Accordion.Control>
              <Accordion.Panel>
                Yes, CoWatch is completely free to use. You can start rooms and invite friends whenever you like.
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="devices-supported">
              <Accordion.Control>
                What devices can we use?
              </Accordion.Control>
              <Accordion.Panel>
                CoWatch works directly in any standard web browser on desktop computers, laptops, iPads, tablets, and smartphones. No app installation is required.
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
      </section>

      {/* Call to Action Banner */}
      <div className={styles.ctaWrapper}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Ready for movie night?</h2>
          <p className={styles.ctaSubtitle}>
            Gather your favorite people and start your private watch party right now.
          </p>
          <div className={styles.ctaButtons}>
            <Button
              size="lg"
              variant="gradient"
              gradient={{ from: "#8B5CF6", to: "#EC4899", deg: 135 }}
              leftSection={<IconCirclePlusFilled size={20} />}
              onClick={() => history.push("/room/new")}
            >
              Start a Watch Party
            </Button>
            <Button
              size="lg"
              variant="default"
              component={Link}
              to="/faq"
            >
              Learn More
            </Button>
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
  { id: "movie", label: "Movie Night", image: "/cinema_theater_bg.jpg", title: "Cinema Night" },
  { id: "youtube", label: "YouTube", image: "/previews/spring.jpg", title: "Shared Stream" },
  { id: "web", label: "Web Screen", image: "/screenshot_full.png", title: "Shared Screen" },
];

const InteractiveTheaterPreview = () => {
  const [activeMode, setActiveMode] = useState("movie");
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

const FeatureCard = ({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) => {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIconWrap}>{icon}</div>
      <h3 className={styles.featureCardTitle}>{title}</h3>
      <p className={styles.featureCardText}>{text}</p>
    </div>
  );
};

