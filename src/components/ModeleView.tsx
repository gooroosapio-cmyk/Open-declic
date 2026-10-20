import Link from "next/link";
import type { ProjectDetail } from "@/lib/data";
import { CatalogueFacts, ModelSummary } from "./CatalogueFacts";
import { CompareButton } from "./CompareButton";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";
import { NatureBadge } from "./Nature";
import { AccessBadges } from "./ProjectCard";

/** Fiche d'un modèle du catalogue : aperçu public, sans kit. */
export function ModeleView({ project, category, favorite, loggedIn }: { project: ProjectDetail; category: string; favorite: boolean; loggedIn: boolean }) {
  const a = project.apercu;
  return (
    <article className="stack" style={{ gap: 24 }}>
      {project.status !== "published" && (
        <p className="notice notice--warn" role="status">Aperçu administrateur : ce modèle n&apos;est pas publié.</p>
      )}
      <Link href="/" className="row small" style={{ gap: 4, minHeight: 44 }}><Icon name="retour" small /> Retour au catalogue</Link>
      <header className="stack-sm">
        <div className="row"><AccessBadges p={project} /></div>
        {project.odNumber && <p className="small muted" style={{ margin: 0 }}>{project.odNumber}</p>}
        <h1>{project.title}</h1>
        <p className="muted" style={{ fontSize: 17 }}>{project.summary}</p>
        <div className="row">
          <FavoriteButton projectId={project.id} title={project.title} initial={favorite} loggedIn={loggedIn} withLabel />
          <CompareButton slug={project.slug} title={project.title} />
        </div>
      </header>

      <section className="stack" aria-labelledby="h-modele">
        <h2 id="h-modele">Le modèle</h2>
        <CatalogueFacts p={project} category={category} />
        <p className="small">{a.difficulte_explication}</p>
        <ModelSummary v1={a.v1} local={a.adaptation_locale} revenu={a.revenu} construire={a.construire} />
      </section>

      <section className="stack-sm" aria-labelledby="h-ref">
        <h2 id="h-ref">Référence</h2>
        {a.references.length === 0 ? (
          <p className="od-card">Proposition originale Open declic : aucune entreprise de référence. Hypothèse à valider.</p>
        ) : (
          a.references.map((r) => (
            <div key={r.nom} className="od-card stack-sm">
              <div className="row"><strong>{r.nom}</strong><NatureBadge nature={r.nature} /></div>
              <p style={{ margin: 0 }}>{r.description}</p>
              {r.url_officielle && <a href={r.url_officielle} target="_blank" rel="noopener noreferrer">Site officiel <Icon name="ouvrir-externe" small /></a>}
              {r.sources.map((s) => (
                <p key={s.url} className="xsmall muted" style={{ margin: 0 }}>Source consultée le {new Date(s.date_consultation).toLocaleDateString("fr-FR")} (catalogue V1).</p>
              ))}
            </div>
          ))
        )}
        <p className="small muted">S&apos;inspirer d&apos;un modèle économique ne signifie pas copier son code, son identité visuelle ou ses contenus.</p>
      </section>

      <section className="stack-sm" aria-labelledby="h-couts">
        <h2 id="h-couts">Coûts</h2>
        <p className="od-card" style={{ margin: 0 }}>
          Le budget de lancement et les dépenses récurrentes de ce modèle ne sont pas encore chiffrés : ils sont <strong>non renseignés</strong>, pas nuls.
        </p>
      </section>

      <section className="stack-sm" aria-labelledby="h-kit">
        <h2 id="h-kit">Configurations et prompts</h2>
        <div className="notice notice--info">
          <p><strong>Cahier de construction en préparation.</strong> Ce modèle ne dispose pas encore d&apos;étapes ni de prompts. Les fiches complètes OD-001 à OD-010 sont déjà disponibles.</p>
          <p><Link href="/?niveau_contenu=complete">Voir les fiches complètes</Link></p>
        </div>
      </section>

      {a.limites && <p className="xsmall muted">{a.limites}</p>}
    </article>
  );
}
