"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Point {
    constructor(nx, ny) {
        this.x = nx;
        this.y = ny;
    }
    transform(mat) {
        const x = this.x * mat[0] + this.y * mat[3] + mat[6];
        const y = this.x * mat[1] + this.y * mat[4] + mat[7];
        this.x = x;
        this.y = y;
        return this;
    }
}
exports.Point = Point;
//# sourceMappingURL=Point.js.map