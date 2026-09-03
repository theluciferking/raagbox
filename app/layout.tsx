import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RaagBox — Indian Music Lounge",
  description: "A premium Indian music lounge powered by Spotify.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
