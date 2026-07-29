export interface SpotifyPlaylistExport {
  year: number;
  month: number;
  playlistUrl: string;
  trackCount: number;
  reused: boolean;
}

export async function exportSpotifyPlaylist(
  apiBaseUrl: string,
  accessToken: string,
  year: number,
  month: number,
) {
  const response = await fetch(`${apiBaseUrl}/api/spotify/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ year, month }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message || "Spotify 플레이리스트를 만들지 못했어요.");
  }
  const data = body?.data as Partial<SpotifyPlaylistExport> | undefined;
  if (
    !data
    || data.year !== year
    || data.month !== month
    || typeof data.playlistUrl !== "string"
    || !data.playlistUrl.startsWith("https://open.spotify.com/")
    || !Number.isInteger(data.trackCount)
    || Number(data.trackCount) < 1
    || typeof data.reused !== "boolean"
  ) throw new Error("Spotify 플레이리스트 응답을 확인하지 못했어요.");
  return data as SpotifyPlaylistExport;
}
