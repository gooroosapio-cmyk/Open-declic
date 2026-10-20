"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { safeAction } from "./safe-action";
import { setFavorite } from "@/app/actions/user";
import { Icon } from "./Icon";

/** L'état « enregistré » ne change qu'après confirmation du serveur. */
export function FavoriteButton({ projectId, title, initial, loggedIn, withLabel = false }: {
  projectId: string; title: string; initial: boolean; loggedIn: boolean; withLabel?: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!loggedIn) {
    return (
      <Link className={withLabel ? "od-button od-button--ghost od-button--small" : "od-icon-button"} href="/connexion" aria-label={`Se connecter pour enregistrer ${title}`}>
        <Icon name="favoris" />{withLabel && "Enregistrer"}
      </Link>
    );
  }
  const toggle = () =>
    start(async () => {
      setError(null);
      const r = await safeAction(() => setFavorite(projectId, !saved));
      if (r.ok) setSaved(!saved);
      else setError(r.error);
    });
  return (
    <span className="row" style={{ gap: 4 }}>
      <button
        type="button"
        className={withLabel ? "od-button od-button--ghost od-button--small" : "od-icon-button"}
        aria-pressed={saved}
        aria-label={withLabel ? undefined : `${saved ? "Retirer des" : "Ajouter aux"} favoris : ${title}`}
        onClick={toggle}
        disabled={pending}
        style={saved && withLabel ? { color: "var(--od-action)", borderColor: "var(--od-action)" } : undefined}
      >
        <Icon name="favoris" />
        {withLabel && (pending ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer")}
      </button>
      <span role="status" aria-live="polite" className="xsmall" style={{ color: "var(--od-error-ink)" }}>{error}</span>
    </span>
  );
}
