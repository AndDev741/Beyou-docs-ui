import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "./MermaidBlock";
import { cn } from "@/lib/utils";

interface DesignMarkdownProps {
  content: string;
  className?: string;
}

export function DesignMarkdown({ content, className }: DesignMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn("docs-prose", className)}
      components={{
        pre({ children }) {
          return <>{children}</>;
        },
        code({ inline, className: codeClass, children }) {
          const raw = String(children).replace(/\n$/, "");
          const match = /language-([a-z0-9_-]+)/i.exec(codeClass ?? "");
          const language = match?.[1]?.toLowerCase();

          if (!inline && language === "mermaid") {
            return (
              <div className="my-6 p-4 rounded-xl bg-muted/30 border border-border/50 overflow-hidden">
                <MermaidBlock code={raw} />
              </div>
            );
          }

          if (inline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm text-primary">
                {children}
              </code>
            );
          }

          return (
            <pre className="p-4 rounded-lg bg-muted/50 overflow-x-auto my-3">
              <code className="text-sm text-foreground">{raw}</code>
            </pre>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
