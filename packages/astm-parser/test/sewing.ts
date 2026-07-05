import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Ajv2020 as Ajv } from 'ajv/dist/2020.js';

import { IOpenPatternFormat, OPF_VERSION } from '../src/index.js';

const SCHEMA_PATH = path.join(__dirname, '..', '..', '..', 'schema', 'opf.schema.json');
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

/** Minimal valid document with two pieces (one snapshot each). */
function makeDoc(): IOpenPatternFormat {
  const snapshot = () => ({
    vertices: [0, 0, 100, 0, 100, 100, 0, 100, 10, 10, 90, 10],
    boundary: { start: 0, closed: true, segments: [{ type: 'lines' as const, to: [1, 2, 3] }] },
    internalLines: [{ start: 4, closed: false, segments: [{ type: 'lines' as const, to: [5] }] }],
    internalCutouts: [],
    sewLines: [],
    stripeReferences: [],
    plaidReferences: [],
    gradeReferences: [],
    turnPoints: [0, 1, 2, 3],
    curvePoints: [],
    drillHoles: [],
    notches: [],
    annotations: [],
  });
  return {
    version: OPF_VERSION,
    asset: {
      authoringTool: 'test',
      authoringToolVersion: '1',
      authoringVendor: 'test',
      creationDate: '',
      creationTime: '',
      unit: 'mm',
    },
    style: { name: 'TEST', baseSize: 'M' },
    sizes: ['M'],
    pieces: [
      { id: 'pcA', name: 'FRONT', sizes: { M: snapshot() } },
      { id: 'pcB', name: 'BACK', sizes: { M: snapshot() } },
    ],
  };
}

function check(doc: unknown): { valid: boolean; errors: string } {
  const json = JSON.parse(JSON.stringify(doc));
  const valid = validate(json) as boolean;
  return { valid, errors: valid ? '' : ajv.errorsText(validate.errors, { separator: '\n' }) };
}

describe('OPF 0.4 sewing & topstitching schema', () => {
  it('accepts a document without sewing (0.3-shaped)', () => {
    const doc = makeDoc();
    delete (doc.pieces[0] as { id?: string }).id;
    delete (doc.pieces[1] as { id?: string }).id;
    const { valid, errors } = check(doc);
    expect(errors).toBe('');
    expect(valid).toBe(true);
  });

  it('accepts a full sewing + topstitching document', () => {
    const doc = makeDoc();
    doc.sewing = [
      {
        name: 'Seam_1',
        first: {
          piece: 'pcA',
          contour: { property: 'boundary' },
          start: 0.1,
          end: 0.4,
        },
        second: {
          piece: 'pcB',
          contour: { property: 'internalLines', index: 0 },
          start: 1.0,
          end: 0.0,
          reversed: true,
        },
        fold: { angle: 180, strength: 5 },
        turned: false,
      },
    ];
    doc.topstitching = [
      {
        name: 'Topstitch_1',
        target: { piece: 'pcA', contour: { property: 'boundary' }, start: 0, end: 0.25 },
        offset: 1.3,
        extendStart: true,
        extendEnd: true,
        corner: { curved: false, curvedLength: 5, rightAngled: false },
        style: 'st1',
      },
    ];
    doc.topstitchStyles = [{ id: 'st1', name: 'Default', modelType: 1 }];
    const { valid, errors } = check(doc);
    expect(errors).toBe('');
    expect(valid).toBe(true);
  });

  it('rejects array contour references without index', () => {
    const doc = makeDoc();
    doc.sewing = [
      {
        first: { piece: 'pcA', contour: { property: 'internalLines' }, start: 0, end: 1 },
        second: { piece: 'pcB', contour: { property: 'boundary' }, start: 0, end: 1 },
      },
    ];
    expect(check(doc).valid).toBe(false);
  });

  it('rejects unknown contour properties', () => {
    const doc = makeDoc();
    doc.sewing = [
      {
        first: {
          piece: 'pcA',
          contour: { property: 'grainLine' } as unknown as { property: 'boundary' },
          start: 0,
          end: 1,
        },
        second: { piece: 'pcB', contour: { property: 'boundary' }, start: 0, end: 1 },
      },
    ];
    expect(check(doc).valid).toBe(false);
  });

  it('rejects parameters outside [0, 1]', () => {
    const doc = makeDoc();
    doc.sewing = [
      {
        first: { piece: 'pcA', contour: { property: 'boundary' }, start: 0, end: 1.5 },
        second: { piece: 'pcB', contour: { property: 'boundary' }, start: 0, end: 1 },
      },
    ];
    expect(check(doc).valid).toBe(false);
  });

  it('rejects seams missing a side', () => {
    const doc = makeDoc();
    doc.sewing = [
      {
        first: { piece: 'pcA', contour: { property: 'boundary' }, start: 0, end: 1 },
      } as unknown as NonNullable<IOpenPatternFormat['sewing']>[number],
    ];
    expect(check(doc).valid).toBe(false);
  });

  it('rejects empty topstitch objects', () => {
    const doc = makeDoc();
    doc.topstitching = [{}];
    expect(check(doc).valid).toBe(false);
  });

  it('rejects unknown seam properties', () => {
    const doc = makeDoc();
    doc.sewing = [
      {
        first: { piece: 'pcA', contour: { property: 'boundary' }, start: 0, end: 1 },
        second: { piece: 'pcB', contour: { property: 'boundary' }, start: 0, end: 1 },
        seamAllowance: 10,
      } as unknown as NonNullable<IOpenPatternFormat['sewing']>[number],
    ];
    expect(check(doc).valid).toBe(false);
  });
});
