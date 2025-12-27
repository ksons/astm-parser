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
| Mocha/Chai | 11.7.5/6.2.2 | Testing |
| ESLint | 9.x | Linting (flat config) |

## Project Structure

```
astm-parser/
├── src/
│   ├── index.ts              # Main ASTMParser class (async API)
│   ├── dxf.d.ts              # Legacy DXF type definitions
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
│   └── data/dxf/             # 33+ sample DXF files
├── schema/                   # JSON Schema definitions
├── package.json
├── tsconfig.json
└── eslint.config.js
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
- Modernized to async/await: `parseStream()` now returns `Promise<IReturnValue>`
- Added proper type imports from dxf-parser (`IEntity`, `ITextEntity`)

**`tsconfig.json`:**
- Updated to ESM: `module: "nodenext"`, `moduleResolution: "nodenext"`
- Target updated to `es2022`
- Added `esModuleInterop: true` and `skipLibCheck: true`

**`package.json`:**
- Added `"type": "module"` for ESM support
- Migrated from TSLint to ESLint with flat config
- Using `tsx` for test execution (Windows ESM compatibility)

### Breaking Changes
The `parseStream()` method now returns a Promise instead of using callbacks:
```typescript
// Old API
parser.parseStream(stream, (err, res) => { ... });

// New API
const res = await parser.parseStream(stream);
```

## Tech Debt

### Fixed
- ~~All dependencies 7+ years outdated~~ - Updated to latest versions
- ~~`@ts-ignore` comment in index.ts~~ - Removed, proper imports used
- ~~TSLint deprecated~~ - Migrated to ESLint with flat config
- ~~Callback-based API~~ - Modernized to async/await
- ~~Unused `opf.ts` skeleton~~ - Removed
- ~~Unused `isText()` function~~ - Removed

### Remaining Issues

**Critical:**
- `noImplicitAny: false` allows unsafe typing

**Code Quality:**
- Minimal test coverage (5 test files for 33+ DXF samples)
- No tests for Point, BBox, SVG generation utilities
- Duplicate type definitions in `src/dxf.d.ts` (shadows dxf-parser types)

## Recommended Refactoring

### 1. Migrate Types from Local to dxf-parser

The project maintains duplicate type definitions in `src/dxf.d.ts` that shadow the types exported by dxf-parser. This causes type incompatibilities requiring `as any` casts.

**Files to update:**
- `src/lib/PatternPiece.ts` - Change `import * as DXF from '../dxf.js'` to use dxf-parser types
- `src/dxf.d.ts` - Can be removed once PatternPiece is migrated

**Example migration:**
```typescript
// Before
import * as DXF from '../dxf.js';
createSize(size: string, entities: DXF.BlockEntity[]): Diagnostic[]

// After
import { IEntity } from 'dxf-parser';
createSize(size: string, entities: IEntity[]): Diagnostic[]
```

### 2. Enable Strict TypeScript

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

### 3. Migrate from Mocha to Vitest

Vitest provides better ESM and TypeScript support out of the box, eliminating the need for `tsx` workarounds.

```bash
npm uninstall mocha chai @types/mocha @types/chai ts-node
npm install --save-dev vitest
```

**Benefits:**
- Native ESM support (no Windows path issues)
- Built-in TypeScript support (no loader configuration)
- Faster execution with native ESM
- Compatible with Jest API (`describe`, `it`, `expect`)

**Migration:**
```typescript
// Before (Chai)
import { expect } from 'chai';
expect(result).to.have.property('asset');

// After (Vitest)
import { expect } from 'vitest';
expect(result).toHaveProperty('asset');
```

### 4. Add Missing Tests

Priority areas lacking test coverage:
- `src/lib/Point.ts` - Transform operations
- `src/lib/BBox.ts` - Bounding box calculations
- `src/lib/svg.ts` - SVG generation
- Edge cases in pattern parsing (malformed DXF files, missing fields)

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
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
