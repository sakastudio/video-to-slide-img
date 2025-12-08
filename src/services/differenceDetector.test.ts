import { describe, it, expect } from 'vitest';
import { detectDifference, DifferenceDetector } from './differenceDetector';

describe('DifferenceDetector', () => {
  describe('detectDifference', () => {
    it('同一画像の場合、差分が0であること', () => {
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4).fill(128);

      const frame1 = new ImageData(data.slice(), width, height);
      const frame2 = new ImageData(data.slice(), width, height);

      const result = detectDifference(frame1, frame2, 10);

      expect(result.isDifferent).toBe(false);
      expect(result.diffRatio).toBe(0);
      expect(result.diffPixelCount).toBe(0);
    });

    it('完全に異なる画像の場合、差分が100%であること', () => {
      const width = 10;
      const height = 10;

      // 黒い画像
      const data1 = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data1.length; i += 4) {
        data1[i] = 0;     // R
        data1[i + 1] = 0; // G
        data1[i + 2] = 0; // B
        data1[i + 3] = 255; // A
      }

      // 白い画像
      const data2 = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data2.length; i += 4) {
        data2[i] = 255;     // R
        data2[i + 1] = 255; // G
        data2[i + 2] = 255; // B
        data2[i + 3] = 255; // A
      }

      const frame1 = new ImageData(data1, width, height);
      const frame2 = new ImageData(data2, width, height);

      const result = detectDifference(frame1, frame2, 10);

      expect(result.isDifferent).toBe(true);
      expect(result.diffRatio).toBe(100);
      expect(result.diffPixelCount).toBe(width * height);
    });

    it('差分が閾値以下の場合、isDifferentがfalseであること', () => {
      const width = 100;
      const height = 100;
      const totalPixels = width * height;

      // ほぼ同じ画像（5%だけ異なる）
      const data1 = new Uint8ClampedArray(totalPixels * 4);
      const data2 = new Uint8ClampedArray(totalPixels * 4);

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        data1[idx] = 128;
        data1[idx + 1] = 128;
        data1[idx + 2] = 128;
        data1[idx + 3] = 255;

        // 最初の5%のピクセルだけ異なる色に
        if (i < totalPixels * 0.05) {
          data2[idx] = 0;
          data2[idx + 1] = 0;
          data2[idx + 2] = 0;
        } else {
          data2[idx] = 128;
          data2[idx + 1] = 128;
          data2[idx + 2] = 128;
        }
        data2[idx + 3] = 255;
      }

      const frame1 = new ImageData(data1, width, height);
      const frame2 = new ImageData(data2, width, height);

      // 閾値10%で5%の差分はisDifferent = false
      const result = detectDifference(frame1, frame2, 10);

      expect(result.isDifferent).toBe(false);
      expect(result.diffRatio).toBeLessThanOrEqual(10);
    });

    it('差分が閾値を超える場合、isDifferentがtrueであること', () => {
      const width = 100;
      const height = 100;
      const totalPixels = width * height;

      // 15%異なる画像
      const data1 = new Uint8ClampedArray(totalPixels * 4);
      const data2 = new Uint8ClampedArray(totalPixels * 4);

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        data1[idx] = 128;
        data1[idx + 1] = 128;
        data1[idx + 2] = 128;
        data1[idx + 3] = 255;

        // 最初の15%のピクセルだけ異なる色に
        if (i < totalPixels * 0.15) {
          data2[idx] = 0;
          data2[idx + 1] = 0;
          data2[idx + 2] = 0;
        } else {
          data2[idx] = 128;
          data2[idx + 1] = 128;
          data2[idx + 2] = 128;
        }
        data2[idx + 3] = 255;
      }

      const frame1 = new ImageData(data1, width, height);
      const frame2 = new ImageData(data2, width, height);

      // 閾値10%で15%の差分はisDifferent = true
      const result = detectDifference(frame1, frame2, 10);

      expect(result.isDifferent).toBe(true);
      expect(result.diffRatio).toBeGreaterThan(10);
    });

    it('異なるサイズの画像の場合、エラーをスローすること', () => {
      const frame1 = new ImageData(10, 10);
      const frame2 = new ImageData(20, 20);

      expect(() => detectDifference(frame1, frame2, 10)).toThrow();
    });
  });

  describe('DifferenceDetector class', () => {
    it('インスタンスとして使用できること', () => {
      const detector = new DifferenceDetector();

      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4).fill(128);

      const frame1 = new ImageData(data.slice(), width, height);
      const frame2 = new ImageData(data.slice(), width, height);

      const result = detector.detectDifference(frame1, frame2, 10);

      expect(result.isDifferent).toBe(false);
    });
  });
});
