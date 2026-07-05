import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Ajv2020 as Ajv } from 'ajv/dist/2020.js';

const ROOT = path.join(__dirname, '..', '..', '..');
const EXAMPLES_DIR = path.join(ROOT, 'examples');
const SCHEMA_PATH = path.join(ROOT, 'schema', 'opf.schema.json');

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const exampleFiles = fs.readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.opf.json'));

describe('example documents', () => {
  it('finds example files', () => {
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  it.each(exampleFiles)('%s is schema-valid', file => {
    const doc = JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8'));
    const valid = validate(doc);
    if (!valid) {
      throw new Error(`${file}: ${ajv.errorsText(validate.errors, { separator: '\n' })}`);
    }
    expect(valid).toBe(true);
  });

  it.each(exampleFiles)('%s has resolvable construction references', file => {
    const doc = JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8'));
    const pieces = new Map<string, unknown>();
    for (const pc of doc.pieces) {
      if (pc.id) pieces.set(pc.id, pc);
      if (!pieces.has(pc.name)) pieces.set(pc.name, pc);
    }
    const sides = (doc.sewing ?? []).flatMap((s: { first: unknown; second: unknown }) => [
      s.first,
      s.second,
    ]);
    const targets = (doc.topstitching ?? [])
      .map((t: { target?: unknown }) => t.target)
      .filter(Boolean);
    for (const ref of [...sides, ...targets] as {
      piece: string;
      contour?: { property: string; index?: number };
    }[]) {
      const pc = pieces.get(ref.piece) as { sizes: Record<string, Record<string, unknown>> };
      expect(pc, `piece ${ref.piece}`).toBeDefined();
      if (!ref.contour) continue;
      for (const snapshot of Object.values(pc.sizes)) {
        const value = snapshot[ref.contour.property];
        const contour = Array.isArray(value) ? value[ref.contour.index ?? -1] : value;
        expect(contour, `${ref.piece}/${ref.contour.property}`).toBeDefined();
      }
    }
    const styleIds = new Set((doc.topstitchStyles ?? []).map((s: { id: string }) => s.id));
    for (const t of doc.topstitching ?? []) {
      if (t.style) expect(styleIds.has(t.style), `style ${t.style}`).toBe(true);
    }
  });
});
