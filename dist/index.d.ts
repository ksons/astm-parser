/// <reference types="node" />
import * as fs from 'fs';
import { Diagnostic } from './lib/Diagnostic';
export interface IPatternPiece {
    name: string;
    shapes: object;
    internalShapes: object;
}
export interface IOpenPatternFormat {
    pieces: IPatternPiece[];
    sizes: number[];
    vertices: number[];
    baseSize: number;
}
export interface IReturnValue {
    data: IOpenPatternFormat;
    diagnostics: Diagnostic[];
}
declare class ASTMParser {
    vertices: number[];
    count: number;
    diagnostics: Diagnostic[];
    parseStream(stream: fs.ReadStream, callback: (err: Error, msg: IReturnValue) => void): void;
    private _transform(callback, err, dxf);
    private _checkBlock(entities);
    private _getVertexIndex(vertex);
    private _findKey(entities, key);
    private _createBoundery(entities);
    private _createInternalShapes(entities);
}
export { ASTMParser };
