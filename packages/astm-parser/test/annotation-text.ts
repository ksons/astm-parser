import { describe, it, beforeAll, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { ASTMParser } from '../src/index.js';

describe('ASTM with annotation text', () => {
  let result;
  let diagnostics;

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'annotation.DXF');
    const fileStream = fs.createReadStream(DXF_FILE_PATH, { encoding: 'utf8' });

    const parser = new ASTMParser();
    const res = await parser.parseStream(fileStream);
    expect(res).toBeTypeOf('object');
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have no diagnostics', () => {
    expect(diagnostics).toHaveLength(1989); // ASTM
  });

  it('should have asset information', () => {
    expect(result).toHaveProperty('asset');
    expect(result.asset).toBeTypeOf('object');
    expect(result.asset).toHaveProperty('authoringVendor', 'GERBER TECHNOLOGY ; ACCUMARK ; 10.0.1');
    expect(result.asset).toHaveProperty('authoringTool', '');
    expect(result.asset).toHaveProperty('authoringToolVersion', '');
    expect(result.asset).toHaveProperty('creationDate', '23-10-2017');
    expect(result.asset).toHaveProperty('creationTime', '10:31');
    expect(result.asset).toHaveProperty('unit', 1);
  });

  it('should have style information', () => {
    expect(result).toHaveProperty('style');
    expect(result.style).toBeTypeOf('object');
    expect(result.style).toHaveProperty('baseSize', '50');
    expect(result.style).toHaveProperty('name', 'GMG1016S19');
  });

  it('should have annotations information', () => {
    const piece = result.pieces[0];
    expect(piece).toHaveProperty('annotations');
    expect(piece.annotations).toBeTypeOf('object');
    expect(Object.keys(piece.annotations)).toEqual(expect.arrayContaining(result.sizes));

    const annotation = piece.annotations[52];
    console.log(annotation);
    expect(annotation).toBeTypeOf('object');
    expect(annotation.text).toBe('Neckline Full Collar W/stand');
  });
});
