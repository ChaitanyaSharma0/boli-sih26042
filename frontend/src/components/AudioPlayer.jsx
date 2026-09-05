import { useEffect, useMemo } from "react";

// A player for one language's audio.
//
// The object URL is created during render and revoked when the blob
// changes or the player unmounts, so a teacher stepping back and forth
// through a lesson does not leak a wav per visit.
export default function AudioPlayer({ blob, label }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return (
    <audio controls src={url} aria-label={label}>
      Your browser cannot play audio.
    </audio>
  );
}
