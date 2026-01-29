const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "NEYNAR_API_DOCS";
const NEYNAR_BASE_URL = "https://api.neynar.com/v2";

export async function getNeynarUser(fid: number) {
  const res = await fetch(`${NEYNAR_BASE_URL}/farcaster/user/bulk?fids=${fid}`, {
    headers: {
      accept: "application/json",
      api_key: NEYNAR_API_KEY,
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error(`Neynar API error: ${res.status}`);
  }

  const data = await res.json();
  const user = data.users?.[0];

  if (!user) return null;

  return {
    fid: user.fid,
    username: user.username,
    display_name: user.display_name,
    pfp_url: user.pfp_url,
    score: user.experimental?.neynar_user_score ?? 0,
  };
}

export async function getNeynarScore(fid: number): Promise<number> {
  const user = await getNeynarUser(fid);
  return user?.score ?? 0;
}

export async function getBulkUsers(fids: number[]) {
  if (fids.length === 0) return [];

  const res = await fetch(
    `${NEYNAR_BASE_URL}/farcaster/user/bulk?fids=${fids.join(",")}`,
    {
      headers: {
        accept: "application/json",
        api_key: NEYNAR_API_KEY,
      },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    throw new Error(`Neynar API error: ${res.status}`);
  }

  const data = await res.json();
  return (data.users || []).map((user: Record<string, unknown>) => ({
    fid: user.fid,
    username: user.username,
    display_name: user.display_name,
    pfp_url: user.pfp_url,
    score: (user.experimental as Record<string, unknown>)?.neynar_user_score ?? 0,
  }));
}
