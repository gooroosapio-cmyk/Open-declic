"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { COUNTRIES, DIFFICULTIES, EQUIPMENT, SKILLS } from "@/lib/constants";
import type { ProjectSummary } from "@/lib/data";
import { activeFilterCount, EMPTY_FILTERS, evaluate, filtersToParams, parseFilters, SORTS, sortItems, type Filters, type SortKey } from "@/lib/filters";
import { Icon } from "./Icon";
import { ProjectCard } from "./ProjectCard";

const BUDGETS = [0, 25000, 50000, 100000, 250000, 500000];
const MONTHLY = [0, 5000, 10000, 25000, 50000];
const HOURS = [3, 5, 10, 20];

export function Catalogue({ items, categories, favoriteIds, loggedIn }: {
  items: ProjectSummary[];
  categories: { slug: string; label: string }[];
  favoriteIds: string[];
  loggedIn: boolean;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  // État local immédiat, synchronisé avec l'URL (partageable, retour arrière).
  const spStr = sp.toString();
  const [state, setState] = useState(() => ({ qs: spStr, ...parseFilters(new URLSearchParams(spStr)) }));
  if (spStr !== state.qs) setState({ qs: spStr, ...parseFilters(new URLSearchParams(spStr)) }); // navigation externe
  const { filters, sort } = state;
  const fromHelper = sp.get("depuis") === "aide";
  const catLabel = (s: string) => categories.find((c) => c.slug === s)?.label ?? s;

  const update = (patch: Partial<Filters>, nextSort: SortKey = sort) => {
    const extra: Record<string, string> = fromHelper ? { depuis: "aide" } : {};
    const next = { ...filters, ...patch };
    const qs = filtersToParams(next, nextSort, extra).toString();
    setState({ qs, filters: next, sort: nextSort });
    // Mise à jour de l'URL côté navigateur (synchronisée avec useSearchParams), sans requête serveur.
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const evaluated = useMemo(
    () => items.map((p) => ({ p, ...evaluate(p, filters, catLabel) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filters, categories],
  );
  const matches = sortItems(evaluated.filter((e) => e.match).map((e) => ({ ...e.p, _reasons: e.reasons })), sort);
  const unknownExcluded = evaluated.filter((e) => !e.match && e.unknown).length;
  const count = activeFilterCount(filters);
  const fav = new Set(favoriteIds);

  return (
    <div className="stack">
      <form className="stack" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="od-field">
          <span className="sr-only">Rechercher un projet</span>
          <input className="od-input" type="search" placeholder="Rechercher un projet, un secteur…" value={filters.q}
            onChange={(e) => update({ q: e.target.value })} />
        </label>
        <div className="row-between">
          <details className="od-card" style={{ padding: "4px 16px", flex: "1 1 100%" }} open={fromHelper || undefined}>
            <summary style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}>
              <Icon name="filtrer" /> Filtres{count > 0 && ` (${count} actif${count > 1 ? "s" : ""})`}
            </summary>
            <div className="stack" style={{ padding: "8px 0 16px" }}>
              <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
                <label className="od-field">Budget de lancement disponible
                  <select className="od-input" value={filters.budget ?? ""} onChange={(e) => update({ budget: e.target.value === "" ? null : Number(e.target.value) })}>
                    <option value="">Indifférent</option>
                    {BUDGETS.map((b) => <option key={b} value={b}>{b === 0 ? "Aucun budget" : `Jusqu'à ${b.toLocaleString("fr-FR")} FCFA`}</option>)}
                  </select>
                </label>
                <label className="od-field">Dépenses mensuelles acceptables
                  <select className="od-input" value={filters.mensuel ?? ""} onChange={(e) => update({ mensuel: e.target.value === "" ? null : Number(e.target.value) })}>
                    <option value="">Indifférent</option>
                    {MONTHLY.map((b) => <option key={b} value={b}>{b === 0 ? "Aucune dépense" : `Jusqu'à ${b.toLocaleString("fr-FR")} FCFA`}</option>)}
                  </select>
                </label>
                <label className="od-field">Temps disponible par semaine
                  <select className="od-input" value={filters.heures ?? ""} onChange={(e) => update({ heures: e.target.value === "" ? null : Number(e.target.value) })}>
                    <option value="">Indifférent</option>
                    {HOURS.map((h) => <option key={h} value={h}>{`Jusqu'à ${h} h`}</option>)}
                  </select>
                </label>
                <label className="od-field">Difficulté maximale
                  <select className="od-input" value={filters.niveau ?? ""} onChange={(e) => update({ niveau: (e.target.value || null) as Filters["niveau"] })}>
                    <option value="">Indifférent</option>
                    {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="od-field">Catégorie
                  <select className="od-input" value={filters.categorie ?? ""} onChange={(e) => update({ categorie: e.target.value || null })}>
                    <option value="">Toutes</option>
                    {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                  </select>
                </label>
                <label className="od-field">Pays étudié
                  <select className="od-input" value={filters.pays ?? ""} onChange={(e) => update({ pays: e.target.value || null })}>
                    <option value="">Tous</option>
                    {Object.entries(COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              </div>
              <fieldset>
                <legend>Compétences mobilisées</legend>
                <div className="chips">
                  {Object.entries(SKILLS).map(([k, v]) => (
                    <label className="chip" key={k}>
                      <input type="checkbox" checked={filters.competences.includes(k)} onChange={() => update({ competences: toggleIn(filters.competences, k) })} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Matériel dont vous disposez</legend>
                <p className="xsmall muted">Seuls les projets réalisables avec ce matériel sont affichés.</p>
                <div className="chips">
                  {Object.entries(EQUIPMENT).map(([k, v]) => (
                    <label className="chip" key={k}>
                      <input type="checkbox" checked={filters.materiel.includes(k)} onChange={() => update({ materiel: toggleIn(filters.materiel, k) })} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="check">
                <input type="checkbox" checked={filters.gratuit} onChange={(e) => update({ gratuit: e.target.checked })} />
                Fiches gratuites seulement
              </label>
              {count > 0 && (
                <button type="button" className="link-button" onClick={() => update(EMPTY_FILTERS)}>Effacer les filtres</button>
              )}
            </div>
          </details>
        </div>
        <div className="row-between">
          <p className="small muted" role="status" aria-live="polite" style={{ margin: 0 }}>
            {matches.length} projet{matches.length > 1 ? "s" : ""}
            {unknownExcluded > 0 && ` · ${unknownExcluded} masqué${unknownExcluded > 1 ? "s" : ""} faute de donnée renseignée`}
          </p>
          <label className="row small" style={{ gap: 8 }}>
            Trier
            <select className="od-input" style={{ width: "auto", minHeight: 44 }} value={sort} onChange={(e) => update({}, e.target.value as SortKey)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
      </form>

      {fromHelper && count > 0 && (
        <p className="notice notice--info small">
          Résultats filtrés selon vos réponses. Chaque carte explique les critères vérifiés. Vous pouvez modifier les filtres ci-dessus ou{" "}
          <Link href="/aide-choix">reprendre le questionnaire</Link>. Aucun score de réussite n&apos;est calculé.
        </p>
      )}

      {matches.length === 0 ? (
        <div className="empty od-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/open-declic/03_Illustrations/12_aide.svg" alt="" width={640} height={480} />
          <h2>Aucun projet ne correspond</h2>
          <p className="muted">Élargissez un critère : budget, temps ou matériel par exemple.</p>
          <button type="button" className="od-button od-button--secondary" onClick={() => update(EMPTY_FILTERS)}>Effacer les filtres</button>
        </div>
      ) : (
        <div className="grid-cards">
          {matches.map((p) => (
            <ProjectCard key={p.id} p={p} categoryLabel={catLabel(p.category)} favorite={fav.has(p.id)} loggedIn={loggedIn}
              reasons={fromHelper && count > 0 ? p._reasons : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
