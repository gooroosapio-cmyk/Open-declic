"use client";
import { useState, useTransition } from "react";
import { safeAction } from "../safe-action";
import { setProjectFree, setProjectStatus, type AdminResult } from "@/app/actions/admin";
import { ResultMessage } from "./AdminForm";

export function ProjectControls({ id, slug, status, isFree }: { id: string; slug: string; status: "draft" | "published" | "archived"; isFree: boolean }) {
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AdminResult>) => start(async () => setResult(await safeAction(fn)));
  return (
    <div className="stack-sm">
      <div className="row">
        {status !== "published" && (
          <button className="od-button od-button--small" disabled={pending}
            onClick={() => { if (confirm("Publier cette fiche ? Elle deviendra visible dans le catalogue.")) run(() => setProjectStatus(id, slug, "published")); }}>
            Publier
          </button>
        )}
        {status === "published" && (
          <button className="od-button od-button--ghost od-button--small" disabled={pending} onClick={() => run(() => setProjectStatus(id, slug, "draft"))}>
            Dépublier
          </button>
        )}
        {status !== "archived" && (
          <button className="od-button od-button--ghost od-button--small" disabled={pending} onClick={() => run(() => setProjectStatus(id, slug, "archived"))}>
            Archiver
          </button>
        )}
        <label className="check small">
          <input type="checkbox" checked={isFree} disabled={pending} onChange={(e) => run(() => setProjectFree(id, slug, e.target.checked))} />
          Fiche gratuite
        </label>
      </div>
      <ResultMessage result={result} />
    </div>
  );
}
