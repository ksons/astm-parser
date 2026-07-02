import * as d3 from 'd3';
// @ts-expect-error - pretty-data has no type declarations
import * as pd from 'pretty-data';

import type {
  IContour,
  IOpenPatternFormat,
  IPatternPiece,
  ISizeSnapshot,
  TextAnnotation,
} from '@open-patterns/astm-parser';
import { BBox } from './BBox.js';

/**
 * Options for SVG generation
 */
export interface SVGOptions {
  /** Page width (default: "210mm" for A4) */
  width?: string;
  /** Page height (default: "297mm" for A4) */
  height?: string;
  /** Pretty-print the XML output (default: true) */
  prettyPrint?: boolean;
  /** Include Inkscape layer metadata (default: true) */
  inkscapeLayers?: boolean;
  /** Sizes to render (default: all sizes) */
  sizes?: string[];
  /** Base size fill color (default: "#ddd") */
  baseSizeFill?: string;
}

const DEFAULT_OPTIONS: Required<SVGOptions> = {
  width: '210mm',
  height: '297mm',
  prettyPrint: true,
  inkscapeLayers: true,
  sizes: [],
  baseSizeFill: '#ddd',
};

function roundToTwo(num: number): number {
  return +(Math.round(+(num + 'e+2')) + 'e-2');
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Look up a pool vertex in SVG coordinates (y flipped) and track the bbox. */
function vertexAt(vertices: number[], index: number, bbox: BBox): { x: number; y: number } {
  const x = vertices[index * 2];
  const y = -vertices[index * 2 + 1];
  bbox.addToBox(x, y);
  return { x, y };
}

/** Convert a contour to SVG path data (M/L/C/Z). */
function contourToPath(contour: IContour, vertices: number[], bbox: BBox): string {
  const start = vertexAt(vertices, contour.start, bbox);
  let d = `M ${roundToTwo(start.x)} ${roundToTwo(start.y)} `;

  for (const segment of contour.segments) {
    if (segment.type === 'lines') {
      for (const index of segment.to) {
        const p = vertexAt(vertices, index, bbox);
        d += `L ${roundToTwo(p.x)} ${roundToTwo(p.y)} `;
      }
    } else {
      const c1 = vertexAt(vertices, segment.c1, bbox);
      const c2 = vertexAt(vertices, segment.c2, bbox);
      const to = vertexAt(vertices, segment.to, bbox);
      d += `C ${roundToTwo(c1.x)} ${roundToTwo(c1.y)} ${roundToTwo(c2.x)} ${roundToTwo(c2.y)} ${roundToTwo(to.x)} ${roundToTwo(to.y)} `;
    }
  }
  if (contour.closed) {
    d += 'Z';
  }
  return d.trimEnd();
}

function circles(indices: number[], vertices: number[], bbox: BBox, size: string, unit: string, fill: string): string[] {
  const radius = unit === 'inch' ? 2 / 25.4 : 2;
  return indices.map(index => {
    const p = vertexAt(vertices, index, bbox);
    return `<circle class="size${size}" cx="${roundToTwo(p.x)}" cy="${roundToTwo(p.y)}" r="${radius}" fill="${fill}" />`;
  });
}

function texts(annotations: TextAnnotation[], size: string): string[] {
  return annotations
    .filter(annotation => annotation.source === undefined)
    .map(annotation => {
      let transform = '';
      if (annotation.position) {
        transform = `translate(${annotation.position.x} ${-annotation.position.y})`;
      }
      if (annotation.rotation !== undefined) {
        transform += `rotate(${-annotation.rotation})`;
      }
      return `<text class="size${size}" font-family="Verdana" transform="${transform}" font-size="${annotation.height}">${escapeXML(annotation.text)}</text>`;
    });
}

interface ContourLayerStyle {
  stroke: string;
  dashArray?: string;
}

const CONTOUR_LAYERS: Array<{
  key: 'internalLines' | 'internalCutouts' | 'sewLines' | 'stripeReferences' | 'plaidReferences' | 'gradeReferences';
  name: string;
  idPrefix: string;
  style: ContourLayerStyle;
}> = [
  { key: 'internalLines', name: 'internal', idPrefix: 'internal', style: { stroke: 'blue' } },
  { key: 'internalCutouts', name: 'internal cutouts', idPrefix: 'cutout', style: { stroke: 'purple' } },
  { key: 'sewLines', name: 'sew lines', idPrefix: 'sewline', style: { stroke: 'magenta', dashArray: '4 2' } },
  { key: 'stripeReferences', name: 'stripe references', idPrefix: 'stripe', style: { stroke: 'gray', dashArray: '8 4' } },
  { key: 'plaidReferences', name: 'plaid references', idPrefix: 'plaid', style: { stroke: 'gray', dashArray: '2 2' } },
  { key: 'gradeReferences', name: 'gradeReference', idPrefix: 'grade', style: { stroke: 'green' } },
];

const SINGLE_CONTOUR_LAYERS: Array<{
  key: 'grainLine' | 'mirrorLine';
  name: string;
  idPrefix: string;
  style: ContourLayerStyle;
}> = [
  { key: 'grainLine', name: 'grainLine', idPrefix: 'grainline', style: { stroke: 'black' } },
  { key: 'mirrorLine', name: 'mirrorLine', idPrefix: 'mirror', style: { stroke: 'black' } },
];

const POINT_LAYERS: Array<{
  key: 'turnPoints' | 'curvePoints' | 'drillHoles';
  name: string;
  fill: string;
}> = [
  { key: 'turnPoints', name: 'turn points', fill: 'red' },
  { key: 'curvePoints', name: 'curve points', fill: 'red' },
  { key: 'drillHoles', name: 'drillHoles', fill: 'red' },
];

function contourPathElement(
  contour: IContour,
  snapshot: ISizeSnapshot,
  bbox: BBox,
  id: string,
  size: string,
  style: ContourLayerStyle
): string {
  const d = contourToPath(contour, snapshot.vertices, bbox);
  const dash = style.dashArray ? ` stroke-dasharray="${style.dashArray}"` : '';
  return `<path id="${id}" class="size${size}" d="${d}" fill="none" stroke="${style.stroke}"${dash} vector-effect="non-scaling-stroke"/>`;
}

function generatePieceSVG(
  piece: IPatternPiece,
  sizes: string[],
  baseSize: string,
  unit: string,
  bbox: BBox,
  colorForSize: (size: string) => string,
  options: Required<SVGOptions>
): string {
  const layers: Record<string, { svg: string[]; name: string }> = {
    annotations: { svg: [], name: 'annotations' },
    boundaries: { svg: [], name: 'boundaries' },
  };
  [...CONTOUR_LAYERS, ...SINGLE_CONTOUR_LAYERS].forEach(({ key, name }) => {
    layers[key] = { svg: [], name };
  });
  layers.notches = { svg: [], name: 'notches' };
  POINT_LAYERS.forEach(({ key, name }) => {
    layers[key] = { svg: [], name };
  });

  for (const size of sizes) {
    const snapshot = piece.sizes[size];
    if (!snapshot) {
      continue;
    }
    const isBaseSize = size === baseSize;
    const id = `${piece.name}-${size}`;

    const d = contourToPath(snapshot.boundary, snapshot.vertices, bbox);
    const fill = isBaseSize ? options.baseSizeFill : 'none';
    const boundaryPath = `<path id="path-${id}" class="size${size}" d="${d}" fill="${fill}" stroke="${colorForSize(size)}" vector-effect="non-scaling-stroke"/>`;
    if (isBaseSize) {
      layers.boundaries.svg.unshift(boundaryPath);
    } else {
      layers.boundaries.svg.push(boundaryPath);
    }

    for (const { key, idPrefix, style } of CONTOUR_LAYERS) {
      snapshot[key].forEach((contour, index) => {
        layers[key].svg.push(contourPathElement(contour, snapshot, bbox, `${idPrefix}-${id}-${index}`, size, style));
      });
    }

    for (const { key, idPrefix, style } of SINGLE_CONTOUR_LAYERS) {
      const contour = snapshot[key];
      if (contour) {
        layers[key].svg.push(contourPathElement(contour, snapshot, bbox, `${idPrefix}-${id}`, size, style));
      }
    }

    layers.notches.svg.push(
      ...circles(snapshot.notches.map(notch => notch.vertex), snapshot.vertices, bbox, size, unit, 'red')
    );
    for (const { key, fill: pointFill } of POINT_LAYERS) {
      layers[key].svg.push(...circles(snapshot[key], snapshot.vertices, bbox, size, unit, pointFill));
    }

    layers.annotations.svg.push(...texts(snapshot.annotations, size));
  }

  let result = '';
  Object.keys(layers).forEach(layerName => {
    const layer = layers[layerName];
    if (layer.svg.length) {
      if (options.inkscapeLayers) {
        result += `<g inkscape:label="${escapeXML(piece.name)} ${layer.name}" inkscape:groupmode="layer">`;
      } else {
        result += `<g data-layer="${layer.name}">`;
      }
      result += layer.svg.join('');
      result += '</g>';
    }
  });

  return result;
}

/**
 * Generate SVG string from Open Pattern Format data
 */
export function generateSVG(data: IOpenPatternFormat, options: SVGOptions = {}): string {
  const opts: Required<SVGOptions> = { ...DEFAULT_OPTIONS, ...options };
  const sizes = opts.sizes.length > 0 ? opts.sizes : data.sizes;
  const baseSize = data.style.baseSize;
  const unit = data.asset.unit;

  // Color by size index so non-numeric sizes (S, M, L) work as well
  const rainbow = d3.scaleSequential(d3.interpolateWarm).domain([0, Math.max(sizes.length - 1, 1)]);
  const sizeIndex = new Map(sizes.map((size, i) => [size, i]));
  const colorForSize = (size: string) => rainbow(sizeIndex.get(size) ?? 0);

  const bbox = new BBox();

  let layerStr = '';
  let layerCount = 0;

  data.pieces.forEach(piece => {
    const pieceContent = generatePieceSVG(piece, sizes, baseSize, unit, bbox, colorForSize, opts);
    if (!pieceContent) {
      return;
    }
    if (opts.inkscapeLayers) {
      layerStr += `<g id="layer${layerCount++}" inkscape:label="${escapeXML(piece.name)}" inkscape:groupmode="layer">`;
    } else {
      layerStr += `<g id="piece-${escapeXML(piece.name)}">`;
    }
    layerStr += pieceContent;
    layerStr += '</g>';
  });

  let svgString = '<?xml version="1.0"?>';
  svgString += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
  if (opts.inkscapeLayers) {
    svgString += ' xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"';
  }
  svgString += ` height="${opts.height}" width="${opts.width}" viewBox="${bbox.min.x} ${bbox.min.y} ${bbox.width} ${bbox.height}">`;
  svgString += layerStr;
  svgString += '</svg>';

  if (opts.prettyPrint) {
    return pd.pd.xml(svgString);
  }
  return svgString;
}
