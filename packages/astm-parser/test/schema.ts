import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Ajv2020 as Ajv } from 'ajv/dist/2020.js';

import { ASTMParser, IContour, ISizeSnapshot } from '../src/index.js';

const DXF_DIR = path.join(__dirname, 'data', 'dxf');
const SCHEMA_PATH = path.join(__dirname, '..', '..', '..', 'schema', 'opf.schema.json');

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const dxfFiles = fs.readdirSync(DXF_DIR).filter(file => file.toLowerCase().endsWith('.dxf'));

function contourIndices(contour: IContour): number[] {
  return [
    contour.start,
    ...contour.segments.flatMap(segment =>
      segment.type === 'lines' ? segment.to : [segment.c1, segment.c2, segment.to]
    ),
  ];
}

function allIndices(snapshot: ISizeSnapshot): number[] {
  const contours: IContour[] = [
    snapshot.boundary,
    ...snapshot.internalLines,
    ...snapshot.internalCutouts,
    ...snapshot.sewLines,
    ...snapshot.stripeReferences,
    ...snapshot.plaidReferences,
    ...snapshot.gradeReferences,
    ...(snapshot.grainLine ? [snapshot.grainLine] : []),
    ...(snapshot.mirrorLine ? [snapshot.mirrorLine] : []),
    ...Object.values(snapshot.qualityValidation ?? {}).flat(),
  ];
  return [
    ...contours.flatMap(contourIndices),
    ...snapshot.turnPoints,
    ...snapshot.curvePoints,
    ...snapshot.drillHoles,
    ...snapshot.notches.map(notch => notch.vertex),
  ];
}

describe('OPF schema validation', () => {
  it('finds DXF fixtures', () => {
    expect(dxfFiles.length).toBeGreaterThan(20);
  });

  it.each(dxfFiles)('%s parses to schema-valid OPF', async file => {
    const parser = new ASTMParser();
    const result = await parser.parseFile(path.join(DXF_DIR, file));

    // Validate the JSON serialization - that is what the format defines
    const json = JSON.parse(JSON.stringify(result.data));
    const valid = validate(json);
    if (!valid) {
      throw new Error(`${file}: ${ajv.errorsText(validate.errors, { separator: '\n' })}`);
    }
    expect(valid).toBe(true);
  });

  it.each(dxfFiles)('%s has consistent snapshots', async file => {
    const parser = new ASTMParser();
    const result = await parser.parseFile(path.join(DXF_DIR, file));

    for (const piece of result.data.pieces) {
      expect(Object.keys(piece.sizes).length).toBeGreaterThan(0);
      for (const snapshot of Object.values(piece.sizes)) {
        // even-length coordinate pool
        expect(snapshot.vertices.length % 2).toBe(0);
        const vertexCount = snapshot.vertices.length / 2;

        // exactly one closed boundary with at least 3 points
        expect(snapshot.boundary.closed).toBe(true);
        expect(contourIndices(snapshot.boundary).length).toBeGreaterThanOrEqual(3);

        // all indices point into the snapshot's own pool
        for (const index of allIndices(snapshot)) {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(vertexCount);
        }
      }
    }
  });
});
