// @ts-ignore
import * as DXFParser from 'dxf-parser';
import * as fs from 'fs';
import * as DXF from './dxf';
import { Diagnostic, Severity } from './lib/Diagnostic';
import { ASTMLayers, IPatternPiece } from './lib/interfaces';
import { PatternPiece } from './lib/PatternPiece';

export const enum Units {
  MM = 1,
  INCH = 2
}

interface IVertex {
  x: number;
  y: number;
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

  parseStream(stream: fs.ReadStream, callback: (err: Error, msg: IReturnValue) => void) {
    try {
      const parser = new DXFParser();
      parser.parseStream(stream, this._transform.bind(this, callback));
    } catch (e) {
      console.log(e);
    }
  }

  private _transform(callback: (err: Error, msg?: IReturnValue) => void, err: Error, dxf: DXF.DxfSchema) {
    if (err) {
      callback(err);
    }

    const pieceMap = new Map<string, PatternPiece>();
    const sizeSet = new Set();
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
      const diag = actualPiece.createSize(size, block.entities);
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

    // console.log(asset);
    err = foundError ? new Error(this.diagnostics.map(diag => diag.message).join('\n')) : null;
    const ret: IReturnValue = {
      data: {
        asset,
        pieces: Array.from(pieceMap.values()),
        sizes: Array.from(sizeSet).sort(),
        style
      },
      diagnostics: this.diagnostics
    };

    callback(err, ret);
  }

  private _findUnit(entities: DXF.BlockEntity[]): Units {
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

  private _findKey(entities: DXF.BlockEntity[], key: string): string {
    for (const entity of entities) {
      if (entity.type === 'TEXT') {
        const result = getTextKeyValue(entity);
        if (!result) {
          this.diagnostics.push(new Diagnostic(Severity.WARNING, 'Unexpected syntax in key-value text string: ' + entity.text, entity));
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

function isText(entity: DXF.BlockEntity): entity is DXF.EntityText {
  return (entity as DXF.EntityText).type === 'TEXT';
}

function isPolyLine(entity: DXF.BlockEntity): entity is DXF.EntityPolyline {
  return (entity as DXF.EntityPolyline).type === 'POLYLINE';
}

function getTextKeyValue(entity: DXF.EntityText): { key: string; value: string } | null {
  const text = entity.text;
  const splitPos = text.indexOf(':');
  if (splitPos === -1) {
    return null;
  }
  return {
    key: text.substr(0, splitPos),
    value: text.substr(splitPos + 1).trim()
  };
}

export { ASTMParser };
