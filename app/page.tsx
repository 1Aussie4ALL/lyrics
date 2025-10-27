"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    // Lightweight check: try hitting now-playing; if 401, not authed
    fetch("/api/now-playing").then((r) => setAuthed(r.status !== 401));
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Lyrics Overlay</h1>
        {!authed ? (
          <a href="/api/auth/signin" style={{ color: "#fff", textDecoration: "underline" }}>
            Sign in with Spotify
          </a>
        ) : (
          <Link href="/lyrics" style={{ color: "#fff", textDecoration: "underline" }}>
            Go to Lyrics
          </Link>
        )}
      </div>
    </main>
  );
}

