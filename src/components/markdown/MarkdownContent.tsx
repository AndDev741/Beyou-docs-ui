import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MermaidBlock } from "./MermaidBlock";
import { cn } from "@/lib/utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function headingComponent(level: number) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return function Heading({ children }: { children?: ReactNode }) {
    const text = typeof children === "string" ? children : String(children ?? "");
    const id = slugify(text);
    return <Tag id={id}>{children}</Tag>;
  };
}

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn("docs-prose", className)}
      components={{
        h1: headingComponent(1),
        h2: headingComponent(2),
        h3: headingComponent(3),
        table({ children }) {
          return (
            <div className="overflow-x-auto -mx-2 px-2 my-4">
              <table className="min-w-full">{children}</table>
            </div>
          );
        },
        pre({ children }) {
          return <>{children}</>;
        },
        code({ className: codeClass, children, ...rest }) {
          const raw = String(children).replace(/\n$/, "");
          const match = /language-([a-z0-9_-]+)/i.exec(codeClass ?? "");
          const language = match?.[1]?.toLowerCase();

          // In react-markdown v9, inline code has no className and no parent <pre>.
          // Block code gets a className like "language-java" from the ``` fence.
          const isInline = !codeClass && !raw.includes("\n");

          if (!isInline && language === "mermaid") {
            return (
              <div className="my-6 p-4 rounded-xl bg-muted/30 border border-border/50 overflow-hidden">
                <MermaidBlock code={raw} />
              </div>
            );
          }

          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm text-primary">
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter
              style={oneDark}
              language={language || "text"}
              PreTag="pre"
              customStyle={{
                margin: "0.75rem 0",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              {raw}
            </SyntaxHighlighter>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
