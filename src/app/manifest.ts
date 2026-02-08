import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Funnelists Radar",
    short_name: "Radar",
    description:
      "AI-powered intelligence monitoring — What's Hot in AI, Agents, and Automation",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    categories: ["business", "productivity", "news"],
    icons: [
      {
        src: "/icons/maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
