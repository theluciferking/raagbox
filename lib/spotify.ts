export type SpotifyImage = { url: string; width?: number; height?: number };
export type SpotifyArtist = { name: string; external_urls?: { spotify?: string } };
export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: { name: string; images: SpotifyImage[] };
  is_playable?: boolean;
};

// Spotify changed playlist responses in February 2026:
// playlist contents are now exposed through `items` and are only returned
// for playlists owned by or collaborated on by the current user.
export type SpotifyPlaylist = {
  id: string;
  uri: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  external_urls: { spotify: string };
  owner?: { display_name?: string | null; id?: string };
  public?: boolean | null;
  items?: { total: number };
};

export function getPlaylistId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/(?:open\.spotify\.com\/(?:intl-[^/]+\/)?playlist\/|spotify:playlist:)([A-Za-z0-9]+)(?:[?&/].*)?$/i);
  return match?.[1] ?? "";
}

export function spotifyApiHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function spotifyError(response: Response, fallback: string) {
  let detail = "";
  try {
    const body = await response.json();
    detail = body?.error?.message || body?.error_description || "";
  } catch {}
  const suffix = detail ? `: ${detail}` : "";
  return new Error(`${fallback} (${response.status})${suffix}`);
}

export async function fetchPlaylist(token: string, id: string): Promise<SpotifyPlaylist> {
  // IMPORTANT: Do not request playlist track contents here. Since Spotify's
  // February 2026 API changes, playlist contents are restricted to playlists
  // owned by or collaborated on by the current user. We can still retrieve
  // playlist metadata and use the playlist URI as a playback context.
  const params = new URLSearchParams({
    market: "IN",
    fields: "id,uri,name,description,images,external_urls,owner,public,items(total)"
  });
  const response = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}?${params}`, {
    headers: spotifyApiHeaders(token), cache: "no-store"
  });
  if (!response.ok) throw await spotifyError(response, "Spotify playlist request failed");
  return response.json();
}

export async function startPlaylist(token: string, deviceId: string, playlistId: string, offset = 0) {
  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: "PUT",
    headers: spotifyApiHeaders(token),
    body: JSON.stringify({
      context_uri: `spotify:playlist:${playlistId}`,
      offset: { position: offset },
      position_ms: 0
    })
  });
  if (!response.ok) throw await spotifyError(response, "Spotify could not start playback");
}

export async function startTrack(token: string, deviceId: string, trackUri: string) {
  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: "PUT",
    headers: spotifyApiHeaders(token),
    body: JSON.stringify({ uris: [trackUri] })
  });
  if (!response.ok) throw await spotifyError(response, "Spotify could not start this track");
}
