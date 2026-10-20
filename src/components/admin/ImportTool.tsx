"use client";
import { useState, useTransition } from "react";
import { safeAction } from "../safe-action";
import { confirmImport, previewImport, type AdminResult, type ImportPreview } from "@/app/actions/admin";
import { Issues, ResultMessage } from "./AdminForm";

export function ImportTool() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
    setPreview(null);
    setResult(null);
  };
  const changes = preview?.ok ? preview.diffs.filter((d) => d.kind !== "identique").length : 0;

  return (
    <div className="stack">
      <label className="od-field">Fichier JSON
        <input className="od-input" type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <label className="od-field">Ou collez le contenu
        <textarea className="od-input od-code" rows={10} value={text} spellCheck={false}
          onChange={(e) => { setText(e.target.value); setPreview(null); setResult(null); }} />
      </label>
      <button type="button" className="od-button" disabled={!text.trim() || pending}
        onClick={() => start(async () => { setResult(null); const p = await safeAction(() => previewImport(text)); setPreview(p.ok ? p : { ok: false, message: "message" in p && p.message ? p.message : "Échec.", issues: "issues" in p && p.issues ? p.issues : [] }); })}>
        {pending && !preview ? "Vérification…" : "1. Vérifier et prévisualiser"}
      </button>

      <div role="status" aria-live="polite">
        {preview && !preview.ok && (
          <div className="notice notice--error"><p><strong>{preview.message}</strong></p><Issues issues={preview.issues} /></div>
        )}
      </div>

      {preview?.ok && (
        <section className="stack-sm od-card" aria-labelledby="h-apercu-import">
          <h2 id="h-apercu-import">Aperçu : {preview.count} fiche{preview.count > 1 ? "s" : ""} valide{preview.count > 1 ? "s" : ""}</h2>
          <ul className="stack-sm" style={{ paddingLeft: 18 }}>
            {preview.diffs.map((d) => (
              <li key={d.id}>
                <strong className={d.kind === "creation" ? "diff-added" : d.kind === "modification" ? "diff-changed" : undefined}>
                  {d.kind === "creation" ? "Ajout" : d.kind === "modification" ? "Modification" : "Inchangée"}
                </strong>{" "}
                · {d.title} <code className="xsmall">{d.id}</code>
                <div className="small">{d.statusNote}</div>
                {d.changedFields.length > 0 && <div className="small">Champs modifiés : {d.changedFields.join(", ")}</div>}
                {(d.steps.added.length > 0 || d.steps.modified.length > 0) && (
                  <div className="small">Étapes : {d.steps.added.length} ajoutée{d.steps.added.length > 1 ? "s" : ""}{d.steps.added.length > 0 && ` (${d.steps.added.join(", ")})`}, {d.steps.modified.length} modifiée{d.steps.modified.length > 1 ? "s" : ""}{d.steps.modified.length > 0 && ` (${d.steps.modified.join(", ")})`}</div>
                )}
                {d.steps.kept.length > 0 && <div className="small">Étapes absentes du fichier, conservées sans changement : {d.steps.kept.join(", ")}</div>}
              </li>
            ))}
          </ul>
          <p className="small muted">Aucune suppression implicite. La progression des utilisateurs n&apos;est jamais modifiée.</p>
          <button type="button" className="od-button" disabled={pending || changes === 0}
            onClick={() => start(async () => { const r = await safeAction(() => confirmImport(text)); setResult(r); if (r.ok) setPreview(null); })}>
            {pending ? "Import…" : changes === 0 ? "Rien à importer" : `2. Confirmer l'import (${changes} fiche${changes > 1 ? "s" : ""})`}
          </button>
        </section>
      )}
      <ResultMessage result={result} />
    </div>
  );
}
