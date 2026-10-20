import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessOffer } from "@/components/AccessOffer";
import { Icon } from "@/components/Icon";
import { Markdown } from "@/components/Markdown";
import { PromptConsole } from "@/components/PromptConsole";
import { StepValidation } from "@/components/StepValidation";
import { canReadReserved, getProject, getReserved, getSetting, getUserProjectState, getViewer, toPromptContext } from "@/lib/data";
import { buildKitPrompt, buildStepPrompt } from "@/lib/prompt-builder";

export async function generateMetadata({ params }: PageProps<"/projets/[slug]/kit">) {
  const p = await getProject((await params).slug);
  return { title: p ? `Kit · ${p.title}` : "Kit introuvable" };
}

export default async function KitPage({ params }: PageProps<"/projets/[slug]/kit">) {
  const { slug } = await params;
  const [project, viewer] = await Promise.all([getProject(slug), getViewer()]);
  if (!project) notFound();

  const back = (
    <Link href={`/projets/${slug}`} className="row small" style={{ gap: 4, minHeight: 44 }}>
      <Icon name="retour" small /> Retour à la fiche
    </Link>
  );

  if (project.contentLevel === "modele") {
    return (
      <div className="stack">
        {back}
        <h1>{project.title}</h1>
        <p className="notice notice--info">Cahier de construction en préparation : ce modèle n&apos;a pas encore d&apos;étapes ni de prompts. <Link href="/?niveau_contenu=complete">Voir les fiches complètes</Link>.</p>
      </div>
    );
  }

  // Contrôle côté serveur : un visiteur non autorisé ne déclenche même pas la lecture.
  if (!canReadReserved(project, viewer)) {
    const contact = (await getSetting<{ texte: string }>("acces_contact"))?.texte || null;
    return (
      <div className="stack">
        {back}
        <h1>{project.title}</h1>
        <AccessOffer contact={contact} loggedIn={Boolean(viewer.userId)} />
      </div>
    );
  }

  // Double contrôle : la base (RLS) renvoie null si l'accès n'est pas autorisé.
  const reserved = await getReserved(project.id);
  if (!reserved) {
    return (
      <div className="stack">
        {back}
        <p className="notice notice--error" role="alert">Ce kit n&apos;est pas accessible avec votre compte.</p>
      </div>
    );
  }

  const state = await getUserProjectState(project.id, viewer);
  const ctx = toPromptContext(project);
  const done = new Set(state.validated);
  const total = reserved.steps.length;
  const doneCount = reserved.steps.filter((s) => done.has(s.step_key)).length;
  const nextStep = reserved.steps.find((s) => !done.has(s.step_key));
  const loginHref = viewer.userId ? null : `/connexion?next=/projets/${slug}/kit`;
  const { kit } = reserved;

  return (
    <div className="stack" style={{ gap: 28 }}>
      {back}
      <header className="stack-sm">
        <p className="small muted" style={{ margin: 0 }}>Configurations &amp; prompts</p>
        <h1>{project.title}</h1>
        {project.status !== "published" && <p className="notice notice--warn">Aperçu administrateur d&apos;une fiche non publiée.</p>}
        {viewer.userId ? (
          <div className="stack-sm">
            <p style={{ margin: 0 }}>{doneCount} étape{doneCount > 1 ? "s" : ""} validée{doneCount > 1 ? "s" : ""} sur {total}</p>
            <progress className="od-progress" value={doneCount} max={Math.max(1, total)} aria-label="Progression du projet" />
            {nextStep ? (
              <a className="od-button" href={`#etape-${nextStep.step_key}`}>Continuer : {nextStep.titre} <Icon name="fleche-droite" /></a>
            ) : (
              <p className="notice notice--success">Toutes les étapes sont validées.</p>
            )}
          </div>
        ) : (
          <p className="notice notice--info small">Vous consultez ce kit sans compte. <Link href={loginHref!}>Connectez-vous</Link> pour enregistrer votre progression.</p>
        )}
        <p className="small muted">Open declic ne génère rien : copiez chaque prompt dans l&apos;outil IA de votre choix. Copier un prompt ne valide pas une étape ; validez-la vous-même quand le résultat est vérifié.</p>
      </header>

      <nav aria-label="Plan du kit" className="od-card">
        <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
          {(kit.dossier_md || kit.cahier_md) && <li><a href="#dossier">Dossier de la fiche</a></li>}
          <li><a href="#cadrage">Prompt initial de cadrage</a></li>
          {kit.configurations.length > 0 && <li><a href="#configurations">Configurations utiles</a></li>}
          {reserved.steps.map((s) => (
            <li key={s.step_key}><a href={`#etape-${s.step_key}`}>{s.titre}</a>{done.has(s.step_key) && " ✓"}</li>
          ))}
          <li><a href="#transmission">Résumé de transmission</a></li>
        </ol>
      </nav>

      {(kit.dossier_md || kit.cahier_md || kit.socle_md) && (
        <section id="dossier" className="stack" aria-labelledby="h-dossier">
          <h2 id="h-dossier">Dossier de la fiche</h2>
          {kit.dossier_md && (
            <div className="od-card stack-sm">
              <p style={{ margin: 0 }}>Les prompts demandent de joindre ce dossier à l&apos;outil IA : il contient la fiche, le socle commun et les références techniques.</p>
              <a className="od-button" href={`/projets/${slug}/kit/dossier`} download>
                <Icon name="telecharger" /> Télécharger le dossier (.md)
              </a>
            </div>
          )}
          {kit.cahier_md && (
            <details className="od-card">
              <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 700, cursor: "pointer" }}>Cahier de construction : écrans, données, sécurité et recette</summary>
              <div style={{ paddingTop: 8 }}><Markdown>{kit.cahier_md}</Markdown></div>
            </details>
          )}
          {kit.socle_md && (
            <details className="od-card">
              <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 700, cursor: "pointer" }}>Socle commun : hypothèses, rôles des IA, sécurité, paiement Visa, mise en ligne</summary>
              <div style={{ paddingTop: 8 }}><Markdown>{kit.socle_md}</Markdown></div>
            </details>
          )}
        </section>
      )}

      <section id="cadrage" className="stack" aria-labelledby="h-cadrage">
        <h2 id="h-cadrage">1. Cadrer le projet</h2>
        <PromptConsole
          title={kit.prompt_cadrage.titre}
          texts={{
            personnaliser: buildKitPrompt(ctx, kit.prompt_cadrage, "personnaliser", "cadrage"),
            laisser_choisir: buildKitPrompt(ctx, kit.prompt_cadrage, "laisser_choisir", "cadrage"),
          }}
          purpose={kit.prompt_cadrage.a_quoi_sert}
          usage={kit.prompt_cadrage.comment_utiliser}
        />
      </section>

      {kit.configurations.length > 0 && (
        <section id="configurations" className="stack" aria-labelledby="h-configs">
          <h2 id="h-configs">2. Configurations utiles</h2>
          <p className="small muted">Ces services ne sont nécessaires que pour ce projet. Ne collez jamais une clé secrète dans une conversation IA.</p>
          {kit.configurations.map((c) => (
            <details key={c.nom} className="od-card">
              <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 700, cursor: "pointer" }}>{c.nom}</summary>
              <div className="stack-sm" style={{ paddingTop: 8 }}>
                <p><strong>À quoi ça sert :</strong> {c.role}</p>
                {c.lien && <a href={c.lien} target="_blank" rel="noopener noreferrer">Site officiel <Icon name="ouvrir-externe" small /></a>}
                <ol>{c.etapes.map((e) => <li key={e}>{e}</li>)}</ol>
                <p className="notice notice--info small"><span><strong>Vérification :</strong> {c.verification}</span></p>
              </div>
            </details>
          ))}
        </section>
      )}

      {reserved.steps.map((s, i) => (
        <section key={s.step_key} id={`etape-${s.step_key}`} className="stack" aria-labelledby={`h-${s.step_key}`} style={{ scrollMarginTop: 120 }}>
          <div className="row">
            <span className={`step-num${done.has(s.step_key) ? " done" : ""}`} aria-hidden="true">{done.has(s.step_key) ? "✓" : i + 1}</span>
            <h2 id={`h-${s.step_key}`} style={{ margin: 0 }}>Étape {i + 1} · {s.titre}</h2>
          </div>
          <div className="od-card stack-sm">
            <p style={{ margin: 0 }}><strong>Objectif :</strong> {s.objectif}</p>
            {s.prerequis.length > 0 && (<div><strong>Prérequis :</strong><ul style={{ margin: "4px 0 0" }}>{s.prerequis.map((p) => <li key={p}>{p}</li>)}</ul></div>)}
            {s.reglages.length > 0 && (
              <details>
                <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 600, cursor: "pointer", color: "var(--od-action)" }}>Réglages utiles</summary>
                <ul>{s.reglages.map((r) => <li key={r}>{r}</li>)}</ul>
              </details>
            )}
          </div>
          <PromptConsole
            title={s.prompt.titre}
            tool={s.outil}
            models={s.modeles}
            texts={{
              personnaliser: buildStepPrompt(ctx, s, i + 1, total, "personnaliser"),
              laisser_choisir: buildStepPrompt(ctx, s, i + 1, total, "laisser_choisir"),
            }}
            purpose={s.prompt.a_quoi_sert}
            usage={s.prompt.comment_utiliser}
          />
          <div className="od-card stack-sm">
            <p style={{ margin: 0 }}><strong>Résultat attendu :</strong> {s.resultat_attendu.description}</p>
            <p style={{ margin: 0 }}><strong>Format :</strong> {s.resultat_attendu.format}</p>
            <p style={{ margin: 0 }}><strong>Comment vérifier :</strong> {s.verification}</p>
            {s.livrables.length > 0 && (
              <p style={{ margin: 0 }}><strong>Livrables :</strong> {s.livrables.map((l) => `${l.nom} (${l.format})`).join(", ")} — à produire.</p>
            )}
            <p style={{ margin: 0 }}><strong>Étape suivante :</strong> {s.etape_suivante}</p>
          </div>
          <StepValidation projectId={project.id} stepKey={s.step_key} initial={done.has(s.step_key)} loginHref={loginHref} />
        </section>
      ))}

      <section id="transmission" className="stack" aria-labelledby="h-transmission">
        <h2 id="h-transmission">Résumé de transmission</h2>
        <p className="small muted">À utiliser quand une conversation devient longue ou pour changer d&apos;outil IA. Le résumé ne doit contenir aucun mot de passe ni clé.</p>
        <PromptConsole
          title={kit.resume_transmission.titre}
          texts={{
            personnaliser: buildKitPrompt(ctx, kit.resume_transmission, "personnaliser", "transmission"),
            laisser_choisir: buildKitPrompt(ctx, kit.resume_transmission, "laisser_choisir", "transmission"),
          }}
          purpose={kit.resume_transmission.a_quoi_sert}
          usage={kit.resume_transmission.comment_utiliser}
        />
      </section>

      {kit.ressources.length > 0 && (
        <section className="stack-sm" aria-labelledby="h-ressources">
          <h2 id="h-ressources">Ressources</h2>
          <ul>{kit.ressources.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.titre}</a> — {r.description}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
