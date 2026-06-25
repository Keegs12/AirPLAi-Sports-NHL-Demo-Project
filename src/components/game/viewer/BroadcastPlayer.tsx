"use client";

import { useEffect, useState } from "react";
import BroadcastPlaceholder from "./BroadcastPlaceholder";
import { BROADCAST_YOUTUBE, youtubeId } from "@/lib/broadcast";

/**
 * The "tape": a real video player. Priority is the configured YouTube broadcast
 * (see src/lib/broadcast.ts) → a local public/game3.mp4 → the styled broadcast
 * still. The embedded YouTube player carries its own broadcast audio, so there's
 * no separate audio track to manage.
 */
export default function BroadcastPlayer() {
  const yt = youtubeId(BROADCAST_YOUTUBE);
  const [hasMp4, setHasMp4] = useState(false);

  // Probe for a local mp4 (client-side fetch avoids the SSR media-error race
  // where a <video> 404s before React can attach an onError handler).
  useEffect(() => {
    if (yt) return;
    let alive = true;
    fetch("/game3.mp4", { method: "HEAD" })
      .then((r) => { if (alive && r.ok) setHasMp4(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, [yt]);

  if (yt) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1&playsinline=1`}
        title="Full-game broadcast"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "#000" }}
      />
    );
  }

  if (hasMp4) {
    return (
      <video
        src="/game3.mp4"
        controls
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
      />
    );
  }

  return <BroadcastPlaceholder />;
}
