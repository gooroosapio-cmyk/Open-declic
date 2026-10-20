"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { safeAction } from "./safe-action";
import { startProject } from "@/app/actions/user";
import { Icon } from "./Icon";

/** Démarre le projet (enregistré en base) puis ouvre le kit. */
export function StartButton({ projectId, slug, started, loggedIn }: { projectId: string; slug: string; started: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const href = `/projets/${slug}/kit`;
  if (started || !loggedIn) {
    return (
      <Link className="od-button od-button--block" href={href}>
        {started ? "Continuer" : "Démarrer ce projet"} <Icon name="fleche-droite" />
      </Link>
    );
  }
  return (
    <div className="stack-sm">
      <button type="button" className="od-button od-button--block" disabled={pending}
        onClick={() => start(async () => {
          setError(null);
          const r = await safeAction(() => startProject(projectId));
          if (r.ok) router.push(href);
          else setError(r.error);
        })}>
        {pending ? "Enregistrement…" : "Démarrer ce projet"} <Icon name="fleche-droite" />
      </button>
      <p role="status" aria-live="polite" className="small" style={{ color: "var(--od-error-ink)", margin: 0 }}>{error}</p>
    </div>
  );
}
