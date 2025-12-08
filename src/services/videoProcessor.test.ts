import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoProcessor } from './videoProcessor';
import type { ExtractionParams, ExtractedSlide, ProgressState } from '../types';

describe('VideoProcessor', () => {
  let processor: VideoProcessor;
  let mockVideo: HTMLVideoElement;
  let progressCallback: (state: ProgressState) => void;
  const defaultParams: ExtractionParams = {
    interval: 1.0,
    threshold: 10,
  };

  beforeEach(() => {
    processor = new VideoProcessor();
    progressCallback = vi.fn() as (state: ProgressState) => void;

    // Mock video element
    mockVideo = {
      videoWidth: 100,
      videoHeight: 100,
      duration: 10, // 10秒の動画
      currentTime: 0,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'seeked') {
          setTimeout(handler, 0);
        }
      }),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    // Mock canvas for frame extraction
    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(new ImageData(100, 100)),
      putImageData: vi.fn(),
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn((cb) => cb(new Blob(['test']))),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processVideo', () => {
    it('処理開始時にprocessingステータスになること', async () => {
      const resultPromise = processor.processVideo(mockVideo, defaultParams, progressCallback);

      // 非同期処理なので少し待つ
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
        })
      );

      // キャンセルしてクリーンアップ
      processor.cancel();
      await resultPromise;
    });

    it('完了時にcompletedステータスとスライド配列を返すこと', async () => {
      const result = await processor.processVideo(mockVideo, defaultParams, progressCallback);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.slides)).toBe(true);
      }
    });

    it('進捗コールバックが適切な情報で呼び出されること', async () => {
      await processor.processVideo(mockVideo, defaultParams, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      const mockFn = progressCallback as unknown as ReturnType<typeof vi.fn>;
      const lastCall = mockFn.mock.calls[mockFn.mock.calls.length - 1][0] as ProgressState;
      expect(lastCall.totalDuration).toBe(10);
    });
  });

  describe('cancel', () => {
    it('キャンセルするとCANCELLEDエラーを返すこと', async () => {
      // 長い動画をシミュレート
      mockVideo = {
        ...mockVideo,
        duration: 100,
      } as unknown as HTMLVideoElement;

      const resultPromise = processor.processVideo(mockVideo, defaultParams, progressCallback);

      // すぐにキャンセル
      processor.cancel();

      const result = await resultPromise;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CANCELLED');
      }
    });
  });

  describe('パラメータバリデーション', () => {
    it('interval > 0 であること', async () => {
      const invalidParams = { ...defaultParams, interval: 0 };

      const result = await processor.processVideo(mockVideo, invalidParams, progressCallback);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EXTRACTION_FAILED');
      }
    });

    it('threshold が 0-100 の範囲であること', async () => {
      const invalidParams = { ...defaultParams, threshold: 150 };

      const result = await processor.processVideo(mockVideo, invalidParams, progressCallback);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EXTRACTION_FAILED');
      }
    });
  });

  describe('onSlideDetected', () => {
    it('スライド検出時にコールバックが呼び出されること', async () => {
      const slideCallback = vi.fn() as (slide: ExtractedSlide) => void;

      const result = await processor.processVideo(
        mockVideo,
        defaultParams,
        progressCallback,
        slideCallback
      );

      expect(result.success).toBe(true);
      expect(slideCallback).toHaveBeenCalled();
    });

    it('最初のフレームで必ずコールバックが呼び出されること', async () => {
      const slideCallback = vi.fn() as (slide: ExtractedSlide) => void;

      await processor.processVideo(
        mockVideo,
        defaultParams,
        progressCallback,
        slideCallback
      );

      // 最初のフレームは必ず検出される
      expect(slideCallback).toHaveBeenCalled();
      const mockFn = slideCallback as unknown as ReturnType<typeof vi.fn>;
      const firstCall = mockFn.mock.calls[0][0] as ExtractedSlide;
      expect(firstCall.timestamp).toBe(0);
      expect(firstCall.sequenceNumber).toBe(1);
    });

    it('コールバックなしでも処理が正常に完了すること', async () => {
      // onSlideDetected を渡さない場合
      const result = await processor.processVideo(
        mockVideo,
        defaultParams,
        progressCallback
      );

      expect(result.success).toBe(true);
    });
  });
});
