"use client";

import { useEffect, useMemo, useState } from "react";
import SpotifyWebPlayer from "../components/SpotifyWebPlayer";
import { fetchPlaylist, getPlaylistId, type SpotifyPlaylist, type SpotifyTrack } from "../lib/spotify";

const DEFAULT_URL = "https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM";
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
  const [dark, setDark] = useState(true);
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
    const savedTheme = localStorage.getItem("raagbox_theme");
    if (savedTheme) setDark(savedTheme === "dark");
    const savedToken = localStorage.getItem("raagbox_access_token");
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => { localStorage.setItem("raagbox_theme", dark ? "dark" : "light"); }, [dark]);
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
        setToken(data.access_token); localStorage.removeItem("raagbox_code_verifier");
        window.history.replaceState({}, "", window.location.pathname);
        setMessage("Spotify connected.");
      } catch (e) { setMessage(e instanceof Error ? e.message : "Spotify authorization failed."); }
      finally { setBusy(false); }
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    loadPlaylist(DEFAULT_URL, token, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login() {
    if (!CLIENT_ID) { setMessage("Add NEXT_PUBLIC_SPOTIFY_CLIENT_ID to .env.local first."); return; }
    const verifier = randomString();
    const codeChallenge = await challenge(verifier);
    localStorage.setItem("raagbox_code_verifier", verifier);
    const auth = new URL("https://accounts.spotify.com/authorize");
    auth.search = new URLSearchParams({ client_id: CLIENT_ID, response_type: "code", redirect_uri: window.location.origin, code_challenge_method: "S256", code_challenge: codeChallenge, scope: SCOPES }).toString();
    window.location.href = auth.toString();
  }

  async function loadPlaylist(url = playlistUrl, accessToken = token, silent = false) {
    const id = getPlaylistId(url);
    if (!id) { setMessage("Paste a valid Spotify playlist URL."); return; }
    if (!accessToken) { setMessage("Connect Spotify first to load playlist metadata and use the custom player."); return; }
    setBusy(true); if (!silent) setMessage("Loading playlist…");
    try { const data = await fetchPlaylist(accessToken, id); setPlaylist(data); setPlaylistUrl(url); setMessage(""); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not load playlist."); }
    finally { setBusy(false); }
  }

  function addSaved() {
    if (!playlist) return;
    const item: SavedPlaylist = { id: playlist.id, name: playlist.name, url: playlist.external_urls.spotify, mood: "Indian Vibes", description: playlist.description ?? "Spotify playlist" };
    setSaved(prev => [item, ...prev.filter(x => x.id !== item.id)]); setShowAdd(false);
  }

  const tracks = useMemo(() => playlist?.tracks.items.map(x => x.track).filter((x): x is SpotifyTrack => Boolean(x?.id && x.uri)) ?? [], [playlist]);
  const search = query.toLowerCase();
  const shownTracks = tracks.filter(t => `${t.name} ${t.artists.map(a => a.name).join(" ")}`.toLowerCase().includes(search));

  return (
    <main className={`app ${dark ? "dark" : "light"}`}>
      <aside className="sidebar">
        <div className="logo"><div className="logo-mark">राग</div><div><strong>RaagBox</strong><span>INDIAN MUSIC LOUNGE</span></div></div>
        <nav>
          <button className="nav-active">⌂ <span>Now Playing</span></button>
          <button>☷ <span>Playlists</span></button><button>♡ <span>My Library</span></button><button>◷ <span>Recents</span></button>
        </nav>
        <div className="nav-divider"/><div className="browse-title">BROWSE</div>
        {["Hindi","Bollywood","Punjabi","Marathi","Tamil","Telugu","Indie","Lo-fi / Chill","Devotional","Trending"].map((x,i) => <button className="genre" key={x}><b>{["ह","▣","◆","म","அ","అ","♬","◉","♨","♦"][i]}</b><span>{x}</span></button>)}
        <div className="sidebar-art"><div>ॐ</div><span>संगीत • संस्कृति • कहानी</span></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search songs, artists, albums, playlists..."/><kbd>Ctrl /</kbd></div>
          <button className="mode" onClick={() => setDark(!dark)}>{dark ? "☀" : "☾"}<span>{dark ? "☾" : "☀"}</span></button>
          <button className="add-playlist" onClick={() => setShowAdd(true)}>＋ Add Playlist</button>
          <button className="profile">♙</button>
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
                <div className="actions"><button className="liked">♡ Like</button><button onClick={() => document.getElementById("queue")?.scrollIntoView({behavior:"smooth"})}>☷ Queue</button><a href={playlist?.external_urls.spotify ?? DEFAULT_URL} target="_blank" rel="noreferrer">↗ Spotify</a></div>
                <div className="wave-large">{Array.from({length: 52}).map((_,i)=><i key={i} style={{height:`${10+((i*23)%44)}px`}}/>)}</div>
              </div>
              <div className="progress-label"><span>0:00</span><span>Spotify Web Playback</span><span>{tracks.length ? `${tracks.length} tracks` : "—"}</span></div>
            </section>

            {token && playlist ? <SpotifyWebPlayer token={token} tracks={shownTracks} playlistName={playlist.name}/> : <section className="connect-card"><div className="connect-icon">♫</div><div><span className="eyebrow">CUSTOM PLAYER</span><h2>Connect Spotify to start listening</h2><p>The Spotify iframe is not used here. RaagBox uses Spotify's Web Playback SDK to provide this custom UI.</p></div><button className="connect" onClick={login} disabled={busy}>{busy ? "Connecting…" : "Connect Spotify"}</button></section>}

            <section className="featured"><div className="section-title"><div><span>FEATURED PLAYLISTS</span><h2>Made for your mood</h2></div><button>View All ›</button></div><div className="cards">{fallbackCards.map(([a,b,c,e],i)=><button className="playlist-card" key={a} onClick={() => { setPlaylistUrl(saved[i]?.url ?? DEFAULT_URL); if (token) loadPlaylist(saved[i]?.url ?? DEFAULT_URL); }}><div className={`card-art art-${i}`}>{e}<small>✦</small></div><strong>{a}</strong><span>{b}</span><em>{c}</em></button>)}</div></section>
          </div>

          <aside className="right-column">
            <section className="lyrics-panel"><div className="panel-head"><strong>LYRICS</strong><span>हिंदी⌄</span></div><div className="lyrics-placeholder"><p>Lyrics remain inside Spotify's supported experience.</p><p>RaagBox does not copy or host copyrighted lyrics.</p><button onClick={() => window.open(playlist?.external_urls.spotify ?? DEFAULT_URL, "_blank")}>Open Spotify ↗</button></div></section>
            <section className="queue-panel" id="queue"><div className="panel-head"><strong>QUEUE</strong><button>Clear</button></div><div className="queue-list">{(shownTracks.length ? shownTracks.slice(0,7) : []).map((t,i)=><button key={t.id+i} className={i===0 ? "queue-item selected" : "queue-item"}><span>⠿</span><img src={t.album.images?.[2]?.url ?? t.album.images?.[0]?.url ?? ""} alt=""/><div><strong>{t.name}</strong><small>{t.artists.map(a=>a.name).join(", ")}</small></div><em>{Math.floor(t.duration_ms/60000)}:{String(Math.floor(t.duration_ms/1000)%60).padStart(2,"0")}</em></button>)}{!shownTracks.length && <div className="empty-queue">Connect Spotify and load a playlist to see its queue.</div>}</div></section>
          </aside>
        </div>

        <footer><span>✿ Indian Aesthetic</span><i>•</i><span>♫ Custom Player</span><i>•</i><span>● Spotify Powered</span><i>•</i><span>▣ Mobile Responsive</span><i>•</i><span>♡ Easy to Use</span><i>•</i><span>♥ Made with love in India</span></footer>
      </section>

      {showAdd && <div className="modal-backdrop" onMouseDown={e => e.target===e.currentTarget && setShowAdd(false)}><div className="modal"><button className="close" onClick={() => setShowAdd(false)}>×</button><span className="eyebrow">ADD A MEHFIL</span><h2>Bring your playlist</h2><p>Paste a public Spotify playlist URL. RaagBox will fetch its metadata and tracks after Spotify authorization.</p><label>Spotify playlist URL<input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..."/></label><div className="modal-actions"><button onClick={() => {setShowAdd(false); if(!token) login(); else loadPlaylist(playlistUrl);}} className="connect">{token ? "Load Playlist" : "Connect Spotify"}</button><button onClick={() => {setShowAdd(false); addSaved();}} className="ghost">Save current</button></div></div></div>}
      {message && <div className="toast">{message}<button onClick={() => setMessage("")}>×</button></div>}
    </main>
  );
}
