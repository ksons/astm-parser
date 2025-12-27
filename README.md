# astm-parser

TypeScript parser that converts DXF (Drawing Exchange Format) files into standardized Open Pattern Format (OPF) for the fashion/apparel industry.

## Purpose

Parses ASTM (American Society of Testing and Materials) and AAMA (American Apparel Manufacturers Association) format pattern files from CAD tools like Gerber AccuMark and CLO Virtual Fashion. Extracts pattern piece data including shapes, grading information, grain lines, notches, drill holes, annotations, and metadata. Provides diagnostic feedback and SVG visualization capabilities.

## Technology Stack

| Component | Version | Notes |
|-----------|---------|-------|
| TypeScript | 5.9.3 | Primary language (ESM) |
| Node.js | 22.x | Runtime |
| dxf-parser | 1.1.2 | DXF file parsing (Promise-based API) |
| d3 | 7.9.0 | Pattern visualization |
| lodash | 4.17.21 | Utility functions |
| Vitest | 3.2.4 | Testing framework |
| ESLint | 9.x | Linting (flat config) |

## Project Structure

```
astm-parser/
├── src/
│   ├── index.ts              # Main ASTMParser class (async API)
│   └── lib/
│       ├── PatternPiece.ts   # Core pattern piece logic
│       ├── Diagnostic.ts     # Error/warning reporting
│       ├── interfaces.ts     # Types and ASTM layer enums
│       ├── Point.ts          # 2D point with transform
│       ├── BBox.ts           # Bounding box calculations
│       └── svg.ts            # SVG visualization utility
├── test/
│   ├── parse.ts              # Gerber AccuMark tests
│   ├── clo.ts                # CLO Virtual Fashion tests
│   ├── mirror.ts             # Mirror line tests
│   ├── annotation-text.ts    # Annotation tests
│   ├── drill-holes.ts        # Drill hole tests
│   ├── point.ts              # Point class tests
│   ├── bbox.ts               # BBox class tests
│   ├── parse-all.ts          # Batch parsing script
│   └── data/dxf/             # Sample DXF files
├── schema/                   # JSON Schema definitions
├── vitest.config.ts          # Vitest configuration
├── package.json
├── tsconfig.json
└── eslint.config.js
```

## Quick Start

```bash
npm install
npm test
npm run lint
```

## Build

```bash
npx tsc
```

The compiled output is written to `dist/`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run parse:all` | Parse all DXF files and generate report |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Batch Processing

Parse all DXF files in the current directory tree:

```bash
npm run parse:all
```

Produces a report showing:
- Summary of successful/failed parses
- Table of parsed files with piece counts, sizes, and diagnostics
- Failed files with error messages
- Top diagnostic messages grouped by frequency

## API Usage

```typescript
import { ASTMParser } from 'astm-parser';
import * as fs from 'fs';

const parser = new ASTMParser();
const stream = fs.createReadStream('pattern.dxf', { encoding: 'utf8' });
const result = await parser.parseStream(stream);

console.log(result.data.pieces);      // Pattern pieces
console.log(result.data.sizes);       // Available sizes
console.log(result.data.asset);       // Authoring tool metadata
console.log(result.diagnostics);      // Warnings and errors
```

## Recent Changes (December 2024)

### Type System Migration
- Removed local `src/dxf.d.ts` type definitions
- Now uses types directly from `dxf-parser` package (`IEntity`, `ITextEntity`, `IPointEntity`, etc.)
- Added type guards for entity type narrowing in PatternPiece.ts
- Exported `BlockEntity` union type for external use

### Test Framework Migration
- Migrated from Mocha/Chai to Vitest
- Updated all test files to use Vitest assertions (`toHaveProperty`, `toEqual`, etc.)
- Replaced `before()` hooks with `beforeAll()`
- Removed callback-style tests in favor of synchronous assertions

### Code Modernization
- Converted `parse-all.js` to TypeScript with proper error handling
- Updated lodash imports for ESM compatibility
- Added batch processing report with diagnostic summaries

## Tech Debt

### Fixed
- ~~All dependencies 7+ years outdated~~ - Updated to latest versions
- ~~`@ts-ignore` comment in index.ts~~ - Removed, proper imports used
- ~~TSLint deprecated~~ - Migrated to ESLint with flat config
- ~~Callback-based API~~ - Modernized to async/await
- ~~Duplicate type definitions in `src/dxf.d.ts`~~ - Now uses dxf-parser types
- ~~Mocha/Chai testing~~ - Migrated to Vitest
- ~~`noImplicitAny: false`~~ - Enabled strict TypeScript (`noImplicitAny` + `strictNullChecks`)
- ~~No tests for Point, BBox utilities~~ - Added test coverage (12 Point tests, 19 BBox tests)

### Remaining Issues

**Code Quality:**
- No tests for SVG generation utilities (svg.ts is a script, not a testable module)
- Edge cases in pattern parsing not covered (malformed DXF files, missing fields)

## ASTM Layer Reference

| Layer | Purpose | Status | Output Property |
|-------|---------|--------|-----------------|
| 1 | Boundary (pattern outline) | Handled | `shapes` |
| 2 | Turn Points | Handled | `turnPoints` |
| 3 | Curve Points | Handled | `curvePoints` |
| 4 | Notches | Handled | `notches` |
| 5 | Grade Reference | Handled | `gradeReferences` |
| 6 | Mirror Line | Handled | `mirrorLines` |
| 7 | Grain Line | Handled | `grainLines` |
| 8 | Internal Lines | Handled | `internalShapes` |
| 13 | Drill Holes | Handled | `drillHoles` |
| 15 | Annotation Text | Handled | `annotations` |
| 84 | ASTM Boundary (alternative) | Not handled | Logged as diagnostic |
| 85 | ASTM Internal Lines (alternative) | Not handled | Logged as diagnostic |
