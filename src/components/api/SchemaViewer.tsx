import { stringify } from "yaml";
import { cn } from "@/lib/utils";

interface SchemaViewerProps {
  /** Schema object (may contain $ref) */
  schema: Record<string, unknown>;
  /** Optional title to display above the schema */
  title?: string;
  /** If true, the schema will be displayed as a compact inline block */
  inline?: boolean;
  className?: string;
}

/**
 * Renders an OpenAPI schema as formatted YAML with syntax highlighting.
 * If the schema contains $ref, it will be displayed as a reference (no automatic resolution).
 */
export function SchemaViewer({ schema, title, inline = false, className }: SchemaViewerProps) {
  const yaml = stringify(schema, { indent: 2 });

  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <h4 className="text-sm font-medium text-foreground/80">{title}</h4>
      )}
      <pre
        className={cn(
          "font-mono text-sm whitespace-pre-wrap break-words rounded-lg p-4",
          inline
            ? "bg-muted/30 border border-muted/50"
            : "glass-panel border border-glass-border/30"
        )}
      >
        <code className="text-foreground/90">{yaml}</code>
      </pre>
    </div>
  );
}