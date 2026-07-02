import { describe, it, beforeAll, expect } from 'vitest';
import * as path from 'path';

import { ASTMParser, Diagnostic, IOpenPatternFormat } from '../src/index.js';
import { contourPointCount } from './helpers.js';

describe('CLO file', () => {
  let result: IOpenPatternFormat;
  let diagnostics: Diagnostic[];

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'clo-pattern.dxf');
    const parser = new ASTMParser();
    const res = await parser.parseFile(DXF_FILE_PATH);
    expect(res).toBeTypeOf('object');
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have no diagnostics', () => {
    expect(diagnostics).toHaveLength(0);
  });

  it('should have asset information', () => {
    expect(result.asset).toBeTypeOf('object');
    expect(result.asset).toHaveProperty('authoringVendor', 'CLO Virtual Fashion Inc.');
    expect(result.asset).toHaveProperty('authoringTool', 'CLO Standalone OnlineAuth 4.0.129');
    expect(result.asset).toHaveProperty('authoringToolVersion', '3');
    expect(result.asset).toHaveProperty('creationDate', '05-03-2018');
    expect(result.asset).toHaveProperty('creationTime', '08:29');
    expect(result.asset).toHaveProperty('unit', 'mm');
  });

  it('should have style information', () => {
    expect(result.style).toHaveProperty('baseSize', 'M');
    expect(result.style).toHaveProperty('name', 'clo-pattern');
  });

  it('should contain pieces', () => {
    expect(result.pieces).toHaveLength(9);
    const pieceNames = ['11', '36', '37', '38', '39', '7', 'Pattern2D_768516', 'Pattern2D_768527', 'Pattern2D_768528'];
    expect(result.pieces.map(a => a.name).sort()).toEqual(pieceNames);
  });

  it('should contain sizes', () => {
    expect(result.sizes).toEqual(['M']);
  });

  it('should contain a closed boundary contour', () => {
    const piece = result.pieces.find(p => p.name === '11')!;
    const snapshot = piece.sizes['M'];
    expect(snapshot.vertices.length).toBe(182 * 2);
    expect(snapshot.boundary.closed).toBe(true);
    expect(contourPointCount(snapshot.boundary)).toBe(148);
  });

  it('keeps boundary text as sourced annotations, lifted keys excluded', () => {
    const piece = result.pieces.find(p => p.name === '11')!;
    const boundaryTexts = piece.sizes['M'].annotations.filter(a => a.source === 'boundary');
    expect(boundaryTexts).toHaveLength(2);
    expect(boundaryTexts.map(a => a.text)).toEqual(['ANNOTATION:', 'QUANTITY: 1']);
    expect(boundaryTexts[0].position).toEqual({ x: 192.148163, y: 1234.616211 });
    // 'PIECE NAME: 11' and 'SIZE: M' are lifted into the structure
    const texts = piece.sizes['M'].annotations.map(a => a.text.toLowerCase());
    expect(texts.some(t => t.startsWith('piece name'))).toBe(false);
    expect(texts.some(t => t.startsWith('size:'))).toBe(false);
  });

  it('should contain internal lines', () => {
    const piece = result.pieces.find(p => p.name === '11')!;
    expect(piece.sizes['M'].internalLines).toHaveLength(6);
  });

  it('should contain a grain line', () => {
    const piece = result.pieces.find(p => p.name === '11')!;
    const grainLine = piece.sizes['M'].grainLine!;
    expect(grainLine).toBeDefined();
    expect(contourPointCount(grainLine)).toBe(2);
  });

  it('preserves the CLO quality-validation boundary (layer 84)', () => {
    const piece = result.pieces.find(p => p.name === '11')!;
    const qv = piece.sizes['M'].qualityValidation!;
    expect(qv).toBeDefined();
    expect(qv.boundary!.length).toBeGreaterThan(0);
  });
});
