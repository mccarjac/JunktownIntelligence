export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * Converts a normalized (0-1) image coordinate to a position relative to the
 * top-left of the image, in the image's own (untransformed) pixel space.
 */
export function normalizedToImagePoint(coords: Point, image: Size): Point {
  'worklet';
  return {
    x: coords.x * image.width,
    y: coords.y * image.height,
  };
}

/**
 * Converts a point in the (untransformed) map container's coordinate space
 * — e.g. a long-press event's `x`/`y` — into normalized (0-1) image
 * coordinates, accounting for the image being centered in the container and
 * transformed by `[translateX, translateY, scale]` about its own center.
 *
 * Returns `null` when the point falls outside the image bounds (the
 * letterboxed area around it).
 */
export function containerPointToNormalized(
  point: Point,
  container: Size,
  image: Size,
  transform: MapTransform
): Point | null {
  'worklet';
  const { scale, translateX, translateY } = transform;

  const localX =
    (point.x - container.width / 2 - translateX) / scale + image.width / 2;
  const localY =
    (point.y - container.height / 2 - translateY) / scale + image.height / 2;

  const x = image.width > 0 ? localX / image.width : 0;
  const y = image.height > 0 ? localY / image.height : 0;

  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null;
  }

  return { x, y };
}

/**
 * Clamps pan translation so the scaled image can never be panned away from
 * fully covering (or, when smaller than the container, staying centered
 * within) the container. At scale 1 the image is fit-to-screen, so both
 * bounds collapse to 0 and translation is pinned to the origin.
 */
export function clampTranslation(
  translateX: number,
  translateY: number,
  scale: number,
  image: Size,
  container: Size
): Point {
  'worklet';
  const maxX = Math.max(0, (scale * image.width - container.width) / 2);
  const maxY = Math.max(0, (scale * image.height - container.height) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, translateX)) || 0,
    y: Math.min(maxY, Math.max(-maxY, translateY)) || 0,
  };
}
