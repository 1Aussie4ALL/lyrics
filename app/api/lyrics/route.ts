import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchLyrics } from "@/lib/lyrics";

const schema = z.object({ title: z.string().min(1), artist: z.string().min(1) });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get("title");
  const artist = url.searchParams.get("artist");
  const parsed = schema.safeParse({ title, artist });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const result = await fetchLyrics(parsed.data.title, parsed.data.artist);
  return NextResponse.json(result);
}

