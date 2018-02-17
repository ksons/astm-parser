"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const d3 = require("d3");
const fs = require("fs");
const path = require("path");
const pd = require("pretty-data");
const __1 = require("..");
const BBox_1 = require("./BBox");
const DXF_FILE_PATH = path.join(__dirname, '..', '..', 'test', 'data', 'dxf', 'C-S1615WWO206-10-26.DXF');
const fileStream = fs.createReadStream(DXF_FILE_PATH, { encoding: 'utf8' });
function roundToTwo(num) {
    return +(Math.round(num + 'e+2') + 'e-2');
}
function generateSegmentsFromShape(shape, vertices, bbox) {
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
function generatePathFromShape(shape, vertices, bbox) {
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
const parser = new __1.ASTMParser();
parser.parseStream(fileStream, (err, res) => {
    if (err) {
        console.error(err);
        return;
    }
    const baseSize = res.baseSize;
    const rainbow = d3.scaleSequential(d3.interpolateWarm).domain([res.sizes[0], res.sizes[res.sizes.length - 1]]);
    const bbox = new BBox_1.BBox();
    let layerStr = '';
    let layerCount = 0;
    res.pieces.forEach(piece => {
        const bounderies = [];
        let internalShapes = [];
        res.sizes.forEach(size => {
            const isBaseSize = size === baseSize;
            const id = piece.name + '-' + size;
            const d = generatePathFromShape(piece.shapes[size], res.vertices, bbox);
            if (d) {
                const color = rainbow(size);
                const fill = isBaseSize ? '#ddd' : 'none';
                const sizePath = `<path id="path-${id}" class="size${size}" d="${d}" fill="${fill}" stroke="${color}"/>`;
                if (isBaseSize) {
                    // prepend the baseSize path as it is filled and should be on the bottom of the size stack
                    bounderies.unshift(sizePath);
                }
                else {
                    bounderies.push(sizePath);
                }
            }
            const di = generateSegmentsFromShape(piece.internalShapes[size], res.vertices, bbox);
            internalShapes = internalShapes.concat(di.map((dStr, idx) => {
                return `<path id="internal-${id}-${idx}" class="size${size} internal" d="${dStr}" fill="none" stroke="blue"/>`;
            }));
        });
        layerStr += `<g id="layer${layerCount++}" inkscape:label="${piece.name}" inkscape:groupmode="layer">`;
        layerStr += bounderies.join();
        if (internalShapes.length) {
            layerStr += `<g id="layer${layerCount++}" inkscape:label="${piece.name} internal" inkscape:groupmode="layer">`;
            layerStr += internalShapes.join();
            layerStr += '</g>';
        }
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
//# sourceMappingURL=svg.js.map