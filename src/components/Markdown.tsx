import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Rendu Markdown sûr : le HTML brut n'est jamais interprété et les URL dangereuses
 * (javascript:, data:…) sont neutralisées par react-markdown.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{c}</a>
          ),
          table: ({ children: c }) => (
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Tableau défilant">
              <table className="data">{c}</table>
            </div>
          ),
          h1: ({ children: c }) => <h3>{c}</h3>,
          h2: ({ children: c }) => <h3>{c}</h3>,
          h3: ({ children: c }) => <h4>{c}</h4>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
