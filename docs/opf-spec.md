# Open Pattern Format (OPF) Specification

**Version 0.4.0** — Draft

OPF is a JSON-based interchange format for 2D apparel/garment patterns. It is
designed as a modern replacement for the DXF-based ASTM D6673 / AAMA-292
conventions that dominate pattern data exchange today.

## Motivation

The industry-standard exchange path for graded patterns is DXF with
ASTM/AAMA layer conventions. That approach has structural problems:

- **Semantics by convention.** DXF knows nothing about patterns. Meaning is
  encoded in numbered layers (layer 4 = notches, layer 7 = grain line, …) and
  in free-text key/value pairs (`Piece Name: FRONT`). Nothing is validated;
  every CAD vendor interprets the conventions slightly differently.
- **No structure.** A graded style is a flat list of DXF blocks — one block
  per piece *and* size. The piece/size relationship must be reconstructed by
  string matching on embedded text entities. The piece boundary itself
  arrives as an unordered bag of polyline fragments.
- **Polylines only.** Curves are densified into hundreds of points; the
  designer's smooth curve is lost except for marker points.
- **Hard to consume.** Web and 3D applications need a full DXF parser plus
  knowledge of the ASTM conventions before they can draw a single piece.

OPF addresses these by making the pattern domain model explicit, validatable
(JSON Schema), and directly consumable by web tooling.

## Coordinate conventions

- All coordinates are in the unit given by `asset.unit` (`"mm"` or `"inch"`).
- The coordinate system is **y-up** (mathematical convention, as in DXF).
  Renderers targeting y-down systems (SVG, canvas) must flip.
- There is no prescribed origin; pieces are positioned as authored.

## Document structure

```jsonc
{
  "version": "0.4.0",          // OPF semantic version
  "asset":   { ... },          // provenance and units
  "style":   { ... },          // style-level information
  "sizes":   ["26", "28"],     // the style's size run, sorted
  "pieces":  [ ... ],          // pattern pieces
  "sewing":  [ ... ],          // optional: assembly seams
  "topstitching":    [ ... ],  // optional: decorative stitch lines
  "topstitchStyles": [ ... ]   // optional: stitch style definitions
}
```

The canonical machine-readable definition is
[`schema/opf.schema.json`](../schema/opf.schema.json) (JSON Schema 2020-12).

### `asset`

Provenance of the document, mapped from the DXF header text entities.

| Field                 | Type                | Description                          |
| --------------------- | ------------------- | ------------------------------------ |
| `authoringTool`       | string              | e.g. `"ACCUMARK"`                    |
| `authoringToolVersion`| string              | e.g. `"10.0.1"`                      |
| `authoringVendor`     | string              | e.g. `"GERBER TECHNOLOGY"`           |
| `creationDate`        | string              | as written by the authoring tool     |
| `creationTime`        | string              | as written by the authoring tool     |
| `unit`                | `"mm"` \| `"inch"`  | unit of **all** coordinates          |

Fields that the source file does not provide are empty strings.

### `style`

| Field      | Type   | Description                                   |
| ---------- | ------ | --------------------------------------------- |
| `name`     | string | style identifier, e.g. `"C-S1615WWO206"`      |
| `baseSize` | string | the sample size the pattern was drafted in    |

### `sizes`

Array of size identifiers as strings (`"36"`, `"M"`). Sorted numerically when
all sizes are numeric, alphabetically otherwise. This is the *style's* size
run; individual pieces may exist in a subset (sparse size runs).

### `pieces`

A piece is a name plus one **size snapshot** per size it exists in:

```jsonc
{
  "id": "RXP8nE",              // optional stable identifier
  "name": "FRONT",
  "sizes": {
    "36": { ...sizeSnapshot },
    "38": { ...sizeSnapshot }
  }
}
```

`id`, when present, must be unique within the document. Piece names may
repeat (e.g. linked mirror copies); documents that contain `sewing` or
`topstitching` references must make every referenced piece unambiguous —
by `id`, or by a unique name.

Every piece should include a snapshot for the style's `baseSize`; that
snapshot is the anchor for future rule-based grading.

### Size snapshot

A snapshot is the complete, self-contained geometry of one piece in one
size. All indices reference the snapshot's own vertex pool.

```jsonc
{
  "vertices": [0, 0, 12.5, 3.1, ...],   // flat [x0,y0, x1,y1, ...], deduplicated
  "boundary": { ...contour },           // the cut outline, always closed
  "internalLines":    [ ...contours ],  // drawn on the piece, not cut
  "internalCutouts":  [ ...contours ],  // cut lines inside the boundary
  "sewLines":         [ ...contours ],
  "stripeReferences": [ ...contours ],
  "plaidReferences":  [ ...contours ],
  "gradeReferences":  [ ...contours ],
  "grainLine":  { ...contour },         // optional, at most one
  "mirrorLine": { ...contour },         // optional, at most one
  "turnPoints":  [3, 17, 42],           // vertex indices on the boundary
  "curvePoints": [5, 6, 9],             // vertex indices (curve fit points)
  "drillHoles":  [55, 61],              // vertex indices
  "notches": [ { "vertex": 17, "type": "v-slit" } ],
  "annotations": [ ...textAnnotations ],
  "qualityValidation": { ... }          // optional, see below
}
```

#### Vertex pool

All coordinates of a snapshot live in a single flat array
`[x0, y0, x1, y1, …]`. Vertices are deduplicated: geometry that shares a
coordinate (e.g. a notch sitting exactly on a boundary vertex) references
the same index, making topological relationships explicit. Snapshots are
self-contained — extracting or transmitting a single size requires no other
data.

#### Contours

A contour is a start vertex plus a sequence of segments:

```jsonc
{
  "start": 12,
  "closed": true,
  "segments": [
    { "type": "lines", "to": [13, 14, 15] },
    { "type": "cubic", "c1": 16, "c2": 17, "to": 18 }
  ]
}
```

| Segment | Meaning |
| ------- | ------- |
| `lines` | straight segments through the listed vertices, in order |
| `cubic` | cubic Bézier (SVG `C` semantics): control points `c1`, `c2`, endpoint `to` |

When `closed` is true, an implicit straight edge connects the last on-curve
point back to `start` (SVG `Z` semantics). Control points are pool vertices
like any other — transformations and (future) grading offsets apply to them
uniformly. The mapping to an SVG path is direct: `M start`, `L`/`C`
segments, `Z` if closed.

Sources that only provide densified polylines (all ASTM DXF exports)
produce contours with a single `lines` segment; the original curve fit
points remain available in `curvePoints` for re-fitting. When a document
contains both a cubic representation and curve points, the cubic curve is
authoritative.

#### `boundary`

The piece outline (cut line). Exactly one per snapshot, always `closed`.
Parsers assembling OPF from DXF must chain the layer-1 fragments (polylines
and lines sharing endpoints) into this single contour.

#### `notches`

Notch objects: `{ "vertex": <index>, "type": <notchType> }` with types
`v-slit` (ASTM layer 4), `t` (80), `castle` (81), `check` (82), `u` (83).
Future revisions may add `angle`, `depth` and `width` fields.

#### `annotations`

Free text of the snapshot:

```jsonc
{
  "text": "Neckline Full Collar W/stand",
  "position": { "x": 755.02, "y": 427.63 },  // optional
  "height": 5.0,                              // optional, in document units
  "rotation": 269.9,                          // optional, degrees CCW
  "source": "boundary"                        // optional, see below
}
```

Regular annotation text (ASTM layer 15) has no `source`. Text found on a
geometry layer carries the OPF property name it was attached to (e.g.
`"boundary"`, `"sewLines"`). Key/value texts that are lifted into the
structured format (`Piece Name:`, `Size:`) do not appear as annotations.

#### `qualityValidation`

ASTM layers 84–87 carry system-written copies of the cut geometry that
receiving systems can use to validate their import. When present in the
source, OPF preserves them as contour arrays under `qualityValidation`
(`boundary`, `internalLines`, `internalCutouts`, `sewLines`); the property
is omitted otherwise. Consumers that only draw or cut patterns can ignore
this group.

## Sewing

The optional document-level `sewing` array records assembly seams:
which contour ranges are sewn together. ASTM DXF cannot express this;
the data originates from garment CAD/3D authoring tools.

```jsonc
{
  "name": "Sewing_185633",                      // optional
  "first": {
    "piece": "RXP8nE",                          // piece.id, else unique name
    "contour": { "property": "sewLines", "index": 0 },
    "start": 0.5176,
    "end": 0.2651,
    "reversed": true                            // default false
  },
  "second": {
    "piece": "aB3dEf",
    "contour": { "property": "boundary" },
    "start": 0.1554,
    "end": 0.5815
  },
  "fold": { "angle": 180, "strength": 5 },      // optional
  "turned": false                               // optional
}
```

### Contour references

`contour.property` names a snapshot property (`boundary`, `sewLines`,
`internalLines`, `internalCutouts`); `contour.index` is required for
the array-valued properties. A reference addresses the *corresponding*
contour in **every** size snapshot of the piece — producers must keep
contour order stable across sizes.

Seams attach to the line that is physically stitched: the net outline.
For pieces whose `boundary` is a cut line with seam allowance, that is
`sewLines[0]`; for pieces without separate seam allowance it is
`boundary` itself.

### Parameter ranges

`start` and `end` are **normalized arc-length parameters** in [0, 1],
measured along the contour from its `start` vertex following segment
order (including the implicit closing edge of closed contours). Because
they are fractions of the total length, the same range applies to every
size — seam definitions are grading-invariant by construction.

A side covers the arc traveled **from `start` to `end`**: in the
direction of increasing parameter when `reversed` is false (wrapping
1 → 0 on closed contours if `end < start`), in the direction of
decreasing parameter when `reversed` is true (wrapping 0 → 1 if
`end > start`). On open contours no wrap exists: `reversed: false`
requires `start ≤ end` and `reversed: true` requires `start ≥ end`.

The sewn correspondence is linear in arc length between the two sides'
traversals: the point at `first.start` meets the point at
`second.start`, and both traversals progress together to `end`. Sides
of unequal arc length imply ease (gathering/stretch), distributed
proportionally.

### Fold and turned

`fold.angle` is the fold angle across the seam in degrees (180 = flat,
i.e. no fold); `fold.strength` is a tool-defined stiffness value.
`turned` marks seams whose allowance is turned. Both are optional and
informational for 2D consumers.

## Topstitching

The optional `topstitching` array records decorative stitch lines that
run parallel to a contour; `topstitchStyles` holds reusable style
definitions they reference.

```jsonc
{
  "name": "Topstitch_1928505",
  "target": { "piece": "RXP8nE",
              "contour": { "property": "boundary" },
              "start": 0.0, "end": 0.25 },      // omit start/end: whole contour
  "offset": 1.3,                                 // distance in document units
  "extendStart": true,
  "extendEnd": true,
  "corner": { "curved": false, "curvedLength": 5, "rightAngled": false },
  "placement": "Seam Both",                      // seam-line stitches only
  "style": "st1"                                 // -> topstitchStyles[].id
}
```

`target` uses the same contour reference and parameter semantics as
seam sides; `target.contour` may be omitted when the source only
exposes the owning piece. All fields are optional except that a
topstitch object must not be empty; producers should emit at least
`name` or `target`.

## Mapping from ASTM D6673 / AAMA-292 DXF

| DXF layer | ASTM meaning                        | OPF property                          |
| --------- | ----------------------------------- | ------------------------------------- |
| 1         | Piece boundary                      | `boundary` (fragments chained)        |
| 2         | Turn points                         | `turnPoints`                          |
| 3         | Curve points                        | `curvePoints`                         |
| 4         | V-notch / slit notch                | `notches` (type `v-slit`)             |
| 5         | Grade reference                     | `gradeReferences`                     |
| 6         | Mirror line                         | `mirrorLine`                          |
| 7         | Grain line                          | `grainLine`                           |
| 8         | Internal lines (drawn, not cut)     | `internalLines`                       |
| 9         | Stripe reference                    | `stripeReferences`                    |
| 10        | Plaid reference                     | `plaidReferences`                     |
| 11        | Internal cutouts                    | `internalCutouts`                     |
| 13        | Drill holes                         | `drillHoles`                          |
| 14        | Sew lines                           | `sewLines`                            |
| 15        | Annotation text                     | `annotations`                         |
| 80–83     | T-/Castle/Check/U-notch             | `notches` (typed)                     |
| 84        | Boundary quality validation         | `qualityValidation.boundary`          |
| 85        | Internal lines quality validation   | `qualityValidation.internalLines`     |
| 86        | Internal cutouts quality validation | `qualityValidation.internalCutouts`   |
| 87        | Sew lines quality validation        | `qualityValidation.sewLines`          |

Style- and piece-level text metadata (`Piece Name:`, `Size:`, `Sample Size:`,
`Style Name:`, `Units:`, …) is lifted into the structured `asset`, `style`
and piece fields.

## Versioning

`version` follows semantic versioning of the *format*:

- **0.1.0** (implicit) — direct DXF transcription: per-layer shape
  collections keyed by size, numeric units, single raw annotation.
- **0.2.0** — `version` field; `unit` as `"mm"`/`"inch"`; annotation
  arrays; all ASTM layers incl. sew lines, cutouts, notch types and
  quality validation.
- **0.3.0** — inverted nesting: pieces hold self-contained per-size
  snapshots with local vertex pools; boundary chained into a single closed
  contour; contours with `lines`/`cubic` segments (SVG path semantics);
  singular `grainLine`/`mirrorLine`; notch objects; point layers as vertex
  index arrays; `qualityValidation` optional; sparse size runs.
- **0.4.0** — construction data (additive): optional `piece.id`;
  document-level `sewing` (assembly seams as grading-invariant contour
  parameter ranges), `topstitching` and `topstitchStyles`. Sourced from
  garment CAD/3D tools; ASTM DXF sources emit none of these.

## Known limitations / future work

- **Grading is materialized.** Every size's geometry is stored explicitly.
  A planned additive `grading` block will express the size run as the base
  snapshot plus per-vertex offsets (or grade rules at grade points), with
  materialized snapshots as an optional derived form.
- **Curve fitting is not performed yet.** The format supports cubic
  segments, but the DXF parser currently emits densified `lines` segments;
  fitting cubics through the preserved `curvePoints` is planned tooling.
- **Seam allowance** is not modeled explicitly; when present it is implicit
  in the relationship between `boundary` (cut) and `sewLines` (stitch).
- **Notch geometry** (angle, depth, width) is not yet captured.
- **Piece orientation/placement** (marker making) is out of scope.
