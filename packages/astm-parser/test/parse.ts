import { describe, it, beforeAll, expect } from 'vitest';
import * as path from 'path';

import { ASTMParser, Diagnostic, IOpenPatternFormat, OPF_VERSION } from '../src/index.js';
import { contourPointCount } from './helpers.js';

describe('ASTM file', () => {
  let result: IOpenPatternFormat;
  let diagnostics: Diagnostic[];

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'simple.DXF');
    const parser = new ASTMParser();
    const res = await parser.parseFile(DXF_FILE_PATH);
    expect(res).toBeTypeOf('object');
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have no diagnostics', () => {
    expect(diagnostics).toHaveLength(0);
  });

  it('should have version and asset information', () => {
    expect(result.version).toBe(OPF_VERSION);
    expect(result.asset).toBeTypeOf('object');
    expect(result.asset).toHaveProperty('authoringVendor', 'GERBER TECHNOLOGY');
    expect(result.asset).toHaveProperty('authoringTool', 'ACCUMARK');
    expect(result.asset).toHaveProperty('authoringToolVersion', '10.0.1');
    expect(result.asset).toHaveProperty('creationDate', '26-10-2017');
    expect(result.asset).toHaveProperty('creationTime', '9:34');
    expect(result.asset).toHaveProperty('unit', 'inch');
  });

  it('should have style information', () => {
    expect(result.style).toBeTypeOf('object');
    expect(result.style).toHaveProperty('baseSize', '36');
    expect(result.style).toHaveProperty('name', 'C-S1615WWO206-10-26');
  });

  it('should contain pieces', () => {
    expect(Array.isArray(result.pieces)).toBe(true);
    expect(result.pieces).toHaveLength(4);
    const pieceNames = ['C-S1615WWO206-AB', 'C-S1615WWO206-B', 'C-S1615WWO206-F', 'C-S1615WWO206-NB'];
    expect(result.pieces.map(a => a.name).sort()).toEqual(pieceNames);
  });

  it('should contain sizes', () => {
    expect(result.sizes).toEqual(['26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52']);
  });

  it('every piece has a snapshot for every size including the base size', () => {
    for (const piece of result.pieces) {
      expect(Object.keys(piece.sizes).sort()).toEqual([...result.sizes].sort());
      expect(piece.sizes[result.style.baseSize]).toBeDefined();
    }
  });

  it('snapshots are self-contained with a local vertex pool', () => {
    const snapshot = result.pieces[0].sizes['26'];
    expect(Array.isArray(snapshot.vertices)).toBe(true);
    expect(snapshot.vertices.length % 2).toBe(0);
    expect(snapshot.vertices.length).toBeGreaterThan(0);
  });

  it('chains the boundary fragments into one closed contour', () => {
    const front = result.pieces.find(p => p.name === 'C-S1615WWO206-F')!;
    const boundary = front.sizes['26'].boundary;
    expect(boundary.closed).toBe(true);
    expect(contourPointCount(boundary)).toBe(126);

    const ab = result.pieces.find(p => p.name === 'C-S1615WWO206-AB')!;
    expect(ab.sizes['26'].boundary.closed).toBe(true);
    expect(contourPointCount(ab.sizes['26'].boundary)).toBe(4);
  });

  it('should contain internal lines', () => {
    const front = result.pieces.find(p => p.name === 'C-S1615WWO206-F')!;
    expect(front.sizes['26'].internalLines).toHaveLength(25);
  });

  it('should contain a single grain line', () => {
    const front = result.pieces.find(p => p.name === 'C-S1615WWO206-F')!;
    const grainLine = front.sizes['26'].grainLine!;
    expect(grainLine).toBeDefined();
    expect(contourPointCount(grainLine)).toBe(2);
    expect(grainLine.closed).toBe(false);
  });
});
