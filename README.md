# astm-parser

TypeScript parser that converts DXF (Drawing Exchange Format) files into standardized Open Pattern Format (OPF) for the fashion/apparel industry.

## Purpose

Parses ASTM (American Society of Testing and Materials) and AAMA (American Apparel Manufacturers Association) format pattern files from CAD tools like Gerber AccuMark and CLO Virtual Fashion. Extracts pattern piece data including shapes, grading information, grain lines, notches, drill holes, annotations, and metadata. Provides diagnostic feedback and SVG visualization capabilities.

## Technology Stack

| Component | Version | Notes |
|-----------|---------|-------|
| TypeScript | 2.6.2 | Primary language |
| Node.js | - | Runtime |
| dxf-parser | 0.5.1 | DXF file parsing |
| d3 | 4.13.0 | Pattern visualization |
| lodash | 4.17.5 | Utility functions |
| Mocha/Chai | 5.0.0/4.1.2 | Testing |
| TSLint | 5.9.1 | Linting (deprecated) |

## Project Structure

\`\`\`
astm-parser/
├── src/
│   ├── index.ts              # Main ASTMParser class
│   ├── dxf.d.ts              # DXF type definitions
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
\`\`\`

## Tech Debt

**Critical:**
- All dependencies 7+ years outdated (TypeScript 2.6 vs 5.x, Node types 9.x vs 20.x)
- TSLint deprecated (replaced by ESLint in 2019)
- \`noImplicitAny: false\` allows unsafe typing
- \`@ts-ignore\` comment in index.ts bypasses type checking

**Code Quality:**
- Minimal test coverage (5 test files for 33+ DXF samples)
- No tests for Point, BBox, SVG generation utilities
- Empty documentation
- Unused code (\`opf.ts\` skeleton, \`pd.js\`)

## How to Make it Usable

### 1. Update Dependencies
\`\`\`bash
npm install --save-dev typescript@latest @types/node@latest @types/mocha@latest
npm install --save d3@latest d3-scale-chromatic@latest
npm install --save-dev mocha@latest chai@latest ts-node@latest
\`\`\`

### 2. Migrate Linting
\`\`\`bash
npm uninstall tslint tslint-config-prettier tslint-config-standard
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier
\`\`\`

### 3. Fix TypeScript Config
Update \`tsconfig.json\`:
\`\`\`json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
\`\`\`

### 4. Run Tests
\`\`\`bash
npm install
npm test  # mocha -r ts-node/register test/**/*.ts
\`\`\`

### 5. Build
\`\`\`bash
npx tsc
\`\`\`

## Quick Start (Current State)

\`\`\`bash
npm install
npm test
\`\`\`

Note: May require Node.js v14 or earlier for compatibility with old dependencies.
