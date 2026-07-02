import { describe, it, beforeAll, expect } from 'vitest';
import * as path from 'path';

import { ASTMParser, Diagnostic, IOpenPatternFormat } from '../src/index.js';
import { contourPointCount } from './helpers.js';

describe('ASTM with seam allowance (sew lines + quality validation)', () => {
  let result: IOpenPatternFormat;
  let diagnostics: Diagnostic[];

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'GMH2446F17_INCLALLOWANCE_ASTM.DXF');
    const parser = new ASTMParser();
    const res = await parser.parseFile(DXF_FILE_PATH);
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have no diagnostics', () => {
    expect(diagnostics).toHaveLength(0);
  });

  it('should parse style and sizes', () => {
    expect(result.style.name).toBe('GMH2446F17');
    expect(result.style.baseSize).toBe('50');
    expect(result.pieces).toHaveLength(10);
    expect(result.sizes).toEqual([
      '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64', '66', '68', '70'
    ]);
  });

  it('should parse sew lines (layer 14) in every snapshot', () => {
    const piece = result.pieces[0];
    for (const size of result.sizes) {
      const snapshot = piece.sizes[size];
      expect(snapshot.sewLines.length).toBeGreaterThan(0);
      for (const contour of snapshot.sewLines) {
        expect(contourPointCount(contour)).toBeGreaterThan(1);
      }
    }
  });

  it('should preserve quality validation copies (layers 84, 85, 87)', () => {
    const snapshot = result.pieces[0].sizes['42'];
    const qv = snapshot.qualityValidation!;
    expect(qv).toBeDefined();
    expect(qv.boundary!.length).toBeGreaterThan(0);
    expect(qv.internalLines!.length).toBeGreaterThan(0);
    expect(qv.sewLines!.length).toBeGreaterThan(0);
    expect(qv.internalCutouts).toBeUndefined();
  });

  it('sew lines should differ from the cut boundary', () => {
    // With seam allowance included, the sew line is inset from the boundary,
    // so no sew-line contour may start on the boundary start vertex sequence.
    const snapshot = result.pieces[0].sizes['42'];
    const boundarySegment = snapshot.boundary.segments[0];
    const boundaryIndices = new Set([
      snapshot.boundary.start,
      ...(boundarySegment.type === 'lines' ? boundarySegment.to : []),
    ]);
    const sewIndices = snapshot.sewLines.flatMap(contour => [
      contour.start,
      ...contour.segments.flatMap(segment => (segment.type === 'lines' ? segment.to : [segment.to])),
    ]);
    const overlap = sewIndices.filter(index => boundaryIndices.has(index));
    expect(overlap.length).toBeLessThan(sewIndices.length);
  });
});
