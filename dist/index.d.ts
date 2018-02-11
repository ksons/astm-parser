/// <reference types="node" />
import * as fs from 'fs';
declare class ASTMParser {
    vertices: number[];
    count: number;
    parseStream(stream: fs.ReadStream, callback: (err: Error, msg: any) => void): void;
    private _transform(callback, err, dxf);
    private _getVertexIndex(vertex);
    private _findKey(entities, key);
    private _createBoundery(entities);
}
export { ASTMParser };
