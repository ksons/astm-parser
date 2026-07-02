import { describe, it, beforeAll, expect } from 'vitest';
import * as path from 'path';

import { ASTMParser, Diagnostic, IOpenPatternFormat } from '../src/index.js';
import { contourPointCount } from './helpers.js';

describe('ASTM with mirror lines', () => {
  let result: IOpenPatternFormat;
  let diagnostics: Diagnostic[];

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'mirrored.DXF');
    const parser = new ASTMParser();
    const res = await parser.parseFile(DXF_FILE_PATH);
    expect(res).toBeTypeOf('object');
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have one diagnostic for a non key-value text', () => {
    expect(diagnostics).toHaveLength(1);
  });

  it('should have asset information', () => {
    expect(result.asset).toHaveProperty('authoringVendor', 'GERBER TECHNOLOGY');
    expect(result.asset).toHaveProperty('authoringTool', 'ACCUMARK');
    expect(result.asset).toHaveProperty('authoringToolVersion', '10.0.1');
    expect(result.asset).toHaveProperty('creationDate', '23-10-2017');
    expect(result.asset).toHaveProperty('creationTime', '10:31');
  });

  it('should have style information', () => {
    expect(result.style).toHaveProperty('baseSize', '50');
    expect(result.style).toHaveProperty('name', 'GMG1016S19');
  });

  it('should have a single mirror line per snapshot', () => {
    const piece = result.pieces[0];
    const mirrorLine = piece.sizes['52'].mirrorLine!;
    expect(mirrorLine).toBeDefined();
    expect(mirrorLine.closed).toBe(false);
    expect(contourPointCount(mirrorLine)).toBe(2);
  });
});
