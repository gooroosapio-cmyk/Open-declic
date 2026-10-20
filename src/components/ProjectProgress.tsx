export function ProjectProgress({ done, total }: { done: number; total: number }) {
  const safeTotal = Math.max(1, total);
  const safeDone = Math.min(safeTotal, Math.max(0, done));
  return (
    <div className="stack-sm" style={{ gap: 4 }}>
      <p className="small" style={{ margin: 0 }}>{safeDone} étape{safeDone > 1 ? "s" : ""} sur {total}</p>
      <progress className="od-progress" value={safeDone} max={safeTotal} aria-label="Progression du projet" />
    </div>
  );
}
