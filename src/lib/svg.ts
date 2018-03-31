import * as d3 from 'd3';
import * as d3c from 'd3-scale-chromatic';
import * as fs from 'fs';
import * as path from 'path';
import * as pd from 'pretty-data';

import { ASTMParser } from '..';
import { BBox } from './BBox';

const DXF_FILE_PATH = path.join(__dirname, '..', '..', 'test', 'data', 'dxf', 'SS17_M POLO REG_AAMA.DXF');
const fileStream = fs.createReadStream(DXF_FILE_PATH, { encoding: 'utf8' });

function roundToTwo(num: number) {
  return +(Math.round(num + 'e+2') + 'e-2');
}

function generatePointsFromShape(shape, vertices: number[], bbox: BBox, size: number): string[] {
  if (!shape) {
    return [];
  }
  let i = 0;
  const circles = [];

  shape.lengths.forEach(len => {
    if (len !== 1) {
      i += len;
      return;
    }
    const vidx = shape.vertices[i];
    const x = vertices[vidx * 2];
    const y = -vertices[vidx * 2 + 1];
    const circleSVG = `<circle class="size${size}" cx="${roundToTwo(x)}" cy="${roundToTwo(y)}" r="10" fill="red" vector-effect="non-scaling-stroke" />`;
    circles.push(circleSVG);
    bbox.addToBox(x, y);
    i++;
  });
  return circles;
}

function generateSegmentsFromShape(shape, vertices: number[], bbox: BBox): string[] {
  if (!shape) {
    return [];
  }

  let i = 0;
  const da = [];

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

function generatePathFromShape(shape, vertices: number[], bbox: BBox): string {
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
parser.parseStream(fileStream, (err, res) => {
  if (err) {
    console.error(err);
    return;
  }

  const data = res.data;
  const baseSize = data.baseSize;
  const rainbow = d3.scaleSequential(d3.interpolateWarm).domain([data.sizes[0], data.sizes[data.sizes.length - 1]]);
  const bbox = new BBox();

  let layerStr = '';
  let layerCount = 0;
  data.pieces.forEach(piece => {
    const layers = {
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

    data.sizes.forEach(size => {
      const isBaseSize = size === baseSize;
      const id = piece.name + '-' + size;

      const d = generatePathFromShape(piece.shapes[size], data.vertices, bbox);
      if (d) {
        const color = rainbow(size);
        const fill = isBaseSize ? '#ddd' : 'none';
        const sizePath = `<path id="path-${id}" class="size${size}" d="${d}" fill="${fill}" stroke="${color}" vector-effect="non-scaling-stroke"/>`;

        if (isBaseSize) {
          // prepend the baseSize path as it is filled and should be on the bottom of the size stack
          layers.bounderies.svg.unshift(sizePath);
        } else {
          layers.bounderies.svg.push(sizePath);
        }
      }

      const di = generateSegmentsFromShape(piece.internalShapes[size], data.vertices, bbox);
      layers.internalShapes.svg = layers.internalShapes.svg.concat(
        di.map((dStr, idx) => {
          return `<path id="internal-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="blue" vector-effect="non-scaling-stroke"/>`;
        })
      );

      const tp = generatePointsFromShape(piece.turnPoints[size], data.vertices, bbox, size);
      layers.turnPoints.svg = layers.turnPoints.svg.concat(tp);

      const dh = generatePointsFromShape(piece.drillHoles[size], data.vertices, bbox, size);
      layers.drillHoles.svg = layers.drillHoles.svg.concat(dh);

      const cp = generatePointsFromShape(piece.curvePoints[size], data.vertices, bbox, size);
      layers.curvePoints.svg = layers.curvePoints.svg.concat(cp);

      const no = generatePointsFromShape(piece.notches[size], data.vertices, bbox, size);
      layers.notches.svg = layers.notches.svg.concat(no);

      const gl = generateSegmentsFromShape(piece.grainLines[size], data.vertices, bbox);
      layers.grainLines.svg = layers.grainLines.svg.concat(
        gl.map((dStr, idx) => {
          return `<path id="grainline-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="black" vector-effect="non-scaling-stroke" />`;
        })
      );

      const ml = generateSegmentsFromShape(piece.mirrorLines[size], data.vertices, bbox);
      layers.mirrorLines.svg = layers.mirrorLines.svg.concat(
        ml.map((dStr, idx) => {
          return `<path id="grainline-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="black" vector-effect="non-scaling-stroke" />`;
        })
      );

      const grl = generateSegmentsFromShape(piece.gradeReferences[size], data.vertices, bbox);
      layers.gradeReferences.svg = layers.gradeReferences.svg.concat(
        grl.map((dStr, idx) => {
          return `<path id="grainline-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="green" vector-effect="non-scaling-stroke" />`;
        })
      );
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
});
