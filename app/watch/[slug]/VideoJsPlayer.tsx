"use client";

import { createElement, useEffect } from "react";

const VIDEO_JS_CSS = "https://1aaaa.b-cdn.net/8.10.0/video-js.css";
const VIDEO_JS_SCRIPT = "https://2aaaaa.b-cdn.net/8.10.0/video.min.js";

type VideoJsPlayerInstance = {
  dispose: () => void;
};

type VideoJsWindow = Window & {
  videojs?: (
    id: string,
    options: {
      autoplay: boolean;
      muted: boolean;
      fluid: boolean;
    },
  ) => VideoJsPlayerInstance;
};

let videoJsLoader: Promise<void> | null = null;

export function VideoJsPlayer({
  playerId,
  src,
}: {
  playerId: string;
  src: string;
}) {
  useEffect(() => {
    let player: VideoJsPlayerInstance | null = null;
    let cancelled = false;

    loadVideoJs().then(() => {
      if (cancelled) {
        return;
      }

      const videojs = (window as VideoJsWindow).videojs;
      if (!videojs) {
        return;
      }

      player = videojs(playerId, {
        autoplay: true,
        muted: false,
        fluid: true,
      });
    });

    return () => {
      cancelled = true;
      player?.dispose();
    };
  }, [playerId]);

  return createElement(
    "video-js",
    {
      id: playerId,
      className: "video-js vjs-default-skin vjs-big-play-centered h-full w-full",
      controls: true,
      preload: "auto",
      "data-setup": "{}",
    },
    createElement("source", {
      src,
      type: "application/x-mpegURL",
    }),
  );
}

function loadVideoJs() {
  if (videoJsLoader) {
    return videoJsLoader;
  }

  videoJsLoader = new Promise<void>((resolve, reject) => {
    if ((window as VideoJsWindow).videojs) {
      resolve();
      return;
    }

    if (!document.querySelector(`link[href="${VIDEO_JS_CSS}"]`)) {
      const link = document.createElement("link");
      link.href = VIDEO_JS_CSS;
      link.rel = "stylesheet";
      document.head.append(link);
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${VIDEO_JS_SCRIPT}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = VIDEO_JS_SCRIPT;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(), { once: true });
    document.body.append(script);
  });

  return videoJsLoader;
}
