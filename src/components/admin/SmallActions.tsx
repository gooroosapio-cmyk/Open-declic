"use client";
import { useState, useTransition } from "react";
import { safeAction } from "../safe-action";
import { setStepRetired, updateVisual, type AdminResult } from "@/app/actions/admin";
import { ResultMessage } from "./AdminForm";

export function RetireStepButton({ projectId, slug, stepKey, retired }: { projectId: string; slug: string; stepKey: string; retired: boolean }) {
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="stack-sm">
      <button type="button" className="link-button" disabled={pending}
        onClick={() => {
          if (!retired && !confirm("Retirer cette étape ? Elle sera masquée ; la progression des utilisateurs est conservée.")) return;
          start(async () => setResult(await safeAction(() => setStepRetired(projectId, slug, stepKey, !retired))));
        }}>
        {retired ? "Rétablir l'étape" : "Retirer l'étape"}
      </button>
      <ResultMessage result={result} />
    </div>
  );
}

export function VisualActions({ slug, index, isFirst }: { slug: string; index: number; isFirst: boolean }) {
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="stack-sm">
      <div className="row">
        {!isFirst && <button type="button" className="od-button od-button--ghost od-button--small" disabled={pending} onClick={() => start(async () => setResult(await safeAction(() => updateVisual(slug, index, "first"))))}>Mettre en premier</button>}
        <button type="button" className="od-button od-button--ghost od-button--small" disabled={pending}
          onClick={() => { if (confirm("Retirer ce visuel de la fiche ?")) start(async () => setResult(await safeAction(() => updateVisual(slug, index, "remove")))); }}>Retirer</button>
      </div>
      <ResultMessage result={result} />
    </div>
  );
}
