import { Point } from './Point';
export declare class BBox {
    min: Point;
    max: Point;
    constructor();
    readonly width: number;
    readonly height: number;
    addToBox(x: number | Point, y?: number): void;
    merge(other: BBox): this;
    translate(x: number, y: number): void;
    transformed(mat: number[] | Float32Array): BBox;
}
