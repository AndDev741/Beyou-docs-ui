import { OpenAPISpec, type OpenAPINode } from "./openapi";

/**
 * A reference map keyed by reference string (e.g., "#/components/schemas/GoalResponseDTO")
 */
export type RefMap = Map<string, OpenAPINode>;

/**
 * Collect all referenceable schemas from the spec's components.
 */
export function collectRefs(spec: OpenAPISpec): RefMap {
  const map = new Map<string, OpenAPINode>();
  if (!spec.components) {
    return map;
  }

  // Collect schemas
  if (spec.components.schemas && typeof spec.components.schemas === "object") {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      map.set(`#/components/schemas/${name}`, schema);
    }
  }

  // Optionally collect parameters, responses, headers, etc.
  // For now we only need schemas.

  return map;
}

/**
 * Resolve a single reference string against the given map.
 * Returns the referenced object or undefined if not found.
 */
export function resolveRef(ref: string, refMap: RefMap): OpenAPINode | undefined {
  return refMap.get(ref);
}

/**
 * Simplify a JSON Schema object into a human‑readable representation suitable for display.
 * Returns an object where each property maps to a type string (or nested simplified object).
 * Optional fields are marked with "(optional)" suffix.
 */
export function simplifySchema(schema: OpenAPINode): OpenAPINode {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // If $ref is still present (should be resolved earlier), just indicate reference
  if (schema.$ref) {
    return { $ref: schema.$ref };
  }

  // Handle object type with properties
  if (schema.type === 'object' && schema.properties) {
    const result: Record<string, OpenAPINode> = {};
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const simplified = simplifySchema(propSchema);
      result[propName] = simplified;
    }
    return result;
  }

  // Handle array type
  if (schema.type === 'array') {
    if (schema.items) {
      const itemSimplified = simplifySchema(schema.items);
      if (typeof itemSimplified === 'string') {
        return `array of ${itemSimplified}`;
      }
      // complex items: keep as object with items property
      return { type: 'array', items: itemSimplified };
    }
    return 'array';
  }

  // Handle primitive types
  if (schema.type === 'string') {
    if (schema.enum) {
      return `enum (${schema.enum.map((v: OpenAPINode) => JSON.stringify(v)).join(', ')})`;
    }
    if (schema.format) {
      return schema.format; // e.g., uuid, date-time
    }
    return 'string';
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return schema.type;
  }
  if (schema.type === 'boolean') {
    return 'boolean';
  }

  // Fallback: return the type if known, otherwise the schema itself
  return schema.type || schema;
}

/**
 * Dereference a schema object by recursively replacing all $ref properties.
 * Keeps track of visited references to avoid infinite recursion.
 */
export function dereferenceSchema(
  schema: OpenAPINode,
  refMap: RefMap,
  visited: Set<string> = new Set()
): OpenAPINode {
  if (schema === null || typeof schema !== "object") {
    return schema;
  }

  // If this object is a direct $ref, resolve it
  if (typeof schema.$ref === "string") {
    const ref = schema.$ref;
    if (visited.has(ref)) {
      // Circular reference detected – return a placeholder
      console.log('Circular reference detected for', ref);
      return { $ref: ref, _circular: true };
    }
    
    
    
    const resolved = resolveRef(ref, refMap);
    if (!resolved) {
      // Reference not found – keep the $ref as is
      return { ...schema };
    }
    // Mark this reference as visited and dereference the resolved schema
    visited.add(ref);
    const dereferenced = dereferenceSchema(resolved, refMap, visited);
    visited.delete(ref);

    // According to OpenAPI, sibling properties of $ref are ignored.
    // We discard them and return the dereferenced schema.
    return dereferenced;
  }

  // If it's an array, dereference each element
  if (Array.isArray(schema)) {
    return schema.map((item) => dereferenceSchema(item, refMap, visited));
  }

  // Otherwise it's a plain object – dereference each property
  const result: OpenAPINode = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = dereferenceSchema(value, refMap, visited);
  }
  return result;
}

/**
 * Dereference all schemas in the spec's components and return a map of
 * resolved schemas keyed by their original reference.
 */
export function dereferenceAllSchemas(spec: OpenAPISpec): Map<string, OpenAPINode> {
  const refMap = collectRefs(spec);
  const resolved = new Map<string, OpenAPINode>();

  for (const [ref, schema] of refMap.entries()) {
    resolved.set(ref, dereferenceSchema(schema, refMap));
  }

  return resolved;
}

/**
 * Utility to get a fully dereferenced spec (optional).
 * This replaces all $ref occurrences throughout the entire spec.
 */
export function dereferenceSpec(spec: OpenAPISpec): OpenAPISpec {
  const refMap = collectRefs(spec);
  const deref = (obj: OpenAPINode): OpenAPINode => dereferenceSchema(obj, refMap);
  return {
    ...spec,
    paths: deref(spec.paths),
    components: spec.components ? deref(spec.components) : undefined,
  };
}