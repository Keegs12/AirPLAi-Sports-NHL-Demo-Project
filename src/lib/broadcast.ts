// The full-game broadcast shown in the left "tape" pane.
//
// Paste the YouTube URL (or bare 11-char video id) of the NHL full-game replay
// below and the viewer embeds a real video player. Leave it empty to fall back
// to a local video (public/game3.mp4) or, failing that, the audio call
// (public/game3-audio.mp3) over the broadcast still.
//
// You can also set it without editing code via the env var
// NEXT_PUBLIC_BROADCAST_YOUTUBE (e.g. in .env.local).
export const BROADCAST_YOUTUBE =
  process.env.NEXT_PUBLIC_BROADCAST_YOUTUBE ||
  "https://www.youtube.com/watch?v=bSV3u9zARHI"; // NHL full-game replay, SCF 2026 G3

/** Extract an 11-char YouTube id from a watch/share/embed URL or a bare id. */
export function youtubeId(input: string): string {
  if (!input) return "";
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s; // already a bare id
  const m = s.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/|v\/))([\w-]{11})/
  );
  return m ? m[1] : "";
}
