"use client";
import { useState, useTransition } from "react";
import { publishAllDrafts, type AdminResult } from "@/app/actions/admin";
import { ResultMessage } from "./AdminForm";
import { safeAction } from "../safe-action";

export function PublishAllButton({ count }: { count: number }) {
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  if (count === 0 && !result) return null;
  return (
    <div className="stack-sm">
      {count > 0 && (
        <button type="button" className="od-button od-button--secondary" disabled={pending}
          onClick={() => {
            if (!confirm(`Publier les ${count} fiches en brouillon ? Elles deviendront visibles dans le catalogue.`)) return;
            start(async () => setResult(await safeAction(publishAllDrafts)));
          }}>
          {pending ? "Publication…" : `Publier tous les brouillons (${count})`}
        </button>
      )}
      <ResultMessage result={result} />
    </div>
  );
}
