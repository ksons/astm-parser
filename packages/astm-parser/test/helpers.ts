import type { IContour } from '../src/index.js';

/** Number of on-curve points of a contour (start + segment endpoints). */
export function contourPointCount(contour: IContour): number {
  return (
    1 +
    contour.segments.reduce(
      (acc, segment) => acc + (segment.type === 'lines' ? segment.to.length : 1),
      0
    )
  );
}
