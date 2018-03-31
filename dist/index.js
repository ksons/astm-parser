"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const DXFParser = require("dxf-parser");
const Diagnostic_1 = require("./lib/Diagnostic");
class ASTMParser {
    constructor() {
        this.vertices = [];
        this.count = 0;
        this.diagnostics = [];
    }
    parseStream(stream, callback) {
        try {
            const parser = new DXFParser();
            parser.parseStream(stream, this._transform.bind(this, callback));
        }
        catch (e) {
            console.log(e);
        }
    }
    _transform(callback, err, dxf) {
        if (err) {
            callback(err);
        }
        const pieceMap = new Map();
        const sizeSet = new Set();
        let foundError = false;
        Object.keys(dxf.blocks).forEach(key => {
            const block = dxf.blocks[key];
            const size = this._findKey(block.entities, 'size');
            if (size !== null) {
                sizeSet.add(size);
            }
            const name = this._findKey(block.entities, 'piece name');
            if (name === null) {
                this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.ERROR, 'Missing required field piece name', block));
                foundError = true;
                return;
            }
            let actualPiece = pieceMap.get(name);
            if (!actualPiece) {
                actualPiece = {
                    curvePoints: {},
                    drillHoles: {},
                    gradeReferences: {},
                    grainLines: {},
                    internalShapes: {},
                    mirrorLines: {},
                    name,
                    notches: {},
                    shapes: {},
                    turnPoints: {}
                };
                pieceMap.set(name, actualPiece);
            }
            actualPiece.shapes[size] = this._createBoundery(block.entities);
            actualPiece.internalShapes[size] = this._createInternalShapes(block.entities);
            actualPiece.turnPoints[size] = this._createPoints(block.entities, 2 /* TurnPoints */);
            actualPiece.curvePoints[size] = this._createPoints(block.entities, 3 /* CurvePoints */);
            actualPiece.notches[size] = this._createPoints(block.entities, 4 /* Notches */);
            actualPiece.grainLines[size] = this._createLines(block.entities, 7 /* GrainLine */);
            actualPiece.gradeReferences[size] = this._createLines(block.entities, 5 /* GradeReference */);
            actualPiece.mirrorLines[size] = this._createLines(block.entities, 6 /* MirrorLine */);
            actualPiece.drillHoles[size] = this._createPoints(block.entities, 13 /* DrillHoles */);
            this._checkBlock(block.entities);
        });
        const baseSizeStr = this._findKey(dxf.entities, 'sample size');
        const baseSize = baseSizeStr ? baseSizeStr : 'M';
        const style = {
            baseSize,
            name: this._findKey(dxf.entities, 'style name')
        };
        const asset = {
            authoringTool: this._findKey(dxf.entities, 'product'),
            authoringToolVersion: this._findKey(dxf.entities, 'version'),
            authoringVendor: this._findKey(dxf.entities, 'author'),
            creationDate: this._findKey(dxf.entities, 'creation date'),
            creationTime: this._findKey(dxf.entities, 'creation time')
        };
        // console.log(asset);
        err = foundError ? new Error(this.diagnostics.map(diag => diag.message).join('\n')) : null;
        const ret = {
            data: {
                asset,
                pieces: Array.from(pieceMap.values()),
                sizes: Array.from(sizeSet).sort(),
                style,
                vertices: this.vertices
            },
            diagnostics: this.diagnostics
        };
        callback(err, ret);
    }
    _checkBlock(entities) {
        entities.forEach(entity => {
            switch (+entity.layer) {
                case 1 /* Boundery */:
                case 8 /* InternalLines */:
                case 2 /* TurnPoints */:
                case 3 /* CurvePoints */:
                case 7 /* GrainLine */:
                case 4 /* Notches */:
                case 5 /* GradeReference */:
                case 6 /* MirrorLine */:
                case 13 /* DrillHoles */:
                    break;
                case 15 /* AnnotationText */:
                    this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.INFO, `Unhandled definition on layer ${entity.layer}: Annotation Text`, entity));
                    break;
                case 84 /* ASTMBoundery */:
                    this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.INFO, `Unhandled definition on layer ${entity.layer}: ASTM Boundery`, entity));
                    break;
                case 85 /* ASTMInternalLines */:
                    this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.INFO, `Unhandled definition on layer ${entity.layer}: ASTM Internal Lines`, entity));
                    break;
                default:
                    this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.INFO, `Unhandled definition on layer ${entity.layer}: `, entity));
            }
        });
    }
    _getVertexIndex(vertex) {
        this.count++;
        const fx = vertex.x * 25.4;
        const fy = vertex.y * 25.4;
        for (let i = 0; i < this.vertices.length / 2; i++) {
            const x = this.vertices[i * 2];
            const y = this.vertices[i * 2 + 1];
            if (x === fx && y === fy) {
                return i;
            }
        }
        this.vertices.push(fx, fy);
        return this.vertices.length / 2 - 1;
    }
    _findKey(entities, key) {
        for (const entity of entities) {
            if (entity.type === 'TEXT') {
                const result = getTextKeyValue(entity);
                if (!result) {
                    this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, 'Unexpected syntax in key-value text string: ' + entity.text, entity));
                    continue;
                }
                // console.log(result)
                if (result.key.toLowerCase() === key) {
                    return result.value;
                }
            }
        }
        return '';
    }
    _createLines(entities, layer) {
        const shape = { lengths: [], metadata: {}, vertices: [] };
        entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
            switch (entity.type) {
                case 'LINE':
                    if (entity.vertices.length !== 2) {
                        this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Found line with more than 2 vertices: '${entity.vertices.length}'`, entity.vertices));
                    }
                    shape.lengths.push(2);
                    shape.vertices.push(this._getVertexIndex(entity.vertices[0]));
                    shape.vertices.push(this._getVertexIndex(entity.vertices[1]));
                    break;
                case 'TEXT':
                    const metadata = shape.metadata;
                    if (!metadata.astm) {
                        metadata.astm = [];
                    }
                    metadata.astm.push(entity.text);
                    break;
                default:
                    this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Unexpected entity in turn points: '${entity.type}'`, entity));
            }
        });
        return shape;
    }
    _createPoints(entities, layer) {
        const shape = { lengths: [], metadata: {}, vertices: [] };
        entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
            switch (entity.type) {
                case 'POINT':
                    shape.lengths.push(1);
                    shape.vertices.push(this._getVertexIndex(entity.position));
                    break;
                case 'TEXT':
                    const metadata = shape.metadata;
                    if (!metadata.astm) {
                        metadata.astm = [];
                    }
                    metadata.astm.push(entity.text);
                    break;
                default:
                    this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Unexpected entity in layer ${layer}: expected points, found '${entity.type}'`, entity));
            }
        });
        return shape;
    }
    _createBoundery(entities) {
        const shape = { lengths: [], metadata: {}, vertices: [] };
        entities.filter(entity => entity.layer === 1 /* Boundery */.toString()).forEach(entity => {
            switch (entity.type) {
                case 'POLYLINE':
                    shape.lengths.push(entity.vertices.length);
                    entity.vertices.forEach(vertex => {
                        shape.vertices.push(this._getVertexIndex(vertex));
                    });
                    break;
                case 'LINE':
                    shape.lengths.push(entity.vertices.length);
                    entity.vertices.forEach(vertex => {
                        shape.vertices.push(this._getVertexIndex(vertex));
                    });
                    break;
                case 'TEXT':
                    const metadata = shape.metadata;
                    if (!metadata.astm) {
                        metadata.astm = [];
                    }
                    metadata.astm.push(entity.text);
                    break;
                default:
            }
        });
        return shape;
    }
    _createInternalShapes(entities) {
        const shape = { lengths: [], metadata: {}, vertices: [] };
        entities.filter(entity => entity.layer === 8 /* InternalLines */.toString()).forEach(entity => {
            switch (entity.type) {
                case 'POLYLINE':
                    shape.lengths.push(entity.vertices.length);
                    entity.vertices.forEach(vertex => {
                        shape.vertices.push(this._getVertexIndex(vertex));
                    });
                    break;
                case 'LINE':
                    shape.lengths.push(entity.vertices.length);
                    entity.vertices.forEach(vertex => {
                        shape.vertices.push(this._getVertexIndex(vertex));
                    });
                    break;
                case 'TEXT':
                    const metadata = shape.metadata;
                    if (!metadata.astm) {
                        metadata.astm = [];
                    }
                    // console.log(entity.text)
                    metadata.astm.push(entity.text);
                    break;
                default:
                    this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Unexpected type in internal shape: '${entity.type}'`, entity));
            }
        });
        return shape;
    }
}
exports.ASTMParser = ASTMParser;
function isText(entity) {
    return entity.type === 'TEXT';
}
function isPolyLine(entity) {
    return entity.type === 'POLYLINE';
}
function getTextKeyValue(entity) {
    const text = entity.text;
    const splitPos = text.indexOf(':');
    if (splitPos === -1) {
        return null;
    }
    return {
        key: text.substr(0, splitPos),
        value: text.substr(splitPos + 1).trim()
    };
}
//# sourceMappingURL=index.js.map