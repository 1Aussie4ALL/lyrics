import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
export async function getAccessTokenOrThrow() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;
  if (!token) throw new Error("Not authenticated with Spotify");
  return token;
}

