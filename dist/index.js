"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const DXFParser = require("dxf-parser");
const Diagnostic_1 = require("./lib/Diagnostic");
const PatternPiece_1 = require("./lib/PatternPiece");
class ASTMParser {
    constructor() {
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
                actualPiece = new PatternPiece_1.PatternPiece(name);
                pieceMap.set(name, actualPiece);
            }
            const diag = actualPiece.createSize(size, block.entities);
            Array.prototype.push.apply(this.diagnostics, diag);
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
            creationTime: this._findKey(dxf.entities, 'creation time'),
            unit: this._findUnit(dxf.entities)
        };
        // console.log(asset);
        err = foundError ? new Error(this.diagnostics.map(diag => diag.message).join('\n')) : null;
        const ret = {
            data: {
                asset,
                pieces: Array.from(pieceMap.values()),
                sizes: Array.from(sizeSet).sort(),
                style
            },
            diagnostics: this.diagnostics
        };
        callback(err, ret);
    }
    _findUnit(entities) {
        const unitStr = this._findKey(entities, 'units');
        if (unitStr === 'METRIC') {
            return 1 /* MM */;
        }
        if (unitStr === 'ENGLISH') {
            return 2 /* INCH */;
        }
        this.diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Unexpected unit: '${unitStr}'`));
        return 2 /* INCH */;
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