import { parse } from "yaml";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SchemaViewer } from "./SchemaViewer";
import { dereferenceAllSchemas, dereferenceSpec } from "@/lib/openapi-resolver";

interface OpenAPIViewerProps {
  spec: string; // YAML content
  className?: string;
}

interface OpenAPIParameter {
  name: string;
  in: string;
  description?: string;
  schema?: {
    type?: string;
  };
}

interface OpenAPIResponse {
  description?: string;
}

interface OpenAPIPathMethod {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  responses?: Record<string, OpenAPIResponse>;
}

interface OpenAPIPath {
  [method: string]: OpenAPIPathMethod;
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, OpenAPIPath>;
  components?: Record<string, unknown>;
}

export function OpenAPIViewer({ spec, className }: OpenAPIViewerProps) {
  const parsed = useMemo<OpenAPISpec | null>(() => {
    try {
      return parse(spec);
    } catch (error) {
      console.error("Failed to parse OpenAPI YAML:", error);
      return null;
    }
  }, [spec]);

  const dereferencedSpec = useMemo(() => {
    if (!parsed) return null;
    return dereferenceSpec(parsed);
  }, [parsed]);

  const resolvedSchemas = useMemo(() => {
    if (!dereferencedSpec?.components?.schemas) return new Map();
    const map = new Map();
    for (const [name, schema] of Object.entries(dereferencedSpec.components.schemas)) {
      map.set(`#/components/schemas/${name}`, schema);
    }
    return map;
  }, [dereferencedSpec]);

  if (!parsed || !dereferencedSpec) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-sm text-red-200">
        Failed to parse OpenAPI specification.
      </div>
    );
  }

  const { info, paths } = dereferencedSpec;

  return (
    <div className={cn("space-y-8", className)}>
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-foreground">{info.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Version {info.version}
        </p>
        {info.description && (
          <p className="text-sm text-foreground/80 mt-4">{info.description}</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Endpoints</h2>
        <div className="space-y-6">
          {Object.entries(paths).map(([path, methods]) => (
            <div
              key={path}
              className="glass-panel rounded-2xl p-6 border border-glass-border/30"
            >
              <h3 className="text-lg font-medium text-foreground mb-4 font-mono">
                {path}
              </h3>
              <div className="space-y-4">
                {Object.entries(methods).map(([method, operation]) => (
                  <div
                    key={method}
                    className="border-l-4 border-primary/50 pl-4 py-2 bg-white/5 rounded-r-lg"
                  >
                    <div className="flex items-center gap-3">
                      <MethodBadge method={method} />
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {operation.summary || operation.operationId || "Untitled"}
                        </h4>
                        {operation.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {operation.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {operation.tags && operation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {operation.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs rounded bg-primary/10 text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {(operation.parameters?.length ?? 0) > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-foreground mb-2">
                          Parameters
                        </h5>
                        <ul className="space-y-2">
                          {operation.parameters!.map((param: OpenAPIParameter, idx: number) => (
                            <li key={idx} className="text-sm">
                              <span className="font-mono text-foreground">
                                {param.name}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {param.in} • {param.schema?.type || "unknown"}
                              </span>
                              {param.description && (
                                <span className="ml-3 text-muted-foreground">
                                  {param.description}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {operation.responses && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-foreground mb-2">
                          Responses
                        </h5>
                        <ul className="space-y-2">
                          {Object.entries(operation.responses).map(([code, resp]: [string, OpenAPIResponse]) => (
                            <li key={code} className="text-sm">
                              <span className="font-mono text-foreground">
                                {code}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {resp.description}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {resolvedSchemas.size > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Schemas</h2>
          <div className="space-y-6">
            {Array.from(resolvedSchemas.entries()).map(([ref, schema]) => (
              <div
                key={ref}
                className="glass-panel rounded-2xl p-6 border border-glass-border/30"
              >
                <h3 className="text-lg font-medium text-foreground mb-4 font-mono">
                  {ref.replace('#/components/schemas/', '')}
                </h3>
                <SchemaViewer schema={schema} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colorMap: Record<string, string> = {
    get: "bg-green-500/20 text-green-300",
    post: "bg-blue-500/20 text-blue-300",
    put: "bg-yellow-500/20 text-yellow-300",
    patch: "bg-purple-500/20 text-purple-300",
    delete: "bg-red-500/20 text-red-300",
    head: "bg-gray-500/20 text-gray-300",
    options: "bg-gray-500/20 text-gray-300",
  };
  return (
    <span
      className={cn(
        "px-3 py-1 rounded-full text-xs font-semibold uppercase",
        colorMap[method.toLowerCase()] || "bg-muted text-foreground"
      )}
    >
      {method}
    </span>
  );
}