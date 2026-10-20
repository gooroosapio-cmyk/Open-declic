import Link from "next/link";
import { LoginRequired } from "@/components/LoginRequired";
import { ProjectProgress } from "@/components/ProjectProgress";
import { AccessBadges } from "@/components/ProjectCard";
import { FavoriteButton } from "@/components/FavoriteButton";
import { getMyProjects, getViewer } from "@/lib/data";

export const metadata = { title: "Mes projets" };

export default async function Page() {
  const viewer = await getViewer();
  if (!viewer.userId) {
    return <LoginRequired title="Mes projets" text="Connectez-vous pour retrouver vos favoris et les projets que vous avez commencés." next="/mes-projets" />;
  }
  const mine = await getMyProjects();
  const started = mine.filter((p) => p.started);
  const favorites = mine.filter((p) => p.favorite);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1>Mes projets</h1>
      <section className="stack" aria-labelledby="h-commences">
        <h2 id="h-commences">Projets commencés</h2>
        {started.length === 0 ? (
          <p className="od-card muted">Aucun projet commencé. Ouvrez une fiche puis « Démarrer ce projet ».</p>
        ) : (
          <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {started.map((p) => (
              <li key={p.id} className="od-card row-between">
                <div className="stack-sm" style={{ flex: "1 1 240px" }}>
                  <div className="row"><AccessBadges p={p} /></div>
                  <Link href={`/projets/${p.slug}`}><strong>{p.title}</strong></Link>
                  <ProjectProgress done={p.validatedCount} total={p.totalSteps} />
                </div>
                <Link className="od-button od-button--small" href={`/projets/${p.slug}/kit${p.nextStep ? `#etape-${p.nextStep.step_key}` : ""}`}>
                  {p.validatedCount > 0 ? "Reprendre" : "Commencer"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="stack" aria-labelledby="h-favoris">
        <h2 id="h-favoris">Favoris</h2>
        {favorites.length === 0 ? (
          <div className="empty od-card">
            <p className="muted">Aucun favori pour l&apos;instant. Utilisez le cœur sur une fiche pour l&apos;enregistrer ici.</p>
            <Link className="od-button od-button--secondary" href="/">Découvrir les projets</Link>
          </div>
        ) : (
          <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {favorites.map((p) => (
              <li key={p.id} className="od-card row-between">
                <div className="stack-sm" style={{ flex: "1 1 240px" }}>
                  <div className="row"><AccessBadges p={p} /></div>
                  <Link href={`/projets/${p.slug}`}><strong>{p.title}</strong></Link>
                  <p className="small muted" style={{ margin: 0 }}>{p.summary}</p>
                </div>
                <FavoriteButton projectId={p.id} title={p.title} initial loggedIn />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
