import * as DXF from '../dxf';
import { Diagnostic } from './Diagnostic';
import { IPatternPiece } from './interfaces';
export declare class PatternPiece implements IPatternPiece {
  annotations: {};
  curvePoints: {};
  drillHoles: {};
  gradeReferences: {};
  grainLines: {};
  internalShapes: {};
  mirrorLines: {};
  name: string;
  notches: {};
  shapes: {};
  turnPoints: {};
  vertices: any[];
  constructor(name: string);
  createSize(size: string, entities: DXF.BlockEntity[]): Diagnostic[];
  private _getVertexIndex(vertex);
  private _checkBlock(entities, diagnostics);
  private _createBoundery(entities, diagnostics);
  private _createLines(entities, layer, diagnostics);
  private _createPoints(entities, layer, diagnostics);
  private _createInternalShapes(entities, diagnostics);
  private _createText(entities, layer, diagnostics);
}
