import { describe, it, beforeAll, expect } from 'vitest';
import * as path from 'path';

import { ASTMParser, IOpenPatternFormat } from '@open-patterns/astm-parser';
import { generateSVG } from '../src/index.js';

const DXF_DIR = path.join(__dirname, '..', '..', 'astm-parser', 'test', 'data', 'dxf');

describe('generateSVG', () => {
  let simple: IOpenPatternFormat;
  let withSewLines: IOpenPatternFormat;

  beforeAll(async () => {
    const parser = new ASTMParser();
    simple = (await parser.parseFile(path.join(DXF_DIR, 'simple.DXF'))).data;
    withSewLines = (await parser.parseFile(path.join(DXF_DIR, 'GMH2446F17_INCLALLOWANCE_ASTM.DXF'))).data;
  });

  it('produces a well-formed SVG document', () => {
    const svg = generateSVG(simple, { prettyPrint: false });
    expect(svg.startsWith('<?xml version="1.0"?>')).toBe(true);
    expect(svg).toContain('<svg version="1.1"');
    expect(svg).toContain('viewBox=');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('renders a closed boundary path per piece and size', () => {
    const svg = generateSVG(simple, { prettyPrint: false });
    for (const piece of simple.pieces) {
      for (const size of simple.sizes) {
        expect(svg).toContain(`id="path-${piece.name}-${size}"`);
      }
    }
    // boundary contours are closed
    expect(svg).toMatch(/id="path-[^"]+" class="size\d+" d="M [^"]*Z"/);
  });

  it('fills the base size', () => {
    const svg = generateSVG(simple, { prettyPrint: false });
    const baseSize = simple.style.baseSize;
    const basePath = svg
      .split('<path')
      .find(fragment => fragment.includes(`class="size${baseSize}"`) && fragment.includes('fill="#ddd"'));
    expect(basePath).toBeDefined();
  });

  it('filters to requested sizes', () => {
    const svg = generateSVG(simple, { prettyPrint: false, sizes: ['36'] });
    expect(svg).toContain('class="size36"');
    expect(svg).not.toContain('class="size38"');
  });

  it('renders sew lines dashed', () => {
    const svg = generateSVG(withSewLines, { prettyPrint: false, sizes: [withSewLines.style.baseSize] });
    expect(svg).toContain('id="sewline-');
    expect(svg).toContain('stroke-dasharray="4 2"');
  });

  it('emits data-layer groups when Inkscape layers are disabled', () => {
    const svg = generateSVG(simple, { prettyPrint: false, inkscapeLayers: false });
    expect(svg).toContain('data-layer=');
    expect(svg).not.toContain('inkscape:');
  });

  it('escapes XML special characters in annotations', () => {
    const data: IOpenPatternFormat = JSON.parse(JSON.stringify(simple));
    const size = data.sizes[0];
    data.pieces[0].sizes[size].annotations = [
      { text: 'A < B & "C"', position: { x: 0, y: 0 }, height: 5 },
    ];
    const svg = generateSVG(data, { prettyPrint: false });
    expect(svg).toContain('A &lt; B &amp; &quot;C&quot;');
  });

  it('renders cubic segments as SVG C commands', () => {
    const data: IOpenPatternFormat = {
      version: '0.3.0',
      asset: {
        authoringTool: 'test',
        authoringToolVersion: '1',
        authoringVendor: 'test',
        creationDate: '',
        creationTime: '',
        unit: 'mm',
      },
      style: { name: 'cubic-test', baseSize: 'M' },
      sizes: ['M'],
      pieces: [
        {
          name: 'CURVED',
          sizes: {
            M: {
              // square with one curved edge: corners + two control points
              vertices: [0, 0, 100, 0, 100, 100, 0, 100, 120, 30, 120, 70],
              boundary: {
                start: 0,
                closed: true,
                segments: [
                  { type: 'lines', to: [1] },
                  { type: 'cubic', c1: 4, c2: 5, to: 2 },
                  { type: 'lines', to: [3] },
                ],
              },
              internalLines: [],
              internalCutouts: [],
              sewLines: [],
              stripeReferences: [],
              plaidReferences: [],
              gradeReferences: [],
              turnPoints: [],
              curvePoints: [],
              drillHoles: [],
              notches: [],
              annotations: [],
            },
          },
        },
      ],
    };

    const svg = generateSVG(data, { prettyPrint: false });
    expect(svg).toContain('d="M 0 0 L 100 0 C 120 -30 120 -70 100 -100 L 0 -100 Z"');
  });
});
