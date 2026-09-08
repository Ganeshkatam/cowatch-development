import React, { useContext, useState } from "react";
import { useHistory, Link } from "react-router-dom";
import { Button, Accordion } from "@mantine/core";
import {
  IconDeviceTv,
  IconLock,
  IconLink,
  IconCircleCheck,
  IconArrowRight,
  IconUsers,
  IconCirclePlusFilled,
  IconUserPlus,
  IconMicrophone,
  IconShieldCheck,
  IconBrandYoutubeFilled,
  IconScreenShare,
  IconFile,
  IconBrowser,
  IconPlayerPlayFilled,
  IconVideo,
  IconMessage,
} from "@tabler/icons-react";
import styles from "./Home.module.css";
import { MetadataContext } from "../../MetadataContext";
import { Announce } from "../Announce/Announce";

export const Home = () => {
  const { user } = useContext(MetadataContext);
  const history = useHistory();

  return (
    <>
      <Announce page="home" />
      <div className={styles.container}>
        <div className={styles.ambientGlowTop} />
      <div className={styles.ambientGlowMid} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Watch together, <br />
              <span className={styles.gradientText}>even miles apart.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Create a room, invite your friends, and enjoy videos, YouTube, and
              streams together from anywhere.
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
                      to="/join"
                      leftSection={<IconDeviceTv size={18} />}
                    >
                      Join a Room
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
                      to="/join"
                      leftSection={<IconDeviceTv size={18} />}
                    >
                      Join a Room
                    </Button>
                  </>
                )}
              </div>

              <div className={styles.perksRow}>
                <span className={styles.perkItem}>
                  <IconCircleCheck size={16} color="var(--color-success)" /> 100% free, no credit card
                </span>
                <span className={styles.perkItem}>
                  <IconCircleCheck size={16} color="var(--color-success)" /> Works on any browser
                </span>
              </div>
            </div>
          </div>

          {/* Real CoWatch Product Interface Preview */}
          <div className={styles.previewStage}>
            <div className={styles.stageBacklight} />
            <div className={styles.heroImageFrame}>
              <div className={styles.heroWindowBar}>
                <div className={styles.windowControls}>
                  <span className={styles.dotRed} />
                  <span className={styles.dotYellow} />
                  <span className={styles.dotGreen} />
                </div>
                <div className={styles.windowUrl}>cowatch.app/watch/party-room</div>
              </div>
              <img
                src="/screenshot_full.png"
                alt="CoWatch watchparty interface preview"
                className={styles.heroScreenshot}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Asymmetric Bento Grid (Distinctive Feature Architecture) */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Feature Highlights</span>
          <h2 className={styles.sectionTitle}>Built for genuine hangout moments</h2>
          <p className={styles.sectionDesc}>
            Everything you need to hang out, stream videos, and share reactions with friends.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          {/* Card 1: Wide Card - Private Watch Parties */}
          <div className={styles.bentoCardWide}>
            <div className={styles.bentoCardBody}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-violet)" }}>
                <IconUsers size={24} />
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Watch Together
                </span>
              </div>
              <h3 className={styles.bentoTitle}>Private Watch Parties</h3>
              <p className={styles.bentoText}>
                Host watch parties and video sessions with friends. When someone pauses to grab snacks or jumps back to replay a moment, everyone stays on the same page.
              </p>
            </div>

            {/* Watch Party Control Deck */}
            <div className={styles.deckWidget}>
              <div className={styles.deckControlBar}>
                <div className={styles.deckBtnCircle}>
                  <IconPlayerPlayFilled size={14} color="#8B5CF6" />
                </div>
                <div className={styles.deckTrack}>
                  <div className={styles.deckTrackFill} />
                  <div className={styles.deckPlayheadDot} />
                </div>
                <div className={styles.deckLiveIndicator}>
                  <span className={styles.pulseDot} />
                  <span>WATCH PARTY</span>
                </div>
              </div>

              <div className={styles.deckPillGrid}>
                <div className={styles.deckPill}>
                  <IconCircleCheck size={15} color="var(--color-success)" />
                  <span>Shared Playhead</span>
                </div>
                <div className={styles.deckPill}>
                  <IconCircleCheck size={15} color="var(--color-success)" />
                  <span>Instant Link Invites</span>
                </div>
                <div className={styles.deckPill}>
                  <IconCircleCheck size={15} color="var(--color-success)" />
                  <span>Group Text Chat</span>
                </div>
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

            {/* Communication Modes */}
            <div className={styles.voiceFeatureGrid}>
              <div className={styles.voiceFeatureItem}>
                <IconMicrophone size={18} color="var(--color-pink)" />
                <span>Microphone</span>
              </div>
              <div className={styles.voiceFeatureItem}>
                <IconVideo size={18} color="var(--color-violet)" />
                <span>Webcam</span>
              </div>
              <div className={styles.voiceFeatureItem}>
                <IconMessage size={18} color="var(--color-teal)" />
                <span>Text Chat</span>
              </div>
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
              <h3 className={styles.nodeTitle}>Invite Friends & Enjoy</h3>
              <p className={styles.nodeDesc}>
                Pick what you want to watch, send your room link to friends, and kick back together without any hassle.
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

      {/* Section 6: Ambient Call to Action Banner */}
      <div className={styles.ctaWrapper}>
        <div className={styles.ctaGlowBackground} />
        <div className={styles.ctaCard}>
          <div className={styles.ctaBadge}>
            <span className={styles.pulseDot} />
            <span>Ready whenever you are</span>
          </div>

          <h2 className={styles.ctaTitle}>
            Start your next <span className={styles.gradientText}>watch party</span>
          </h2>

          <p className={styles.ctaSubtitle}>
            Create your free account, invite your friends with a link,
            and enjoy watching videos together anytime.
          </p>

          <div className={styles.ctaActions}>
            {user ? (
              <div className={styles.ctaButtonsRow}>
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
                  style={{ fontWeight: 600 }}
                >
                  My Rooms
                </Button>
              </div>
            ) : (
              <div className={styles.ctaButtonsRow}>
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
                  style={{ fontWeight: 600 }}
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>

          <div className={styles.ctaPerks}>
            <div className={styles.ctaPerkItem}>
              <IconCircleCheck size={16} color="#10B981" />
              <span>100% Free Account</span>
            </div>
            <div className={styles.ctaPerkItem}>
              <IconCircleCheck size={16} color="#10B981" />
              <span>No Software Downloads</span>
            </div>
            <div className={styles.ctaPerkItem}>
              <IconCircleCheck size={16} color="#10B981" />
              <span>Desktop & Mobile Browsers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
};


const OCCASIONS = [
  {
    id: "watch",
    tag: "Watch Parties",
    title: "Watch Shows & Videos",
    desc: "Host a private room for your friends. Everyone watches together with shared play, pause, and seek controls.",
    image: "/cinema_theater_bg.jpg",
    featureNote: "Shared playback controls so everyone stays on the exact same scene.",
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

