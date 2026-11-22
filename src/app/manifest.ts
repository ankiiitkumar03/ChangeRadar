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
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
