"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const DXFParser = require("dxf-parser");
class ASTMParser {
    constructor() {
        this.vertices = [];
        this.count = 0;
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
        Object.keys(dxf.blocks).forEach(key => {
            const value = dxf.blocks[key];
            const size = +this._findKey(value.entities, 'size');
            if (size !== null) {
                sizeSet.add(size);
            }
            const name = this._findKey(value.entities, 'piece name');
            if (name === null) {
                // TODO: Error handling
            }
            let actualPiece = pieceMap.get(name);
            if (!actualPiece) {
                actualPiece = { name, shapes: {}, internalShapes: {} };
                pieceMap.set(name, actualPiece);
            }
            actualPiece.shapes[size] = this._createBoundery(value.entities);
            actualPiece.internalShapes[size] = this._createInternalShapes(value.entities);
        });
        const baseSizeStr = this._findKey(dxf.entities, 'sample size');
        const baseSize = baseSizeStr ? +baseSizeStr : 36;
        // console.log(this.count)
        callback(err, {
            baseSize,
            pieces: Array.from(pieceMap.values()),
            sizes: Array.from(sizeSet).sort(),
            vertices: this.vertices
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
        const candidate = entities.find(entity => {
            if (isText(entity)) {
                const result = getTextKeyValue(entity);
                if (!result) {
                    return false;
                }
                return result.key.toLowerCase() === key;
            }
            return false;
        });
        return candidate ? getTextKeyValue(candidate).value : null;
    }
    _createBoundery(entities) {
        const shape = {
            lengths: [],
            metadata: {},
            vertices: []
        };
        entities.forEach(entity => {
            if (+entity.layer !== 1) {
                return;
            }
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
        const shape = {
            lengths: [],
            metadata: {},
            vertices: []
        };
        entities.filter(entity => +entity.layer === 8).forEach(entity => {
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
                    console.warn('Unexpected type in internal shape:', entity.type);
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