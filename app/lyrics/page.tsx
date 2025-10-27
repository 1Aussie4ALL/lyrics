"use client";
import useSWR from "swr";
import { useCallback, useEffect, useRef, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => (r.status === 304 ? null : r.json()));

export default function LyricsPage() {
  const [backoff, setBackoff] = useState(200);
  const { data: now, mutate } = useSWR("/api/now-playing", fetcher, {
    refreshInterval: backoff,
    revalidateOnFocus: false,
  });
  const [lyrics, setLyrics] = useState<{ lyrics: string | null; synced?: boolean; timestamps?: Array<{ time: number; text: string }> } | null>(null);
  const lastTrackId = useRef<string | null>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [renderKey, setRenderKey] = useState(0);
  const lastProgress = useRef({ progress: 0, duration: 0, timestamp: Date.now() });
  
  // Split lyrics into lines for karaoke effect
  const lyricsLines = lyrics?.lyrics ? lyrics.lyrics.split("\n") : [];
  
  // Continuously update the local time estimate between server updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 16); // 60fps for ultra-smooth updates
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRenderKey(prev => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const loadLyrics = useCallback(async (title?: string | null, artist?: string | null) => {
    if (!title || !artist) {
      setLyrics(null);
      return;
    }
    const res = await fetch(
      `/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
    );
    if (!res.ok) {
      setLyrics({ lyrics: null });
      return;
    }
    setLyrics(await res.json());
  }, []);

  useEffect(() => {
    if (!now) return;
    if (now.error === "spotify_error") setBackoff(Math.min(backoff * 2, 15000));
    else setBackoff(200);

    if (now?.trackId && now.trackId !== lastTrackId.current) {
      lastTrackId.current = now.trackId;
      loadLyrics(now.title, now.artist);
    }
  }, [now, loadLyrics, backoff]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") mutate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mutate]);
  
  useEffect(() => {
    if (now?.progressMs && now?.durationMs && now.isPlaying) {
      // Only update progress if song is playing
      lastProgress.current = {
        progress: now.progressMs,
        duration: now.durationMs,
        timestamp: Date.now(),
      };
    }
  }, [now?.progressMs, now?.durationMs, now?.isPlaying]);

  // Calculate current progress using actual Spotify time
  const currentProgressSeconds = (() => {
    if (!now?.progressMs || !now?.durationMs) return 0;

    // Use interpolation between server updates for smoothness
    const elapsed = Date.now() - lastProgress.current.timestamp;
    const interpolatedProgress = lastProgress.current.progress / 1000 + elapsed / 1000;

    // But cap it to the actual duration
    const maxProgress = now.durationMs / 1000;

    // Use interpolated value if we're still within bounds
    if (interpolatedProgress < maxProgress && lastProgress.current.duration > 0) {
      return Math.min(interpolatedProgress, maxProgress);
    }

    // Otherwise use actual progress
    return now.progressMs / 1000;
  })();

  // Calculate which line should be highlighted based on EXACT song position
  const getActiveLineIndex = () => {
    if (!lyrics?.timestamps || lyrics.timestamps.length === 0 || !now?.isPlaying) {
      return -1;
    }
    
    // Find the line that should be active at the current time
    let activeIndex = -1;
    for (let i = 0; i < lyrics.timestamps.length; i++) {
      if (currentProgressSeconds >= lyrics.timestamps[i].time) {
        // This line has started
        activeIndex = i;
      } else {
        // We've gone past all started lines
        break;
      }
    }
    
    return activeIndex;
  };

  const activeLineIndex = getActiveLineIndex();
  
  // Force re-calculation when time changes
  const forceUpdate = useRef(0);
  useEffect(() => {
    forceUpdate.current++;
  }, [renderKey]);
  
  useEffect(() => {
    if (renderKey % 10 === 0 && now && now.isPlaying && lyrics?.timestamps) {
      console.log("=== TIMING DEBUG ===");
      console.log("currentProgressSeconds:", currentProgressSeconds.toFixed(2));
      console.log("activeLineIndex:", activeLineIndex);
      if (activeLineIndex >= 0) {
        console.log("active line text:", lyrics.timestamps[activeLineIndex]?.text?.substring(0, 50));
      }
    }
  }, [renderKey, currentProgressSeconds, activeLineIndex, now]);
  
  useEffect(() => {
    if (lyricsRef.current && activeLineIndex >= 0 && now && now.isPlaying && (lyrics?.timestamps || lyricsLines.length > 0)) {
      const container = lyricsRef.current;
      const lineElement = container.children[activeLineIndex] as HTMLElement;
      
      if (lineElement) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = lineElement.getBoundingClientRect();
        
        const isAboveView = elementRect.top < containerRect.top;
        const isBelowView = elementRect.bottom > containerRect.bottom;
        
        if (isAboveView || isBelowView) {
          lineElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [activeLineIndex, lyrics?.timestamps, lyricsLines.length, currentTime, now]);

  // Early returns AFTER all hooks
  if (!now || now === null) return <Center>Loading…</Center>;
  if ((now as any)?.isPlaying === false)
    return <Center>Nothing playing on your Spotify right now.</Center>;
  if ((now as any)?.error) return <Center>Error. Try re-authenticating.</Center>;

  const pct = now.durationMs ? Math.min(100, Math.round((now.progressMs / now.durationMs) * 100)) : 0;

  return (
    <main style={{ 
        minHeight: "100vh", 
        backgroundColor: "#000000", // Pure black background
        padding: "40px 24px 140px",
        display: "flex",
        flexDirection: "column",
        maxWidth: "100%",
        margin: "0 auto"
      }}>
        <section 
          ref={lyricsRef}
          className="lyrics-container"
          style={{ 
            lineHeight: "1.8", 
            fontSize: 24, // Base font size
            fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#fff",
            flex: 1,
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
            scrollBehavior: "smooth",
            paddingTop: "20px",
            // Hide scrollbar
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}
        >
        {lyrics?.timestamps && lyrics.timestamps.length > 0 ? (
          lyrics.timestamps.map((item, index) => {
            const isActive = index === activeLineIndex;
            const distanceFromActive = Math.abs(index - activeLineIndex);
            
            // Progressive dimming: active line is brightest, lines further away are dimmer
            let opacity = 0.25;
            if (isActive) {
              opacity = 1.0;
            } else if (distanceFromActive === 1) {
              opacity = 0.7;
            } else if (distanceFromActive === 2) {
              opacity = 0.5;
            } else if (distanceFromActive === 3) {
              opacity = 0.35;
            }
            
            return (
              <div
                key={index}
                style={{
                  color: `rgba(255, 255, 255, ${opacity})`,
                  fontSize: isActive ? 32 : 24, // Larger for active line
                  fontWeight: isActive ? 700 : 400, // Bold for active line
                  transition: "all 0.2s ease-out",
                  whiteSpace: "pre-wrap",
                  marginBottom: "12px"
                }}
              >
                {item.text || "\u00A0"}
              </div>
            );
          })
        ) : lyricsLines.length > 0 ? (
          lyricsLines.map((line, index) => {
            // For non-synced lyrics, show all equally dimmed
            return (
              <div
                key={index}
                style={{
                  color: `rgba(255, 255, 255, 0.3)`,
                  fontSize: 24,
                  fontWeight: 400,
                  whiteSpace: "pre-wrap",
                  marginBottom: "12px"
                }}
              >
                {line || "\u00A0"}
              </div>
            );
          })
        ) : (
          <div style={{ color: "rgba(255, 255, 255, 0.5)" }}>Lyrics unavailable for this track.</div>
        )}
      </section>
      
      {/* Song info at the bottom - centered */}
      <footer style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#000000",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
            {now.title ?? "Unknown Title"}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>
            {now.artist ?? "Unknown Artist"}
          </div>
        </div>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px",
          width: "100%",
          maxWidth: "400px"
        }}>
          <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)" }}>
            {Math.floor(currentProgressSeconds / 60)}:{(Math.floor(currentProgressSeconds) % 60).toString().padStart(2, '0')}
          </div>
          <div style={{ flex: 1, height: 3, background: "rgba(255, 255, 255, 0.2)", borderRadius: 2 }}>
            <div
              style={{ 
                height: 3, 
                width: `${pct}%`, 
                background: "#fff", 
                borderRadius: 2,
                transition: "width .2s linear" 
              }}
            />
          </div>
          <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)" }}>
            {Math.floor(now.durationMs / 60000)}:{(Math.floor(now.durationMs / 1000) % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </footer>
    </main>
  );
}

function Center({ children }: { children: any }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#0d4d52",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ color: "rgba(0, 229, 255, 0.8)" }}>{children}</div>
      <div style={{ marginTop: 12 }}>
        <a href="/api/auth/signin" style={{ color: "#00e5ff", textDecoration: "underline" }}>
          Sign in
        </a>{" "}
        ·{" "}
        <a href="/lyrics" style={{ color: "#00e5ff", textDecoration: "underline" }}>
          Retry
        </a>
      </div>
    </main>
  );
}
