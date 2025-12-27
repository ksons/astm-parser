import * as _ from 'lodash';
import * as DXF from '../dxf.js';
import { Diagnostic, Severity } from './Diagnostic.js';
import { ASTMLayers, IPatternPiece } from './interfaces.js';

interface IShape {
  lengths: number[];
  vertices: number[];
  metadata?: any;
}

export class PatternPiece implements IPatternPiece {
  annotations = {};
  curvePoints = {};
  drillHoles = {};
  gradeReferences = {};
  grainLines = {};
  internalShapes = {};
  mirrorLines = {};
  name: string;
  notches = {};
  shapes = {};
  turnPoints = {};
  vertices = [];

  constructor(name: string) {
    this.name = name;
  }

  createSize(size: string, entities: DXF.BlockEntity[]): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    this.shapes[size] = this._createBoundery(entities, diagnostics);
    this.internalShapes[size] = this._createInternalShapes(entities, diagnostics);
    this.turnPoints[size] = this._createPoints(entities, ASTMLayers.TurnPoints, diagnostics);
    this.curvePoints[size] = this._createPoints(entities, ASTMLayers.CurvePoints, diagnostics);
    this.notches[size] = this._createPoints(entities, ASTMLayers.Notches, diagnostics);
    this.grainLines[size] = this._createLines(entities, ASTMLayers.GrainLine, diagnostics);
    this.gradeReferences[size] = this._createLines(entities, ASTMLayers.GradeReference, diagnostics);
    this.mirrorLines[size] = this._createLines(entities, ASTMLayers.MirrorLine, diagnostics);
    this.drillHoles[size] = this._createPoints(entities, ASTMLayers.DrillHoles, diagnostics);
    this.annotations[size] = this._createText(entities, ASTMLayers.AnnotationText, diagnostics);
    this._checkBlock(entities, diagnostics);

    return diagnostics;
  }

  private _getVertexIndex(vertex: DXF.Vertex | DXF.Point) {
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

  private _checkBlock(entities: DXF.BlockEntity[], diagnostics: Diagnostic[]) {
    entities.forEach(entity => {
      switch (+entity.layer) {
        case ASTMLayers.Boundery:
        case ASTMLayers.InternalLines:
        case ASTMLayers.TurnPoints:
        case ASTMLayers.CurvePoints:
        case ASTMLayers.GrainLine:
        case ASTMLayers.Notches:
        case ASTMLayers.GradeReference:
        case ASTMLayers.MirrorLine:
        case ASTMLayers.DrillHoles:
        case ASTMLayers.AnnotationText:
          break;
        case ASTMLayers.ASTMBoundery:
          diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: ASTM Boundery`, entity));
          break;
        case ASTMLayers.ASTMInternalLines:
          diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: ASTM Internal Lines`, entity));
          break;
        default:
          diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}: `, entity));
      }
    });
  }

  private _createBoundery(entities: DXF.BlockEntity[], _diagnostics: Diagnostic[]): IShape {
    const shape: IShape = { lengths: [], metadata: {}, vertices: [] };
    entities.filter(entity => entity.layer === ASTMLayers.Boundery.toString()).forEach(entity => {
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
        // this.diagnostics.push(new Diagnostic(Severity.WARNING,
        // `Unexpected entity in boundery shape: '${entity.type}'`,
        // entity))
      }
    });

    return shape;
  }

  private _createLines(entities: DXF.BlockEntity[], layer: ASTMLayers, diagnostics: Diagnostic[]): IShape {
    const shape: IShape = { lengths: [], metadata: {}, vertices: [] };

    entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
      switch (entity.type) {
        case 'LINE':
          if (entity.vertices.length !== 2) {
            diagnostics.push(new Diagnostic(Severity.WARNING, `Found line with more than 2 vertices: '${entity.vertices.length}'`, entity.vertices));
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
          diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in turn points: '${entity.type}'`, entity));
      }
    });
    return shape;
  }

  private _createPoints(entities: DXF.BlockEntity[], layer: ASTMLayers, diagnostics: Diagnostic[]): IShape {
    const shape: IShape = { lengths: [], metadata: {}, vertices: [] };
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
          diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in layer ${layer}: expected points, found '${entity.type}'`, entity));
      }
    });
    return shape;
  }

  private _createInternalShapes(entities: DXF.BlockEntity[], diagnostics: Diagnostic[]): IShape {
    const shape: IShape = { lengths: [], metadata: {}, vertices: [] };
    entities.filter(entity => entity.layer === ASTMLayers.InternalLines.toString()).forEach(entity => {
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
          diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected type in internal shape: '${entity.type}'`, entity));
      }
    });

    return shape;
  }

  private _createText(entities: DXF.BlockEntity[], layer: ASTMLayers, diagnostics: Diagnostic[]): object {
    let text = null;
    entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
      switch (entity.type) {
        case 'TEXT':
          text = _.omit(entity, ['type', 'layer', 'handle']);
          break;
        default:
          diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in layer ${layer}: expected points, found '${entity.type}'`, entity));
      }
    });
    return text;
  }
}
