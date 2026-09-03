"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SpotifyTrack } from "../lib/spotify";

declare global {
  interface Window {
    Spotify?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type Props = { token: string; tracks: SpotifyTrack[]; playlistName: string };

export default function SpotifyWebPlayer({ token, tracks, playlistName }: Props) {
  const playerRef = useRef<any>(null);
  const deviceIdRef = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [current, setCurrent] = useState<SpotifyTrack | null>(tracks[0] ?? null);
  const [error, setError] = useState("");

  const currentIndex = useMemo(() => current ? Math.max(0, tracks.findIndex(t => t.id === current.id)) : 0, [current, tracks]);

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
      });
      player.addListener("not_ready", () => setReady(false));
      player.addListener("player_state_changed", (state: any) => {
        if (!state) return;
        const track = state.track_window?.current_track;
        if (track) {
          setCurrent((prev) => tracks.find(t => t.id === track.id) ?? prev);
          setPosition(state.position ?? 0);
          setDuration(state.duration ?? track.duration_ms ?? 0);
        }
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
    return () => { cancelled = true; playerRef.current?.disconnect?.(); };
  // token intentionally initializes the player for the current session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { playerRef.current?.setVolume?.(volume); }, [volume]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!playerRef.current) return;
      const state = await playerRef.current.getCurrentState?.();
      if (state) { setPosition(state.position ?? 0); setDuration(state.duration ?? 0); setPlaying(!state.paused); }
    }, 800);
    return () => window.clearInterval(timer);
  }, []);

  async function playTrack(track: SpotifyTrack) {
    if (!deviceIdRef.current) { setError("Player is not ready. Connect Spotify first."); return; }
    setError("");
    setCurrent(track);
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceIdRef.current)}`, {
      method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [track.uri] })
    });
    if (!response.ok) setError(`Could not start playback (${response.status}). Make sure your Spotify account is Premium.`);
  }

  async function toggle() {
    if (!playerRef.current) return;
    setError("");
    await playerRef.current.activateElement?.();
    await playerRef.current.togglePlay();
  }
  async function next() { await playerRef.current?.nextTrack?.(); }
  async function previous() { await playerRef.current?.previousTrack?.(); }
  async function seek(value: number) { await playerRef.current?.seek(value); setPosition(value); }
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
          <div className="pill">{ready ? "● CONNECTED" : "○ CONNECTING"}</div>
          <div className="kicker">NOW PLAYING • {playlistName}</div>
          <h1>{current?.name ?? "Choose a song"}</h1>
          <p>{current?.artists.map(a => a.name).join(" • ") ?? "Spotify track"}</p>
          <span className="album-line">{current?.album.name ?? ""}</span>
          <div className="visualizer" aria-hidden>{Array.from({ length: 44 }).map((_, i) => <i key={i} style={{ height: `${12 + ((i * 17) % 42)}px` }} />)}</div>
        </div>
      </div>
      <div className="transport">
        <div className="time-row"><span>{format(position)}</span><input type="range" min="0" max={Math.max(duration, 1)} value={Math.min(position, duration || 1)} onChange={e => seek(Number(e.target.value))} /><span>{format(duration)}</span></div>
        <div className="controls">
          <button onClick={previous} aria-label="Previous">⏮</button>
          <button className="play-button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
          <button onClick={next} aria-label="Next">⏭</button>
          <label className="volume"><span>🔊</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label>
        </div>
      </div>
      <div className="track-list">
        <div className="track-list-head"><span>QUEUE • {tracks.length} songs</span><span>{ready ? "Spotify Web Player" : "Waiting for player"}</span></div>
        {tracks.map((track, index) => (
          <button key={`${track.id}-${index}`} className={`track-row ${track.id === current?.id ? "selected" : ""}`} onClick={() => playTrack(track)}>
            <span className="track-number">{index + 1}</span>
            <img src={track.album.images?.[2]?.url ?? track.album.images?.[0]?.url ?? ""} alt="" />
            <span className="track-text"><strong>{track.name}</strong><small>{track.artists.map(a => a.name).join(", ")}</small></span>
            <span className="track-duration">{format(track.duration_ms)}</span>
            <span className="track-play">{track.id === current?.id && playing ? "Ⅱ" : "▶"}</span>
          </button>
        ))}
      </div>
      {error && <div className="player-error">{error}</div>}
    </div>
  );
}
