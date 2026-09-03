"use client";

function getSpotifyPlaylistId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/playlist[/:]([A-Za-z0-9]+)(?:\?|$)/);
  return match?.[1] ?? "";
}

export default function SpotifyEmbed({ url }: { url: string }) {
  const id = getSpotifyPlaylistId(url);

  if (!id) {
    return (
      <div className="spotify-error">
        <strong>Invalid Spotify playlist</strong>
        <span>Paste a Spotify playlist URL, for example: https://open.spotify.com/playlist/...</span>
      </div>
    );
  }

  return (
    <iframe
      className="spotify-frame"
      src={`https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`}
      title="Spotify playlist player"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}