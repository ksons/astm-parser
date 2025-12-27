import * as _ from 'lodash';
import type {
  IEntity,
  IPoint,
  ITextEntity,
  IPointEntity,
  IPolylineEntity,
  ILineEntity,
} from 'dxf-parser';
import { Diagnostic, Severity } from './Diagnostic.js';
import { ASTMLayers, IPatternPiece } from './interfaces.js';

// BlockEntity union - IEntity is the base type for unknown entities
export type BlockEntity = ITextEntity | IPointEntity | IPolylineEntity | ILineEntity | IEntity;

// Type guards for entity narrowing
function isPolylineEntity(entity: BlockEntity): entity is IPolylineEntity {
  return entity.type === 'POLYLINE';
}
function isLineEntity(entity: BlockEntity): entity is ILineEntity {
  return entity.type === 'LINE';
}
function isTextEntity(entity: BlockEntity): entity is ITextEntity {
  return entity.type === 'TEXT';
}
function isPointEntity(entity: BlockEntity): entity is IPointEntity {
  return entity.type === 'POINT';
}

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

  createSize(size: string, entities: BlockEntity[]): Diagnostic[] {
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

  private _getVertexIndex(vertex: IPoint) {
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

  private _checkBlock(entities: BlockEntity[], diagnostics: Diagnostic[]) {
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

  private _createBoundery(entities: BlockEntity[], _diagnostics: Diagnostic[]): IShape {
    const shape: IShape = { lengths: [], metadata: {}, vertices: [] };
    entities.filter(entity => entity.layer === ASTMLayers.Boundery.toString()).forEach(entity => {
      if (isPolylineEntity(entity)) {
        shape.lengths.push(entity.vertices.length);
        entity.vertices.forEach(vertex => {
          shape.vertices.push(this._getVertexIndex(vertex));
        });
      } else if (isLineEntity(entity)) {
        shape.lengths.push(entity.vertices.length);
        entity.vertices.forEach(vertex => {
          shape.vertices.push(this._getVertexIndex(vertex));
        });
      } else if (isTextEntity(entity)) {
        const metadata = shape.metadata;
        if (!metadata.astm) {
          metadata.astm = [];
        }
        metadata.astm.push(entity.text);
      }
    });

    return shape;
  }

  private _createLines(entities: BlockEntity[], layer: ASTMLayers, diagnostics: Diagnostic[]): IShape {
    const shape: IShape = { lengths: [], metadata: {}, vertices: [] };

    entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
      if (isLineEntity(entity)) {
        if (entity.vertices.length !== 2) {
          diagnostics.push(new Diagnostic(Severity.WARNING, `Found line with more than 2 vertices: '${entity.vertices.length}'`, entity.vertices));
        }
        shape.lengths.push(2);
        shape.vertices.push(this._getVertexIndex(entity.vertices[0]));
        shape.vertices.push(this._getVertexIndex(entity.vertices[1]));
      } else if (isTextEntity(entity)) {
        const metadata = shape.metadata;
        if (!metadata.astm) {
          metadata.astm = [];
        }
        metadata.astm.push(entity.text);
      } else {
        diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in turn points: '${entity.type}'`, entity));
      }
    });
    return shape;
  }

  private _createPoints(entities: BlockEntity[], layer: ASTMLayers, diagnostics: Diagnostic[]): IShape {
    const shape: IShape = { lengths: [], metadata: {}, vertices: [] };
    entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
      if (isPointEntity(entity)) {
        shape.lengths.push(1);
        shape.vertices.push(this._getVertexIndex(entity.position));
      } else if (isTextEntity(entity)) {
        const metadata = shape.metadata;
        if (!metadata.astm) {
          metadata.astm = [];
        }
        metadata.astm.push(entity.text);
      } else {
        diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in layer ${layer}: expected points, found '${entity.type}'`, entity));
      }
    });
    return shape;
  }

  private _createInternalShapes(entities: BlockEntity[], diagnostics: Diagnostic[]): IShape {
    const shape: IShape = { lengths: [], metadata: {}, vertices: [] };
    entities.filter(entity => entity.layer === ASTMLayers.InternalLines.toString()).forEach(entity => {
      if (isPolylineEntity(entity)) {
        shape.lengths.push(entity.vertices.length);
        entity.vertices.forEach(vertex => {
          shape.vertices.push(this._getVertexIndex(vertex));
        });
      } else if (isLineEntity(entity)) {
        shape.lengths.push(entity.vertices.length);
        entity.vertices.forEach(vertex => {
          shape.vertices.push(this._getVertexIndex(vertex));
        });
      } else if (isTextEntity(entity)) {
        const metadata = shape.metadata;
        if (!metadata.astm) {
          metadata.astm = [];
        }
        metadata.astm.push(entity.text);
      } else {
        diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected type in internal shape: '${entity.type}'`, entity));
      }
    });

    return shape;
  }

  private _createText(entities: BlockEntity[], layer: ASTMLayers, diagnostics: Diagnostic[]): object {
    let text = null;
    entities.filter(entity => entity.layer === layer.toString()).forEach(entity => {
      if (isTextEntity(entity)) {
        text = _.omit(entity, ['type', 'layer', 'handle']);
      } else {
        diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected entity in layer ${layer}: expected points, found '${entity.type}'`, entity));
      }
    });
    return text;
  }
}
