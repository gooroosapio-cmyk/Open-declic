"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIFFICULTIES, EQUIPMENT, SKILLS } from "@/lib/constants";
import { EMPTY_FILTERS, filtersToParams, type Filters } from "@/lib/filters";

const BUDGETS: [string, number | null][] = [["Je ne sais pas", null], ["Aucun budget", 0], ["Moins de 25 000 FCFA", 25000], ["Moins de 50 000 FCFA", 50000], ["Moins de 100 000 FCFA", 100000], ["Moins de 250 000 FCFA", 250000]];
const HOURS: [string, number | null][] = [["Je ne sais pas", null], ["Moins de 3 h", 3], ["Jusqu'à 5 h", 5], ["Jusqu'à 10 h", 10], ["Jusqu'à 20 h", 20]];

/**
 * Questionnaire déterministe : les réponses deviennent des filtres du catalogue,
 * modifiables ensuite. Aucun score ni IA.
 */
export function ChoiceHelper({ categories }: { categories: { slug: string; label: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState<Filters>({ ...EMPTY_FILTERS });
  const toggle = (key: "competences" | "materiel", v: string) =>
    setF((s) => ({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] }));

  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); router.push(`/?${filtersToParams(f, "pertinence", { depuis: "aide" })}`); }}>
      <fieldset>
        <legend>1. Quel budget pouvez-vous consacrer au lancement ?</legend>
        <div className="chips">
          {BUDGETS.map(([label, v]) => (
            <label className="chip" key={label}><input type="radio" name="budget" checked={f.budget === v} onChange={() => setF({ ...f, budget: v })} /><span>{label}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>2. Combien de temps par semaine ?</legend>
        <div className="chips">
          {HOURS.map(([label, v]) => (
            <label className="chip" key={label}><input type="radio" name="heures" checked={f.heures === v} onChange={() => setF({ ...f, heures: v })} /><span>{label}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>3. Quelles compétences aimeriez-vous mobiliser ?</legend>
        <p className="xsmall muted">Plusieurs choix possibles. Laissez vide si vous ne savez pas.</p>
        <div className="chips">
          {Object.entries(SKILLS).map(([k, v]) => (
            <label className="chip" key={k}><input type="checkbox" checked={f.competences.includes(k)} onChange={() => toggle("competences", k)} /><span>{v}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>4. De quel matériel disposez-vous ?</legend>
        <div className="chips">
          {Object.entries(EQUIPMENT).map(([k, v]) => (
            <label className="chip" key={k}><input type="checkbox" checked={f.materiel.includes(k)} onChange={() => toggle("materiel", k)} /><span>{v}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>5. Vos préférences</legend>
        <div className="grid-cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
          <label className="od-field">Type de projet
            <select className="od-input" value={f.categorie ?? ""} onChange={(e) => setF({ ...f, categorie: e.target.value || null })}>
              <option value="">Indifférent</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </label>
          <label className="od-field">Difficulté maximale
            <select className="od-input" value={f.niveau ?? ""} onChange={(e) => setF({ ...f, niveau: (e.target.value || null) as Filters["niveau"] })}>
              <option value="">Indifférent</option>
              {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <label className="check"><input type="checkbox" checked={f.complete} onChange={(e) => setF({ ...f, complete: e.target.checked })} /> Seulement les fiches complètes (étapes et prompts disponibles)</label>
        <label className="check"><input type="checkbox" checked={f.gratuit} onChange={(e) => setF({ ...f, gratuit: e.target.checked })} /> Fiches gratuites seulement</label>
        <label className="check"><input type="checkbox" checked={f.inconnus} onChange={(e) => setF({ ...f, inconnus: e.target.checked })} /> Inclure les projets dont une donnée n&apos;est pas encore renseignée</label>
      </fieldset>
      <button type="submit" className="od-button od-button--block">Voir les projets correspondants</button>
    </form>
  );
}
