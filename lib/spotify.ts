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
export type SpotifyPlaylist = {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  external_urls: { spotify: string };
  tracks: { items: Array<{ track: SpotifyTrack | null }> };
};

export function getPlaylistId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/(?:open\.spotify\.com\/(?:intl-[^/]+\/)?playlist\/|spotify:playlist:)([A-Za-z0-9]+)(?:[?&/].*)?$/i);
  return match?.[1] ?? "";
}

export function spotifyApiHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function fetchPlaylist(token: string, id: string): Promise<SpotifyPlaylist> {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${id}?fields=id,name,description,images,external_urls,tracks.items(track(id,uri,name,duration_ms,artists(name,external_urls),album(name,images),is_playable))`, {
    headers: spotifyApiHeaders(token), cache: "no-store"
  });
  if (!response.ok) throw new Error(`Spotify playlist request failed (${response.status})`);
  return response.json();
}
