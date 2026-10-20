const SPRITE = "/assets/open-declic/04_Icones/sprite.svg";

export type IconName =
  | "explorer" | "favoris" | "projets" | "compte" | "fleche-droite" | "retour" | "chevron" | "copier" | "check"
  | "fermer" | "filtrer" | "ouvrir-externe" | "verrou" | "horloge" | "telecharger" | "document" | "image"
  | "donnees" | "deployer" | "domaine" | "aide" | "alerte" | "etapes" | "reglages" | "code" | "carte" | "mobile"
  | "notification" | "partager" | "boutique" | "palette" | "actualiser";

/** Icône du sprite du kit (24 × 24, currentColor). Décorative : le libellé est porté par le parent. */
export function Icon({ name, small = false }: { name: IconName; small?: boolean }) {
  return (
    <svg className={`od-icon${small ? " od-icon-sm" : ""}`} aria-hidden="true" focusable="false">
      <use href={`${SPRITE}#od-${name}`} />
    </svg>
  );
}
