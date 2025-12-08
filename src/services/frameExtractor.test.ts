import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrameExtractor } from './frameExtractor';

describe('FrameExtractor', () => {
  let extractor: FrameExtractor;
  let mockVideo: HTMLVideoElement;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Mock canvas context
    mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(100 * 100 * 4),
        width: 100,
        height: 100,
        colorSpace: 'srgb',
      }),
    } as unknown as CanvasRenderingContext2D;

    // Mock canvas
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as HTMLCanvasElement;

    // Spy on document.createElement
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement);

    // Mock video element
    mockVideo = {
      videoWidth: 100,
      videoHeight: 100,
      duration: 60,
      currentTime: 0,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'seeked') {
          // Simulate seeked event after setting currentTime
          setTimeout(handler, 0);
        }
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    extractor = new FrameExtractor();
  });

  afterEach(() => {
    extractor.dispose();
    vi.restoreAllMocks();
  });

  describe('extractFrame', () => {
    it('指定時刻のフレームをImageDataとして取得できること', async () => {
      const time = 5.0;
      const result = await extractor.extractFrame(mockVideo, time);

      expect(result).toBeDefined();
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('Canvasのサイズが動画のサイズに設定されること', async () => {
      await extractor.extractFrame(mockVideo, 0);

      expect(mockCanvas.width).toBe(100);
      expect(mockCanvas.height).toBe(100);
    });

    it('drawImageが正しく呼び出されること', async () => {
      await extractor.extractFrame(mockVideo, 0);

      expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0);
    });

    it('getImageDataが正しく呼び出されること', async () => {
      await extractor.extractFrame(mockVideo, 0);

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('複数回呼び出してもCanvasが再利用されること', async () => {
      await extractor.extractFrame(mockVideo, 0);
      await extractor.extractFrame(mockVideo, 5);

      // createElementは1回だけ呼ばれる
      expect(document.createElement).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', () => {
    it('disposeを呼び出しても例外が発生しないこと', () => {
      expect(() => extractor.dispose()).not.toThrow();
    });
  });
});
