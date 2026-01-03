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

export interface TextAnnotation {
  text: string;
  position?: { x: number; y: number };
  height?: number;
  rotation?: number;
}


export interface IMetadata {
  textAnnotations?: TextAnnotation[];
}

export interface IShape {
  lengths: number[];
  vertices: number[];
  metadata?: IMetadata;
}



export interface IPatternPiece {
  name: string;
  shapes: Record<string, IShape>;
  internalShapes: Record<string, IShape>;
  turnPoints: Record<string, IShape>;
  curvePoints: Record<string, IShape>;
  grainLines: Record<string, IShape>;
  notches: Record<string, IShape>;
  gradeReferences: Record<string, IShape>;
  mirrorLines: Record<string, IShape>;
  drillHoles: Record<string, IShape>;
  annotations: Record<string, object | null>;
  vertices: number[];
}
