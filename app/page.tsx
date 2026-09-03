 "use client";

import { useEffect, useMemo, useState } from "react";
import SpotifyEmbed from "../components/SpotifyEmbed";

type Playlist = {
  id: string;
  title: string;
  subtitle: string;
  mood: string;
  emoji: string;
  url: string;
};

const starterPlaylists: Playlist[] = [
  {
    id: "demo-1",
    title: "Bollywood Mehfil",
    subtitle: "Romantic Hindi songs for late-night listening",
    mood: "Romance",
    emoji: "🌙",
    url: "https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM"
  },
  {
    id: "demo-2",
    title: "Desi Dhol",
    subtitle: "Punjabi & Indian dance energy",
    mood: "Dance",
    emoji: "🥁",
    url: "https://open.spotify.com/playlist/37i9dQZF1DWY4xHQp97fN6"
  },
  {
    id: "demo-3",
    title: "Indie India",
    subtitle: "Fresh independent sounds from India",
    mood: "Indie",
    emoji: "🎸",
    url: "https://open.spotify.com/playlist/37i9dQZF1DX5q67ZpWyRrZ"
  }
];

export default function Home() {
  const [playlists, setPlaylists] = useState<Playlist[]>(starterPlaylists);
  const [active, setActive] = useState<Playlist>(starterPlaylists[0]);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [dark, setDark] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", mood: "Hindi", url: "" });

  useEffect(() => {
    const saved = localStorage.getItem("raagbox_playlists");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Playlist[];
        if (Array.isArray(parsed) && parsed.length) {
          setPlaylists(parsed);
          setActive(parsed[0]);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("raagbox_playlists", JSON.stringify(playlists));
  }, [playlists]);

  const filtered = useMemo(
    () =>
      playlists.filter((p) =>
        `${p.title} ${p.subtitle} ${p.mood}`.toLowerCase().includes(query.toLowerCase())
      ),
    [playlists, query]
  );

  function addPlaylist(e: React.FormEvent) {
    e.preventDefault();
    const id = `p-${Date.now()}`;
    const item: Playlist = {
      id,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || "A new Indian music playlist",
      mood: form.mood.trim() || "Desi",
      emoji: "🎶",
      url: form.url.trim()
    };
    if (!item.title || !item.url || !item.url.includes("spotify.com/playlist")) {
      alert("Please enter a valid Spotify playlist URL.");
      return;
    }
    const next = [item, ...playlists];
    setPlaylists(next);
    setActive(item);
    setForm({ title: "", subtitle: "", mood: "Hindi", url: "" });
    setShowAdd(false);
  }

  return (
    <main className={dark ? "site dark" : "site"}>
      <nav className="nav">
        <div className="brand">
          <div className="brand-mark">राग</div>
          <div>
            <strong>RaagBox</strong>
            <span>Indian Music Lounge</span>
          </div>
        </div>
        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#playlists">Playlists</a>
          <a href="#about">About</a>
          <button className="theme-btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">
            {dark ? "☀️" : "🌙"}
          </button>
          <button className="add-btn" onClick={() => setShowAdd(true)}>＋ Add Playlist</button>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow">✦ भारतीय संगीत • DESI VIBES • YOUR PLAYLISTS</div>
          <h1>Where every song<br /><em>feels like home.</em></h1>
          <p>
            A warm, modern music lounge for Hindi, Marathi, Punjabi, Tamil,
            Telugu, Bengali and indie Indian playlists. Paste a Spotify playlist
            URL and RaagBox creates the player automatically.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setShowAdd(true)}>＋ Create Your Playlist</button>
            <a className="secondary" href="#playlists">Explore music ↓</a>
          </div>
          <div className="mini-stats">
            <span><b>{playlists.length}</b> playlists</span>
            <span><b>100%</b> Spotify-powered</span>
            <span><b>∞</b> moods</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="sun"></div>
          <div className="mandala">✺</div>
          <div className="hero-card">
            <span>NOW LISTENING</span>
            <strong>{active.emoji} {active.title}</strong>
            <small>{active.mood} • Indian playlist</small>
            <div className="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          </div>
        </div>
      </section>

      <section className="player-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CURRENT MEHFIL</span>
            <h2>{active.title}</h2>
            <p>{active.subtitle}</p>
          </div>
          <a href={active.url} target="_blank" rel="noreferrer" className="spotify-link">Open in Spotify ↗</a>
        </div>
        <div className="player-shell">
          <SpotifyEmbed url={active.url} />
        </div>
      </section>

      <section className="library" id="playlists">
        <div className="library-top">
          <div>
            <span className="eyebrow">YOUR MUSIC LIBRARY</span>
            <h2>Pick your vibe</h2>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search playlists..." />
        </div>
        <div className="playlist-grid">
          {filtered.map((p) => (
            <button className={p.id === active.id ? "playlist active" : "playlist"} key={p.id} onClick={() => setActive(p)}>
              <div className="playlist-art">{p.emoji}<span>✦</span></div>
              <div className="playlist-info">
                <span>{p.mood}</span>
                <strong>{p.title}</strong>
                <small>{p.subtitle}</small>
              </div>
              <div className="play-circle">▶</div>
            </button>
          ))}
        </div>
      </section>

      <section className="lyrics-note">
        <div className="lyrics-icon">अ</div>
        <div>
          <span className="eyebrow">LYRICS &amp; STORIES</span>
          <h3>Let the words stay with you.</h3>
          <p>Use Spotify's official player for music and lyrics features available through Spotify. RaagBox does not copy or host copyrighted lyrics.</p>
        </div>
      </section>

      <footer id="about">
        <div className="brand"><div className="brand-mark">राग</div><div><strong>RaagBox</strong><span>Indian Music Lounge</span></div></div>
        <p>Made for Indian music lovers. Music is played through official Spotify embeds.</p>
      </footer>

      {showAdd && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <form className="modal" onSubmit={addPlaylist}>
            <button type="button" className="close" onClick={() => setShowAdd(false)}>×</button>
            <span className="eyebrow">ADD A MEHFIL</span>
            <h2>Create a playlist card</h2>
            <p>Paste a public Spotify playlist URL. The official Spotify player will be created automatically.</p>
            <label>Playlist name<input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Monsoon Bollywood" /></label>
            <label>Description<input value={form.subtitle} onChange={(e) => setForm({...form, subtitle: e.target.value})} placeholder="Rainy evening Hindi melodies" /></label>
            <label>Language / mood<input value={form.mood} onChange={(e) => setForm({...form, mood: e.target.value})} placeholder="Hindi • Romance" /></label>
            <label>Spotify playlist URL<input required value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} placeholder="https://open.spotify.com/playlist/..." /></label>
            <button className="primary full" type="submit">Create Player ✦</button>
          </form>
        </div>
      )}
    </main>
  );
}