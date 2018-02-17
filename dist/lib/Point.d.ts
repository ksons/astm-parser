export declare class Point {
    x: number;
    y: number;
    constructor(nx: number, ny: number);
    transform(mat: number[] | Float32Array): Point;
}
