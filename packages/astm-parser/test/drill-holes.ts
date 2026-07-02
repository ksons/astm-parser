import { describe, it, beforeAll, expect } from 'vitest';
import * as path from 'path';

import { ASTMParser, Diagnostic, IOpenPatternFormat } from '../src/index.js';

describe('ASTM with drill holes', () => {
  let result: IOpenPatternFormat;
  let diagnostics: Diagnostic[];

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'drill-holes.DXF');
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
    expect(result.asset).toHaveProperty('authoringVendor', 'GERBER TECHNOLOGY');
    expect(result.asset).toHaveProperty('authoringTool', 'ACCUMARK');
    expect(result.asset).toHaveProperty('authoringToolVersion', '10.0.1');
    expect(result.asset).toHaveProperty('creationDate', '23-10-2017');
    expect(result.asset).toHaveProperty('creationTime', '10:42');
    expect(result.asset).toHaveProperty('unit', 'mm');
  });

  it('should have style information', () => {
    expect(result.style).toHaveProperty('baseSize', '50');
    expect(result.style).toHaveProperty('name', 'SS17_M POLO REG');
  });

  it('should have drill holes as vertex indices', () => {
    const piece = result.pieces[0];
    const snapshot = piece.sizes['52'];
    expect(snapshot.drillHoles).toHaveLength(1);
    const index = snapshot.drillHoles[0];
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(snapshot.vertices.length / 2);
  });
});
