"use client";
import { useId, useRef, useState } from "react";
import { MODE_HINTS, MODE_LABELS, type PromptMode } from "@/lib/prompt-builder";
import { Icon } from "./Icon";

export type ConsoleProps = {
  title: string;
  tool?: { nom: string; url: string | null } | null;
  models?: {
    minimum: { nom: string | null; note?: string };
    recommande: { nom: string | null; note?: string };
    economique: { nom: string | null; note?: string } | null;
    date_verification: string | null;
    source: string | null;
  } | null;
  texts: Record<PromptMode, string>;
  purpose: string;
  usage: string;
};

type CopyState = "idle" | "copied" | "manual";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // On tente la méthode de secours ci-dessous.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const modelText = (m: { nom: string | null; note?: string } | null | undefined) =>
  m?.nom ? `${m.nom}${m.note ? ` (${m.note})` : ""}` : `Non renseigné${m?.note ? ` — ${m.note}` : ""}`;

/**
 * Console de prompt : Open declic sélectionne et copie un texte préparé.
 * Aucune génération : le texte s'utilise dans un outil IA externe.
 */
export function PromptConsole({ title, tool, models, texts, purpose, usage }: ConsoleProps) {
  const id = useId();
  const [mode, setMode] = useState<PromptMode>("personnaliser");
  const [copy, setCopy] = useState<CopyState>("idle");
  const preRef = useRef<HTMLPreElement>(null);
  const text = texts[mode];

  const onCopy = async () => {
    setCopy("idle");
    if (await copyText(text)) {
      setCopy("copied");
      return;
    }
    // Échec : on sélectionne le texte pour une copie manuelle.
    const sel = window.getSelection();
    if (preRef.current && sel) {
      const range = document.createRange();
      range.selectNodeContents(preRef.current);
      sel.removeAllRanges();
      sel.addRange(range);
      preRef.current.focus();
    }
    setCopy("manual");
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      <section className="od-card stack" aria-labelledby={`${id}-t`} style={{ gap: 12 }}>
        <h3 id={`${id}-t`} style={{ margin: 0 }}>{title}</h3>
        {(tool || models) && (
          <dl className="facts" style={{ gridTemplateColumns: "1fr" }}>
            {tool && (
              <div><dt>Outil conseillé</dt><dd>{tool.url ? <a href={tool.url} target="_blank" rel="noopener noreferrer">{tool.nom} <Icon name="ouvrir-externe" small /></a> : tool.nom}</dd></div>
            )}
            {models && (
              <>
                <div><dt>Modèle minimum</dt><dd>{modelText(models.minimum)}</dd></div>
                <div><dt>Modèle recommandé</dt><dd>{modelText(models.recommande)}</dd></div>
                {models.economique && <div><dt>Alternative moins coûteuse</dt><dd>{modelText(models.economique)}</dd></div>}
                <div>
                  <dt>Vérification des modèles</dt>
                  <dd className="small">{models.date_verification ? `Le ${new Date(models.date_verification).toLocaleDateString("fr-FR")}${models.source ? ` · ${models.source}` : ""}` : "Non vérifiée : à confirmer avant usage."}</dd>
                </div>
              </>
            )}
          </dl>
        )}
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend className="small" style={{ padding: 0, marginBottom: 6 }}>Comment souhaitez-vous avancer ?</legend>
          <div className="mode-switch">
            {(Object.keys(MODE_LABELS) as PromptMode[]).map((m) => (
              <label key={m}>
                <input type="radio" name={`${id}-mode`} value={m} checked={mode === m} onChange={() => { setMode(m); setCopy("idle"); }} />
                <strong>{MODE_LABELS[m]}</strong>
                <span>{MODE_HINTS[m]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <pre ref={preRef} className="od-prompt" tabIndex={0} aria-label={`Prompt à copier, mode ${MODE_LABELS[mode]}`}>{text}</pre>
        <button type="button" className="od-button od-button--block" onClick={onCopy}>
          <Icon name={copy === "copied" ? "check" : "copier"} /> Copier le prompt
        </button>
        <div role="status" aria-live="polite">
          {copy === "copied" && <p className="notice notice--success" style={{ margin: 0 }}><Icon name="check" small /> Prompt copié ({MODE_LABELS[mode]}).</p>}
          {copy === "manual" && (
            <p className="notice notice--warn" style={{ margin: 0 }}>
              La copie automatique a échoué. Le texte est sélectionné : utilisez Ctrl + C (ou Cmd + C), ou un appui long puis « Copier » sur téléphone.
            </p>
          )}
        </div>
      </section>
      <div className="explain od-card od-card--sage">
        <div>
          <h4>À quoi sert ce prompt ?</h4>
          <p style={{ margin: 0 }}>{purpose}</p>
        </div>
        <div>
          <h4>Comment l&apos;utiliser ?</h4>
          <p style={{ margin: 0 }}>{usage}</p>
        </div>
      </div>
    </div>
  );
}
