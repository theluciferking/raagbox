"use client";

import { useEffect, useState } from "react";
import SpotifyWebPlayer from "../components/SpotifyWebPlayer";
import { fetchPlaylist, getPlaylistId, type SpotifyPlaylist } from "../lib/spotify";

const DEFAULT_URL = "";
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? "";
const SCOPES = "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative";

type SavedPlaylist = { id: string; name: string; url: string; mood: string; description: string };

const fallbackCards = [
  ["Bollywood Hits", "Top Hindi Hits", "50 Songs", "🎙️"],
  ["Lo-fi India", "Chill Vibes", "40 Songs", "🌃"],
  ["Travel Diaries", "Road Trip Songs", "35 Songs", "🚐"],
  ["Indian Indie", "Best of Indie", "45 Songs", "🎸"],
  ["Morning Bhajans", "Positive Energy", "30 Songs", "🪔"],
  ["Romantic Rain", "Monsoon Special", "40 Songs", "☕"],
];

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}
async function challenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export default function Home() {
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState(DEFAULT_URL);
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [saved, setSaved] = useState<SavedPlaylist[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("raagbox_saved");
    if (stored) { try { setSaved(JSON.parse(stored)); } catch {} }
    const savedToken = localStorage.getItem("raagbox_access_token");
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => { localStorage.setItem("raagbox_saved", JSON.stringify(saved)); }, [saved]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    const verifier = localStorage.getItem("raagbox_code_verifier");
    if (!verifier) return;
    (async () => {
      setBusy(true); setMessage("Connecting to Spotify…");
      try {
        const redirectUri = window.location.origin;
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error_description ?? "Spotify authorization failed");
        localStorage.setItem("raagbox_access_token", data.access_token);
        if (data.refresh_token) localStorage.setItem("raagbox_refresh_token", data.refresh_token);
        const pendingUrl = localStorage.getItem("raagbox_pending_playlist_url");
        localStorage.removeItem("raagbox_pending_playlist_url");
        setToken(data.access_token);
        localStorage.removeItem("raagbox_code_verifier");
        window.history.replaceState({}, "", window.location.pathname);
        if (pendingUrl) {
          setMessage("Spotify connected. Loading your playlist…");
          setTimeout(() => loadPlaylist(pendingUrl, data.access_token), 0);
        } else {
          setMessage("Spotify connected. Paste a playlist URL to load it.");
        }
      } catch (e) { setMessage(e instanceof Error ? e.message : "Spotify authorization failed."); }
      finally { setBusy(false); }
    })();
  }, []);

  async function login() {
    if (!CLIENT_ID) { setMessage("Add NEXT_PUBLIC_SPOTIFY_CLIENT_ID to .env.local first."); return; }
    if (getPlaylistId(playlistUrl)) localStorage.setItem("raagbox_pending_playlist_url", playlistUrl.trim());
    const verifier = randomString();
    const codeChallenge = await challenge(verifier);
    localStorage.setItem("raagbox_code_verifier", verifier);
    const auth = new URL("https://accounts.spotify.com/authorize");
    auth.search = new URLSearchParams({ client_id: CLIENT_ID, response_type: "code", redirect_uri: window.location.origin, code_challenge_method: "S256", code_challenge: codeChallenge, scope: SCOPES }).toString();
    window.location.href = auth.toString();
  }

  async function loadPlaylist(url = playlistUrl, accessToken = token) {
    const id = getPlaylistId(url);
    if (!id) { setMessage("Paste a valid Spotify playlist URL."); return; }
    if (!accessToken) { setMessage("Connect Spotify first to load the playlist."); return; }
    setBusy(true); setMessage("Loading playlist…");
    try {
      const data = await fetchPlaylist(accessToken, id);
      setPlaylist(data);
      setPlaylistUrl(url);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load playlist.");
    } finally { setBusy(false); }
  }

  function addSaved() {
    if (!playlist) return;
    const item: SavedPlaylist = { id: playlist.id, name: playlist.name, url: playlist.external_urls.spotify, mood: "Indian Vibes", description: playlist.description ?? "Spotify playlist" };
    setSaved(prev => [item, ...prev.filter(x => x.id !== item.id)]); setShowAdd(false);
  }


  return (
    <main className="app">
      <section className="workspace">
        <header className="topbar">
          <div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search songs, artists, albums, playlists..."/><kbd>Ctrl /</kbd></div>
          <button className="add-playlist" onClick={() => setShowAdd(true)}>＋ Add Playlist</button>
        </header>

        <div className="content-grid">
          <div className="main-column">
            <section className="hero-player">
              <div className="ornament">✦</div>
              <div className="hero-artwork">{playlist?.images?.[0]?.url ? <img src={playlist.images[0].url} alt="Playlist artwork"/> : <div className="placeholder-art">राग<br/><small>RaagBox</small></div>}</div>
              <div className="hero-info">
                <span className="now-pill">NOW PLAYING</span>
                <div className="eyebrow">{playlist ? "SPOTIFY PLAYLIST" : "YOUR INDIAN MUSIC LOUNGE"}</div>
                <h1>{playlist?.name ?? "Your next mehfil"}</h1>
                <p className="artist-line">{playlist?.description ? playlist.description.replace(/<[^>]+>/g, "") : "Connect Spotify and paste a playlist URL to bring your music into this custom player."}</p>
                <div className="actions"><button className="liked">♡ Like</button><a href={playlist?.external_urls.spotify ?? "https://open.spotify.com"} target="_blank" rel="noreferrer">↗ Spotify</a></div>
                <div className="wave-large">{Array.from({length: 52}).map((_,i)=><i key={i} style={{height:`${10+((i*23)%44)}px`}}/>)}</div>
              </div>
              <div className="progress-label"><span>0:00</span><span>Spotify Web Playback</span><span>{playlist?.items?.total ? `${playlist.items.total} tracks` : "Spotify playlist"}</span></div>
            </section>

            {token && playlist ? <div id="player"><SpotifyWebPlayer token={token} playlistId={playlist.id} playlistName={playlist.name}/></div> : <section className="connect-card"><div className="connect-icon">♫</div><div><span className="eyebrow">CUSTOM PLAYER</span><h2>Connect Spotify to start listening</h2><p>The Spotify iframe is not used here. RaagBox uses Spotify's Web Playback SDK to provide this custom UI.</p></div><button className="connect" onClick={login} disabled={busy}>{busy ? "Connecting…" : "Connect Spotify"}</button></section>}

          </div>


        </div>

        <footer><span>✿ Indian Aesthetic</span><i>•</i><span>♫ Custom Player</span><i>•</i><span>● Spotify Powered</span><i>•</i><span>▣ Mobile Responsive</span><i>•</i><span>♡ Easy to Use</span><i>•</i><span>♥ Made with love in India</span></footer>
      </section>

      {showAdd && <div className="modal-backdrop" onMouseDown={e => e.target===e.currentTarget && setShowAdd(false)}><div className="modal"><button className="close" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">ADD A MEHFIL</span><h2>Bring your playlist</h2><p>Paste a Spotify playlist URL. RaagBox fetches playlist metadata and starts the playlist context through Spotify Web Playback. Spotify controls which track metadata is available to the app.</p><label>Spotify playlist URL<input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..."/></label><div className="modal-actions"><button onClick={() => {setShowAdd(false); if(!token) login(); else loadPlaylist(playlistUrl);}} className="connect">{token ? "Load Playlist" : "Connect Spotify"}</button><button onClick={() => {setShowAdd(false); addSaved();}} className="ghost">Save current</button></div></div></div>}
      {message && <div className="toast">{message}<button onClick={() => setMessage("")}>×</button></div>}
    </main>
  );
}
