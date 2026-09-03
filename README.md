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

## 404 playlist fix (Spotify API changes)

This build fixes the common `Spotify playlist request failed (404)` problem in the earlier build.

The old build automatically requested a hard-coded demo playlist after login. That demo playlist is no longer a reliable/current playlist, so the request could return 404.

The fixed build:
- never auto-loads a hard-coded demo playlist;
- remembers the playlist URL you entered before Spotify login and loads that URL after login;
- requests playlist metadata with `market=IN`;
- does not request the old `tracks` field;
- starts public playlist playback using the playlist context URI through Spotify Web Playback;
- handles Spotify's February 2026 playlist API changes, where playlist contents are exposed as `items` and are only available for playlists owned by or collaborated on by the current user.

For a public playlist owned by someone else, RaagBox can use the playlist context for playback, but Spotify may not expose the complete playlist track list to the app. The Web Playback SDK provides current/upcoming playback metadata after playback starts.
