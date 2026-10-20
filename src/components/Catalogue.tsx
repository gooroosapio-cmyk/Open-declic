"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AI_USAGES, CLIENT_TYPES, COUNTRIES, DIFFICULTIES, EQUIPMENT, EVIDENCE, SKILLS } from "@/lib/constants";
import type { ProjectSummary } from "@/lib/data";
import { activeFilterCount, EMPTY_FILTERS, evaluate, filtersToParams, parseFilters, SORTS, sortItems, type Filters, type SortKey } from "@/lib/filters";
import { Icon } from "./Icon";
import { ProjectCard } from "./ProjectCard";

const BUDGETS = [0, 25000, 50000, 100000, 250000, 500000];
const MONTHLY = [0, 5000, 10000, 25000, 50000];
const HOURS = [3, 5, 10, 20];
const PAGE = 24;

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
  // L'URL est mise à jour avec un léger décalage après replaceState : on ne resynchronise
  // l'état que si l'URL observée change vers une valeur qui n'est pas la nôtre (navigation externe).
  const [seenQs, setSeenQs] = useState(spStr);
  if (spStr !== seenQs) {
    setSeenQs(spStr);
    if (spStr !== state.qs) setState({ qs: spStr, ...parseFilters(new URLSearchParams(spStr)) });
  }
  const { filters, sort } = state;
  const [shown, setShown] = useState(PAGE);
  const domains = useMemo(() => [...new Set(items.map((p) => p.domain).filter((d): d is string => Boolean(d)))].sort((a, b) => a.localeCompare(b, "fr")), [items]);
  const fromHelper = sp.get("depuis") === "aide";
  const catLabel = (s: string) => categories.find((c) => c.slug === s)?.label ?? s;

  const update = (patch: Partial<Filters>, nextSort: SortKey = sort) => {
    const extra: Record<string, string> = fromHelper ? { depuis: "aide" } : {};
    const next = { ...filters, ...patch };
    const qs = filtersToParams(next, nextSort, extra).toString();
    setState({ qs, filters: next, sort: nextSort });
    setShown(PAGE);
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
  // Projets écartés uniquement faute de donnée : ils deviendraient visibles avec l'option « inconnus ».
  const unknownExcluded = filters.inconnus ? 0 : evaluated.filter((e) => !e.match && e.unknown && evaluate(e.p, { ...filters, inconnus: true }, catLabel).match).length;
  const count = activeFilterCount(filters);
  const fav = new Set(favoriteIds);
  // Sans filtre ni recherche : les fiches complètes sont mises en avant au-dessus des modèles.
  const showcase = count === 0 && !filters.q && sort === "pertinence";
  const featured = matches.filter((p) => p.featured);
  const others = matches.filter((p) => !p.featured);

  const renderGrid = (list: typeof matches) => (
    <div className="stack">
      <div className="grid-cards">
        {list.slice(0, shown).map((p) => (
          <ProjectCard key={p.id} p={p} categoryLabel={catLabel(p.category)} favorite={fav.has(p.id)} loggedIn={loggedIn}
            reasons={fromHelper && count > 0 ? p._reasons : undefined} />
        ))}
      </div>
      {list.length > shown && (
        <button type="button" className="od-button od-button--secondary" style={{ justifySelf: "center" }} onClick={() => setShown(shown + PAGE)}>
          Afficher plus ({list.length - shown} restant{list.length - shown > 1 ? "s" : ""})
        </button>
      )}
    </div>
  );

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
                <label className="od-field">Domaine
                  <select className="od-input" value={filters.domaine ?? ""} onChange={(e) => update({ domaine: e.target.value || null })}>
                    <option value="">Tous</option>
                    {domains.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
                <label className="od-field">Client
                  <select className="od-input" value={filters.client ?? ""} onChange={(e) => update({ client: e.target.value || null })}>
                    <option value="">Tous</option>
                    {Object.entries(CLIENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="od-field">IA à l&apos;usage
                  <select className="od-input" value={filters.ia ?? ""} onChange={(e) => update({ ia: e.target.value || null })}>
                    <option value="">Indifférent</option>
                    {Object.entries(AI_USAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="od-field">Niveau de preuve
                  <select className="od-input" value={filters.preuve ?? ""} onChange={(e) => update({ preuve: e.target.value || null })}>
                    <option value="">Tous</option>
                    {Object.entries(EVIDENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                <input type="checkbox" checked={filters.complete} onChange={(e) => update({ complete: e.target.checked })} />
                Fiches complètes seulement (étapes et prompts)
              </label>
              <label className="check">
                <input type="checkbox" checked={filters.gratuit} onChange={(e) => update({ gratuit: e.target.checked })} />
                Fiches gratuites seulement
              </label>
              <label className="check">
                <input type="checkbox" checked={filters.inconnus} onChange={(e) => update({ inconnus: e.target.checked })} />
                Inclure les projets dont la donnée filtrée n&apos;est pas renseignée
              </label>
              <p className="xsmall muted" style={{ margin: 0 }}>Une donnée non renseignée n&apos;est jamais comptée comme nulle. Par défaut, ces projets sont masqués par les filtres de budget, temps, compétences et matériel ; cochez la case pour les afficher avec la mention « à vérifier ».</p>
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
          {unknownExcluded > 0 && (
            <button type="button" className="link-button small" onClick={() => update({ inconnus: true })}>Les afficher aussi</button>
          )}
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
          <p className="muted">Élargissez un critère : budget, temps ou matériel par exemple.{unknownExcluded > 0 && ` ${unknownExcluded} projet${unknownExcluded > 1 ? "s ont" : " a"} une donnée non renseignée.`}</p>
          <button type="button" className="od-button od-button--secondary" onClick={() => update(EMPTY_FILTERS)}>Effacer les filtres</button>
        </div>
      ) : showcase ? (
        <>
          <section className="stack" aria-labelledby="h-completes">
            <div className="stack-sm">
              <h2 id="h-completes">Fiches complètes, prêtes à construire</h2>
              <p className="muted small" style={{ margin: 0 }}>
                {featured.length} cahiers de construction avec étapes, prompts à copier, configurations et recette.
              </p>
            </div>
            <div className="grid-cards">
              {featured.map((p) => (
                <ProjectCard key={p.id} p={p} categoryLabel={catLabel(p.category)} favorite={fav.has(p.id)} loggedIn={loggedIn} />
              ))}
            </div>
          </section>
          <section className="stack" aria-labelledby="h-modeles">
            <div className="stack-sm">
              <h2 id="h-modeles">Tous les modèles du catalogue</h2>
              <p className="muted small" style={{ margin: 0 }}>
                {others.length} modèles existants ou propositions à adapter. Leur cahier de construction est en préparation.
              </p>
            </div>
            {renderGrid(others)}
          </section>
        </>
      ) : (
        renderGrid(matches)
      )}
    </div>
  );
}
