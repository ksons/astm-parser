import { describe, it, expect } from 'vitest';
import { Point } from '../src/lib/Point.js';

describe('Point', () => {
  describe('constructor', () => {
    it('should create a point with given coordinates', () => {
      const point = new Point(10, 20);
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
    });

    it('should handle zero values', () => {
      const point = new Point(0, 0);
      expect(point.x).toBe(0);
      expect(point.y).toBe(0);
    });

    it('should handle negative values', () => {
      const point = new Point(-5, -10);
      expect(point.x).toBe(-5);
      expect(point.y).toBe(-10);
    });

    it('should handle decimal values', () => {
      const point = new Point(1.5, 2.75);
      expect(point.x).toBe(1.5);
      expect(point.y).toBe(2.75);
    });
  });

  describe('transform', () => {
    it('should not change point with identity matrix', () => {
      const point = new Point(10, 20);
      // Identity matrix: [1,0,0, 0,1,0, 0,0,1]
      point.transform([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      expect(point.x).toBe(10);
      expect(point.y).toBe(20);
    });

    it('should translate point correctly', () => {
      const point = new Point(10, 20);
      // Translation matrix: translate by (5, 10)
      // [1,0,0, 0,1,0, 5,10,1]
      point.transform([1, 0, 0, 0, 1, 0, 5, 10, 1]);
      expect(point.x).toBe(15);
      expect(point.y).toBe(30);
    });

    it('should scale point correctly', () => {
      const point = new Point(10, 20);
      // Scale matrix: scale by (2, 3)
      // [2,0,0, 0,3,0, 0,0,1]
      point.transform([2, 0, 0, 0, 3, 0, 0, 0, 1]);
      expect(point.x).toBe(20);
      expect(point.y).toBe(60);
    });

    it('should handle 90 degree rotation', () => {
      const point = new Point(10, 0);
      // Rotation matrix for 90 degrees: cos=0, sin=1
      // [cos, sin, 0, -sin, cos, 0, 0, 0, 1]
      // [0, 1, 0, -1, 0, 0, 0, 0, 1]
      point.transform([0, 1, 0, -1, 0, 0, 0, 0, 1]);
      expect(point.x).toBeCloseTo(0);
      expect(point.y).toBeCloseTo(10);
    });

    it('should mutate the point in place', () => {
      const point = new Point(10, 20);
      point.transform([1, 0, 0, 0, 1, 0, 5, 5, 1]);
      expect(point.x).toBe(15);
      expect(point.y).toBe(25);
    });

    it('should return this for method chaining', () => {
      const point = new Point(10, 20);
      const result = point.transform([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      expect(result).toBe(point);
    });

    it('should work with Float32Array', () => {
      const point = new Point(10, 20);
      const matrix = new Float32Array([1, 0, 0, 0, 1, 0, 5, 10, 1]);
      point.transform(matrix);
      expect(point.x).toBe(15);
      expect(point.y).toBe(30);
    });

    it('should handle combined scale and translate', () => {
      const point = new Point(10, 20);
      // Scale by 2, then translate by (5, 5)
      // [2,0,0, 0,2,0, 5,5,1]
      point.transform([2, 0, 0, 0, 2, 0, 5, 5, 1]);
      expect(point.x).toBe(25); // 10*2 + 5
      expect(point.y).toBe(45); // 20*2 + 5
    });
  });
});
