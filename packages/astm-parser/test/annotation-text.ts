import { describe, it, beforeAll, expect } from 'vitest';
import * as path from 'path';

import { ASTMParser, Diagnostic, IOpenPatternFormat } from '../src/index.js';

describe('ASTM with annotation text', () => {
  let result: IOpenPatternFormat;
  let diagnostics: Diagnostic[];

  beforeAll(async () => {
    const DXF_FILE_PATH = path.join(__dirname, 'data', 'dxf', 'annotation.DXF');
    const parser = new ASTMParser();
    const res = await parser.parseFile(DXF_FILE_PATH);
    expect(res).toBeTypeOf('object');
    result = res.data;
    diagnostics = res.diagnostics;
  });

  it('should have only the known key-value syntax diagnostic', () => {
    // One TEXT entity 'ANNOTATION' without key:value syntax
    expect(diagnostics).toHaveLength(1);
  });

  it('should have asset information', () => {
    expect(result.asset).toHaveProperty('authoringVendor', 'GERBER TECHNOLOGY ; ACCUMARK ; 10.0.1');
    expect(result.asset).toHaveProperty('authoringTool', '');
    expect(result.asset).toHaveProperty('authoringToolVersion', '');
    expect(result.asset).toHaveProperty('creationDate', '23-10-2017');
    expect(result.asset).toHaveProperty('creationTime', '10:31');
    expect(result.asset).toHaveProperty('unit', 'mm');
  });

  it('should have style information', () => {
    expect(result.style).toHaveProperty('baseSize', '50');
    expect(result.style).toHaveProperty('name', 'GMG1016S19');
  });

  it('should have annotation text on the snapshot', () => {
    const piece = result.pieces[0];
    const annotations = piece.sizes['52'].annotations.filter(a => a.source === undefined);
    expect(annotations).toHaveLength(1);
    expect(annotations[0].text).toBe('Neckline Full Collar W/stand');
    expect(annotations[0].position).toBeDefined();
  });
});
