import { cn } from "@/lib/utils";

interface JsonHighlightProps {
  /** JSON string or JavaScript object */
  data: string | Record<string, unknown> | unknown[];
  className?: string;
}

/**
 * A simple component that renders JSON with syntax highlighting.
 * Keys are colored differently from values.
 */
export function JsonHighlight({ data, className }: JsonHighlightProps) {
  let parsed: unknown;
  try {
    parsed = typeof data === "string" ? JSON.parse(data) : data;
  } catch (error) {
    // If parsing fails, fallback to plain text
    return (
      <pre
        className={cn(
          "font-mono text-sm whitespace-pre-wrap break-words rounded-lg p-4 glass-panel border border-glass-border/30",
          className,
        )}
      >
        <code className="text-foreground/90">{String(data)}</code>
      </pre>
    );
  }

  // Recursive rendering function
  const renderValue = (value: unknown, depth = 0): React.ReactNode => {
    const indent = "  ".repeat(depth);
    if (value === null) {
      return <span className="text-purple-400">null</span>;
    }
    if (typeof value === "boolean") {
      return <span className="text-purple-400">{String(value)}</span>;
    }
    if (typeof value === "number") {
      return <span className="text-blue-400">{String(value)}</span>;
    }
    if (typeof value === "string") {
      // Check if the string looks like a type (e.g., "string", "boolean", "uuid")
      const isType = /^(string|boolean|integer|number|array|uuid|date-time|enum)/.test(value);
      return (
        <span className={isType ? "text-emerald-300" : "text-yellow-300"}>
          {JSON.stringify(value)}
        </span>
      );
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400">[]</span>;
      }
      return (
        <>
          <span className="text-gray-400">[</span>
          <div className="ml-4">
            {value.map((item, idx) => (
              <div key={idx}>
                {indent}  {renderValue(item, depth + 1)}
                {idx < value.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            ))}
          </div>
          <span className="text-gray-400">{indent}]</span>
        </>
      );
    }
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return <span className="text-gray-400">{}</span>;
      }
      return (
        <>
          <span className="text-gray-400">{"{"}</span>
          <div className="ml-4">
            {entries.map(([key, val], idx) => (
              <div key={key}>
                {indent}
                <span className="text-purple-400">{JSON.stringify(key)}</span>
                <span className="text-gray-400">: </span>
                {renderValue(val, depth + 1)}
                {idx < entries.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            ))}
          </div>
          <span className="text-gray-400">{indent}{"}"}</span>
        </>
      );
    }
    return <span className="text-gray-400">{String(value)}</span>;
  };

  return (
    <pre
      className={cn(
        "font-mono text-sm whitespace-pre-wrap break-words rounded-lg p-4 glass-panel border border-glass-border/30",
        className,
      )}
    >
      <code>{renderValue(parsed)}</code>
    </pre>
  );
}