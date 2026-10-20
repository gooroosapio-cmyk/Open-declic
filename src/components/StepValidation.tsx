"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { safeAction } from "./safe-action";
import { setStepValidated } from "@/app/actions/user";
import { Icon } from "./Icon";

/**
 * Validation manuelle d'une étape. Copier un prompt ne valide jamais une étape.
 * L'état « validée » ne s'affiche qu'après confirmation de l'enregistrement.
 */
export function StepValidation({ projectId, stepKey, initial, loginHref }: {
  projectId: string; stepKey: string; initial: boolean; loginHref: string | null;
}) {
  const router = useRouter();
  const [validated, setValidated] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (loginHref) {
    return (
      <p className="small">
        <Link href={loginHref}>Connectez-vous</Link> pour valider cette étape et retrouver votre progression.
      </p>
    );
  }
  const toggle = () =>
    start(async () => {
      setError(null);
      const r = await safeAction(() => setStepValidated(projectId, stepKey, !validated));
      if (r.ok) {
        setValidated(!validated);
        router.refresh();
      } else setError(r.error);
    });

  return (
    <div className="stack-sm">
      {validated ? (
        <div className="row-between notice notice--success">
          <span className="row" style={{ gap: 6 }}><Icon name="check" /> Étape validée et enregistrée.</span>
          <button type="button" className="link-button" onClick={toggle} disabled={pending}>
            {pending ? "Enregistrement…" : "Annuler la validation"}
          </button>
        </div>
      ) : (
        <button type="button" className="od-button od-button--block" onClick={toggle} disabled={pending}>
          {pending ? "Enregistrement…" : "Valider cette étape"}
        </button>
      )}
      <div role="status" aria-live="polite">
        {error && <p className="notice notice--error" style={{ margin: 0 }}>Échec de l&apos;enregistrement : {error} Votre progression n&apos;a pas été modifiée.</p>}
      </div>
    </div>
  );
}
