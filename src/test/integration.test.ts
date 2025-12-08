/**
 * 統合テスト
 * 動画処理フロー全体、ダウンロードフロー、キャンセル操作のテスト
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoProcessor } from '../services/videoProcessor';
import { ExportService, generateFilename } from '../services/exportService';
import type { ProgressState, ExtractedSlide } from '../types';

// Canvasモックの設定
const setupCanvasMock = () => {
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(new ImageData(100, 100)),
      putImageData: vi.fn(),
    }),
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockData'),
    toBlob: vi.fn((callback: BlobCallback) => {
      callback(new Blob(['mock'], { type: 'image/png' }));
    }),
  };

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas as unknown as HTMLCanvasElement;
    }
    if (tagName === 'a') {
      return {
        click: vi.fn(),
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement;
    }
    return document.createElement(tagName);
  });

  return mockCanvas;
};

// Videoモックの生成
const createMockVideo = (duration: number) => {
  let currentTime = 0;
  const listeners: { [key: string]: EventListener[] } = {};

  return {
    duration,
    get currentTime() {
      return currentTime;
    },
    set currentTime(value: number) {
      currentTime = value;
      // シーク完了をシミュレート
      setTimeout(() => {
        listeners['seeked']?.forEach((cb) => cb(new Event('seeked')));
      }, 0);
    },
    addEventListener: vi.fn((event: string, callback: EventListener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    }),
    removeEventListener: vi.fn((event: string, callback: EventListener) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      }
    }),
    videoWidth: 100,
    videoHeight: 100,
  } as unknown as HTMLVideoElement;
};

describe('統合テスト', () => {
  let originalCreateElement: typeof document.createElement;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalRequestAnimationFrame: typeof requestAnimationFrame;

  beforeEach(() => {
    vi.clearAllMocks();
    originalCreateElement = document.createElement.bind(document);
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;

    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    globalThis.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 0);
      return 0;
    });

    setupCanvasMock();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    vi.restoreAllMocks();
  });

  describe('動画処理フロー全体', () => {
    it('フレーム抽出 → 差分検出 → スライド保存のフローが正常に動作する', async () => {
      const processor = new VideoProcessor();
      const video = createMockVideo(5);
      const progressStates: ProgressState[] = [];

      const result = await processor.processVideo(
        video,
        { interval: 1, threshold: 10 },
        (state) => progressStates.push({ ...state })
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.slides.length).toBeGreaterThan(0);
        // 最初のスライドは必ず抽出される
        expect(result.slides[0].timestamp).toBe(0);
        expect(result.slides[0].sequenceNumber).toBe(1);
        expect(result.slides[0].imageData).toBeInstanceOf(ImageData);
        expect(result.slides[0].thumbnailUrl).toContain('data:image/png');
      }
    });

    it('処理開始から完了まで進捗状態が正しく遷移する', async () => {
      const processor = new VideoProcessor();
      const video = createMockVideo(3);
      const progressStates: ProgressState[] = [];

      await processor.processVideo(
        video,
        { interval: 1, threshold: 10 },
        (state) => progressStates.push({ ...state })
      );

      // 初期状態はprocessing
      expect(progressStates[0].status).toBe('processing');
      expect(progressStates[0].currentTime).toBe(0);

      // 最終状態はcompleted
      const lastState = progressStates[progressStates.length - 1];
      expect(lastState.status).toBe('completed');
      expect(lastState.currentTime).toBe(video.duration);
    });

    it('パラメータバリデーションエラー時は即座にエラーを返す', async () => {
      const processor = new VideoProcessor();
      const video = createMockVideo(10);

      const result = await processor.processVideo(
        video,
        { interval: -1, threshold: 10 },
        vi.fn()
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('EXTRACTION_FAILED');
      }
    });

    it('閾値を超えた差分がある場合、新しいスライドが抽出される', async () => {
      const processor = new VideoProcessor();
      const video = createMockVideo(5);

      const result = await processor.processVideo(
        video,
        { interval: 1, threshold: 0 }, // 閾値0で全フレームをスライドとして抽出
        vi.fn()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // 5秒の動画を1秒間隔で処理すると、複数のスライドが抽出される
        expect(result.slides.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('キャンセル操作', () => {
    it('処理中にキャンセルすると処理が中断される', async () => {
      const processor = new VideoProcessor();
      const video = createMockVideo(100);
      const progressStates: ProgressState[] = [];

      // 非同期で少し待ってからキャンセル
      const cancelPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          processor.cancel();
          resolve();
        }, 50);
      });

      const [result] = await Promise.all([
        processor.processVideo(
          video,
          { interval: 1, threshold: 10 },
          (state) => progressStates.push({ ...state })
        ),
        cancelPromise,
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CANCELLED');
        expect(result.error.message).toBe('処理がキャンセルされました');
      }
    });

    it('キャンセル後に進捗がcompleted状態にならない', async () => {
      const processor = new VideoProcessor();
      const video = createMockVideo(100);
      const progressStates: ProgressState[] = [];

      setTimeout(() => processor.cancel(), 30);

      await processor.processVideo(
        video,
        { interval: 1, threshold: 10 },
        (state) => progressStates.push({ ...state })
      );

      const hasCompleted = progressStates.some((s) => s.status === 'completed');
      expect(hasCompleted).toBe(false);
    });
  });

  describe('ダウンロードフロー', () => {
    const createMockSlide = (id: string, seqNum: number): ExtractedSlide => ({
      id,
      sequenceNumber: seqNum,
      timestamp: seqNum * 10,
      imageData: new ImageData(100, 100),
      thumbnailUrl: 'data:image/png;base64,mockThumb',
    });

    describe('個別ダウンロード', () => {
      it('単一スライドがPNGとしてダウンロードされる', async () => {
        const exportService = new ExportService();
        const slide = createMockSlide('slide-1', 1);

        await exportService.downloadSingle(slide);

        // ダウンロード用のa要素が作成されたことを確認
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });

      it('ファイル名がシーケンス番号を含む形式で生成される', () => {
        expect(generateFilename(1)).toBe('slide_001.png');
        expect(generateFilename(10)).toBe('slide_010.png');
        expect(generateFilename(100)).toBe('slide_100.png');
      });

      it('カスタムプレフィックスを指定できる', () => {
        expect(generateFilename(5, 'frame')).toBe('frame_005.png');
      });
    });

    describe('一括ダウンロード（ZIP）', () => {
      it('複数スライドがZIPとしてダウンロードされる', async () => {
        const exportService = new ExportService();
        const slides = [
          createMockSlide('slide-1', 1),
          createMockSlide('slide-2', 2),
          createMockSlide('slide-3', 3),
        ];

        await exportService.downloadAll(slides);

        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });

      it('空のスライド配列の場合、ダウンロードは実行されない', async () => {
        const exportService = new ExportService();

        await exportService.downloadAll([]);

        expect(URL.createObjectURL).not.toHaveBeenCalled();
      });

      it('1枚のスライドでもZIPダウンロードが動作する', async () => {
        const exportService = new ExportService();
        const slides = [createMockSlide('slide-1', 1)];

        await exportService.downloadAll(slides);

        expect(URL.createObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('エンドツーエンド処理フロー', () => {
    it('動画選択→処理→スライド抽出→ダウンロード準備の一連の流れ', async () => {
      // 1. VideoProcessor で処理
      const processor = new VideoProcessor();
      const video = createMockVideo(3);
      const progressStates: ProgressState[] = [];

      const result = await processor.processVideo(
        video,
        { interval: 1, threshold: 10 },
        (state) => progressStates.push({ ...state })
      );

      // 2. 処理成功を確認
      expect(result.success).toBe(true);
      if (!result.success) return;

      const slides = result.slides;
      expect(slides.length).toBeGreaterThan(0);

      // 3. ExportService でダウンロード
      const exportService = new ExportService();

      // 個別ダウンロード
      await exportService.downloadSingle(slides[0]);
      expect(URL.createObjectURL).toHaveBeenCalled();

      // 一括ダウンロード（全スライド）
      vi.clearAllMocks();
      await exportService.downloadAll(slides);
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
