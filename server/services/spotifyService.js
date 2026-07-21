import { getSpotifyAccessToken } from "../utils/spotifyToken.js";

const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";

function getAlbumImageUrl(images = []) {
  const image = images.find((item) => item?.url && item.width <= 640) ?? images[0];
  return image?.url ?? "";
}

function isValidTrack(track) {
  return (
    typeof track?.id === "string" &&
    typeof track?.name === "string" &&
    Array.isArray(track?.artists) &&
    typeof track?.album?.name === "string" &&
    Array.isArray(track?.album?.images) &&
    typeof track?.external_urls?.spotify === "string"
  );
}

export function mapSpotifyTrack(track) {
  if (!isValidTrack(track)) {
    throw new Error("Invalid Spotify track response");
  }

  return {
    spotifyTrackId: track.id,
    title: track.name,
    artistName: track.artists
      .map((artist) => artist?.name)
      .filter(Boolean)
      .join(", "),
    albumName: track.album.name,
    albumImageUrl: getAlbumImageUrl(track.album.images),
    externalUrl: track.external_urls.spotify,
  };
}

export async function searchSpotifyTracks(
  query,
  { fetchImpl = fetch, getAccessToken = getSpotifyAccessToken } = {},
) {
  const accessToken = await getAccessToken({ fetchImpl });
  const searchParams = new URLSearchParams({
    q: query,
    type: "track",
    limit: "10",
  });

  const response = await fetchImpl(`${SPOTIFY_SEARCH_URL}?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify search failed with status ${response.status}`);
  }

  const payload = await response.json();
  const tracks = payload?.tracks?.items;

  if (!Array.isArray(tracks)) {
    throw new Error("Invalid Spotify search response");
  }

  return tracks.map(mapSpotifyTrack);
}
