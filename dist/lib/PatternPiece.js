"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const Diagnostic_1 = require("./Diagnostic");
class PatternPiece {
    constructor(name) {
        this.annotations = {};
        this.curvePoints = {};
        this.drillHoles = {};
        this.gradeReferences = {};
        this.grainLines = {};
        this.internalShapes = {};
        this.mirrorLines = {};
        this.notches = {};
        this.shapes = {};
        this.turnPoints = {};
        this.vertices = [];
        this.name = name;
    }
    createSize(size, entities) {
        const diagnostics = [];
        this.shapes[size] = this._createBoundery(entities, diagnostics);
        this.internalShapes[size] = this._createInternalShapes(entities, diagnostics);
        this.turnPoints[size] = this._createPoints(entities, 2 /* TurnPoints */, diagnostics);
        this.curvePoints[size] = this._createPoints(entities, 3 /* CurvePoints */, diagnostics);
        this.notches[size] = this._createPoints(entities, 4 /* Notches */, diagnostics);
        this.grainLines[size] = this._createLines(entities, 7 /* GrainLine */, diagnostics);
        this.gradeReferences[size] = this._createLines(entities, 5 /* GradeReference */, diagnostics);
        this.mirrorLines[size] = this._createLines(entities, 6 /* MirrorLine */, diagnostics);
        this.drillHoles[size] = this._createPoints(entities, 13 /* DrillHoles */, diagnostics);
        this.annotations[size] = this._createText(entities, 15 /* AnnotationText */, diagnostics);
        this._checkBlock(entities, diagnostics);
        return diagnostics;
    }
    _getVertexIndex(vertex) {
        const fx = vertex.x;
        const fy = vertex.y;
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
    _checkBlock(entities, diagnostics) {
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
                case 15 /* AnnotationText */:
                    break;
                case 84 /* ASTMBoundery */:
                    diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.INFO, `Unhandled definition on layer ${entity.layer}: ASTM Boundery`, entity));
                    break;
                case 85 /* ASTMInternalLines */:
                    diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.INFO, `Unhandled definition on layer ${entity.layer}: ASTM Internal Lines`, entity));
                    break;
                default:
                    diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.INFO, `Unhandled definition on layer ${entity.layer}: `, entity));
            }
        });
    }
    _createBoundery(entities, diagnostics) {
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
    _createLines(entities, layer, diagnostics) {
        const shape = { lengths: [], metadata: {}, vertices: [] };
        entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
            switch (entity.type) {
                case 'LINE':
                    if (entity.vertices.length !== 2) {
                        diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Found line with more than 2 vertices: '${entity.vertices.length}'`, entity.vertices));
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
                    diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Unexpected entity in turn points: '${entity.type}'`, entity));
            }
        });
        return shape;
    }
    _createPoints(entities, layer, diagnostics) {
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
                    diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Unexpected entity in layer ${layer}: expected points, found '${entity.type}'`, entity));
            }
        });
        return shape;
    }
    _createInternalShapes(entities, diagnostics) {
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
                    diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Unexpected type in internal shape: '${entity.type}'`, entity));
            }
        });
        return shape;
    }
    _createText(entities, layer, diagnostics) {
        let text = null;
        entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
            switch (entity.type) {
                case 'TEXT':
                    text = _.omit(entity, ['type', 'layer', 'handle']);
                    break;
                default:
                    diagnostics.push(new Diagnostic_1.Diagnostic(Diagnostic_1.Severity.WARNING, `Unexpected entity in layer ${layer}: expected points, found '${entity.type}'`, entity));
            }
        });
        return text;
    }
}
exports.PatternPiece = PatternPiece;
//# sourceMappingURL=PatternPiece.js.map