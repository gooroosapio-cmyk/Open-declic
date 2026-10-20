import { ChoiceHelper } from "@/components/ChoiceHelper";
import { getCategories } from "@/lib/data";

export const metadata = { title: "Aide-moi à choisir" };

export default async function Page() {
  const categories = await getCategories();
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <h1>Aide-moi à choisir</h1>
      <p className="muted">
        Cinq questions facultatives. Vos réponses deviennent des filtres du catalogue : chaque projet affiché indique quels critères il respecte, et vous pouvez tout modifier ensuite. Aucun score de réussite ou de rentabilité n&apos;est calculé.
      </p>
      <ChoiceHelper categories={categories} />
    </div>
  );
}
