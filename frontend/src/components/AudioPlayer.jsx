import { useEffect, useRef } from "react";

// A player for one language's audio.
//
// The object URL is created and revoked inside the same effect, so every
// URL the <audio> element is given is one that is still alive. Creating it
// during render (useMemo) and revoking it in cleanup broke under React
// StrictMode: dev runs mount -> cleanup -> mount, the memoised URL survived
// the cleanup that revoked it, and the player was left pointing at a dead
// blob. Revoking on cleanup still stops a wav leaking per visit.
export default function AudioPlayer({ blob, label }) {
  const audio = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    audio.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return (
    <audio ref={audio} controls aria-label={label}>
      Your browser cannot play audio.
    </audio>
  );
}
