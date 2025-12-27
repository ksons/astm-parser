import { describe, it, beforeAll, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { ASTMParser } from '../src/index.js';

describe('ASTM file', () => {
  let result;
  let diagnostics;

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'simple.DXF');
    const fileStream = fs.createReadStream(DXF_FILE_PATH, { encoding: 'utf8' });

    const parser = new ASTMParser();
    const res = await parser.parseStream(fileStream);
    expect(res).toBeTypeOf('object');
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have no diagnostics', () => {
    expect(diagnostics).toHaveLength(0);
  });

  it('should have asset information', () => {
    expect(result).toHaveProperty('asset');
    expect(result.asset).toBeTypeOf('object');
    expect(result.asset).toHaveProperty('authoringVendor', 'GERBER TECHNOLOGY');
    expect(result.asset).toHaveProperty('authoringTool', 'ACCUMARK');
    expect(result.asset).toHaveProperty('authoringToolVersion', '10.0.1');
    expect(result.asset).toHaveProperty('creationDate', '26-10-2017');
    expect(result.asset).toHaveProperty('creationTime', '9:34');
    expect(result.asset).toHaveProperty('unit', 2);
  });

  it('should have style information', () => {
    expect(result).toHaveProperty('style');
    expect(result.style).toBeTypeOf('object');
    expect(result.style).toHaveProperty('baseSize', '36');
    expect(result.style).toHaveProperty('name', 'C-S1615WWO206-10-26');
  });

  it('should contain pieces', () => {
    // Pieces
    expect(result).toHaveProperty('pieces');
    expect(Array.isArray(result.pieces)).toBe(true);
    expect(result.pieces).toHaveLength(4);
    const pieceNames = ['C-S1615WWO206-AB', 'C-S1615WWO206-B', 'C-S1615WWO206-F', 'C-S1615WWO206-NB'];
    expect(result.pieces.map(a => a.name).sort()).toEqual(pieceNames);
  });

  it('should contain sizes', () => {
    // Sizes
    expect(result).toHaveProperty('sizes');
    expect(Array.isArray(result.sizes)).toBe(true);
    expect(result.sizes).toHaveLength(14);
    expect(result.sizes).toEqual(['26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52']);
  });

  it('should contain vertices', () => {
    const piece = result.pieces[0];
    expect(piece).toHaveProperty('vertices');
    expect(Array.isArray(piece.vertices)).toBe(true);
    expect(piece.vertices.length).toBe(84 * 2);
  });

  it('should contain shapes', () => {
    // Shapes
    const piece = result.pieces[0];
    expect(piece).toHaveProperty('shapes');
    expect(piece.shapes).toBeTypeOf('object');
    expect(Object.keys(piece.shapes)).toEqual(expect.arrayContaining(result.sizes));

    const shape = piece.shapes[26];
    expect(shape.vertices.length).toBe(8);
    expect(shape.vertices.length).toBe(shape.lengths.reduce((acc, prev) => acc + prev));
  });

  it('should contain internal shapes', () => {
    // Shapes
    const piece = result.pieces.find(p => p.name === 'C-S1615WWO206-F');
    expect(piece).toHaveProperty('internalShapes');
    expect(piece.internalShapes).toBeTypeOf('object');
    expect(Object.keys(piece.internalShapes)).toEqual(expect.arrayContaining(result.sizes));

    const shape = piece.internalShapes[26];
    expect(shape.vertices.length).toBe(64);
    expect(shape.vertices.length).toBe(shape.lengths.reduce((acc, prev) => acc + prev));
  });

  it('should contain grain lines', () => {
    // Shapes
    const piece = result.pieces.find(p => p.name === 'C-S1615WWO206-F');
    expect(piece).toHaveProperty('grainLines');
    expect(piece.grainLines).toBeTypeOf('object');
    expect(Object.keys(piece.grainLines)).toEqual(expect.arrayContaining(result.sizes));

    const shape = piece.grainLines[26];
    expect(shape.vertices.length).toBe(2);
    expect(shape.vertices.length).toBe(shape.lengths.reduce((acc, prev) => acc + prev));
  });
});
