/**
 * ASTM D6673 / AAMA-292 DXF layer assignments.
 *
 * Layers 1-15 carry the pattern geometry, layers 80-83 carry special
 * notch types and layers 84-87 carry quality-validation copies of the
 * cut geometry (boundary, internal lines, cutouts and sew lines).
 */
export enum ASTMLayers {
  Boundary = 1,
  TurnPoints = 2,
  CurvePoints = 3,
  /** V-notches and slit notches */
  Notches = 4,
  GradeReference = 5,
  MirrorLine = 6,
  GrainLine = 7,
  /** Drawn on the piece, not cut */
  InternalLines = 8,
  StripeReference = 9,
  PlaidReference = 10,
  /** Cut lines inside the piece boundary */
  InternalCutouts = 11,
  DrillHoles = 13,
  SewLines = 14,
  AnnotationText = 15,
  TNotch = 80,
  CastleNotch = 81,
  CheckNotch = 82,
  UNotch = 83,
  BoundaryQualityValidation = 84,
  InternalLinesQualityValidation = 85,
  InternalCutoutsQualityValidation = 86,
  SewLinesQualityValidation = 87
}

/** Notch types defined by ASTM D6673 (layers 4 and 80-83). */
export type NotchType = 'v-slit' | 't' | 'castle' | 'check' | 'u';

/**
 * One segment of a contour. All numbers are indices into the
 * snapshot's vertex pool.
 *
 * - `lines`: a run of straight segments through the listed vertices.
 * - `cubic`: a cubic Bezier (SVG `C` semantics) with control points
 *   `c1`/`c2` ending on `to`.
 */
export type ContourSegment =
  | { type: 'lines'; to: number[] }
  | { type: 'cubic'; c1: number; c2: number; to: number };

/**
 * A contour starts at vertex `start` and follows `segments`. When
 * `closed` is true, an implicit straight edge connects the last
 * on-curve point back to `start` (SVG `Z` semantics).
 */
export interface IContour {
  start: number;
  closed: boolean;
  segments: ContourSegment[];
}

export interface INotch {
  /** Index into the snapshot vertex pool */
  vertex: number;
  type: NotchType;
}

/**
 * Free text belonging to a snapshot. `source` names the OPF property
 * whose ASTM source layer the text was found on (e.g. 'boundary');
 * omitted for regular annotation text (ASTM layer 15).
 */
export interface TextAnnotation {
  text: string;
  position?: { x: number; y: number };
  height?: number;
  rotation?: number;
  source?: string;
}

/**
 * Quality-validation copies of cut geometry (ASTM layers 84-87),
 * written by some CAD systems so receivers can validate their import.
 * Present only when the source file carries them.
 */
export interface IQualityValidation {
  boundary?: IContour[];
  internalLines?: IContour[];
  internalCutouts?: IContour[];
  sewLines?: IContour[];
}

/**
 * The complete geometry of one pattern piece in one size. Snapshots
 * are self-contained: all indices reference the snapshot's own
 * `vertices` pool ([x0, y0, x1, y1, ...], deduplicated).
 */
export interface ISizeSnapshot {
  /** Flat coordinate pool: [x0, y0, x1, y1, ...] */
  vertices: number[];
  /** The piece outline (cut line), always closed */
  boundary: IContour;
  internalLines: IContour[];
  internalCutouts: IContour[];
  sewLines: IContour[];
  stripeReferences: IContour[];
  plaidReferences: IContour[];
  gradeReferences: IContour[];
  grainLine?: IContour;
  mirrorLine?: IContour;
  /** Vertex indices marking direction changes on the boundary */
  turnPoints: number[];
  /** Vertex indices of curve fit points */
  curvePoints: number[];
  /** Vertex indices of drill/punch positions */
  drillHoles: number[];
  notches: INotch[];
  annotations: TextAnnotation[];
  qualityValidation?: IQualityValidation;
}

/**
 * A pattern piece with one snapshot per size it exists in. The keys
 * of `sizes` are size identifiers; a piece need not exist in every
 * size of the style (sparse size runs), but must include the style's
 * base size.
 */
export interface IPatternPiece {
  /**
   * Optional stable identifier (unique within the document). Required
   * in practice when the document contains `sewing`/`topstitching`
   * references and piece names are not unique.
   */
  id?: string;
  name: string;
  sizes: Record<string, ISizeSnapshot>;
}

/**
 * Reference to one contour of a piece's snapshots. `property` names
 * the snapshot property; `index` is required for the array-valued
 * properties. The reference addresses the corresponding contour in
 * every size snapshot of the piece.
 */
export interface IContourRef {
  property: 'boundary' | 'sewLines' | 'internalLines' | 'internalCutouts';
  index?: number;
}

/**
 * One side of a seam: a parameter range on a contour. `start`/`end`
 * are normalized arc-length parameters in [0, 1], measured from the
 * contour's `start` vertex following segment order (including the
 * implicit closing edge of closed contours). Because they are
 * fractions, the same range applies to every size (grading-invariant).
 */
export interface ISeamSide {
  /** `piece.id` when present, else the (unique) piece name */
  piece: string;
  contour: IContourRef;
  start: number;
  end: number;
  reversed?: boolean;
}

/** An assembly seam connecting two contour ranges. */
export interface ISeam {
  name?: string;
  first: ISeamSide;
  second: ISeamSide;
  /** Fold across the seam: angle in degrees (180 = flat), tool-defined strength */
  fold?: { angle?: number; strength?: number };
  turned?: boolean;
}

/**
 * Target of a topstitch. `contour` may be omitted when the source only
 * exposes the owning piece; omit `start`/`end` for the whole contour.
 */
export interface ITopstitchTarget {
  piece: string;
  contour?: IContourRef;
  start?: number;
  end?: number;
}

/** A decorative stitch line running parallel to a contour. */
export interface ITopstitch {
  name?: string;
  target?: ITopstitchTarget;
  /** Distance from the contour, in document units */
  offset?: number;
  extendStart?: boolean;
  extendEnd?: boolean;
  corner?: { curved?: boolean; curvedLength?: number; rightAngled?: boolean };
  /** Seam-line stitches: which side(s) of the seam (e.g. "Seam Both") */
  placement?: string;
  /** References `topstitchStyles[].id` */
  style?: string;
}

/** A reusable topstitch style definition. */
export interface ITopstitchStyle {
  id: string;
  name?: string;
  modelType?: number;
}
