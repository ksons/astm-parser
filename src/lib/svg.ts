// eslint-disable-next-line @typescript-eslint/no-require-imports
const d3 = require('d3') as { scaleSequential: (interpolator: unknown) => { domain: (domain: number[]) => (value: number) => string }; interpolateWarm: unknown };
import * as fs from 'fs';
import * as path from 'path';
// @ts-expect-error - pretty-data has no type declarations
import * as pd from 'pretty-data';

import { ASTMParser, Units } from '../index.js';
import { BBox } from './BBox.js';
import type { IShape } from './PatternPiece.js';

// Type for text annotation entities
interface ITextAnnotation {
  startPoint?: { x: number; y: number };
  rotation?: number;
  textHeight?: number;
  text?: string;
}

const DXF_FILE_PATH = path.join(__dirname, '..', '..', 'test', 'data', 'dxf', 'GMG1016S19_ASTM.DXF');
const fileStream = fs.createReadStream(DXF_FILE_PATH, { encoding: 'utf8' });

function roundToTwo(num: number) {
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
  return [`<text  font-family="Verdana" transform="${transformString}" font-size="${text.textHeight}">${text.text}</text>`];
}

function generatePointsFromShape(shape: IShape | null, vertices: number[], bbox: BBox, size: number, unit: Units): string[] {
  if (!shape) {
    return [];
  }
  let i = 0;
  const circles: string[] = [];

  shape.lengths.forEach(len => {
    if (len !== 1) {
      i += len;
      return;
    }
    const vidx = shape.vertices[i];
    const x = vertices[vidx * 2];
    const y = -vertices[vidx * 2 + 1];
    let r = 2;
    if (unit === Units.INCH) {
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

const parser = new ASTMParser();

(async () => {
  const res = await parser.parseStream(fileStream);
  const data = res.data;
  const baseSize = +data.style.baseSize;
  const unit = data.asset.unit;
  const rainbow = d3.scaleSequential(d3.interpolateWarm).domain([+data.sizes[0], +data.sizes[data.sizes.length - 1]]);
  const bbox = new BBox();

  let layerStr = '';
  let layerCount = 0;
  data.pieces.forEach(piece => {
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
      drillHoles: { svg: [], name: 'drillHoles' }
    };

    data.sizes.forEach(key => {
      const size = +key;
      const isBaseSize = size === baseSize;
      const id = piece.name + '-' + size;

      const d = generatePathFromShape(piece.shapes[size], piece.vertices, bbox);
      if (d) {
        const color = rainbow(+size);
        const fill = isBaseSize ? '#ddd' : 'none';
        const sizePath = `<path id="path-${id}" class="size${size}" d="${d}" fill="${fill}" stroke="${color}" vector-effect="non-scaling-stroke"/>`;

        if (isBaseSize) {
          // prepend the baseSize path as it is filled and should be on the bottom of the size stack
          layers.bounderies.svg.unshift(sizePath);
        } else {
          layers.bounderies.svg.push(sizePath);
        }
      }

      const di = generateSegmentsFromShape(piece.internalShapes[size], piece.vertices, bbox);
      layers.internalShapes.svg = layers.internalShapes.svg.concat(
        di.map((dStr, idx) => {
          return `<path id="internal-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="blue" vector-effect="non-scaling-stroke"/>`;
        })
      );

      const tp = generatePointsFromShape(piece.turnPoints[size], piece.vertices, bbox, size, unit);
      layers.turnPoints.svg = layers.turnPoints.svg.concat(tp);

      const dh = generatePointsFromShape(piece.drillHoles[size], piece.vertices, bbox, size, unit);
      layers.drillHoles.svg = layers.drillHoles.svg.concat(dh);

      const cp = generatePointsFromShape(piece.curvePoints[size], piece.vertices, bbox, size, unit);
      layers.curvePoints.svg = layers.curvePoints.svg.concat(cp);

      const no = generatePointsFromShape(piece.notches[size], piece.vertices, bbox, size, unit);
      layers.notches.svg = layers.notches.svg.concat(no);

      const gl = generateSegmentsFromShape(piece.grainLines[size], piece.vertices, bbox);
      layers.grainLines.svg = layers.grainLines.svg.concat(
        gl.map((dStr, idx) => {
          return `<path id="grainline-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="black" vector-effect="non-scaling-stroke" />`;
        })
      );

      const ml = generateSegmentsFromShape(piece.mirrorLines[size], piece.vertices, bbox);
      layers.mirrorLines.svg = layers.mirrorLines.svg.concat(
        ml.map((dStr, idx) => {
          return `<path id="grainline-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="black" vector-effect="non-scaling-stroke" />`;
        })
      );

      const grl = generateSegmentsFromShape(piece.gradeReferences[size], piece.vertices, bbox);
      layers.gradeReferences.svg = layers.gradeReferences.svg.concat(
        grl.map((dStr, idx) => {
          return `<path id="grainline-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="green" vector-effect="non-scaling-stroke" />`;
        })
      );

      const annotation = generateText(piece.annotations[size]);
      layers.annotations.svg = layers.annotations.svg.concat(annotation);
    });

    layerStr += `<g id="layer${layerCount++}" inkscape:label="${piece.name}" inkscape:groupmode="layer">`;

    Object.keys(layers).forEach(layerName => {
      const layer = layers[layerName];
      if (layer.svg.length) {
        layerStr += `<g id="layer${layerCount++}" inkscape:label="${piece.name} ${layer.name}" inkscape:groupmode="layer">`;
        layerStr += layer.svg.join();
        layerStr += '</g>';
      }
    });
    layerStr += '</g>';
  });

  let svgString = '<?xml version="1.0"?>';
  svgString += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"';
  svgString += ` height="297mm" width="210mm" viewBox="${bbox.min.x} ${bbox.min.y} ${bbox.width} ${bbox.height}">`;

  // svgString += ' width="100%" height="100%">' + result.map(x => {return x.path; }).join() + rect + "</svg>";
  svgString += layerStr;

  svgString += '</svg>';

  console.log(pd.pd.xml(svgString));
})().catch(console.error);
