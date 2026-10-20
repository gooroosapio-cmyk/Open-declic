"use client";
import { useState } from "react";
import { COMPARE_MAX, useCompare } from "./compare-store";

export function CompareButton({ slug, title }: { slug: string; title: string }) {
  const compare = useCompare();
  const [message, setMessage] = useState<string | null>(null);
  const selected = compare.has(slug);
  const onClick = () => {
    setMessage(null);
    if (selected) {
      compare.remove(slug);
      setMessage("Retiré de la comparaison.");
    } else if (compare.add(slug)) {
      setMessage(`Ajouté à la comparaison (${compare.ids.length + 1}/${COMPARE_MAX}).`);
    } else {
      setMessage(`Limite atteinte : ${COMPARE_MAX} projets maximum. Retirez-en un dans Comparer.`);
    }
  };
  return (
    <span className="stack-sm" style={{ gap: 2 }}>
      <button type="button" className="od-button od-button--ghost od-button--small" aria-pressed={selected} onClick={onClick}>
        {selected ? "✓ Comparé" : "Comparer"}<span className="sr-only"> : {title}</span>
      </button>
      <span role="status" aria-live="polite" className="xsmall muted">{message}</span>
    </span>
  );
}
