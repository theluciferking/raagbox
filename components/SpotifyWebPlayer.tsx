"use client";

import { useEffect, useRef, useState } from "react";
import { startPlaylist, startTrack, type SpotifyTrack } from "../lib/spotify";

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type Props = {
  token: string;
  playlistId: string;
  playlistName: string;
  onCurrentTrack?: (track: SDKTrack | null) => void;
};

type SDKTrack = {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
};

export default function SpotifyWebPlayer({ token, playlistId, playlistName, onCurrentTrack }: Props) {
  const playerRef = useRef<any>(null);
  const deviceIdRef = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [current, setCurrent] = useState<SDKTrack | null>(null);
  const [queue, setQueue] = useState<SDKTrack[]>([]);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const setup = () => {
      if (cancelled || !window.Spotify) return;
      const player = new window.Spotify.Player({
        name: "RaagBox Web Player",
        getOAuthToken: (cb: (token: string) => void) => cb(token),
        volume
      });
      playerRef.current = player;
      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id;
        setReady(true);
        setError("");
      });
      player.addListener("not_ready", () => setReady(false));
      player.addListener("player_state_changed", (state: any) => {
        if (!state) return;
        const track = state.track_window?.current_track as SDKTrack | undefined;
        if (track) {
          setCurrent(track);
          onCurrentTrack?.(track);
        }
        const next = (state.track_window?.next_tracks ?? []) as SDKTrack[];
        setQueue(next.slice(0, 7));
        setPosition(state.position ?? 0);
        setDuration(state.duration ?? track?.duration_ms ?? 0);
        setPlaying(!state.paused);
      });
      player.addListener("initialization_error", ({ message }: any) => setError(message));
      player.addListener("authentication_error", ({ message }: any) => setError(message));
      player.addListener("account_error", ({ message }: any) => setError(message));
      player.addListener("playback_error", ({ message }: any) => setError(message));
      player.connect();
    };

    if (window.Spotify) setup();
    else {
      const old = window.onSpotifyWebPlaybackSDKReady;
      window.onSpotifyWebPlaybackSDKReady = () => { old?.(); setup(); };
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }
    return () => { cancelled = true; playerRef.current?.disconnect?.(); playerRef.current = null; };
  // A new token means a new SDK session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { playerRef.current?.setVolume?.(volume); }, [volume]);

  const lastPlaylistRef = useRef(playlistId);

  useEffect(() => {
    if (!ready || !deviceIdRef.current || !playlistId) return;
    if (lastPlaylistRef.current === playlistId) return;
    lastPlaylistRef.current = playlistId;
    void playPlaylist(0);
  }, [playlistId, ready]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!playerRef.current) return;
      const state = await playerRef.current.getCurrentState?.();
      if (state) {
        const track = state.track_window?.current_track as SDKTrack | undefined;
        if (track) {
          setCurrent(track);
          onCurrentTrack?.(track);
        }
        setPosition(state.position ?? 0);
        setDuration(state.duration ?? track?.duration_ms ?? 0);
        setPlaying(!state.paused);
      }
    }, 800);
    return () => window.clearInterval(timer);
  }, []);

  async function playPlaylist(offset = 0) {
    if (!deviceIdRef.current) {
      setError("RaagBox player is still connecting to Spotify. Try again in a moment.");
      return;
    }
    setStarting(true);
    setError("");
    try {
      await playerRef.current?.activateElement?.();
      await startPlaylist(token, deviceIdRef.current, playlistId, offset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Spotify playback.");
    } finally {
      setStarting(false);
    }
  }

  async function playQueueTrack(track: SDKTrack) {
    if (!deviceIdRef.current) return;
    setError("");
    try {
      await playerRef.current?.activateElement?.();
      await startTrack(token, deviceIdRef.current, track.uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start this track.");
    }
  }

  async function toggle() {
    if (!playerRef.current) return;
    setError("");
    try {
      await playerRef.current.activateElement?.();
      if (!current) await playPlaylist(0);
      else await playerRef.current.togglePlay();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Playback could not be changed.");
    }
  }

  async function next() { try { await playerRef.current?.nextTrack?.(); } catch {} }
  async function previous() { try { await playerRef.current?.previousTrack?.(); } catch {} }
  async function seek(value: number) { try { await playerRef.current?.seek(value); setPosition(value); } catch {} }
  function format(ms: number) { const total = Math.floor(ms / 1000); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }

  const artwork = current?.album.images?.[0]?.url;

  return (
    <div className="custom-player">
      <div className="player-main">
        <div className="album-wrap">
          {artwork ? <img src={artwork} alt={current?.album.name ?? "Album artwork"} /> : <div className="album-fallback">राग</div>}
          <div className="vinyl-ring" />
        </div>
        <div className="now-copy">
          <div className="pill">{ready ? "● READY" : "○ CONNECTING"}</div>
          <div className="kicker">NOW PLAYING • {playlistName}</div>
          <h1>{current?.name ?? "Choose a song"}</h1>
          <p>{current?.artists?.map(a => a.name).join(" • ") ?? "Start the playlist to begin listening"}</p>
          <span className="album-line">{current?.album.name ?? "Spotify Web Playback"}</span>
          <div className="visualizer" aria-hidden>{Array.from({ length: 44 }).map((_, i) => <i key={i} style={{ height: `${12 + ((i * 17) % 42)}px` }} />)}</div>
        </div>
      </div>

      <div className="transport">
        <div className="time-row">
          <span>{format(position)}</span>
          <input type="range" min="0" max={Math.max(duration, 1)} value={Math.min(position, duration || 1)} onChange={e => seek(Number(e.target.value))} />
          <span>{format(duration)}</span>
        </div>
        <div className="controls">
          <button onClick={previous} aria-label="Previous">⏮</button>
          <button className="play-button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
          <button onClick={next} aria-label="Next">⏭</button>
          <label className="volume"><span>🔊</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label>
        </div>
        {!current && <button className="start-playlist" onClick={() => playPlaylist(0)} disabled={!ready || starting}>{starting ? "Starting…" : ready ? "▶ Play Playlist" : "Connecting…"}</button>}
      </div>

      <div className="track-list">
        <div className="track-list-head"><span>QUEUE • {queue.length ? `${queue.length} NEXT` : "LIVE FROM SPOTIFY"}</span><span>{ready ? "Spotify Web Player" : "Waiting for player"}</span></div>
        {queue.map((track, index) => (
          <button key={`${track.id}-${index}`} className="track-row" onClick={() => playQueueTrack(track)}>
            <span className="track-number">{index + 1}</span>
            <img src={track.album.images?.[2]?.url ?? track.album.images?.[0]?.url ?? ""} alt="" />
            <span className="track-text"><strong>{track.name}</strong><small>{track.artists.map(a => a.name).join(", ")}</small></span>
            <span className="track-duration">{format(track.duration_ms)}</span>
            <span className="track-play">▶</span>
          </button>
        ))}
        {!queue.length && <div className="empty-queue">Spotify controls the playlist context. Start playback and RaagBox will show the current and upcoming tracks supplied by the Web Playback SDK.</div>}
      </div>
      {error && <div className="player-error">{error}</div>}
    </div>
  );
}
