# RaagBox Custom Spotify Player

A Next.js redesign based on the requested RaagBox dark Indian music dashboard. This version does **not render Spotify's official iframe embed in the UI**. Instead, it uses Spotify's Web Playback SDK + Web API to power a custom player interface.

## Important Spotify requirements

- Web Playback SDK playback requires a Spotify Premium account.
- Spotify's current developer policy says streaming applications may not be commercial. Review Spotify's current developer terms before launching publicly or monetizing this project.
- The user must authorize Spotify. This project uses Authorization Code with PKCE, so no client secret is shipped to the browser.
- Do not copy/host copyrighted lyrics or rip/download Spotify audio.

## Setup

1. Create a Spotify developer app.
2. Copy `.env.example` to `.env.local`.
3. Put your Spotify Client ID in `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`.
4. In the Spotify app settings, add the exact redirect URI:
   - local: `http://127.0.0.1:3000`
   - production: your exact HTTPS Vercel URL
5. Run:

```bash
npm install
npm run dev
```

6. Open the app and click **Connect Spotify**.
7. Paste a public Spotify playlist URL in **Add Playlist**.

## Architecture

The browser authenticates with Spotify using PKCE, fetches playlist metadata/tracks through the Web API, creates a local Spotify Connect device with the Web Playback SDK, and uses the custom RaagBox controls for play/pause/next/previous/seek/volume.

The UI is independent of Spotify's iframe embed, so there is no visible official Spotify embed player to style or hide.
