import Link from "next/link";
import { notFound } from "next/navigation";
import { addVisual, saveFicheJson, saveMainInfo, saveStep } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin/AdminForm";
import { ProjectControls } from "@/components/admin/ProjectControls";
import { RetireStepButton, VisualActions } from "@/components/admin/SmallActions";
import { exportFiches } from "@/lib/admin";
import { DIFFICULTIES } from "@/lib/constants";
import { getCategories } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const Field = ({ label, name, defaultValue, type = "text", hint, required = true }: { label: string; name: string; defaultValue?: string | number | null; type?: string; hint?: string; required?: boolean }) => (
  <label className="od-field">{label}{hint && <span className="hint">{hint}</span>}
    <input className="od-input" name={name} type={type} defaultValue={defaultValue ?? ""} required={required} />
  </label>
);
const Area = ({ label, name, defaultValue, rows = 4 }: { label: string; name: string; defaultValue?: string; rows?: number }) => (
  <label className="od-field">{label}<textarea className="od-input" name={name} rows={rows} defaultValue={defaultValue ?? ""} required /></label>
);
const Section = ({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <details className="od-card" open={open}>
    <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 700, cursor: "pointer" }}>{title}</summary>
    <div style={{ paddingTop: 12 }}>{children}</div>
  </details>
);

export default async function EditFiche({ params }: PageProps<"/admin/fiches/[slug]">) {
  const { slug } = await params;
  const [data, categories] = await Promise.all([exportFiches([slug]), getCategories()]);
  const entry = data.get(slug);
  if (!entry) notFound();
  const { fiche, status, isFree, retiredSteps } = entry;
  const supabase = await createClient();
  const { data: proj } = await supabase.from("projects").select("id").eq("slug", slug).single();
  const projectId = proj!.id as string;
  const f = fiche.filtres;

  return (
    <div className="stack">
      <div className="row-between">
        <div><p className="xsmall muted" style={{ margin: 0 }}><code>{slug}</code></p><h1>{fiche.titre}</h1></div>
        <div className="row">
          <Link className="od-button od-button--ghost od-button--small" href={`/projets/${slug}`}>Prévisualiser la fiche</Link>
          <Link className="od-button od-button--ghost od-button--small" href={`/projets/${slug}/kit`}>Prévisualiser le kit</Link>
        </div>
      </div>
      <ProjectControls id={projectId} slug={slug} status={status as "draft" | "published" | "archived"} isFree={isFree} />
      {status === "published" && <p className="notice notice--warn small">Fiche publiée : chaque enregistrement est visible immédiatement. Dépubliez-la pour préparer des changements importants.</p>}

      <Section title="Informations principales" open>
        <AdminForm action={saveMainInfo.bind(null, slug)} submitLabel="Enregistrer les informations">
          <Field label="Titre" name="titre" defaultValue={fiche.titre} />
          <Area label="Résumé" name="resume" defaultValue={fiche.resume} rows={3} />
          <label className="od-field">Catégorie
            <select className="od-input" name="categorie" defaultValue={fiche.categorie}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </label>
          <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))" }}>
            <Field label="Version du contenu" name="version" defaultValue={fiche.version} />
            <Field label="Date de vérification" name="date_verification" type="date" defaultValue={fiche.date_verification} required={false} />
            <label className="od-field">Difficulté
              <select className="od-input" name="niveau" defaultValue={fiche.difficulte.niveau}>
                {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <Area label="Explication de la difficulté" name="explication" defaultValue={fiche.difficulte.explication} rows={3} />
          <fieldset className="stack-sm">
            <legend>Fourchettes (laisser vide si inconnu — jamais 0 par défaut)</legend>
            <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))" }}>
              <Field label="Lancement min (FCFA)" name="bl_min" type="number" defaultValue={f.budget_lancement.min} required={false} />
              <Field label="Lancement max (FCFA)" name="bl_max" type="number" defaultValue={f.budget_lancement.max} required={false} />
              <Field label="Mensuel min (FCFA)" name="dm_min" type="number" defaultValue={f.depenses_mensuelles.min} required={false} />
              <Field label="Mensuel max (FCFA)" name="dm_max" type="number" defaultValue={f.depenses_mensuelles.max} required={false} />
              <Field label="Heures/semaine min" name="hh_min" type="number" defaultValue={f.heures_hebdo.min} required={false} />
              <Field label="Heures/semaine max" name="hh_max" type="number" defaultValue={f.heures_hebdo.max} required={false} />
            </div>
          </fieldset>
        </AdminForm>
      </Section>

      <Section title={`Étapes, prompts et modèles (${fiche.reserve.etapes.length})`}>
        <div className="stack">
          {fiche.reserve.etapes.map((s, i) => (
            <details key={s.id} className="od-card od-card--flat">
              <summary style={{ minHeight: 44, display: "flex", alignItems: "center", fontWeight: 600, cursor: "pointer" }}>{i + 1}. {s.titre} <code className="xsmall muted" style={{ marginLeft: 8 }}>{s.id}</code></summary>
              <div className="stack" style={{ paddingTop: 12 }}>
                <AdminForm action={saveStep.bind(null, slug, s.id)} submitLabel="Enregistrer l'étape">
                  <Field label="Titre" name="titre" defaultValue={s.titre} />
                  <Area label="Objectif" name="objectif" defaultValue={s.objectif} rows={2} />
                  <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
                    <Field label="Outil" name="outil_nom" defaultValue={s.outil.nom} />
                    <Field label="Lien officiel de l'outil (https)" name="outil_url" type="url" defaultValue={s.outil.url} required={false} />
                  </div>
                  <fieldset className="stack-sm">
                    <legend>Modèles conseillés (n&apos;indiquez que des modèles réellement testés)</legend>
                    <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
                      <Field label="Minimum : nom" name="min_nom" defaultValue={s.modeles.minimum.nom} required={false} />
                      <Field label="Minimum : note" name="min_note" defaultValue={s.modeles.minimum.note} required={false} />
                      <Field label="Recommandé : nom" name="rec_nom" defaultValue={s.modeles.recommande.nom} required={false} />
                      <Field label="Recommandé : note" name="rec_note" defaultValue={s.modeles.recommande.note} required={false} />
                      <Field label="Moins coûteux : nom" name="eco_nom" defaultValue={s.modeles.economique?.nom} required={false} />
                      <Field label="Moins coûteux : note" name="eco_note" defaultValue={s.modeles.economique?.note} required={false} />
                      <Field label="Date de vérification" name="date_verification" type="date" defaultValue={s.modeles.date_verification} required={false} />
                      <Field label="Source de la vérification" name="source" defaultValue={s.modeles.source} required={false} />
                    </div>
                  </fieldset>
                  <Field label="Titre de la console" name="prompt_titre" defaultValue={s.prompt.titre} />
                  <Area label="Mission (insérée dans les deux modes, sans crochets à remplir)" name="mission" defaultValue={s.prompt.mission} rows={5} />
                  <Area label="À quoi sert ce prompt ?" name="a_quoi_sert" defaultValue={s.prompt.a_quoi_sert} rows={2} />
                  <Area label="Comment l'utiliser ?" name="comment_utiliser" defaultValue={s.prompt.comment_utiliser} rows={3} />
                  <Area label="Méthode de vérification" name="verification" defaultValue={s.verification} rows={2} />
                </AdminForm>
                <RetireStepButton projectId={projectId} slug={slug} stepKey={s.id} retired={false} />
              </div>
            </details>
          ))}
          {retiredSteps.length > 0 && (
            <div className="notice notice--warn small">
              <p><strong>Étapes retirées</strong> (masquées, progression conservée) :</p>
              {retiredSteps.map((k) => (
                <div key={k} className="row"><code>{k}</code><RetireStepButton projectId={projectId} slug={slug} stepKey={k} retired /></div>
              ))}
            </div>
          )}
          <p className="small muted">Pour ajouter une étape ou modifier les prérequis, réglages, livrables et configurations : section « JSON complet » ou import.</p>
        </div>
      </Section>

      <Section title={`Visuels (${fiche.apercu.visuels.length})`}>
        <div className="stack">
          {fiche.apercu.visuels.map((v, i) => (
            <div key={v.url + i} className="row" style={{ alignItems: "flex-start" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.url} alt={v.alt} width={120} height={90} style={{ objectFit: "contain", background: "var(--od-peach)", borderRadius: 10 }} />
              <div className="stack-sm" style={{ flex: "1 1 200px" }}>
                <p className="small" style={{ margin: 0 }}><strong>Description :</strong> {v.alt}</p>
                {v.legende && <p className="xsmall muted" style={{ margin: 0 }}>{v.legende}</p>}
                <VisualActions slug={slug} index={i} isFirst={i === 0} />
              </div>
            </div>
          ))}
          <AdminForm action={addVisual.bind(null, slug)} submitLabel="Ajouter le visuel">
            <label className="od-field">Image (PNG, JPEG ou WebP, 4 Mo max)<input className="od-input" type="file" name="fichier" accept="image/png,image/jpeg,image/webp" required /></label>
            <Field label="Description accessible (texte alternatif)" name="alt" />
            <Field label="Légende (facultatif)" name="legende" required={false} />
          </AdminForm>
        </div>
      </Section>

      <Section title="JSON complet (avancé)">
        <AdminForm action={saveFicheJson.bind(null, slug)} submitLabel="Valider et enregistrer le JSON">
          <p className="small muted">Même format qu&apos;une fiche d&apos;import (docs/IMPORT.md). L&apos;identifiant stable ne peut pas changer. Le réglage gratuit/complet et le statut se gèrent en haut de page.</p>
          <textarea className="od-input od-code" name="json" rows={24} defaultValue={JSON.stringify(fiche, null, 2)} spellCheck={false} aria-label="JSON de la fiche" />
        </AdminForm>
      </Section>
    </div>
  );
}
