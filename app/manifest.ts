import type { MetadataRoute } from "next";

// Public-facing identity only. Never mention the hidden layer here (see CLAUDE.md threat model).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Path Finder",
    short_name: "Path Finder",
    description: "A calm maze puzzle game.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4efe4",
    theme_color: "#2f6f6a",
    categories: ["games", "puzzle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
