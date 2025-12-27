import { describe, it, expect } from 'vitest';
import { BBox } from '../src/lib/BBox.js';
import { Point } from '../src/lib/Point.js';

describe('BBox', () => {
  describe('constructor', () => {
    it('should initialize with Infinity values', () => {
      const bbox = new BBox();
      expect(bbox.min.x).toBe(Infinity);
      expect(bbox.min.y).toBe(Infinity);
      expect(bbox.max.x).toBe(-Infinity);
      expect(bbox.max.y).toBe(-Infinity);
    });
  });

  describe('width and height', () => {
    it('should calculate width correctly', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 5);
      expect(bbox.width).toBe(10);
    });

    it('should calculate height correctly', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 5);
      expect(bbox.height).toBe(5);
    });

    it('should handle single point (zero width and height)', () => {
      const bbox = new BBox();
      bbox.addToBox(5, 5);
      expect(bbox.width).toBe(0);
      expect(bbox.height).toBe(0);
    });
  });

  describe('addToBox', () => {
    it('should accept x and y numbers', () => {
      const bbox = new BBox();
      bbox.addToBox(10, 20);
      expect(bbox.min.x).toBe(10);
      expect(bbox.min.y).toBe(20);
      expect(bbox.max.x).toBe(10);
      expect(bbox.max.y).toBe(20);
    });

    it('should accept Point object', () => {
      const bbox = new BBox();
      const point = new Point(10, 20);
      bbox.addToBox(point);
      expect(bbox.min.x).toBe(10);
      expect(bbox.min.y).toBe(20);
      expect(bbox.max.x).toBe(10);
      expect(bbox.max.y).toBe(20);
    });

    it('should update bounds with multiple points', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 5);
      bbox.addToBox(5, 10);
      expect(bbox.min.x).toBe(0);
      expect(bbox.min.y).toBe(0);
      expect(bbox.max.x).toBe(10);
      expect(bbox.max.y).toBe(10);
    });

    it('should handle negative coordinates', () => {
      const bbox = new BBox();
      bbox.addToBox(-10, -20);
      bbox.addToBox(10, 20);
      expect(bbox.min.x).toBe(-10);
      expect(bbox.min.y).toBe(-20);
      expect(bbox.max.x).toBe(10);
      expect(bbox.max.y).toBe(20);
    });

    it('should not update bounds for point inside existing box', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 10);
      bbox.addToBox(5, 5); // Inside the box
      expect(bbox.min.x).toBe(0);
      expect(bbox.min.y).toBe(0);
      expect(bbox.max.x).toBe(10);
      expect(bbox.max.y).toBe(10);
    });
  });

  describe('merge', () => {
    it('should combine two bounding boxes', () => {
      const bbox1 = new BBox();
      bbox1.addToBox(0, 0);
      bbox1.addToBox(10, 10);

      const bbox2 = new BBox();
      bbox2.addToBox(5, 5);
      bbox2.addToBox(20, 20);

      bbox1.merge(bbox2);
      expect(bbox1.min.x).toBe(0);
      expect(bbox1.min.y).toBe(0);
      expect(bbox1.max.x).toBe(20);
      expect(bbox1.max.y).toBe(20);
    });

    it('should return this for chaining', () => {
      const bbox1 = new BBox();
      const bbox2 = new BBox();
      const result = bbox1.merge(bbox2);
      expect(result).toBe(bbox1);
    });
  });

  describe('translate', () => {
    it('should shift min and max by offset', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 10);
      bbox.translate(5, 10);
      expect(bbox.min.x).toBe(5);
      expect(bbox.min.y).toBe(10);
      expect(bbox.max.x).toBe(15);
      expect(bbox.max.y).toBe(20);
    });

    it('should handle negative offsets', () => {
      const bbox = new BBox();
      bbox.addToBox(10, 10);
      bbox.addToBox(20, 20);
      bbox.translate(-5, -5);
      expect(bbox.min.x).toBe(5);
      expect(bbox.min.y).toBe(5);
      expect(bbox.max.x).toBe(15);
      expect(bbox.max.y).toBe(15);
    });

    it('should not change with zero offset', () => {
      const bbox = new BBox();
      bbox.addToBox(10, 10);
      bbox.addToBox(20, 20);
      bbox.translate(0, 0);
      expect(bbox.min.x).toBe(10);
      expect(bbox.min.y).toBe(10);
      expect(bbox.max.x).toBe(20);
      expect(bbox.max.y).toBe(20);
    });
  });

  describe('transformed', () => {
    it('should return a new BBox instance', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 10);
      const result = bbox.transformed([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      expect(result).not.toBe(bbox);
      expect(result).toBeInstanceOf(BBox);
    });

    it('should not mutate original with identity matrix', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 10);
      bbox.transformed([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      expect(bbox.min.x).toBe(0);
      expect(bbox.min.y).toBe(0);
      expect(bbox.max.x).toBe(10);
      expect(bbox.max.y).toBe(10);
    });

    it('should return same bounds with identity matrix', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 10);
      const result = bbox.transformed([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      expect(result.min.x).toBe(0);
      expect(result.min.y).toBe(0);
      expect(result.max.x).toBe(10);
      expect(result.max.y).toBe(10);
    });

    it('should handle translation transform', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 10);
      // Translate by (5, 5)
      const result = bbox.transformed([1, 0, 0, 0, 1, 0, 5, 5, 1]);
      expect(result.min.x).toBe(5);
      expect(result.min.y).toBe(5);
      expect(result.max.x).toBe(15);
      expect(result.max.y).toBe(15);
    });

    it('should handle scale transform', () => {
      const bbox = new BBox();
      bbox.addToBox(0, 0);
      bbox.addToBox(10, 10);
      // Scale by 2
      const result = bbox.transformed([2, 0, 0, 0, 2, 0, 0, 0, 1]);
      expect(result.min.x).toBe(0);
      expect(result.min.y).toBe(0);
      expect(result.max.x).toBe(20);
      expect(result.max.y).toBe(20);
    });
  });
});
