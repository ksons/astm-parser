/// <reference types="node" />
import * as fs from 'fs';
import { Diagnostic } from './lib/Diagnostic';
import { IPatternPiece } from './lib/interfaces';
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
declare class ASTMParser {
  diagnostics: Diagnostic[];
  parseStream(stream: fs.ReadStream, callback: (err: Error, msg: IReturnValue) => void): void;
  private _transform(callback, err, dxf);
  private _findUnit(entities);
  private _findKey(entities, key);
}
export { ASTMParser };
