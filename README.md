# Lyrics Overlay (Spotify)

Shows lyrics (via a licensed provider) for the track currently playing on your Spotify account.

## Setup

1. Create a Spotify App → add Redirect URI:
   - http://127.0.0.1:3000/api/auth/callback/spotify
2. Fill `.env.local` with your keys.
3. `npm i` and `npm run dev` (or `pnpm dev`).
4. Visit `http://127.0.0.1:3000/api/auth/signin` → Spotify → approve scopes.
5. Go to `/lyrics`.

## Notes

- Spotify public API does not provide lyrics; we use AudD (or swap providers in `lib/lyrics.ts`).
- All secrets remain on the server; client never sees tokens.

## License

MIT

