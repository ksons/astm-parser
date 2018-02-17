"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Point_1 = require("./Point");
class BBox {
    constructor() {
        this.min = new Point_1.Point(Infinity, Infinity);
        this.max = new Point_1.Point(-Infinity, -Infinity);
    }
    get width() {
        return this.max.x - this.min.x;
    }
    get height() {
        return this.max.y - this.min.y;
    }
    addToBox(x, y) {
        if (typeof x === 'object') {
            y = x.y;
            x = x.x;
        }
        this.max.x = x > this.max.x ? x : this.max.x;
        this.max.y = y > this.max.y ? y : this.max.y;
        this.min.x = x < this.min.x ? x : this.min.x;
        this.min.y = y < this.min.y ? y : this.min.y;
    }
    merge(other) {
        this.addToBox(other.min);
        this.addToBox(other.max);
        return this;
    }
    translate(x, y) {
        this.min.x += x;
        this.min.y += y;
        this.max.x += x;
        this.max.y += y;
    }
    transformed(mat) {
        const points = [];
        points[0] = new Point_1.Point(this.min.x, this.min.y);
        points[1] = new Point_1.Point(this.min.x, this.max.y);
        points[2] = new Point_1.Point(this.max.x, this.min.y);
        points[3] = new Point_1.Point(this.max.x, this.max.y);
        const result = new BBox();
        points.forEach(p => {
            p.transform(mat);
            result.addToBox(p);
        });
        return result;
    }
}
exports.BBox = BBox;
//# sourceMappingURL=BBox.js.map