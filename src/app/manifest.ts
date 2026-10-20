import type { MetadataRoute } from "next";

// Application installable (sans mode hors ligne).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open declic",
    short_name: "Open declic",
    description: "Trouvez votre idée. Comprenez le modèle. Passez à l'action.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF9F3",
    theme_color: "#FFF9F3",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
