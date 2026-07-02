# Open Patterns

Monorepo for parsing and visualizing apparel pattern files in ASTM/AAMA DXF format.

## Packages

| Package                                            | Description                                        |
| -------------------------------------------------- | -------------------------------------------------- |
| [@open-patterns/astm-parser](packages/astm-parser) | DXF parser converting to Open Pattern Format (OPF) |
| [@open-patterns/opf2svg](packages/opf2svg)         | SVG generation from OPF data                       |
| [@open-patterns/cli](packages/cli)                 | Command-line tools for pattern conversion          |

## Purpose

Parses ASTM (American Society of Testing and Materials) and AAMA (American Apparel Manufacturers Association) format pattern files from CAD tools like Gerber AccuMark and CLO Virtual Fashion. Extracts pattern piece data including shapes, grading information, grain lines, notches, drill holes, annotations, and metadata.

## Technology Stack

| Component      | Version | Notes                                 |
| -------------- | ------- | ------------------------------------- |
| TypeScript     | 5.9.3   | Primary language (ESM)                |
| Node.js        | 22.x    | Runtime                               |
| npm workspaces | -       | Monorepo management                   |
| dxf-parser     | 1.1.2   | DXF file parsing                      |
| d3             | 7.9.0   | Color interpolation for visualization |
| Vitest         | 3.2.4   | Testing framework                     |
| ESLint         | 9.x     | Linting (flat config)                 |

## Project Structure

```
open-patterns/
├── packages/
│   ├── astm-parser/           # @open-patterns/astm-parser
│   │   ├── src/
│   │   │   ├── index.ts       # ASTMParser class
│   │   │   └── lib/
│   │   │       ├── snapshot.ts
│   │   │       ├── Diagnostic.ts
│   │   │       └── interfaces.ts
│   │   └── test/
│   │       └── data/dxf/      # Sample DXF files
│   │
│   ├── opf2svg/               # @open-patterns/opf2svg
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── lib/
│   │   │       ├── svg-generator.ts
│   │   │       ├── Point.ts
│   │   │       └── BBox.ts
│   │   └── test/
│   │
│   └── cli/                   # @open-patterns/cli
│       └── src/
│           ├── index.ts       # CLI entry point
│           └── commands/
│               ├── parse.ts   # DXF → JSON
│               ├── svg.ts     # DXF → SVG
│               └── image.ts   # DXF → PNG/JPEG/WebP
│
├── schema/                    # JSON Schema definitions
├── package.json               # Workspace root
├── tsconfig.json              # Base TypeScript config
├── vitest.config.ts
└── eslint.config.js
```

## Quick Start

```bash
npm install
npm run build --workspaces
npm test
```

## Scripts

| Command                      | Description               |
| ---------------------------- | ------------------------- |
| `npm run build --workspaces` | Build all packages        |
| `npm test`                   | Run all tests             |
| `npm run lint`               | Run ESLint                |
| `npm run format`             | Format code with Prettier |

## CLI Usage

```bash
# Parse DXF to JSON
npx opf parse packages/astm-parser/test/data/dxf/pattern.dxf
npx opf parse pattern.dxf -o pattern.json

# Generate SVG
npx opf svg pattern.dxf
npx opf svg pattern.dxf -o pattern.svg

# Render to image (PNG, JPEG, WebP)
npx opf image pattern.dxf -o pattern.png
npx opf image pattern.dxf -o pattern.jpg -f jpeg
npx opf image pattern.dxf -o pattern.webp -f webp

# Help
npx opf --help
```

### Size Selection

By default, all graded sizes are rendered. Use `--size` or `--base` to render a single size:

```bash
# Render only a specific size
npx opf svg pattern.dxf --size 36 -o size36.svg
npx opf image pattern.dxf --size 36 -o size36.png

# Render only the base size (auto-detected from pattern metadata)
npx opf svg pattern.dxf --base -o base.svg
npx opf image pattern.dxf -b -o base.png
```

If the specified size doesn't exist in the pattern, an error is shown with all available sizes.

### Image Options

| Option               | Description                                     |
| -------------------- | ----------------------------------------------- |
| `-f, --format <fmt>` | Output format: `png` (default), `jpeg`, `webp`  |
| `-w, --width <px>`   | Output width in pixels (maintains aspect ratio) |
| `-s, --scale <n>`    | Scale factor for higher resolution (default: 1) |

```bash
# High-resolution output (2x scale)
npx opf image pattern.dxf -o pattern.png -s 2

# Fixed width output
npx opf image pattern.dxf -o pattern.png -w 800

# JPEG with specific size
npx opf image pattern.dxf -o pattern.jpg -f jpeg --size 36 -w 1200
```

## API Usage

### Parsing DXF files

```typescript
import { ASTMParser } from '@open-patterns/astm-parser';

const parser = new ASTMParser();
const result = await parser.parseFile('pattern.dxf');
// also available: parser.parseString(content), parser.parseStream(stream)

console.log(result.data.version); // OPF format version
console.log(result.data.pieces); // Pattern pieces
console.log(result.data.sizes); // Available sizes
console.log(result.data.asset); // Authoring tool metadata, unit ('mm' | 'inch')
console.log(result.diagnostics); // Warnings and errors
```

### Generating SVG

```typescript
import { ASTMParser } from '@open-patterns/astm-parser';
import { generateSVG } from '@open-patterns/opf2svg';
import * as fs from 'fs';

const parser = new ASTMParser();
const result = await parser.parseFile('pattern.dxf');

const svg = generateSVG(result.data, {
  prettyPrint: true,
  inkscapeLayers: true,
});

fs.writeFileSync('pattern.svg', svg);

// Render only specific sizes
const baseSizeSvg = generateSVG(result.data, {
  sizes: [result.data.style.baseSize], // Only the base size
});

const selectedSizesSvg = generateSVG(result.data, {
  sizes: ['36', '38', '40'], // Only these sizes
});
```

## Open Pattern Format

The parser emits **Open Pattern Format (OPF)**, a JSON representation of
graded patterns designed to replace DXF/ASTM as an interchange format for
downstream tooling. The format is documented in
[docs/opf-spec.md](docs/opf-spec.md) and machine-validated by
[schema/opf.schema.json](schema/opf.schema.json) (JSON Schema 2020-12).
Every test fixture is round-tripped through the schema in CI.

## ASTM Layer Reference

All layers defined by ASTM D6673 / AAMA-292 are handled:

Every piece holds one self-contained **size snapshot** per size; the
properties below live inside the snapshot:

| Layer | Purpose                             | Snapshot Property                   |
| ----- | ----------------------------------- | ----------------------------------- |
| 1     | Boundary (pattern outline)          | `boundary` (fragments chained into one closed contour) |
| 2     | Turn Points                         | `turnPoints`                        |
| 3     | Curve Points                        | `curvePoints`                       |
| 4     | Notches (V/slit)                    | `notches`                           |
| 5     | Grade Reference                     | `gradeReferences`                   |
| 6     | Mirror Line                         | `mirrorLine`                        |
| 7     | Grain Line                          | `grainLine`                         |
| 8     | Internal Lines                      | `internalLines`                     |
| 9     | Stripe Reference                    | `stripeReferences`                  |
| 10    | Plaid Reference                     | `plaidReferences`                   |
| 11    | Internal Cutouts                    | `internalCutouts`                   |
| 13    | Drill Holes                         | `drillHoles`                        |
| 14    | Sew Lines                           | `sewLines`                          |
| 15    | Annotation Text                     | `annotations`                       |
| 80–83 | T-/Castle/Check/U-Notches           | `notches` (typed)                   |
| 84    | Boundary Quality Validation         | `qualityValidation.boundary`        |
| 85    | Internal Lines Quality Validation   | `qualityValidation.internalLines`   |
| 86    | Internal Cutouts Quality Validation | `qualityValidation.internalCutouts` |
| 87    | Sew Lines Quality Validation        | `qualityValidation.sewLines`        |
