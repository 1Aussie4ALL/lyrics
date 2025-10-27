import NextAuth, { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

async function refreshAccessToken(token: any) {
  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken as string,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    });
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const refreshed = await res.json();
    if (!res.ok) throw new Error(refreshed.error || "Failed to refresh Spotify token");
    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + (Number(refreshed.expires_in ?? 3600) * 1000),
    };
  } catch (e) {
    console.error("Spotify refresh error:", e);
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: { url: "https://accounts.spotify.com/authorize", params: { scope: SCOPES } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: Date.now() + (account.expires_in ?? 3600) * 1000,
        };
      }
      if (token.accessToken && token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
  session: { strategy: "jwt" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

