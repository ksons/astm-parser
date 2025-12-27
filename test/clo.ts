import { describe, it, beforeAll, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { ASTMParser } from '../src/index.js';

describe('CLO file', () => {
  let result;
  let diagnostics;

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'clo-pattern.dxf');
    const fileStream = fs.createReadStream(DXF_FILE_PATH, { encoding: 'utf8' });

    const parser = new ASTMParser();
    const res = await parser.parseStream(fileStream);
    expect(res).toBeTypeOf('object');
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have no diagnostics', () => {
    expect(diagnostics).toHaveLength(9);
  });

  it('should have no asset information', () => {
    expect(result).toHaveProperty('asset');
    expect(result.asset).toBeTypeOf('object');
    expect(result.asset).toHaveProperty('authoringVendor', 'CLO Virtual Fashion Inc.');
    expect(result.asset).toHaveProperty('authoringTool', 'CLO Standalone OnlineAuth 4.0.129');
    expect(result.asset).toHaveProperty('authoringToolVersion', '3');
    expect(result.asset).toHaveProperty('creationDate', '05-03-2018');
    expect(result.asset).toHaveProperty('creationTime', '08:29');
    expect(result.asset).toHaveProperty('unit', 1);
  });

  it('should have style information', () => {
    expect(result).toHaveProperty('style');
    expect(result.style).toBeTypeOf('object');
    expect(result.style).toHaveProperty('baseSize', 'M');
    expect(result.style).toHaveProperty('name', 'clo-pattern');
  });

  it('should contain pieces', () => {
    // Pieces
    expect(result).toHaveProperty('pieces');
    expect(Array.isArray(result.pieces)).toBe(true);
    expect(result.pieces).toHaveLength(9);
    const pieceNames = ['11', '36', '37', '38', '39', '7', 'Pattern2D_768516', 'Pattern2D_768527', 'Pattern2D_768528'];
    expect(result.pieces.map(a => a.name).sort()).toEqual(pieceNames);
  });

  it('should contain sizes', () => {
    // Sizes
    expect(result).toHaveProperty('sizes');
    expect(Array.isArray(result.sizes)).toBe(true);
    expect(result.sizes).toHaveLength(1);
    expect(result.sizes).toEqual(['M']);
  });

  it('should contain vertices', () => {
    const piece = result.pieces[0];
    expect(piece).toHaveProperty('vertices');
    expect(Array.isArray(piece.vertices)).toBe(true);
    expect(piece.vertices.length).toBe(182 * 2);
  });

  it('should contain shapes', () => {
    // Shapes
    const piece = result.pieces[0];
    expect(piece).toHaveProperty('shapes');
    expect(piece.shapes).toBeTypeOf('object');
    expect(Object.keys(piece.shapes)).toEqual(expect.arrayContaining(result.sizes));

    const shape = piece.shapes.M;
    expect(shape).toBeTypeOf('object');

    expect(shape.vertices.length).toBe(148);
    expect(shape.vertices.length).toBe(shape.lengths.reduce((acc, prev) => acc + prev));
  });

  it('should contain internal shapes', () => {
    // Shapes
    const piece = result.pieces.find(p => p.name === '11');
    expect(piece).toHaveProperty('internalShapes');
    expect(piece.internalShapes).toBeTypeOf('object');
    expect(Object.keys(piece.internalShapes)).toEqual(expect.arrayContaining(result.sizes));

    const shape = piece.internalShapes.M;
    expect(shape).toBeTypeOf('object');
    expect(shape.vertices.length).toBe(22);
    expect(shape.vertices.length).toBe(shape.lengths.reduce((acc, prev) => acc + prev));
  });

  it('should contain grain lines', () => {
    // Shapes
    const piece = result.pieces.find(p => p.name === '11');
    expect(piece).toHaveProperty('grainLines');
    expect(piece.grainLines).toBeTypeOf('object');
    expect(Object.keys(piece.grainLines)).toEqual(expect.arrayContaining(result.sizes));

    const shape = piece.grainLines.M;
    expect(shape.vertices.length).toBe(2);
    expect(shape.vertices.length).toBe(shape.lengths.reduce((acc, prev) => acc + prev));
  });
});
