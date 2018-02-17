export class Point {
  x: number
  y: number

  constructor(nx: number, ny: number) {
    this.x = nx
    this.y = ny
  }

  transform(mat: number[] | Float32Array): Point {
    const x = this.x * mat[0] + this.y * mat[3] + mat[6]
    const y = this.x * mat[1] + this.y * mat[4] + mat[7]
    this.x = x
    this.y = y
    return this
  }
}
