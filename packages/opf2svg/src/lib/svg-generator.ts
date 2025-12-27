import * as d3 from 'd3';
// @ts-expect-error - pretty-data has no type declarations
import * as pd from 'pretty-data';

import type { IOpenPatternFormat, IPatternPiece } from '@open-patterns/astm-parser';
import { BBox } from './BBox.js';

/**
 * Text annotation from pattern data
 */
interface ITextAnnotation {
  startPoint?: { x: number; y: number };
  rotation?: number;
  textHeight?: number;
  text?: string;
}

/**
 * Shape data from pattern piece
 */
interface IShape {
  lengths: number[];
  vertices: number[];
}

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

function generateText(text: ITextAnnotation | null): string[] {
  if (!text) {
    return [];
  }
  let transformString = '';
  if (text.startPoint) {
    const x = text.startPoint.x;
    const y = -text.startPoint.y;
    transformString = `translate(${x} ${y})`;
  }

  if (text.rotation !== undefined) {
    transformString += `rotate(${-text.rotation})`;
  }
  return [`<text font-family="Verdana" transform="${transformString}" font-size="${text.textHeight}">${text.text}</text>`];
}

function generatePointsFromShape(
  shape: IShape | null,
  vertices: number[],
  bbox: BBox,
  size: number,
  unit: number
): string[] {
  if (!shape) {
    return [];
  }
  let i = 0;
  const circles: string[] = [];
  const INCH_UNIT = 2;

  shape.lengths.forEach(len => {
    if (len !== 1) {
      i += len;
      return;
    }
    const vidx = shape.vertices[i];
    const x = vertices[vidx * 2];
    const y = -vertices[vidx * 2 + 1];
    let r = 2;
    if (unit === INCH_UNIT) {
      r = r / 25.4;
    }
    const circleSVG = `<circle class="size${size}" cx="${roundToTwo(x)}" cy="${roundToTwo(y)}" r="${r}" fill="red" />`;
    circles.push(circleSVG);
    bbox.addToBox(x, y);
    i++;
  });
  return circles;
}

function generateSegmentsFromShape(shape: IShape | null, vertices: number[], bbox: BBox): string[] {
  if (!shape) {
    return [];
  }

  let i = 0;
  const da: string[] = [];

  shape.lengths.forEach(len => {
    let d = '';
    for (let j = 0; j < len; j++) {
      const vidx = shape.vertices[i];
      const x = vertices[vidx * 2];
      const y = -vertices[vidx * 2 + 1];
      d += j !== 0 ? 'L ' : 'M ';
      d += `${roundToTwo(x)} ${roundToTwo(y)} `;
      bbox.addToBox(x, y);
      i++;
    }
    da.push(d);
  });
  return da;
}

function generatePathFromShape(shape: IShape | null, vertices: number[], bbox: BBox): string {
  if (!shape) {
    return '';
  }
  let i = 0;
  let d = '';

  shape.lengths.forEach(len => {
    for (let j = 0; j < len; j++) {
      const vidx = shape.vertices[i];
      const x = vertices[vidx * 2];
      const y = -vertices[vidx * 2 + 1];
      d += i !== 0 ? 'L ' : 'M ';
      d += `${roundToTwo(x)} ${roundToTwo(y)} `;
      bbox.addToBox(x, y);
      i++;
    }
  });
  return d;
}

function generatePieceSVG(
  piece: IPatternPiece,
  sizes: string[],
  baseSize: number,
  unit: number,
  bbox: BBox,
  rainbow: (size: number) => string,
  options: Required<SVGOptions>
): string {
  const layers: Record<string, { svg: string[]; name: string }> = {
    annotations: { svg: [], name: 'annotations' },
    bounderies: { svg: [], name: 'bounderies' },
    internalShapes: { svg: [], name: 'internal' },
    turnPoints: { svg: [], name: 'turn points' },
    curvePoints: { svg: [], name: 'curve points' },
    grainLines: { svg: [], name: 'grainLines' },
    notches: { svg: [], name: 'notches' },
    gradeReferences: { svg: [], name: 'gradeReference' },
    mirrorLines: { svg: [], name: 'mirrorLines' },
    drillHoles: { svg: [], name: 'drillHoles' },
  };

  sizes.forEach(key => {
    const size = +key;
    const isBaseSize = size === baseSize;
    const id = piece.name + '-' + size;

    // Access shapes with string key, cast to IShape
    const shapeData = (piece.shapes as Record<string, IShape>)[key];
    const d = generatePathFromShape(shapeData, piece.vertices, bbox);
    if (d) {
      const color = rainbow(size);
      const fill = isBaseSize ? options.baseSizeFill : 'none';
      const sizePath = `<path id="path-${id}" class="size${size}" d="${d}" fill="${fill}" stroke="${color}" vector-effect="non-scaling-stroke"/>`;

      if (isBaseSize) {
        layers.bounderies.svg.unshift(sizePath);
      } else {
        layers.bounderies.svg.push(sizePath);
      }
    }

    const internalData = (piece.internalShapes as Record<string, IShape>)[key];
    const di = generateSegmentsFromShape(internalData, piece.vertices, bbox);
    layers.internalShapes.svg = layers.internalShapes.svg.concat(
      di.map((dStr, idx) => `<path id="internal-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="blue" vector-effect="non-scaling-stroke"/>`)
    );

    const turnData = (piece.turnPoints as Record<string, IShape>)[key];
    const tp = generatePointsFromShape(turnData, piece.vertices, bbox, size, unit);
    layers.turnPoints.svg = layers.turnPoints.svg.concat(tp);

    const drillData = (piece.drillHoles as Record<string, IShape>)[key];
    const dh = generatePointsFromShape(drillData, piece.vertices, bbox, size, unit);
    layers.drillHoles.svg = layers.drillHoles.svg.concat(dh);

    const curveData = (piece.curvePoints as Record<string, IShape>)[key];
    const cp = generatePointsFromShape(curveData, piece.vertices, bbox, size, unit);
    layers.curvePoints.svg = layers.curvePoints.svg.concat(cp);

    const notchData = (piece.notches as Record<string, IShape>)[key];
    const no = generatePointsFromShape(notchData, piece.vertices, bbox, size, unit);
    layers.notches.svg = layers.notches.svg.concat(no);

    const grainData = (piece.grainLines as Record<string, IShape>)[key];
    const gl = generateSegmentsFromShape(grainData, piece.vertices, bbox);
    layers.grainLines.svg = layers.grainLines.svg.concat(
      gl.map((dStr, idx) => `<path id="grainline-${id}-${idx}" class="size${size}" d="${dStr}" fill="none" stroke="black" vector-effect="non-scaling-stroke" />`)
    );

    const mirrorData = (piece.mirrorLines as Record<string, IShape>)[key];
    const ml = generateSegmentsFromShape(mirrorData, piece.vertices, bbox);
    layers.mirrorLines.svg = layers.mirrorLines.svg.concat(
      ml.map((dStr, idx) => `<path id="mirror-${id}-${idx}" class="size${size}" d="${dStr}" fill="none" stroke="black" vector-effect="non-scaling-stroke" />`)
    );

    const gradeData = (piece.gradeReferences as Record<string, IShape>)[key];
    const grl = generateSegmentsFromShape(gradeData, piece.vertices, bbox);
    layers.gradeReferences.svg = layers.gradeReferences.svg.concat(
      grl.map((dStr, idx) => `<path id="grade-${id}-${idx}" class="size${size}" d="${dStr}" fill="none" stroke="green" vector-effect="non-scaling-stroke" />`)
    );

    const annotationData = (piece.annotations as Record<string, ITextAnnotation | null>)[key];
    const annotation = generateText(annotationData);
    layers.annotations.svg = layers.annotations.svg.concat(annotation);
  });

  let result = '';
  Object.keys(layers).forEach(layerName => {
    const layer = layers[layerName];
    if (layer.svg.length) {
      if (options.inkscapeLayers) {
        result += `<g inkscape:label="${piece.name} ${layer.name}" inkscape:groupmode="layer">`;
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
  const baseSize = +data.style.baseSize;
  const unit = data.asset.unit;

  const rainbow = d3.scaleSequential(d3.interpolateWarm).domain([+sizes[0], +sizes[sizes.length - 1]]);
  const bbox = new BBox();

  let layerStr = '';
  let layerCount = 0;

  data.pieces.forEach(piece => {
    const pieceContent = generatePieceSVG(piece, sizes, baseSize, unit, bbox, rainbow, opts);

    if (opts.inkscapeLayers) {
      layerStr += `<g id="layer${layerCount++}" inkscape:label="${piece.name}" inkscape:groupmode="layer">`;
    } else {
      layerStr += `<g id="piece-${piece.name}">`;
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
