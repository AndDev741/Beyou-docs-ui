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
  content?: Record<string, { schema?: any }>;
}

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: {
    content?: Record<string, { schema?: any }>;
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
  components?: Record<string, any>;
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