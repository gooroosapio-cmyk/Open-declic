import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { getViewer } from "@/lib/data";
import { BRAND, SIGNATURE } from "@/lib/constants";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["700"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${BRAND} — ${SIGNATURE}`, template: `%s · ${BRAND}` },
  description:
    "Bibliothèque de projets numériques à lancer avec les outils d'IA de votre choix : modèles expliqués, adaptation locale, étapes et prompts prêts à copier.",
  applicationName: BRAND,
  appleWebApp: { title: BRAND, capable: true, statusBarStyle: "default" },
  icons: { apple: "/app-icon-180.png" },
};

export const viewport: Viewport = { themeColor: "#FFF9F3", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  return (
    <html lang="fr" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <a className="skip-link" href="#contenu">Aller au contenu</a>
        <header className="site-header">
          <div className="shell">
            <Link href="/" className="brand" aria-label={`${BRAND}, accueil`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/open-declic/02_Logos/logo-horizontal.svg" alt={BRAND} width={150} height={30} />
            </Link>
            <div className="header-actions">
              {viewer.isAdmin && (
                <Link className="od-button od-button--ghost od-button--small" href="/admin">
                  <Icon name="reglages" small /> Admin
                </Link>
              )}
              {viewer.userId ? (
                <Link className="od-icon-button" href="/compte" aria-label="Mon compte">
                  <Icon name="compte" />
                </Link>
              ) : (
                <Link className="od-button od-button--secondary od-button--small" href="/connexion">
                  Se connecter
                </Link>
              )}
            </div>
          </div>
        </header>
        {!viewer.configured && (
          <div className="shell" style={{ paddingTop: 12 }}>
            <p className="notice notice--error" role="alert">
              Connexion à la base non configurée : comptes, catalogue et progression sont indisponibles. Voir docs/CONFIGURATION.md.
            </p>
          </div>
        )}
        <BottomNav />
        <main id="contenu" className="shell">{children}</main>
      </body>
    </html>
  );
}
