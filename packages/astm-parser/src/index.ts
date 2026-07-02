import DxfParser, { IDxf, IEntity, ITextEntity } from 'dxf-parser';
import * as fs from 'fs';
import { Diagnostic, Severity } from './lib/Diagnostic.js';
import { BlockEntity, buildSnapshot } from './lib/snapshot.js';
import { IPatternPiece } from './lib/interfaces.js';

export type {
  ContourSegment,
  IContour,
  INotch,
  IPatternPiece,
  IQualityValidation,
  ISizeSnapshot,
  NotchType,
  TextAnnotation,
} from './lib/interfaces.js';
export { ASTMLayers } from './lib/interfaces.js';

/** Version of the Open Pattern Format emitted by this parser. */
export const OPF_VERSION = '0.3.0';

/** Measurement unit of all coordinates in the document. */
export type Unit = 'mm' | 'inch';

export type { Diagnostic, Severity } from './lib/Diagnostic.js';

export interface IAsset {
  authoringTool: string;
  authoringToolVersion: string;
  authoringVendor: string;
  creationDate: string;
  creationTime: string;
  unit: Unit;
}

export interface IStyle {
  name: string;
  baseSize: string;
}

export interface IOpenPatternFormat {
  /** Semantic version of the Open Pattern Format */
  version: string;
  asset: IAsset;
  pieces: IPatternPiece[];
  sizes: string[];
  style: IStyle;
}

export interface IReturnValue {
  data: IOpenPatternFormat;
  diagnostics: Diagnostic[];
}

/** Sort sizes numerically when possible, alphabetically otherwise. */
export function compareSizes(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    return na - nb;
  }
  return a.localeCompare(b);
}

class ASTMParser {
  diagnostics: Diagnostic[] = [];

  /** Parse DXF content provided as a string. */
  async parseString(content: string): Promise<IReturnValue> {
    // @ts-expect-error - ESM/CJS interop issue with dxf-parser default export
    const parser: DxfParser = new DxfParser();
    const dxf = parser.parse(content);
    if (!dxf) {
      throw new Error('Failed to parse DXF content');
    }
    return this._transform(dxf);
  }

  /** Parse a DXF file from disk. */
  async parseFile(filePath: string): Promise<IReturnValue> {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    return this.parseStream(stream);
  }

  async parseStream(stream: NodeJS.ReadableStream): Promise<IReturnValue> {
    // @ts-expect-error - ESM/CJS interop issue with dxf-parser default export
    const parser: DxfParser = new DxfParser();
    const dxf: IDxf = await parser.parseStream(stream as fs.ReadStream);
    return this._transform(dxf);
  }

  private _transform(dxf: IDxf): IReturnValue {
    this.diagnostics = [];
    const pieceMap = new Map<string, IPatternPiece>();
    const sizeSet = new Set<string>();

    Object.keys(dxf.blocks).forEach(key => {
      const block = dxf.blocks[key];
      const name = this._findKey(block.entities, 'piece name');
      if (name === '') {
        this.diagnostics.push(new Diagnostic(Severity.WARNING, `Skipping block '${key}': missing required field piece name`, block));
        return;
      }

      const size = this._findKey(block.entities, 'size');
      if (size !== '') {
        sizeSet.add(size);
      }

      const snapshot = buildSnapshot(block.entities as BlockEntity[], this.diagnostics);
      if (!snapshot) {
        this.diagnostics.push(new Diagnostic(Severity.WARNING, `Skipping block '${key}' (piece '${name}', size '${size}')`));
        return;
      }

      let piece = pieceMap.get(name);
      if (!piece) {
        piece = { name, sizes: {} };
        pieceMap.set(name, piece);
      }
      if (piece.sizes[size]) {
        this.diagnostics.push(new Diagnostic(Severity.WARNING, `Duplicate block for piece '${name}', size '${size}'; overwriting`));
      }
      piece.sizes[size] = snapshot;
    });

    const baseSizeStr = this._findKey(dxf.entities, 'sample size');
    const baseSize = baseSizeStr ? baseSizeStr : 'M';

    const style: IStyle = {
      baseSize,
      name: this._findKey(dxf.entities, 'style name')
    };

    const asset: IAsset = {
      authoringTool: this._findKey(dxf.entities, 'product'),
      authoringToolVersion: this._findKey(dxf.entities, 'version'),
      authoringVendor: this._findKey(dxf.entities, 'author'),
      creationDate: this._findKey(dxf.entities, 'creation date'),
      creationTime: this._findKey(dxf.entities, 'creation time'),
      unit: this._findUnit(dxf.entities)
    };

    return {
      data: {
        version: OPF_VERSION,
        asset,
        pieces: Array.from(pieceMap.values()),
        sizes: Array.from(sizeSet).sort(compareSizes),
        style
      },
      diagnostics: this.diagnostics
    };
  }

  private _findUnit(entities: IEntity[]): Unit {
    const unitStr = this._findKey(entities, 'units');
    if (unitStr === 'METRIC') {
      return 'mm';
    }
    if (unitStr === 'ENGLISH') {
      return 'inch';
    }
    this.diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected unit: '${unitStr}'`));
    return 'inch';
  }

  private _findKey(entities: IEntity[], key: string): string {
    for (const entity of entities) {
      if (entity.type === 'TEXT') {
        const textEntity = entity as ITextEntity;
        const result = getTextKeyValue(textEntity);
        if (!result) {
          this.diagnostics.push(new Diagnostic(Severity.WARNING, 'Unexpected syntax in key-value text string: ' + textEntity.text, entity));
          continue;
        }
        if (result.key.toLowerCase() === key) {
          return result.value;
        }
      }
    }
    return '';
  }
}

function getTextKeyValue(entity: ITextEntity): { key: string; value: string } | null {
  const text = entity.text;
  const splitPos = text.indexOf(':');
  if (splitPos === -1) {
    return null;
  }
  return {
    key: text.substring(0, splitPos),
    value: text.substring(splitPos + 1).trim()
  };
}

export { ASTMParser };
