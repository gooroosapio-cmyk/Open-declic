"use client";
import { useState, useTransition } from "react";
import { safeAction } from "../safe-action";
import { setFullAccess, type AdminResult } from "@/app/actions/admin";
import { ResultMessage } from "./AdminForm";

export function AccessToggle({ userId, email, hasAccess }: { userId: string; email: string; hasAccess: boolean }) {
  const [note, setNote] = useState("");
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const act = () => {
    const verb = hasAccess ? "Révoquer l'accès complet de" : "Attribuer l'accès complet à";
    if (!confirm(`${verb} ${email} ? L'opération est enregistrée dans le journal.`)) return;
    start(async () => setResult(await safeAction(() => setFullAccess(userId, !hasAccess, note))));
  };
  return (
    <div className="stack-sm">
      <div className="row">
        <label className="od-field" style={{ flex: "1 1 200px" }}>
          <span className="sr-only">Note pour le journal ({email})</span>
          <input className="od-input" placeholder="Note (ex. paiement reçu le…)" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="button" className={`od-button od-button--small ${hasAccess ? "od-button--secondary" : ""}`} disabled={pending} onClick={act}>
          {pending ? "Enregistrement…" : hasAccess ? "Révoquer" : "Attribuer l'accès complet"}
        </button>
      </div>
      <ResultMessage result={result} />
    </div>
  );
}
