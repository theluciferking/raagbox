import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RaagBox — Indian Music Lounge",
  description: "A beautiful Indian-style music player powered by official Spotify playlist embeds."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}