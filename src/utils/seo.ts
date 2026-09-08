import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface PageSEO {
  title: string;
  description?: string;
  noindex?: boolean;
}

const ROUTE_SEO: Record<string, PageSEO> = {
  "/": {
    title: "CoWatch - Watch Videos Together in Real Time with Friends",
    description:
      "Stream and sync videos with friends in real time. Watch YouTube, personal video files, or virtual browsers with live chat, voice, and instant sync.",
  },
  "/account": {
    title: "Account Settings | CoWatch",
    description: "Manage your CoWatch profile, display name, video/audio preferences, and account security.",
    noindex: true,
  },
  "/account/profile": {
    title: "Your Profile | CoWatch",
    description: "Manage your CoWatch profile, display name, and avatar.",
    noindex: true,
  },
  "/account/preferences": {
    title: "App Preferences | CoWatch",
    description: "Manage your CoWatch media defaults, room layout, and theme appearance.",
    noindex: true,
  },
  "/account/security": {
    title: "Login & Security | CoWatch",
    description: "Manage your CoWatch password, active sessions, and account protection.",
    noindex: true,
  },
  "/myrooms": {
    title: "My Rooms | CoWatch",
    description: "Manage, join, and organize your permanent and temporary watch party rooms.",
    noindex: true,
  },
  "/room/new": {
    title: "Create a Room | CoWatch",
    description:
      "Create a new watch party room. Choose between permanent or temporary rooms, configure passcode, and invite friends.",
  },
  "/faq": {
    title: "Frequently Asked Questions | CoWatch",
    description:
      "Find answers to frequently asked questions about CoWatch, virtual browsers, video synchronization, and room hosting.",
  },
  "/terms": {
    title: "Terms of Service | CoWatch",
    description: "Read the CoWatch Terms of Service and user agreements.",
  },
  "/privacy": {
    title: "Privacy Policy | CoWatch",
    description: "Learn how CoWatch protects and handles your data and privacy.",
  },
  "/login": {
    title: "Sign In | CoWatch",
    description: "Sign in to your CoWatch account to access your saved rooms, preferences, and custom profile.",
  },
  "/signup": {
    title: "Create an Account | CoWatch",
    description: "Join CoWatch for free to host unlimited watch parties, customize your profile, and save permanent rooms.",
  },
  "/forgot-password": {
    title: "Forgot Password | CoWatch",
    description: "Reset your CoWatch password.",
    noindex: true,
  },
  "/reset-password": {
    title: "Reset Password | CoWatch",
    description: "Set a new password for your CoWatch account.",
    noindex: true,
  },
  "/verify-email": {
    title: "Verify Email | CoWatch",
    description: "Verify your email address to access your CoWatch account.",
    noindex: true,
  },
};

export const updatePageSEO = ({ title, description, noindex }: PageSEO) => {
  if (typeof document === "undefined") return;

  // Update title
  document.title = title;

  // Update description
  if (description) {
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement("meta");
      descTag.setAttribute("name", "description");
      document.head.appendChild(descTag);
    }
    descTag.setAttribute("content", description);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);

    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute("content", description);
  }

  // Update OG Title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", title);

  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute("content", title);

  // Update Canonical / OG URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && typeof window !== "undefined") {
    canonical.setAttribute("href", window.location.origin + window.location.pathname);
  }

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl && typeof window !== "undefined") {
    ogUrl.setAttribute("content", window.location.origin + window.location.pathname);
  }

  // Update Robots tag
  const robotsTag = document.querySelector('meta[name="robots"]');
  if (robotsTag) {
    robotsTag.setAttribute(
      "content",
      noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );
  }
};

/**
 * Route-level component that automatically syncs SEO tags on location change.
 */
export const RouteSEO: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    const matched = ROUTE_SEO[pathname];
    if (matched) {
      updatePageSEO(matched);
    } else if (pathname.startsWith("/myrooms/")) {
      updatePageSEO({
        title: "Room Details | CoWatch",
        description: "View room statistics, chat history, and timing details.",
        noindex: true,
      });
    } else if (pathname.startsWith("/watch/")) {
      updatePageSEO({
        title: "Watch Party | CoWatch",
        description: "Join this live watch party on CoWatch.",
        noindex: true,
      });
    }
  }, [location.pathname]);

  return null;
};
