"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

type Props = {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel: string;
  fields: ("email" | "password" | "new-password")[];
  next?: string;
};

export function AuthForm({ action, submitLabel, pendingLabel, fields, next }: Props) {
  const [state, formAction, pending] = useActionState(async (prev: FormState, data: FormData): Promise<FormState> => {
    try {
      return await action(prev, data);
    } catch (e) {
      // Les redirections de Next.js passent par une exception : on la laisse suivre son cours.
      if (typeof (e as { digest?: unknown })?.digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")) throw e;
      return { error: "Connexion impossible avec le serveur. Vérifiez votre connexion puis réessayez.", email: String(data.get("email") ?? "") };
    }
  }, {});
  return (
    <form action={formAction} className="stack" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {fields.includes("email") && (
        <label className="od-field">
          Adresse e-mail
          <input className="od-input" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
        </label>
      )}
      {(fields.includes("password") || fields.includes("new-password")) && (
        <label className="od-field">
          {fields.includes("new-password") ? "Nouveau mot de passe" : "Mot de passe"}
          {fields.includes("new-password") && <span className="hint">8 caractères minimum.</span>}
          <input
            className="od-input"
            name="password"
            type="password"
            required
            minLength={fields.includes("new-password") ? 8 : undefined}
            autoComplete={fields.includes("new-password") ? "new-password" : "current-password"}
          />
        </label>
      )}
      <div role="status" aria-live="polite">
        {state.error && <p className="notice notice--error">{state.error}</p>}
        {state.message && <p className="notice notice--success">{state.message}</p>}
      </div>
      <button className="od-button od-button--block" type="submit" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
