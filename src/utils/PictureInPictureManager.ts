/**
 * Real Picture-in-Picture Manager for CoWatch Cinema
 * Provides true OS-level Picture-in-Picture floating windows (like WhatsApp / YouTube)
 * supporting both YouTube embedded media and HTML5 video streams with active playback,
 * participant controls, and instant room restoration.
 */

export interface PiPOptions {
  roomTitle: string;
  mediaUrl?: string;
  isYouTube: boolean;
  isNative: boolean;
  videoElement: HTMLVideoElement | null;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isMicEnabled: boolean;
  isVideoEnabled: boolean;
  onReturnToRoom: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onSyncTime?: (time: number) => void;
  onClose?: () => void;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "embed" || pathParts[0] === "v") {
        return pathParts[1] || null;
      }
    }
    if (parsed.hostname.includes("youtu.be")) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      return pathParts[0]?.split("?")[0] || null;
    }
  } catch {
    // Fallback regex if URL parsing fails
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }
  return null;
}

export function isDocumentPiPSupported(): boolean {
  return typeof window !== "undefined" && Boolean(window.documentPictureInPicture?.requestWindow);
}

export function isPiPActive(): boolean {
  if (typeof window === "undefined") return false;
  const docPipActive = Boolean(
    window.documentPictureInPicture?.window && !window.documentPictureInPicture.window.closed
  );
  const nativePipActive = Boolean(document.pictureInPictureElement);
  return docPipActive || nativePipActive;
}

export async function closeRealPiP(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (window.documentPictureInPicture?.window && !window.documentPictureInPicture.window.closed) {
      window.documentPictureInPicture.window.close();
    }
  } catch (e) {
    console.warn("[PiPManager] Error closing Document PiP:", e);
  }

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
  } catch (e) {
    console.warn("[PiPManager] Error closing native video PiP:", e);
  }
}

export async function openRealPiP(options: PiPOptions): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // If already open, focus the active PiP window
  if (window.documentPictureInPicture?.window && !window.documentPictureInPicture.window.closed) {
    try {
      window.documentPictureInPicture.window.focus();
      return true;
    } catch (e) {
      console.warn("[PiPManager] Failed to focus existing PiP window:", e);
    }
  }

  // 1. Try Document Picture-in-Picture (Supported in Chrome 116+, Edge 116+)
  if (isDocumentPiPSupported()) {
    try {
      const pipWindow = await window.documentPictureInPicture!.requestWindow({
        width: 540,
        height: 320,
      });

      const doc = pipWindow.document;
      const roomName = options.roomTitle || "Watch Party";
      doc.title = `${roomName} - CoWatch Cinema PiP`;

      // Build CSS styling for cinema PiP experience
      const styleEl = doc.createElement("style");
      styleEl.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          width: 100vw;
          height: 100vh;
          background: #0a0d14;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          overflow: hidden;
          user-select: none;
          display: flex;
          flex-direction: column;
        }
        .pip-viewport {
          position: relative;
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .pip-media-frame {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
          background: #000;
        }
        .pip-overlay-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(180deg, rgba(10, 13, 20, 0.9) 0%, rgba(10, 13, 20, 0) 100%);
          z-index: 20;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }
        .pip-overlay-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(0deg, rgba(10, 13, 20, 0.9) 0%, rgba(10, 13, 20, 0) 100%);
          z-index: 20;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }
        .pip-viewport:hover .pip-overlay-top,
        .pip-viewport:hover .pip-overlay-bottom {
          opacity: 1;
          pointer-events: auto;
        }
        .pip-live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #e2e8f0;
          max-width: 60%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pip-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          flex-shrink: 0;
          animation: pipPulse 2s infinite ease-in-out;
        }
        @keyframes pipPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .pip-actions-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pip-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(30, 41, 59, 0.85);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
        }
        .pip-btn:hover {
          background: rgba(51, 65, 85, 0.95);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        .pip-btn-primary {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          border: 1px solid rgba(139, 92, 246, 0.5);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);
        }
        .pip-btn-primary:hover {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.5);
        }
        .pip-btn-round {
          width: 32px;
          height: 32px;
          padding: 0;
          border-radius: 50%;
        }
        .pip-btn-danger {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.5);
          color: #fca5a5;
        }
        .pip-btn-danger:hover {
          background: rgba(239, 68, 68, 0.45);
          border-color: #ef4444;
          color: #fff;
        }
        .pip-status-hint {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
      `;
      doc.head.appendChild(styleEl);

      const viewport = doc.createElement("div");
      viewport.className = "pip-viewport";

      const startTime = Date.now();
      let originalVideoParent: HTMLElement | null = null;
      let originalVideoSibling: Node | null = null;
      let originalVideoStyle = "";

      // Render actual media inside PiP window
      if (options.isYouTube && options.mediaUrl) {
        const ytId = extractYouTubeId(options.mediaUrl);
        if (ytId) {
          const iframe = doc.createElement("iframe");
          iframe.className = "pip-media-frame";
          const startSeconds = Math.max(0, Math.floor(options.currentTime));
          iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&start=${startSeconds}&controls=1&enablejsapi=1&playsinline=1&rel=0`;
          iframe.allow = "autoplay; encrypted-media; picture-in-picture";
          iframe.setAttribute("allowfullscreen", "true");
          viewport.appendChild(iframe);
        }
      } else if (options.videoElement) {
        const vEl = options.videoElement;
        originalVideoParent = vEl.parentElement;
        originalVideoSibling = vEl.nextSibling;
        originalVideoStyle = vEl.getAttribute("style") || "";

        vEl.style.width = "100%";
        vEl.style.height = "100%";
        vEl.style.objectFit = "contain";
        viewport.appendChild(vEl);
      }

      // Top Overlay Bar (Live Badge + Return Button)
      const topOverlay = doc.createElement("div");
      topOverlay.className = "pip-overlay-top";

      const liveBadge = doc.createElement("div");
      liveBadge.className = "pip-live-badge";
      liveBadge.innerHTML = `<span class="pip-live-dot"></span><span>${escapeHtml(roomName)}</span>`;

      const actionsRow = doc.createElement("div");
      actionsRow.className = "pip-actions-row";

      const returnBtn = doc.createElement("button");
      returnBtn.className = "pip-btn pip-btn-primary";
      returnBtn.innerHTML = `<span>↗</span><span>Return to Room</span>`;
      returnBtn.onclick = () => {
        try {
          window.focus();
        } catch (e) {}
        pipWindow.close();
        options.onReturnToRoom();
      };

      actionsRow.appendChild(returnBtn);
      topOverlay.appendChild(liveBadge);
      topOverlay.appendChild(actionsRow);
      viewport.appendChild(topOverlay);

      // Bottom Overlay Bar (Call & Audio Toggles)
      const bottomOverlay = doc.createElement("div");
      bottomOverlay.className = "pip-overlay-bottom";

      const statusHint = doc.createElement("div");
      statusHint.className = "pip-status-hint";
      statusHint.textContent = "CoWatch Cinema Sync";

      const callControls = doc.createElement("div");
      callControls.className = "pip-actions-row";

      let micActive = options.isMicEnabled;
      const micBtn = doc.createElement("button");
      micBtn.className = `pip-btn pip-btn-round ${micActive ? "" : "pip-btn-danger"}`;
      micBtn.title = micActive ? "Mute Microphone" : "Unmute Microphone";
      micBtn.innerHTML = micActive ? "Mic" : "Muted";
      micBtn.onclick = () => {
        options.onToggleMic();
        micActive = !micActive;
        micBtn.className = `pip-btn pip-btn-round ${micActive ? "" : "pip-btn-danger"}`;
        micBtn.title = micActive ? "Mute Microphone" : "Unmute Microphone";
        micBtn.innerHTML = micActive ? "Mic" : "Muted";
      };

      let videoActive = options.isVideoEnabled;
      const camBtn = doc.createElement("button");
      camBtn.className = `pip-btn pip-btn-round ${videoActive ? "" : "pip-btn-danger"}`;
      camBtn.title = videoActive ? "Turn Off Camera" : "Turn On Camera";
      camBtn.innerHTML = videoActive ? "Cam" : "Off";
      camBtn.onclick = () => {
        options.onToggleVideo();
        videoActive = !videoActive;
        camBtn.className = `pip-btn pip-btn-round ${videoActive ? "" : "pip-btn-danger"}`;
        camBtn.title = videoActive ? "Turn Off Camera" : "Turn On Camera";
        camBtn.innerHTML = videoActive ? "Cam" : "Off";
      };

      callControls.appendChild(micBtn);
      callControls.appendChild(camBtn);
      bottomOverlay.appendChild(statusHint);
      bottomOverlay.appendChild(callControls);
      viewport.appendChild(bottomOverlay);

      doc.body.appendChild(viewport);

      // Cleanup when PiP window closes
      const handlePiPClose = () => {
        if (options.videoElement && originalVideoParent) {
          if (originalVideoSibling) {
            originalVideoParent.insertBefore(options.videoElement, originalVideoSibling);
          } else {
            originalVideoParent.appendChild(options.videoElement);
          }
          if (originalVideoStyle) {
            options.videoElement.setAttribute("style", originalVideoStyle);
          } else {
            options.videoElement.removeAttribute("style");
          }
        }

        // Calculate elapsed time and sync back to room
        if (options.isYouTube && options.onSyncTime) {
          const elapsed = (Date.now() - startTime) / 1000;
          options.onSyncTime(options.currentTime + elapsed);
        }

        options.onClose?.();
      };

      pipWindow.addEventListener("pagehide", handlePiPClose, { once: true });
      return true;
    } catch (err) {
      console.warn("[PiPManager] Document Picture-in-Picture failed, falling back to native:", err);
    }
  }

  // 2. Fallback to HTML5 Native Video Picture-in-Picture
  if (options.videoElement && document.pictureInPictureEnabled) {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      }
      await options.videoElement.requestPictureInPicture();
      return true;
    } catch (err) {
      console.warn("[PiPManager] HTML5 video requestPictureInPicture failed:", err);
    }
  }

  return false;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
