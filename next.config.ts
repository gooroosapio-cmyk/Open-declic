import type { NextConfig } from "next";

// Toutes les pages dépendent de la session (droits, progression) : rendu dynamique
// côté serveur, sans Cache Components.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Envoi des visuels par l'administration (4 Mo max, limite Vercel : 4,5 Mo).
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
