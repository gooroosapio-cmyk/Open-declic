import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessOffer } from "@/components/AccessOffer";
import { CompareButton } from "@/components/CompareButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Icon } from "@/components/Icon";
import { NatureBadge } from "@/components/Nature";
import { AccessBadges } from "@/components/ProjectCard";
import { StartButton } from "@/components/StartButton";
import { COUNTRIES, DIFFICULTIES, EQUIPMENT, RECURRENCES, SKILLS, formatFcfa, formatRange, FULL_ACCESS_PRICE_FCFA } from "@/lib/constants";
import { CatalogueFacts, ModelSummary } from "@/components/CatalogueFacts";
import { ModeleView } from "@/components/ModeleView";
import { canReadReserved, getCategories, getProject, getSetting, getUserProjectState, getViewer, isCompleteApercu } from "@/lib/data";

const lbl = (d: Record<string, string>, keys: string[]) => keys.map((k) => d[k] ?? k).join(", ");

export async function generateMetadata({ params }: PageProps<"/projets/[slug]">) {
  const p = await getProject((await params).slug);
  return { title: p?.title ?? "Fiche introuvable" };
}

export default async function ProjectPage({ params }: PageProps<"/projets/[slug]">) {
  const { slug } = await params;
  const [project, viewer, categories] = await Promise.all([getProject(slug), getViewer(), getCategories()]);
  if (!project) notFound();
  const state = await getUserProjectState(project.id, viewer);
  const category = categories.find((c) => c.slug === project.category)?.label ?? project.category;
  const a = project.apercu;
  if (project.contentLevel === "modele" || !isCompleteApercu(a)) {
    return <ModeleView project={project} category={category} favorite={state.favorite} loggedIn={Boolean(viewer.userId)} />;
  }
  const allowed = canReadReserved(project, viewer);
  const contact = allowed ? null : (await getSetting<{ texte: string }>("acces_contact"))?.texte || null;
  const oneTime = a.budget.lignes.filter((l) => l.recurrence === "unique");
  const recurring = a.budget.lignes.filter((l) => l.recurrence !== "unique");
  const done = new Set(state.validated);
  const visual = a.visuels[0];

  return (
    <article className="stack" style={{ gap: 24 }}>
      {project.status !== "published" && (
        <p className="notice notice--warn" role="status">
          Aperçu administrateur : cette fiche est en {project.status === "draft" ? "brouillon" : "archive"} et n&apos;est pas visible du public.
        </p>
      )}
      <Link href="/" className="row small" style={{ gap: 4, minHeight: 44 }}><Icon name="retour" small /> Retour au catalogue</Link>

      <header className="stack-sm">
        {visual && (
          <figure className="stack-sm" style={{ margin: 0 }}>
            <div className="hero-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={visual.url} alt={visual.alt} width={640} height={480} />
            </div>
            {visual.legende && <figcaption className="xsmall muted">{visual.legende}</figcaption>}
          </figure>
        )}
        <div className="row"><AccessBadges p={project} /><span className="tag">{category}</span></div>
        {project.odNumber && <p className="small muted" style={{ margin: 0 }}>{project.odNumber}{project.workName && ` · nom de travail : ${project.workName}`}</p>}
        <h1>{project.title}</h1>
        <p className="muted" style={{ fontSize: 17 }}>{project.summary}</p>
        <div className="row">
          <FavoriteButton projectId={project.id} title={project.title} initial={state.favorite} loggedIn={Boolean(viewer.userId)} withLabel />
          <CompareButton slug={project.slug} title={project.title} />
        </div>
      </header>

      <nav className="section-nav" aria-label="Sections de la fiche">
        <a href="#apercu">Aperçu</a>
        <a href="#etapes">Étapes</a>
        <a href="#configurations">Configurations et prompts</a>
        <a href="#resultats">Résultats et fichiers</a>
      </nav>

      <section id="apercu" className="stack" aria-labelledby="h-apercu">
        <h2 id="h-apercu">Aperçu</h2>
        <dl className="facts od-card">
          <div><dt>Difficulté</dt><dd>{DIFFICULTIES[project.difficulty as keyof typeof DIFFICULTIES]}</dd></div>
          <div><dt>Temps par semaine</dt><dd>{formatRange(project.weeklyHours.min, project.weeklyHours.max, "h")}</dd></div>
          <div><dt>Compétences</dt><dd>{lbl(SKILLS, project.skills)}</dd></div>
          <div><dt>Matériel</dt><dd>{lbl(EQUIPMENT, project.equipment)}</dd></div>
          <div><dt>Pays étudiés</dt><dd>{lbl(COUNTRIES, project.countries)}</dd></div>
          <div><dt>Étapes</dt><dd>{project.outline.length}</dd></div>
        </dl>
        <p className="small">{a.difficulte_explication ?? null}</p>
        {project.odNumber && <CatalogueFacts p={project} category={category} />}
        <div className="stack-sm">
          <h3>Pour qui ?</h3>
          <p>{a.client_cible}</p>
          {a.probleme && (<><h3>Quel problème ?</h3><p>{a.probleme}</p></>)}
          <h3>Ce qui est proposé</h3>
          <p>{a.offre}</p>
          {a.exemple_livrable && (
            <div className="od-card od-card--flat stack-sm">
              <div className="row"><strong>Exemple de livrable</strong><NatureBadge nature={a.exemple_livrable.nature} /></div>
              <p style={{ margin: 0 }}>{a.exemple_livrable.description}</p>
            </div>
          )}
          <ModelSummary v1={a.v1} reporte={a.reporte} revenu={a.revenu} construire={a.construire} />
        </div>

        <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
          <section className="od-card stack-sm" aria-labelledby="h-prix">
            <h3 id="h-prix">1. Prix d&apos;accès à Open declic</h3>
            {project.isFree ? (
              <p style={{ margin: 0 }}><strong>Fiche gratuite.</strong> Toutes les étapes et tous les prompts sont accessibles.</p>
            ) : (
              <p style={{ margin: 0 }}><strong>{formatFcfa(FULL_ACCESS_PRICE_FCFA)}</strong>, paiement unique : accès à vie à tout le catalogue. Aucun prix par fiche.</p>
            )}
            <p className="xsmall muted" style={{ margin: 0 }}>Ce prix ne comprend pas les dépenses du business présentées ci-après.</p>
          </section>
          <section className="od-card stack-sm" aria-labelledby="h-lancement">
            <h3 id="h-lancement">2. Budget estimé pour lancer le business</h3>
            <p style={{ margin: 0 }}><strong>{formatRange(project.launchBudget.min, project.launchBudget.max)}</strong></p>
            <BudgetLines lines={oneTime} empty="Aucune dépense ponctuelle détaillée." />
          </section>
          <section className="od-card stack-sm" aria-labelledby="h-recurrent">
            <h3 id="h-recurrent">3. Dépenses récurrentes du business</h3>
            <p style={{ margin: 0 }}><strong>{formatRange(project.monthlyCost.min, project.monthlyCost.max)}</strong>{(project.monthlyCost.min != null || project.monthlyCost.max != null) && " par mois"}</p>
            <BudgetLines lines={recurring} empty="Aucune dépense récurrente détaillée." />
          </section>
        </div>
        {a.budget.note && <p className="xsmall muted">{a.budget.note}</p>}

        <details className="od-card">
          <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 700, cursor: "pointer" }}>Modèle de référence et adaptation locale</summary>
          <div className="stack-sm" style={{ paddingTop: 8 }}>
            {a.references.length === 0 && <p className="muted">Aucune référence documentée.</p>}
            {a.references.map((r) => (
              <div key={r.nom} className="stack-sm">
                <div className="row"><strong>{r.nom}</strong><NatureBadge nature={r.nature} /></div>
                <p style={{ margin: 0 }}>{r.description}</p>
                {r.url_officielle && <a href={r.url_officielle} target="_blank" rel="noopener noreferrer">Site officiel <Icon name="ouvrir-externe" small /></a>}
                <p className="xsmall muted" style={{ margin: 0 }}>
                  {r.date_verification ? `Vérifié le ${new Date(r.date_verification).toLocaleDateString("fr-FR")}` : "Non vérifié"}
                </p>
                {r.sources.length > 0 && (
                  <ul className="small">{r.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.titre}</a> (consulté le {new Date(s.date_consultation).toLocaleDateString("fr-FR")})</li>)}</ul>
                )}
              </div>
            ))}
            <p className="small muted">S&apos;inspirer d&apos;un modèle économique ne signifie pas copier son code, son identité visuelle ou ses contenus.</p>
            <h3>Adaptation locale</h3>
            <p>{a.adaptation_locale}</p>
            {a.alternatives.length > 0 && (<><h3>Alternatives</h3><ul>{a.alternatives.map((x) => <li key={x}>{x}</li>)}</ul></>)}
            {a.hypotheses.length > 0 && (<><h3>Hypothèses à tester</h3><ul>{a.hypotheses.map((x) => <li key={x}>{x}</li>)}</ul></>)}
          </div>
        </details>

        <details className="od-card">
          <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 700, cursor: "pointer" }}>Outils, rôle de l&apos;IA et travail humain</summary>
          <div className="stack-sm" style={{ paddingTop: 8 }}>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Tableau défilant">
              <table className="data">
                <thead><tr><th>Outil</th><th>Rôle</th><th>Statut</th><th>Coût</th></tr></thead>
                <tbody>
                  {a.outils.map((o) => (
                    <tr key={o.nom}>
                      <td>{o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer">{o.nom}</a> : o.nom}</td>
                      <td>{o.role}</td><td>{o.obligatoire ? "Indispensable" : "Facultatif"}</td><td>{o.cout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Rôle de l&apos;IA</h3>
            <p><strong>Pour construire :</strong> {a.role_ia.construction}</p>
            <p><strong>Pour fonctionner :</strong> {a.role_ia.fonctionnement}</p>
            <h3>Préparation, exploitation et maintenance</h3>
            {a.exploitation.preparation && <p><strong>Préparation :</strong> {a.exploitation.preparation}</p>}
            {a.exploitation.exploitation && <p><strong>Exploitation :</strong> {a.exploitation.exploitation}</p>}
            {a.exploitation.maintenance && <p><strong>Maintenance :</strong> {a.exploitation.maintenance}</p>}
            {a.exploitation.travail_humain && <p><strong>Travail humain restant :</strong> {a.exploitation.travail_humain}</p>}
          </div>
        </details>

        <details className="od-card">
          <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 700, cursor: "pointer" }}>Test de la demande et risques</summary>
          <div className="stack-sm" style={{ paddingTop: 8 }}>
            <p>{a.test_demande.description}</p>
            <h3>Poursuivre si…</h3>
            <ul>{a.test_demande.criteres_poursuite.map((x) => <li key={x}>{x}</li>)}</ul>
            {a.test_demande.criteres_revision.length > 0 && (<><h3>Réviser si…</h3>
            <ul>{a.test_demande.criteres_revision.map((x) => <li key={x}>{x}</li>)}</ul></>)}
            {a.risques.length > 0 && (<><h3>Risques</h3><ul>{a.risques.map((x) => <li key={x}>{x}</li>)}</ul></>)}
            {a.limites && <p className="small muted">{a.limites}</p>}
          </div>
        </details>
      </section>

      <section id="etapes" className="stack" aria-labelledby="h-etapes">
        <h2 id="h-etapes">Étapes</h2>
        <ol className="steps-list">
          {project.outline.map((s, i) => (
            <li key={s.step_key}>
              <span className={`step-num${done.has(s.step_key) ? " done" : ""}`} aria-hidden="true">{done.has(s.step_key) ? "✓" : i + 1}</span>
              <span>{s.title}{done.has(s.step_key) && <span className="sr-only"> (validée)</span>}</span>
              {!allowed && <span style={{ marginLeft: "auto" }}><Icon name="verrou" small /><span className="sr-only">Réservé</span></span>}
            </li>
          ))}
        </ol>
        {viewer.userId && state.validated.length > 0 && (
          <p className="small muted">{state.validated.length} étape{state.validated.length > 1 ? "s" : ""} validée{state.validated.length > 1 ? "s" : ""} sur {project.outline.length}.</p>
        )}
      </section>

      <section id="configurations" className="stack" aria-labelledby="h-config">
        <h2 id="h-config">Configurations et prompts</h2>
        {allowed ? (
          <div className="stack-sm">
            <p>Le kit rassemble le prompt de cadrage, les configurations utiles, un prompt par étape et le résumé de transmission. Les prompts s&apos;utilisent dans l&apos;outil IA de votre choix.</p>
            <StartButton projectId={project.id} slug={project.slug} started={Boolean(state.started)} loggedIn={Boolean(viewer.userId)} />
            <Link className="od-button od-button--secondary od-button--block" href={`/projets/${project.slug}/kit`}>
              <Icon name="reglages" /> Configurations &amp; prompts
            </Link>
            {!viewer.userId && <p className="small muted">Vous pouvez consulter ce kit gratuit sans compte. <Link href={`/connexion?next=/projets/${project.slug}/kit`}>Connectez-vous</Link> pour enregistrer votre progression.</p>}
          </div>
        ) : (
          <AccessOffer contact={contact} loggedIn={Boolean(viewer.userId)} />
        )}
      </section>

      <section id="resultats" className="stack" aria-labelledby="h-resultats">
        <h2 id="h-resultats">Résultats et fichiers</h2>
        {a.livrables.length === 0 ? <p className="muted">Aucun livrable listé.</p> : (
          <ul className="steps-list">
            {a.livrables.map((l) => (
              <li key={l.nom}><Icon name="document" /><span><strong>{l.nom}</strong> · {l.format}</span><span className="od-badge od-badge--neutral" style={{ marginLeft: "auto" }}>À produire</span></li>
            ))}
          </ul>
        )}
      </section>

      <footer className="xsmall muted stack-sm">
        <p style={{ margin: 0 }}>Version {project.contentVersion} · {project.verifiedAt ? `Dernière vérification le ${new Date(project.verifiedAt).toLocaleDateString("fr-FR")}` : "Contenu non vérifié"} · Mise à jour le {new Date(project.updatedAt).toLocaleDateString("fr-FR")}</p>
      </footer>
    </article>
  );
}

function BudgetLines({ lines, empty }: { lines: { libelle: string; min: number | null; max: number | null; recurrence: string; nature: "fait_verifie" | "estimation" | "hypothese" | "exemple"; hypothese?: string }[]; empty: string }) {
  if (lines.length === 0) return <p className="small muted" style={{ margin: 0 }}>{empty}</p>;
  return (
    <ul className="stack-sm small" style={{ paddingLeft: 18, margin: 0 }}>
      {lines.map((l) => (
        <li key={l.libelle}>
          {l.libelle} : <strong>{formatRange(l.min, l.max)}</strong> ({RECURRENCES[l.recurrence as keyof typeof RECURRENCES].toLowerCase()}) <NatureBadge nature={l.nature} />
          {l.hypothese && <span className="muted"> — {l.hypothese}</span>}
        </li>
      ))}
    </ul>
  );
}
