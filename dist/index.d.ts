/// <reference types="node" />
import * as fs from 'fs';
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
declare class ASTMParser {
    vertices: number[];
    count: number;
    parseStream(stream: fs.ReadStream, callback: (err: Error, msg: IOpenPatternFormat) => void): void;
    private _transform(callback, err, dxf);
    private _getVertexIndex(vertex);
    private _findKey(entities, key);
    private _createBoundery(entities);
    private _createInternalShapes(entities);
}
export { ASTMParser };
