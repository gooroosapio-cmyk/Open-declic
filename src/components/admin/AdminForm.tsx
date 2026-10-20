"use client";
import { startTransition, useActionState } from "react";
import type { AdminResult } from "@/app/actions/admin";

export function Issues({ issues }: { issues?: AdminResult["issues"] }) {
  if (!issues?.length) return null;
  return (
    <ul className="issues">
      {issues.map((i, n) => (
        <li key={n}><strong>{i.fiche}</strong> › <code>{i.champ}</code> : {i.message}</li>
      ))}
    </ul>
  );
}

export function ResultMessage({ result }: { result: AdminResult | null }) {
  return (
    <div role="status" aria-live="polite">
      {result?.message && (
        <div className={`notice ${result.ok ? "notice--success" : "notice--error"}`}>
          <p>{result.message}</p>
          <Issues issues={result.issues} />
        </div>
      )}
    </div>
  );
}

/** Formulaire d'administration : le message de succès n'apparaît qu'après confirmation serveur. */
export function AdminForm({ action, children, submitLabel }: {
  action: (s: AdminResult, f: FormData) => Promise<AdminResult>;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(async (prev: AdminResult, data: FormData): Promise<AdminResult> => {
    try {
      return await action(prev, data);
    } catch {
      return { ok: false, message: "Connexion impossible avec le serveur. Rien n'a été enregistré : réessayez." };
    }
  }, { ok: true });
  return (
    // Soumission manuelle : le formulaire n'est pas réinitialisé, la saisie est conservée en cas d'erreur.
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      <ResultMessage result={state} />
      <button className="od-button" type="submit" disabled={pending}>{pending ? "Enregistrement…" : submitLabel}</button>
    </form>
  );
}
