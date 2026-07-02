import { describe, it, expect } from 'vitest';

import { ASTMParser, compareSizes, OPF_VERSION } from '../src/index.js';

/** Build a group-code/value DXF string from pairs. */
function dxf(...pairs: Array<[number | string, string | number]>): string {
  return pairs.map(([code, value]) => `${code}\n${value}`).join('\n') + '\n';
}

function textEntity(layer: number, text: string, x = 0, y = 0): Array<[number | string, string | number]> {
  return [
    [0, 'TEXT'],
    [8, layer],
    [10, x],
    [20, y],
    [40, 1],
    [1, text],
  ];
}

function pointEntity(layer: number, x: number, y: number): Array<[number | string, string | number]> {
  return [
    [0, 'POINT'],
    [8, layer],
    [10, x],
    [20, y],
  ];
}

function polyline(layer: number, points: Array<[number, number]>): Array<[number | string, string | number]> {
  const pairs: Array<[number | string, string | number]> = [
    [0, 'POLYLINE'],
    [8, layer],
    [66, 1],
    [70, 0],
  ];
  for (const [x, y] of points) {
    pairs.push([0, 'VERTEX'], [8, layer], [10, x], [20, y]);
  }
  pairs.push([0, 'SEQEND']);
  return pairs;
}

function block(name: string, size: string): Array<[number | string, string | number]> {
  return [
    [0, 'BLOCK'],
    [8, 0],
    [2, `${name}-${size}`],
    [70, 0],
    [10, 0],
    [20, 0],
    ...textEntity(1, `Piece Name: ${name}`),
    ...textEntity(1, `Size: ${size}`),
    // boundary split into two fragments that chain into a closed square:
    // (0,0) -> (10,0) -> (10,10) and (10,10) -> (0,10) -> (0,0)
    ...polyline(1, [[0, 0], [10, 0], [10, 10]]),
    ...polyline(1, [[10, 10], [0, 10], [0, 0]]),
    // two annotations
    ...textEntity(15, 'First note', 1, 1),
    ...textEntity(15, 'Second note', 2, 2),
    // v-notch on a boundary vertex (tests dedup), T-notch elsewhere
    ...pointEntity(4, 10, 0),
    ...pointEntity(80, 5, 0),
    [0, 'ENDBLK'],
  ];
}

const SYNTHETIC_DXF = dxf(
  [0, 'SECTION'],
  [2, 'BLOCKS'],
  ...block('TESTPIECE', '8'),
  ...block('TESTPIECE', '10'),
  [0, 'ENDSEC'],
  [0, 'SECTION'],
  [2, 'ENTITIES'],
  ...textEntity(1, 'Style Name: TESTSTYLE'),
  ...textEntity(1, 'Sample Size: 8'),
  ...textEntity(1, 'Units: METRIC'),
  [0, 'ENDSEC'],
  [0, 'EOF']
);

describe('synthetic DXF via parseString', () => {
  it('parses the synthetic pattern', async () => {
    const parser = new ASTMParser();
    const { data, diagnostics } = await parser.parseString(SYNTHETIC_DXF);

    expect(diagnostics).toHaveLength(0);
    expect(data.version).toBe(OPF_VERSION);
    expect(data.style).toEqual({ name: 'TESTSTYLE', baseSize: '8' });
    expect(data.asset.unit).toBe('mm');
    expect(data.pieces).toHaveLength(1);
    expect(data.pieces[0].name).toBe('TESTPIECE');
    expect(Object.keys(data.pieces[0].sizes).sort()).toEqual(['10', '8']);
  });

  it('sorts numeric sizes numerically', async () => {
    const parser = new ASTMParser();
    const { data } = await parser.parseString(SYNTHETIC_DXF);
    // string sort would produce ['10', '8']
    expect(data.sizes).toEqual(['8', '10']);
  });

  it('chains boundary fragments into one closed contour', async () => {
    const parser = new ASTMParser();
    const { data } = await parser.parseString(SYNTHETIC_DXF);
    const boundary = data.pieces[0].sizes['8'].boundary;
    expect(boundary.closed).toBe(true);
    // square: 4 unique corners, no closing repeat
    expect(boundary.segments).toHaveLength(1);
    const segment = boundary.segments[0];
    expect(segment.type).toBe('lines');
    if (segment.type === 'lines') {
      expect(1 + segment.to.length).toBe(4);
    }
  });

  it('keeps all annotations of a snapshot', async () => {
    const parser = new ASTMParser();
    const { data } = await parser.parseString(SYNTHETIC_DXF);
    const annotations = data.pieces[0].sizes['8'].annotations.filter(a => a.source === undefined);
    expect(annotations.map(annotation => annotation.text)).toEqual(['First note', 'Second note']);
    expect(annotations[0].position).toEqual({ x: 1, y: 1 });
  });

  it('creates typed notch objects from layers 4 and 80', async () => {
    const parser = new ASTMParser();
    const { data } = await parser.parseString(SYNTHETIC_DXF);
    const notches = data.pieces[0].sizes['8'].notches;
    expect(notches).toHaveLength(2);
    expect(notches.map(notch => notch.type)).toEqual(['v-slit', 't']);
  });

  it('deduplicates vertices shared between layers', async () => {
    const parser = new ASTMParser();
    const { data } = await parser.parseString(SYNTHETIC_DXF);
    const snapshot = data.pieces[0].sizes['8'];
    // v-notch at (10,0) coincides with the second boundary corner
    const boundarySegment = snapshot.boundary.segments[0];
    const boundaryIndices = [
      snapshot.boundary.start,
      ...(boundarySegment.type === 'lines' ? boundarySegment.to : []),
    ];
    expect(boundaryIndices).toContain(snapshot.notches[0].vertex);
    // vertex pool: 4 corners + 1 T-notch position = 5 unique vertices
    expect(snapshot.vertices.length).toBe(5 * 2);
  });

  it('does not leak diagnostics between parses on a reused parser', async () => {
    const parser = new ASTMParser();
    const first = await parser.parseString(SYNTHETIC_DXF);
    const second = await parser.parseString(SYNTHETIC_DXF);
    expect(first.diagnostics).toHaveLength(0);
    expect(second.diagnostics).toHaveLength(0);
  });

  it('serializes without private parser state', async () => {
    const parser = new ASTMParser();
    const { data } = await parser.parseString(SYNTHETIC_DXF);
    const json = JSON.parse(JSON.stringify(data));
    const snapshot = json.pieces[0].sizes['8'];
    expect(Object.keys(snapshot)).not.toContain('vertexIndex');
    expect(snapshot.vertices.length).toBeGreaterThan(0);
  });
});

describe('compareSizes', () => {
  it('sorts numerically when possible', () => {
    expect(['10', '8', '12'].sort(compareSizes)).toEqual(['8', '10', '12']);
  });

  it('falls back to alphabetical for non-numeric sizes', () => {
    expect(['M', 'L', 'S'].sort(compareSizes)).toEqual(['L', 'M', 'S']);
  });
});
