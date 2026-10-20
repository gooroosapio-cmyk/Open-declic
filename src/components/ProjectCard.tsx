import Link from "next/link";
import { AI_USAGES, CLIENT_TYPES, COUNTRIES, DIFFICULTIES, EQUIPMENT, SKILLS, formatRange } from "@/lib/constants";
import type { ProjectSummary } from "@/lib/data";
import type { Reason } from "@/lib/filters";
import { CompareButton } from "./CompareButton";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";

const lbl = (d: Record<string, string>, keys: string[]) => keys.map((k) => d[k] ?? k).join(", ");

const DEFAULT_VISUAL: Record<string, string> = {
  "saas-app": "/assets/open-declic/03_Illustrations/05_configuration_outils.svg",
  site: "/assets/open-declic/03_Illustrations/03_boutique_modeles.svg",
  jeu: "/assets/open-declic/03_Illustrations/12_aide.svg",
};

export function AccessBadges({ p }: { p: Pick<ProjectSummary, "isFree" | "isDemo" | "status" | "contentLevel"> }) {
  return (
    <>
      {p.isDemo && <span className="od-badge od-badge--demo">Démonstration</span>}
      {p.contentLevel === "modele" ? (
        <span className="od-badge od-badge--neutral">Modèle</span>
      ) : (
        <>
          <span className="od-badge od-badge--complete">Fiche complète</span>
          {p.isFree ? <span className="od-badge od-badge--free">Gratuit</span> : <span className="od-badge"><Icon name="verrou" small />Accès complet</span>}
        </>
      )}
      {p.status !== "published" && <span className="od-badge od-badge--draft">{p.status === "draft" ? "Brouillon" : "Archivée"}</span>}
    </>
  );
}

export function ProjectCard({ p, categoryLabel, favorite, loggedIn, reasons }: {
  p: ProjectSummary; categoryLabel: string; favorite: boolean; loggedIn: boolean; reasons?: Reason[];
}) {
  return (
    <article className="od-card project-card od-enter">
      <div className="visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.visual?.url ?? DEFAULT_VISUAL[p.category] ?? "/assets/open-declic/03_Illustrations/01_hero_demarrer.svg"} alt="" width={640} height={480} loading="lazy" decoding="async" />
      </div>
      <div className="badges"><AccessBadges p={p} /></div>
      <div className="body">
        <p className="xsmall muted" style={{ margin: 0 }}>{[p.odNumber, categoryLabel, p.domain].filter(Boolean).join(" · ")}</p>
        <h3><Link href={`/projets/${p.slug}`}>{p.title}</Link></h3>
        <p className="small" style={{ margin: 0 }}>{p.summary}</p>
        {p.workName && <p className="xsmall" style={{ margin: 0 }}>Nom de travail : <strong>{p.workName}</strong></p>}
        {p.contentLevel === "modele" ? (
          <dl className="facts">
            <div><dt>Difficulté</dt><dd>{DIFFICULTIES[p.difficulty as keyof typeof DIFFICULTIES]}</dd></div>
            <div><dt>Client</dt><dd>{p.clientType ? CLIENT_TYPES[p.clientType as keyof typeof CLIENT_TYPES].split(" · ")[0] : "Non renseigné"}</dd></div>
            <div><dt>IA à l&apos;usage</dt><dd>{p.aiUsage ? AI_USAGES[p.aiUsage as keyof typeof AI_USAGES].replace("IA ", "").replace(" à l'usage", "") : "Non renseigné"}</dd></div>
            <div><dt>Preuve</dt><dd>{p.evidence ?? "Non renseigné"}</dd></div>
          </dl>
        ) : (
        <dl className="facts">
          <div><dt>Budget de lancement</dt><dd>{formatRange(p.launchBudget.min, p.launchBudget.max)}</dd></div>
          <div><dt>Dépenses mensuelles</dt><dd>{formatRange(p.monthlyCost.min, p.monthlyCost.max)}</dd></div>
          <div><dt>Temps par semaine</dt><dd>{formatRange(p.weeklyHours.min, p.weeklyHours.max, "h")}</dd></div>
          <div><dt>Difficulté</dt><dd>{DIFFICULTIES[p.difficulty as keyof typeof DIFFICULTIES]}</dd></div>
        </dl>
        )}
        {reasons && reasons.length > 0 && (
          <div className="notice notice--info small" style={{ position: "relative", zIndex: 1 }}>
            <div>
              <strong>Pourquoi ce projet ?</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {reasons.map((r) => <li key={r.text}>{r.text}</li>)}
              </ul>
            </div>
          </div>
        )}
        {p.contentLevel === "complete" && (
        <details className="more">
          <summary>Détails</summary>
          <dl className="facts" style={{ gridTemplateColumns: "1fr", paddingBottom: 8 }}>
            <div><dt>Compétences mobilisées</dt><dd>{lbl(SKILLS, p.skills)}</dd></div>
            <div><dt>Matériel nécessaire</dt><dd>{lbl(EQUIPMENT, p.equipment)}</dd></div>
            <div><dt>Pays étudiés</dt><dd>{lbl(COUNTRIES, p.countries)}</dd></div>
          </dl>
        </details>
        )}
        <div className="card-actions">
          <FavoriteButton projectId={p.id} title={p.title} initial={favorite} loggedIn={loggedIn} />
          <CompareButton slug={p.slug} title={p.title} />
        </div>
      </div>
    </article>
  );
}
