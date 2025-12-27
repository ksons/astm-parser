import { describe, it, beforeAll, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { ASTMParser } from '../src/index.js';

describe('ASTM with mirror lines', () => {
  let result;
  let diagnostics;

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'mirrored.DXF');
    const fileStream = fs.createReadStream(DXF_FILE_PATH, { encoding: 'utf8' });

    const parser = new ASTMParser();
    const res = await parser.parseStream(fileStream);
    expect(res).toBeTypeOf('object');
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have no diagnostics', () => {
    expect(diagnostics).toHaveLength(1); // One diagnostic for a wrong text type
  });

  it('should have asset information', () => {
    expect(result).toHaveProperty('asset');
    expect(result.asset).toBeTypeOf('object');
    expect(result.asset).toHaveProperty('authoringVendor', 'GERBER TECHNOLOGY');
    expect(result.asset).toHaveProperty('authoringTool', 'ACCUMARK');
    expect(result.asset).toHaveProperty('authoringToolVersion', '10.0.1');
    expect(result.asset).toHaveProperty('creationDate', '23-10-2017');
    expect(result.asset).toHaveProperty('creationTime', '10:31');
  });

  it('should have style information', () => {
    expect(result).toHaveProperty('style');
    expect(result.style).toBeTypeOf('object');
    expect(result.style).toHaveProperty('baseSize', '50');
    expect(result.style).toHaveProperty('name', 'GMG1016S19');
  });

  it('should have mirror information', () => {
    const piece = result.pieces[0];
    expect(piece).toHaveProperty('mirrorLines');
    expect(piece.mirrorLines).toBeTypeOf('object');
    expect(Object.keys(piece.mirrorLines)).toEqual(expect.arrayContaining(result.sizes));

    const ml = piece.mirrorLines[52];
    expect(ml).toBeTypeOf('object');
    expect(ml.vertices.length).toBe(2);
    expect(ml.vertices.length).toBe(ml.lengths.reduce((acc, prev) => acc + prev));
  });
});
