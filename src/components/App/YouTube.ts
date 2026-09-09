import { MediaPlayerClass } from "dashjs";
import { Player } from "./Player";

export class YouTube implements Player {
  coWatchYTPlayer: YT.Player | null;
  constructor(coWatchYTPlayer: YT.Player | null) {
    this.coWatchYTPlayer = coWatchYTPlayer;
  }
  clearDashState = () => {};
  setDashState = (player: MediaPlayerClass) => {};

  getCurrentTime = () => {
    return this.coWatchYTPlayer?.getCurrentTime() ?? 0;
  };

  getDuration = () => {
    return this.coWatchYTPlayer?.getDuration() ?? 0;
  };

  isMuted = () => {
    return this.coWatchYTPlayer?.isMuted() ?? false;
  };

  isSubtitled = (): boolean => {
    // This actually isn't accurate after subtitles have been toggled off because track doesn't update
    // try {
    //   const current = this.coWatchYTPlayer?.getOption('captions', 'track');
    //   return Boolean(current && current.languageCode);
    // } catch (e) {
    //   console.warn(e);
    //   return false;
    // }
    return false;
  };

  getPlaybackRate = (): number => {
    return this.coWatchYTPlayer?.getPlaybackRate() ?? 1;
  };

  setPlaybackRate = (rate: number) => {
    this.coWatchYTPlayer?.setPlaybackRate(rate);
  };

  setSrcAndTime = async (src: string, time: number) => {
    let url = new window.URL(src);
    // Standard link https://www.youtube.com/watch?v=ID
    let videoId = new URLSearchParams(url.search).get("v");
    // Link shortener https://youtu.be/ID
    let altVideoId = src.split("/").slice(-1)[0].split("?")[0];
    this.coWatchYTPlayer?.cueVideoById(videoId || altVideoId, time);
    // this.coWatchYTPlayer?.cuePlaylist({listType: 'playlist', list: 'OLAK5uy_mtoaOGQksRdPbwlNtQ9IiK67wir5QqyIc'});
  };

  playVideo = async () => {
    this.coWatchYTPlayer?.playVideo();
  };

  pauseVideo = () => {
    this.coWatchYTPlayer?.pauseVideo();
  };

  seekVideo = (time: number) => {
    this.coWatchYTPlayer?.seekTo(time, true);
  };

  shouldPlay = () => {
    return (
      this.coWatchYTPlayer?.getPlayerState() ===
        window.YT?.PlayerState.PAUSED ||
      this.getCurrentTime() === this.getDuration()
    );
  };

  setMute = (muted: boolean) => {
    if (muted) {
      this.coWatchYTPlayer?.mute();
    } else {
      this.coWatchYTPlayer?.unMute();
    }
  };

  setVolume = (volume: number) => {
    this.coWatchYTPlayer?.setVolume(volume * 100);
  };

  getVolume = (): number => {
    const volume = this.coWatchYTPlayer?.getVolume();
    return (volume ?? 0) / 100;
  };

  setSubtitleMode = (mode?: TextTrackMode, lang?: string) => {
    // Show the available options
    // console.log(this.coWatchYTPlayer?.getOptions('captions'));
    if (mode === "showing") {
      console.log(lang);
      //@ts-expect-error
      this.coWatchYTPlayer?.setOption("captions", "reload", true);
      //@ts-expect-error
      this.coWatchYTPlayer?.setOption("captions", "track", {
        languageCode: lang ?? "en",
      });
    }
    if (mode === "hidden") {
      // BUG this doesn't actually set the value of track
      // so we can't determine if subtitles are on or off
      // need to provide separate menu options
      //@ts-expect-error
      this.coWatchYTPlayer?.setOption("captions", "track", {});
    }
  };

  getSubtitleMode = () => {
    return "hidden" as TextTrackMode;
  };

  isReady = () => {
    return Boolean(this.coWatchYTPlayer);
  };

  stopVideo = () => {
    this.coWatchYTPlayer?.stopVideo();
  };

  clearState = () => {
    return;
  };

  loadSubtitles = async (src: string) => {
    return;
  };

  syncSubtitles = (sharerTime: number) => {
    return;
  };

  getTimeRanges = (): { start: number; end: number }[] => {
    return [
      {
        start: 0,
        end:
          (this.coWatchYTPlayer?.getVideoLoadedFraction() ?? 0) *
          this.getDuration(),
      },
    ];
  };

  setLoop = (loop: boolean): void => {
    this.coWatchYTPlayer?.setLoop(loop);
  };

  getVideoEl = (): HTMLMediaElement => {
    return document.getElementById("leftYt") as HTMLMediaElement;
  };
}
