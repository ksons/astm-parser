export const enum ASTMLayers {
  Boundery = 1,
  TurnPoints = 2,
  CurvePoints = 3,
  Notches = 4,
  GradeReference = 5,
  MirrorLine = 6,
  GrainLine = 7,
  InternalLines = 8,
  DrillHoles = 13,
  AnnotationText = 15,
  ASTMBoundery = 84,
  ASTMInternalLines = 85
}

export interface IPatternPiece {
  name: string;
  shapes: object;
  internalShapes: object;
  turnPoints: object;
  curvePoints: object;
  grainLines: object;
  notches: object;
  gradeReferences: object;
  mirrorLines: object;
  drillHoles: object;
  annotations: object;
  vertices: number[];
}
