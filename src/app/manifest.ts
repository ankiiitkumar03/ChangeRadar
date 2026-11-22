import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChangeRadar — Website Change Monitoring",
    short_name: "ChangeRadar",
    description:
      "Monitor public websites, detect meaningful changes, and receive alerts.",
    start_url: "/",
    display: "standalone",
    background_color: "#080a14",
    theme_color: "#080a14",
    icons: [
      {
        src: "/brand/changeradar-app-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/changeradar-app-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
