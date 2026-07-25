import {
  normalizedToImagePoint,
  containerPointToNormalized,
  clampTranslation,
} from '@/utils/mapCoordinates';

describe('mapCoordinates', () => {
  describe('normalizedToImagePoint', () => {
    it('scales normalized coordinates to image pixel space', () => {
      expect(
        normalizedToImagePoint({ x: 0.5, y: 0.25 }, { width: 400, height: 200 })
      ).toEqual({ x: 200, y: 50 });
    });

    it('maps corners to image bounds', () => {
      const image = { width: 300, height: 150 };
      expect(normalizedToImagePoint({ x: 0, y: 0 }, image)).toEqual({
        x: 0,
        y: 0,
      });
      expect(normalizedToImagePoint({ x: 1, y: 1 }, image)).toEqual({
        x: 300,
        y: 150,
      });
    });
  });

  describe('containerPointToNormalized', () => {
    const image = { width: 400, height: 200 };
    const container = { width: 400, height: 200 };

    it('round-trips with normalizedToImagePoint at scale 1, no translation', () => {
      const transform = { scale: 1, translateX: 0, translateY: 0 };
      const cases = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 0.5, y: 0.5 },
        { x: 0.25, y: 0.75 },
      ];

      for (const norm of cases) {
        const imagePoint = normalizedToImagePoint(norm, image);
        // Container is centered on the image at scale 1 with no translation,
        // so container-space == image-space here.
        const result = containerPointToNormalized(
          imagePoint,
          container,
          image,
          transform
        );
        expect(result?.x).toBeCloseTo(norm.x);
        expect(result?.y).toBeCloseTo(norm.y);
      }
    });

    it('round-trips at scale 2 with nonzero translation', () => {
      const scale = 2;
      const translateX = 30;
      const translateY = -15;
      const transform = { scale, translateX, translateY };

      const norm = { x: 0.75, y: 0.2 };
      const local = normalizedToImagePoint(norm, image);
      const screenPoint = {
        x:
          container.width / 2 +
          translateX +
          scale * (local.x - image.width / 2),
        y:
          container.height / 2 +
          translateY +
          scale * (local.y - image.height / 2),
      };

      const result = containerPointToNormalized(
        screenPoint,
        container,
        image,
        transform
      );
      expect(result?.x).toBeCloseTo(norm.x);
      expect(result?.y).toBeCloseTo(norm.y);
    });

    it('round-trips at scale 3 with nonzero translation', () => {
      const scale = 3;
      const translateX = -50;
      const translateY = 40;
      const transform = { scale, translateX, translateY };

      const norm = { x: 0.1, y: 0.9 };
      const local = normalizedToImagePoint(norm, image);
      const screenPoint = {
        x:
          container.width / 2 +
          translateX +
          scale * (local.x - image.width / 2),
        y:
          container.height / 2 +
          translateY +
          scale * (local.y - image.height / 2),
      };

      const result = containerPointToNormalized(
        screenPoint,
        container,
        image,
        transform
      );
      expect(result?.x).toBeCloseTo(norm.x);
      expect(result?.y).toBeCloseTo(norm.y);
    });

    it('returns null for a press on the letterboxed area', () => {
      const transform = { scale: 1, translateX: 0, translateY: 0 };
      // Way outside the image bounds.
      const result = containerPointToNormalized(
        { x: -100, y: -100 },
        container,
        image,
        transform
      );
      expect(result).toBeNull();
    });

    it('returns null just past each edge of the image', () => {
      const transform = { scale: 1, translateX: 0, translateY: 0 };
      expect(
        containerPointToNormalized(
          { x: -1, y: 100 },
          container,
          image,
          transform
        )
      ).toBeNull();
      expect(
        containerPointToNormalized(
          { x: 401, y: 100 },
          container,
          image,
          transform
        )
      ).toBeNull();
      expect(
        containerPointToNormalized(
          { x: 200, y: -1 },
          container,
          image,
          transform
        )
      ).toBeNull();
      expect(
        containerPointToNormalized(
          { x: 200, y: 201 },
          container,
          image,
          transform
        )
      ).toBeNull();
    });
  });

  describe('clampTranslation', () => {
    const image = { width: 300, height: 150 };
    const container = { width: 300, height: 150 };

    it('pins translation to 0 at scale 1 (fit-to-screen)', () => {
      expect(clampTranslation(80, -40, 1, image, container)).toEqual({
        x: 0,
        y: 0,
      });
    });

    it('clamps to symmetric bounds of (scale*size - container)/2 when zoomed', () => {
      const scale = 2;
      // scale*width - container.width = 600 - 300 = 300, so maxX = 150
      // scale*height - container.height = 300 - 150 = 150, so maxY = 75
      expect(clampTranslation(1000, 1000, scale, image, container)).toEqual({
        x: 150,
        y: 75,
      });
      expect(clampTranslation(-1000, -1000, scale, image, container)).toEqual({
        x: -150,
        y: -75,
      });
    });

    it('leaves in-bounds translation untouched', () => {
      const scale = 3;
      expect(clampTranslation(10, -5, scale, image, container)).toEqual({
        x: 10,
        y: -5,
      });
    });

    it('stays 0 on an axis where the scaled image still fits the container', () => {
      // A container much taller than the image means the height axis never
      // needs to pan even when zoomed in.
      const tallContainer = { width: 300, height: 1000 };
      const result = clampTranslation(50, 500, 2, image, tallContainer);
      expect(result.y).toBe(0);
    });
  });
});
