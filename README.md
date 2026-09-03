# RaagBox — Indian Spotify Music Player

A Vercel-ready Next.js frontend for an Indian-style music lounge.

## Features

- Paste a public Spotify playlist URL.
- Automatically converts the playlist URL into an official Spotify Embed player.
- Add unlimited playlist cards.
- Search playlists.
- Dark/light mode.
- Responsive desktop/mobile layout.
- No database or API key required.
- Playlist cards are stored in browser localStorage.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

Push the project to GitHub and import the repository into Vercel. No environment variables are required.

## Important Spotify note

This project uses Spotify's official Embed player rather than downloading or hosting Spotify audio. Playback, account requirements, and available features are controlled by Spotify. Public playlists work best.

Spotify documents official playlist embeds here:
https://developer.spotify.com/documentation/embeds

The site does not copy or host copyrighted lyrics. The lyrics section is a visual placeholder and points users to Spotify's own available lyrics/features.

## Data

User-added playlist cards are stored in localStorage, so they are only visible in the browser where they were added. If you want all users to see the same playlists, connect the form to Supabase (or another database) in a future version.
