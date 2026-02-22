import { describe, it, expect } from 'vitest';
import { collectRefs, dereferenceSchema, dereferenceAllSchemas, dereferenceSpec } from '../openapi-resolver';
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const sampleSpec = {
  openapi: '3.0.1',
  info: { title: 'Test', version: 'v0' },
  paths: {},
  components: {
    schemas: {
      CategoryMiniDTO: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          iconId: { type: 'string' },
        },
      },
      GoalResponseDTO: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          categories: {
            type: 'object',
            additionalProperties: {
              $ref: '#/components/schemas/CategoryMiniDTO',
            },
          },
        },
      },
    },
  },
};

describe('openapi-resolver', () => {
  it('collects refs', () => {
    const refs = collectRefs(sampleSpec);
    expect(refs.size).toBe(2);
    expect(refs.get('#/components/schemas/CategoryMiniDTO')).toBeDefined();
    expect(refs.get('#/components/schemas/GoalResponseDTO')).toBeDefined();
  });

  it('dereferences a schema with $ref', () => {
    const refs = collectRefs(sampleSpec);
    const schema = sampleSpec.components!.schemas!.GoalResponseDTO;
    const deref = dereferenceSchema(schema, refs);
    expect(deref).toMatchObject({
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        categories: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              iconId: { type: 'string' },
            },
          },
        },
      },
    });
    // Ensure $ref is gone
    expect(JSON.stringify(deref)).not.toContain('$ref');
  });

  it('dereferences all schemas', () => {
    const resolved = dereferenceAllSchemas(sampleSpec);
    expect(resolved.size).toBe(2);
    const goalSchema = resolved.get('#/components/schemas/GoalResponseDTO');
    expect(goalSchema).toBeDefined();
    expect(JSON.stringify(goalSchema)).not.toContain('$ref');
  });

  it('handles circular references gracefully', () => {
    const circularSpec = {
      ...sampleSpec,
      components: {
        schemas: {
          Node: {
            type: 'object',
            properties: {
              next: { $ref: '#/components/schemas/Node' },
            },
          },
        },
      },
    };
    const refs = collectRefs(circularSpec);
    const deref = dereferenceSchema(circularSpec.components.schemas.Node, refs);
    console.log('deref', JSON.stringify(deref, null, 2));
    // Should not crash; may contain a placeholder
    expect(deref).toBeDefined();
    // Either the $ref is replaced with a circular marker or kept as is
    // Our implementation returns { $ref: ..., _circular: true }
    console.log('deref.properties.next', deref.properties.next);
    expect(deref.properties.next).toBeDefined();
    // Outer $ref may be expanded to its schema (Node), which itself contains a $ref placeholder
    expect(deref.properties.next).toHaveProperty('type', 'object');
    expect(deref.properties.next.properties.next).toHaveProperty('$ref');
    expect(deref.properties.next.properties.next).toHaveProperty('_circular', true);
  });

  it('dereferences $ref in paths', () => {
    const spec = {
      openapi: '3.0.1',
      info: { title: 'Test', version: 'v0' },
      paths: {
        '/user': {
          put: {
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UserEditDTO' },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          UserEditDTO: {
            type: 'object',
            properties: { name: { type: 'string' } },
          },
        },
      },
    };
    const deref = dereferenceSpec(spec);
    expect(deref.paths['/user'].put.requestBody.content['application/json'].schema).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    expect(JSON.stringify(deref)).not.toContain('$ref');
  });

  it('resolves $ref in real user spec', () => {
    const yamlPath = path.join(__dirname, '../../../../beyou-arch-design/api/user/openapi.yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const spec = parse(yamlContent);
    const deref = dereferenceSpec(spec);
    // Check that $ref in requestBody is replaced
    const requestSchema = deref.paths['/user'].put.requestBody.content['application/json'].schema;
    expect(requestSchema).toBeDefined();
    expect(requestSchema.$ref).toBeUndefined();
    expect(requestSchema.type).toBe('object');
    // Ensure there are no $ref left anywhere in the spec
    expect(JSON.stringify(deref)).not.toContain('$ref');
  });
});