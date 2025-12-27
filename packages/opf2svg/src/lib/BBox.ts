import { Point } from './Point.js';

export class BBox {
  min: Point;
  max: Point;
  constructor() {
    this.min = new Point(Infinity, Infinity);
    this.max = new Point(-Infinity, -Infinity);
  }

  get width() {
    return this.max.x - this.min.x;
  }

  get height() {
    return this.max.y - this.min.y;
  }

  addToBox(x: number | Point, y?: number) {
    let xVal: number;
    let yVal: number;
    if (typeof x === 'object') {
      xVal = x.x;
      yVal = x.y;
    } else {
      xVal = x;
      yVal = y!;
    }
    this.max.x = xVal > this.max.x ? xVal : this.max.x;
    this.max.y = yVal > this.max.y ? yVal : this.max.y;
    this.min.x = xVal < this.min.x ? xVal : this.min.x;
    this.min.y = yVal < this.min.y ? yVal : this.min.y;
  }

  merge(other: BBox) {
    this.addToBox(other.min);
    this.addToBox(other.max);
    return this;
  }

  translate(x: number, y: number) {
    this.min.x += x;
    this.min.y += y;
    this.max.x += x;
    this.max.y += y;
  }

  transformed(mat: number[] | Float32Array): BBox {
    const points: Point[] = [];
    points[0] = new Point(this.min.x, this.min.y);
    points[1] = new Point(this.min.x, this.max.y);
    points[2] = new Point(this.max.x, this.min.y);
    points[3] = new Point(this.max.x, this.max.y);

    const result = new BBox();
    points.forEach(p => {
      p.transform(mat);
      result.addToBox(p);
    });

    return result;
  }
}
