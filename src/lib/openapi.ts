/**
 * A node of a parsed OpenAPI document.
 *
 * These specs are arbitrary author-written YAML, so the shape genuinely is not
 * known at compile time — the traversal below narrows structurally at each use
 * site. `any` is the accurate description here rather than a shortcut, so the
 * escape hatch is declared once, named, and explained, instead of fourteen
 * scattered `any`s each needing their own suppression.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenAPINode = any;

import { parse } from "yaml";

export interface OpenAPIParameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
  };
}

export interface OpenAPIResponse {
  description?: string;
  content?: Record<string, { schema?: OpenAPINode }>;
}

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: {
    content?: Record<string, { schema?: OpenAPINode }>;
  };
  responses?: Record<string, OpenAPIResponse>;
}

export interface OpenAPIPath {
  [method: string]: OpenAPIOperation;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, OpenAPIPath>;
  components?: Record<string, OpenAPINode>;
}

export interface Endpoint {
  method: string;
  path: string;
  operation: OpenAPIOperation;
}

export function parseOpenAPISpec(spec: string): OpenAPISpec | null {
  try {
    return parse(spec);
  } catch {
    return null;
  }
}

export function extractEndpoints(spec: OpenAPISpec): Endpoint[] {
  const endpoints: Endpoint[] = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      endpoints.push({ method: method.toUpperCase(), path, operation });
    }
  }
  return endpoints;
}