# TODO — Open Pattern Format roadmap

Working list of agreed and proposed changes. Format decisions are
pre-1.0: breaking changes are acceptable, but each rev should bundle
related breaks (see 0.3, which bundled nesting inversion + contours).

## 0.4 — Grading block (agreed)

Additive `grading` block expressing the size run as the base snapshot
plus deltas, with materialized snapshots as optional derived data.

- [ ] Per-vertex offset extraction relative to the base snapshot
      (lossless re-encoding; empirically valid: boundary vertex
      correspondence holds index-by-index across sizes in all Gerber
      fixtures).
- [ ] Rule-table compression: identify grade points (vertices whose
      offsets are not linear interpolations of their contour
      neighbors — candidates are handed to us by `turnPoints` /
      `curvePoints` sharing pool indices with the boundary), store
      ASTM-style (dx, dy) per grade point per size break.
- [ ] Fidelity ladder in the format: `rules` > `offsets` >
      materialized snapshots; mixed per piece; re-materialization must
      reproduce the source within export resolution (0.01 mm), else
      fall back one level.
- [ ] `opf grade-fit` CLI command + round-trip tests (re-materialize
      all sizes, assert residuals) on all fixtures.
- [ ] Caveat to document: recovered rules reproduce geometry, not the
      grader's original named rule table.

## 0.5 — Edge model and stable identities (proposed; prerequisite for diffing)

Motivated by the version-diff use case ("sleeve was shortened"):
diffs need stable anchors, not array positions and parse-order vertex
indices.

- [ ] Partition the boundary at turn points into **edges** with stable
      IDs (`edges: [{id, from, to, ...}]` referencing boundary
      positions). Edges are the natural unit for seams, seam
      allowance, notch placement and semantic diffs.
- [ ] Parameterize notches and drill holes on edges (edge id + t)
      instead of/in addition to absolute vertices, so they survive
      geometry edits and grading.
- [ ] Stable IDs: `piece.id` (survives renames), contour ids for
      internal geometry. Author-assigned when available, else
      content-derived with documented heuristics.
- [ ] Optional semantic roles vocabulary: piece roles (`sleeve`,
      `front`, `cuff`, …) and edge roles (`hem`, `neckline`,
      `armhole`, `sideSeam`, …). Optional fields — authorable,
      inferable by tooling, never required.

## Curve fitting (format ready since 0.3)

- [ ] Fit cubic Béziers through `curvePoints` (interpolating spline →
      exact Bézier conversion), replacing densified `lines` runs
      between turn points; spec tolerance vs. source polyline
      (≤ 0.05 mm) and seam-length preservation.
- [ ] `opf fit-curves` CLI command; report fit quality and segment
      counts per piece across fixtures.
- [ ] Diff benefit: fitted curves remove densification noise when
      comparing versions (re-exports densify differently).

## Diff tooling (`opf diff`) — after edge model

- [ ] Topology diff: pieces/edges/notches/drill holes/internal
      contours added, removed, retyped; grading structure changes.
- [ ] Geometric diff per matched edge: length delta, positional
      drift (e.g. max deviation), area/perimeter delta per piece.
- [ ] Semantic report: translate geometric deltas into statements
      using roles when present ("sleeve hem edge shortened 18 mm"),
      falling back to edge ids.
- [ ] Matching strategy for inputs without stable IDs (two DXF
      exports): piece by name, edges by turn-point correspondence,
      geometric nearest-match fallback with confidence flags.

## Format completeness (from expert review, not yet scheduled)

- [ ] Notch geometry: optional `angle`, `depth`, `width` on notch
      objects (default: perpendicular to boundary).
- [ ] Seam allowance: optional per-edge allowance value tying
      `boundary` (cut) and `sewLines` (stitch) together.
- [ ] Piece manufacturing metadata: cut quantity, on-fold flag,
      material/fabric code, category, marker rotation constraints —
      lifted from free-text annotations where recognizable.
- [ ] Extension escape hatch: explicit `extensions` object at
      document, piece and snapshot level (schema currently
      `additionalProperties: false` everywhere).

## Housekeeping

- [ ] `opf validate` CLI command (ajv against the bundled schema).
- [ ] Decide long-term home of `qualityValidation` (DXF-transport
      artifact; currently optional).
- [ ] Publish schema at a stable URL matching its `$id`.
- [ ] Consider migrating useful legacy code (`../opf2svg`, `../test`)
      learnings, then archive those folders.
