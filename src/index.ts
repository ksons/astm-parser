import DXFParser, { IEntity, ITextEntity } from 'dxf-parser';
import * as fs from 'fs';
import { Diagnostic, Severity } from './lib/Diagnostic.js';
import { IPatternPiece } from './lib/interfaces.js';
import { BlockEntity, PatternPiece } from './lib/PatternPiece.js';

export const enum Units {
  MM = 1,
  INCH = 2
}


export interface IAsset {
  authoringTool: string;
  authoringToolVersion: string;
  authoringVendor: string;
  creationDate: string;
  creationTime: string;
  unit: Units;
}

export interface IStyle {
  name: string;
  baseSize: string;
}

export interface IOpenPatternFormat {
  asset: IAsset;
  pieces: IPatternPiece[];
  sizes: string[];
  style: IStyle;
}

export interface IReturnValue {
  data: IOpenPatternFormat;
  diagnostics: Diagnostic[];
}

class ASTMParser {
  diagnostics: Diagnostic[] = [];

  async parseStream(stream: fs.ReadStream): Promise<IReturnValue> {
    const parser = new DXFParser();
    const dxf = await parser.parseStream(stream);

    const pieceMap = new Map<string, PatternPiece>();
    const sizeSet = new Set<string>();
    let foundError = false;

    Object.keys(dxf.blocks).forEach(key => {
      const block = dxf.blocks[key];
      const size = this._findKey(block.entities, 'size');
      if (size !== null) {
        sizeSet.add(size);
      }

      const name = this._findKey(block.entities, 'piece name');
      if (name === null) {
        this.diagnostics.push(new Diagnostic(Severity.ERROR, 'Missing required field piece name', block));
        foundError = true;
        return;
      }
      let actualPiece = pieceMap.get(name);
      if (!actualPiece) {
        actualPiece = new PatternPiece(name);
        pieceMap.set(name, actualPiece);
      }
      const diag = actualPiece.createSize(size, block.entities as BlockEntity[]);
      Array.prototype.push.apply(this.diagnostics, diag);
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

    if (foundError) {
      throw new Error(this.diagnostics.map(diag => diag.message).join('\n'));
    }

    return {
      data: {
        asset,
        pieces: Array.from(pieceMap.values()),
        sizes: Array.from(sizeSet).sort(),
        style
      },
      diagnostics: this.diagnostics
    };
  }

  private _findUnit(entities: IEntity[]): Units {
    const unitStr = this._findKey(entities, 'units');
    if (unitStr === 'METRIC') {
      return Units.MM;
    }
    if (unitStr === 'ENGLISH') {
      return Units.INCH;
    }
    this.diagnostics.push(new Diagnostic(Severity.WARNING, `Unexpected unit: '${unitStr}'`));
    return Units.INCH;
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
        // console.log(result)
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
