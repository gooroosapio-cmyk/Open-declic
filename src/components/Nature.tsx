import { NATURES, type Nature } from "@/lib/constants";

const CLASS: Record<Nature, string> = {
  fait_verifie: "od-badge od-badge--free",
  estimation: "od-badge od-badge--neutral",
  hypothese: "od-badge od-badge--draft",
  exemple: "od-badge od-badge--demo",
};

/** Étiquette distinguant fait vérifié, estimation, hypothèse et exemple. */
export function NatureBadge({ nature }: { nature: Nature }) {
  return <span className={CLASS[nature]}>{NATURES[nature]}</span>;
}
