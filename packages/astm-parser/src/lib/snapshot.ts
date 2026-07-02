import type {
  IEntity,
  IPoint,
  ITextEntity,
  IPointEntity,
  IPolylineEntity,
  ILineEntity,
} from 'dxf-parser';
import { Diagnostic, Severity } from './Diagnostic.js';
import {
  ASTMLayers,
  ContourSegment,
  IContour,
  INotch,
  IQualityValidation,
  ISizeSnapshot,
  NotchType,
  TextAnnotation,
} from './interfaces.js';

// BlockEntity union - IEntity is the base type for unknown entities
export type BlockEntity = ITextEntity | IPointEntity | IPolylineEntity | ILineEntity | IEntity;

// Type guards for entity narrowing
function isPolylineEntity(entity: BlockEntity): entity is IPolylineEntity {
  return entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE';
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
// Non-geometric entities that may legally appear on any layer
function isIgnorableEntity(entity: BlockEntity): boolean {
  return entity.type === 'ATTDEF' || entity.type === 'SEQEND';
}

const NOTCH_LAYERS: ReadonlyArray<[ASTMLayers, NotchType]> = [
  [ASTMLayers.Notches, 'v-slit'],
  [ASTMLayers.TNotch, 't'],
  [ASTMLayers.CastleNotch, 'castle'],
  [ASTMLayers.CheckNotch, 'check'],
  [ASTMLayers.UNotch, 'u'],
];

const KNOWN_LAYERS = new Set<number>(
  Object.values(ASTMLayers).filter((value): value is number => typeof value === 'number')
);

// Piece metadata lifted into the structured format - not annotation text
const LIFTED_KEYS = new Set(['piece name', 'size']);

/** Deduplicating vertex pool, local to one snapshot. */
class VertexPool {
  vertices: number[] = [];
  #index = new Map<string, number>();

  index(vertex: IPoint): number {
    const key = `${vertex.x},${vertex.y}`;
    const existing = this.#index.get(key);
    if (existing !== undefined) {
      return existing;
    }
    this.vertices.push(vertex.x, vertex.y);
    const index = this.vertices.length / 2 - 1;
    this.#index.set(key, index);
    return index;
  }
}

function toTextAnnotation(entity: ITextEntity, source?: string): TextAnnotation {
  const annotation: TextAnnotation = { text: entity.text };
  if (entity.startPoint) {
    annotation.position = { x: entity.startPoint.x, y: entity.startPoint.y };
  }
  if (entity.textHeight !== undefined) {
    annotation.height = entity.textHeight;
  }
  if (entity.rotation !== undefined) {
    annotation.rotation = entity.rotation;
  }
  if (source !== undefined) {
    annotation.source = source;
  }
  return annotation;
}

function isLiftedKeyValue(text: string): boolean {
  const splitPos = text.indexOf(':');
  if (splitPos === -1) {
    return false;
  }
  return LIFTED_KEYS.has(text.substring(0, splitPos).trim().toLowerCase());
}

/** Convert one vertex-index run to a contour. A run whose first and
 *  last index coincide becomes a closed contour without the repeat. */
function runToContour(run: number[]): IContour {
  let closed = false;
  let points = run;
  if (run.length > 2 && run[0] === run[run.length - 1]) {
    closed = true;
    points = run.slice(0, -1);
  }
  const segments: ContourSegment[] = points.length > 1 ? [{ type: 'lines', to: points.slice(1) }] : [];
  return { start: points[0], closed, segments };
}

/**
 * Chain runs that share endpoint vertex indices into one sequence.
 * Returns the chained run; leftover runs that could not be connected
 * are reported via the second tuple entry.
 */
function chainRuns(runs: number[][]): { chain: number[]; leftover: number[][] } {
  const rest = runs.slice(1);
  let chain = runs[0];
  let progress = true;
  while (rest.length && progress) {
    progress = false;
    for (let i = 0; i < rest.length; i++) {
      const run = rest[i];
      const head = chain[0];
      const tail = chain[chain.length - 1];
      if (run[0] === tail) {
        chain = chain.concat(run.slice(1));
      } else if (run[run.length - 1] === tail) {
        chain = chain.concat(run.slice(0, -1).reverse());
      } else if (run[run.length - 1] === head) {
        chain = run.slice(0, -1).concat(chain);
      } else if (run[0] === head) {
        chain = run.slice(1).reverse().concat(chain);
      } else {
        continue;
      }
      rest.splice(i, 1);
      progress = true;
      break;
    }
  }
  return { chain, leftover: rest };
}

class SnapshotBuilder {
  #pool = new VertexPool();
  #entities: BlockEntity[];
  #diagnostics: Diagnostic[];
  #annotations: TextAnnotation[] = [];

  constructor(entities: BlockEntity[], diagnostics: Diagnostic[]) {
    this.#entities = entities;
    this.#diagnostics = diagnostics;
  }

  build(): ISizeSnapshot | null {
    const boundary = this.#buildBoundary();
    if (!boundary) {
      return null;
    }

    const snapshot: ISizeSnapshot = {
      vertices: [], // assigned last - the pool fills while building
      boundary,
      internalLines: this.#contours(ASTMLayers.InternalLines, 'internalLines'),
      internalCutouts: this.#contours(ASTMLayers.InternalCutouts, 'internalCutouts'),
      sewLines: this.#contours(ASTMLayers.SewLines, 'sewLines'),
      stripeReferences: this.#contours(ASTMLayers.StripeReference, 'stripeReferences'),
      plaidReferences: this.#contours(ASTMLayers.PlaidReference, 'plaidReferences'),
      gradeReferences: this.#contours(ASTMLayers.GradeReference, 'gradeReferences'),
      turnPoints: this.#points(ASTMLayers.TurnPoints, 'turnPoints'),
      curvePoints: this.#points(ASTMLayers.CurvePoints, 'curvePoints'),
      drillHoles: this.#points(ASTMLayers.DrillHoles, 'drillHoles'),
      notches: this.#notches(),
      annotations: [],
    };

    const grainLine = this.#singleContour(ASTMLayers.GrainLine, 'grainLine');
    if (grainLine) {
      snapshot.grainLine = grainLine;
    }
    const mirrorLine = this.#singleContour(ASTMLayers.MirrorLine, 'mirrorLine');
    if (mirrorLine) {
      snapshot.mirrorLine = mirrorLine;
    }

    const qualityValidation = this.#qualityValidation();
    if (qualityValidation) {
      snapshot.qualityValidation = qualityValidation;
    }

    this.#annotationText();
    snapshot.annotations = this.#annotations;
    snapshot.vertices = this.#pool.vertices;

    this.#checkUnhandledLayers();
    return snapshot;
  }

  #layerEntities(layer: ASTMLayers): BlockEntity[] {
    return this.#entities.filter(entity => entity.layer === layer.toString());
  }

  /** Collect polyline/line entities of a layer as vertex-index runs;
   *  text goes to annotations, anything else is diagnosed. */
  #runs(layer: ASTMLayers, source: string): number[][] {
    const runs: number[][] = [];
    for (const entity of this.#layerEntities(layer)) {
      if (isPolylineEntity(entity) || isLineEntity(entity)) {
        runs.push(entity.vertices.map(vertex => this.#pool.index(vertex)));
      } else if (isTextEntity(entity)) {
        this.#text(entity, source);
      } else if (!isIgnorableEntity(entity)) {
        this.#diagnostics.push(
          new Diagnostic(Severity.WARNING, `Unexpected entity in layer ${layer} (${ASTMLayers[layer]}): '${entity.type}'`, entity)
        );
      }
    }
    return runs;
  }

  #text(entity: ITextEntity, source?: string) {
    if (isLiftedKeyValue(entity.text)) {
      return;
    }
    this.#annotations.push(toTextAnnotation(entity, source));
  }

  #buildBoundary(): IContour | null {
    const runs = this.#runs(ASTMLayers.Boundary, 'boundary').filter(run => run.length > 1);
    if (runs.length === 0) {
      this.#diagnostics.push(new Diagnostic(Severity.WARNING, 'Block has no boundary geometry (layer 1)'));
      return null;
    }

    const { chain, leftover } = chainRuns(runs);
    if (leftover.length) {
      this.#diagnostics.push(
        new Diagnostic(
          Severity.WARNING,
          `Boundary consists of ${leftover.length + 1} disconnected chains; using the first`,
          leftover
        )
      );
    }

    // A piece boundary is closed by definition. Drop an explicit
    // closing repeat; an open chain is closed implicitly.
    let points = chain;
    if (points.length > 2 && points[0] === points[points.length - 1]) {
      points = points.slice(0, -1);
    }
    return {
      start: points[0],
      closed: true,
      segments: [{ type: 'lines', to: points.slice(1) }],
    };
  }

  #contours(layer: ASTMLayers, source: string): IContour[] {
    return this.#runs(layer, source)
      .filter(run => run.length > 0)
      .map(runToContour);
  }

  #singleContour(layer: ASTMLayers, source: string): IContour | undefined {
    const contours = this.#contours(layer, source);
    if (contours.length > 1) {
      this.#diagnostics.push(
        new Diagnostic(Severity.WARNING, `Expected at most one ${source} (layer ${layer}), found ${contours.length}; using the first`)
      );
    }
    return contours[0];
  }

  #points(layer: ASTMLayers, source: string): number[] {
    const indices: number[] = [];
    for (const entity of this.#layerEntities(layer)) {
      if (isPointEntity(entity)) {
        indices.push(this.#pool.index(entity.position));
      } else if (isTextEntity(entity)) {
        this.#text(entity, source);
      } else if (!isIgnorableEntity(entity)) {
        this.#diagnostics.push(
          new Diagnostic(Severity.WARNING, `Unexpected entity in layer ${layer} (${ASTMLayers[layer]}): expected points, found '${entity.type}'`, entity)
        );
      }
    }
    return indices;
  }

  #notches(): INotch[] {
    const notches: INotch[] = [];
    for (const [layer, type] of NOTCH_LAYERS) {
      for (const entity of this.#layerEntities(layer)) {
        if (isPointEntity(entity)) {
          notches.push({ vertex: this.#pool.index(entity.position), type });
        } else if (isTextEntity(entity)) {
          this.#text(entity, 'notches');
        } else if (!isIgnorableEntity(entity)) {
          this.#diagnostics.push(
            new Diagnostic(Severity.WARNING, `Unexpected entity in layer ${layer} (${ASTMLayers[layer]}): expected notch points, found '${entity.type}'`, entity)
          );
        }
      }
    }
    return notches;
  }

  #annotationText() {
    for (const entity of this.#layerEntities(ASTMLayers.AnnotationText)) {
      if (isTextEntity(entity)) {
        this.#annotations.push(toTextAnnotation(entity));
      } else if (!isIgnorableEntity(entity)) {
        this.#diagnostics.push(
          new Diagnostic(Severity.WARNING, `Unexpected entity in layer 15 (AnnotationText): expected text, found '${entity.type}'`, entity)
        );
      }
    }
  }

  #qualityValidation(): IQualityValidation | undefined {
    const groups: Array<[keyof IQualityValidation, ASTMLayers]> = [
      ['boundary', ASTMLayers.BoundaryQualityValidation],
      ['internalLines', ASTMLayers.InternalLinesQualityValidation],
      ['internalCutouts', ASTMLayers.InternalCutoutsQualityValidation],
      ['sewLines', ASTMLayers.SewLinesQualityValidation],
    ];
    const result: IQualityValidation = {};
    let any = false;
    for (const [key, layer] of groups) {
      const contours = this.#contours(layer, 'qualityValidation');
      if (contours.length) {
        result[key] = contours;
        any = true;
      }
    }
    return any ? result : undefined;
  }

  #checkUnhandledLayers() {
    for (const entity of this.#entities) {
      if (!KNOWN_LAYERS.has(+entity.layer)) {
        this.#diagnostics.push(new Diagnostic(Severity.INFO, `Unhandled definition on layer ${entity.layer}`, entity));
      }
    }
  }
}

/**
 * Build a size snapshot from the entities of one DXF block.
 * Returns null (with a diagnostic) when the block carries no boundary.
 */
export function buildSnapshot(entities: BlockEntity[], diagnostics: Diagnostic[]): ISizeSnapshot | null {
  return new SnapshotBuilder(entities, diagnostics).build();
}
