# astm-parser

TypeScript parser that converts DXF (Drawing Exchange Format) files into standardized Open Pattern Format (OPF) for the fashion/apparel industry.

## Purpose

Parses ASTM (American Society of Testing and Materials) and AAMA (American Apparel Manufacturers Association) format pattern files from CAD tools like Gerber AccuMark and CLO Virtual Fashion. Extracts pattern piece data including shapes, grading information, grain lines, notches, drill holes, annotations, and metadata. Provides diagnostic feedback and SVG visualization capabilities.

## Technology Stack

| Component | Version | Notes |
|-----------|---------|-------|
| TypeScript | 5.9.3 | Primary language |
| Node.js | 22.x | Runtime |
| dxf-parser | 1.1.2 | DXF file parsing (Promise-based API) |
| d3 | 7.9.0 | Pattern visualization |
| lodash | 4.17.21 | Utility functions |
| Mocha/Chai | 11.7.5/6.2.2 | Testing |

## Project Structure

```
astm-parser/
├── src/
│   ├── index.ts              # Main ASTMParser class
│   ├── dxf.d.ts              # Legacy DXF type definitions
│   └── lib/
│       ├── PatternPiece.ts   # Core pattern piece logic
│       ├── Diagnostic.ts     # Error/warning reporting
│       ├── interfaces.ts     # Types and ASTM layer enums
│       ├── Point.ts          # 2D point with transform
│       ├── BBox.ts           # Bounding box calculations
│       └── svg.ts            # SVG visualization
├── test/
│   ├── parse.ts              # Gerber AccuMark tests
│   ├── clo.ts                # CLO Virtual Fashion tests
│   └── data/dxf/             # 33+ sample DXF files
├── schema/                   # JSON Schema definitions
├── package.json
├── tsconfig.json
└── tslint.json
```

## Recent Changes (December 2024)

### Dependencies Upgraded
All major dependencies updated to latest versions:
- TypeScript 2.6 → 5.9.3
- dxf-parser 0.5.1 → 1.1.2
- d3 4.13 → 7.9.0
- Mocha 5.0 → 11.7.5
- Chai 4.1 → 6.2.2

### Code Changes

**`src/index.ts`:**
- Updated import to use default export: `import DXFParser from 'dxf-parser'`
- Migrated from callback-based to Promise-based `parseStream()` API
- Added proper type imports from dxf-parser (`IDxf`, `IEntity`, `ITextEntity`)
- Fixed `Set<string>` generic for proper type inference

**`tsconfig.json`:**
- Added `esModuleInterop: true` for default imports from CommonJS modules
- Added `skipLibCheck: true` to handle third-party type conflicts

### Breaking Changes from dxf-parser 1.x
The `parseStream()` method now returns a `Promise<IDxf>` instead of using callbacks:
```typescript
// Old API (0.5.x)
parser.parseStream(stream, (err, dxf) => { ... });

// New API (1.x)
parser.parseStream(stream).then(dxf => { ... });
```

## Tech Debt

### Fixed
- ~~All dependencies 7+ years outdated~~ - Updated to latest versions
- ~~`@ts-ignore` comment in index.ts~~ - Removed, proper imports used

### Remaining Issues

**Critical:**
- TSLint deprecated (replaced by ESLint in 2019)
- `noImplicitAny: false` allows unsafe typing

**Code Quality:**
- Minimal test coverage (5 test files for 33+ DXF samples)
- No tests for Point, BBox, SVG generation utilities
- Empty documentation
- Unused code (`opf.ts` skeleton, `pd.js`)

## Recommended Refactoring

### 1. Migrate Types from Local to dxf-parser

The project maintains duplicate type definitions in `src/dxf.d.ts` that shadow the types exported by dxf-parser. This causes type incompatibilities requiring `as any` casts.

**Files to update:**
- `src/lib/PatternPiece.ts` - Change `import * as DXF from '../dxf'` to use dxf-parser types
- `src/dxf.d.ts` - Can be removed once PatternPiece is migrated

**Example migration:**
```typescript
// Before
import * as DXF from '../dxf';
createSize(size: string, entities: DXF.BlockEntity[]): Diagnostic[]

// After
import { IEntity } from 'dxf-parser';
createSize(size: string, entities: IEntity[]): Diagnostic[]
```

### 2. Migrate from TSLint to ESLint

```bash
npm uninstall tslint tslint-config-prettier tslint-config-standard
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

Create `eslint.config.js` with TypeScript support.

### 3. Enable Strict TypeScript

Update `tsconfig.json` incrementally:
```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strict": true
  }
}
```

This will surface type errors that need fixing, particularly around optional properties and null handling.

### 4. Remove Unused Code

- `src/opf.ts` - Empty skeleton file
- `pd.js` - Unused JavaScript file
- `isText()` and `isPolyLine()` functions in `src/index.ts` - Defined but never called

### 5. Modernize Async Pattern

Consider updating `ASTMParser.parseStream()` to return a Promise instead of using callbacks:

```typescript
// Current
parseStream(stream: fs.ReadStream, callback: (err: Error, msg: IReturnValue) => void)

// Recommended
async parseStream(stream: fs.ReadStream): Promise<IReturnValue>
```

This would align with modern Node.js patterns and the underlying dxf-parser API.

### 6. Add Missing Tests

Priority areas lacking test coverage:
- `src/lib/Point.ts` - Transform operations
- `src/lib/BBox.ts` - Bounding box calculations
- `src/lib/svg.ts` - SVG generation
- Edge cases in pattern parsing (malformed DXF files, missing fields)

## Quick Start

```bash
npm install
npm test
```

## Build

```bash
npx tsc
```

The compiled output is written to `dist/`.
