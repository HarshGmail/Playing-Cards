import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownDocProps {
  /** Raw markdown source, typically a `.md` import from docs/. */
  source: string;
}

/**
 * Renders a documentation markdown string with Tailwind's typography plugin.
 *
 * remark-gfm is required, not optional — the rules docs lean on GFM tables, and
 * without it they render as literal pipe characters.
 */
export default function MarkdownDoc({ source }: MarkdownDocProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-blue-600 dark:prose-a:text-blue-400">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // `prose` styles tables but won't stop a wide one from pushing the
          // page sideways on a phone, which is where these docs get read.
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
