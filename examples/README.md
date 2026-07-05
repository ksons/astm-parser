# OPF examples

Complete Open Pattern Format documents, kept schema-valid by the test
suite (`packages/astm-parser/test/examples.ts`).

## SU26-50587342.opf.json

A full graded style exported from a 3D garment CAD tool (OPF 0.4.0):

- 42 pieces with stable `id`s, 5 sizes (40–48, base 42), materialized
  per-size snapshots
- boundary/sew/internal contours, turn/curve points, notches, grain
  lines, drill holes
- `sewing`: 122 assembly seams as grading-invariant contour parameter
  ranges (including wrap-around ranges on closed contours)
- `topstitching` + `topstitchStyles`: 32 stitch records, 5 styles

Render it with the CLI's sibling library:

```bash
node -e "
import('@open-patterns/opf2svg').then(async m => {
  const fs = await import('fs');
  const opf = JSON.parse(fs.readFileSync('examples/SU26-50587342.opf.json', 'utf8'));
  fs.writeFileSync('example.svg', m.generateSVG(opf));
});"
```
