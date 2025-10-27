import { NextResponse } from "next/server";
import { getAccessTokenOrThrow } from "@/lib/auth";

let etag: string | undefined;

export async function GET(req: Request) {
  try {
    const token = await getAccessTokenOrThrow();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (etag) headers["If-None-Match"] = etag;

    const rsp = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers });
    if (rsp.status === 204) return NextResponse.json({ isPlaying: false });
    if (rsp.status === 304) return new NextResponse(null, { status: 304 });

    etag = rsp.headers.get("ETag") ?? etag;
    if (!rsp.ok) return NextResponse.json({ error: "spotify_error" }, { status: rsp.status });

    const data = await rsp.json();
    const item = data?.item;
    const isPlaying = Boolean(data?.is_playing);
    const progressMs = data?.progress_ms ?? 0;
    const durationMs = item?.duration_ms ?? 0;
    const title = item?.name ?? null;
    const artist = item?.artists?.map((a: any) => a.name).join(", ") ?? null;
    const album = item?.album?.name ?? null;
    const image = item?.album?.images?.[0]?.url ?? null;
    const trackId = item?.id ?? null;

    return NextResponse.json({ isPlaying, progressMs, durationMs, title, artist, album, image, trackId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 401 });
  }
}

