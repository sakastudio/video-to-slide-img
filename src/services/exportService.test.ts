import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExportService, generateFilename } from './exportService';
import type { ExtractedSlide } from '../types';

describe('ExportService', () => {
  let exportService: ExportService;
  let mockSlide: ExtractedSlide;
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  let mockToBlob: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    exportService = new ExportService();

    // Create mock slide
    const imageData = new ImageData(10, 10);
    mockSlide = {
      id: 'slide-1',
      sequenceNumber: 1,
      timestamp: 5.5,
      imageData,
      thumbnailUrl: 'blob:mock-url',
    };

    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-download-url'),
      revokeObjectURL: vi.fn(),
    });

    // Mock anchor element
    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    // Mock toBlob
    mockToBlob = vi.fn((callback: (blob: Blob | null) => void) => {
      callback(new Blob(['mock image data'], { type: 'image/png' }));
    });

    // Mock document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            putImageData: vi.fn(),
          }),
          toBlob: mockToBlob,
        } as unknown as HTMLCanvasElement;
      }
      return mockAnchor as unknown as HTMLElement;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('generateFilename', () => {
    it('シーケンス番号を0埋めしたファイル名を生成すること', () => {
      expect(generateFilename(1)).toBe('slide_001.png');
      expect(generateFilename(10)).toBe('slide_010.png');
      expect(generateFilename(100)).toBe('slide_100.png');
    });

    it('カスタムプレフィックスを使用できること', () => {
      expect(generateFilename(5, 'frame')).toBe('frame_005.png');
    });
  });

  describe('downloadSingle', () => {
    it('単一スライドをPNGとしてダウンロードすること', async () => {
      await exportService.downloadSingle(mockSlide);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('slide_001.png');
    });
  });

  describe('downloadAll', () => {
    it('空の配列の場合、早期リターンすること', async () => {
      await exportService.downloadAll([]);

      // URL.createObjectURLが呼ばれないことを確認
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('複数スライドをZIPとしてダウンロードすること', async () => {
      const slides = [mockSlide, { ...mockSlide, id: 'slide-2', sequenceNumber: 2 }];

      await exportService.downloadAll(slides);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('slides.zip');
    });
  });

  describe('imageDataToBlob', () => {
    it('ImageDataをBlobに変換できること', async () => {
      await exportService.downloadSingle(mockSlide);

      // toBlobが呼ばれたことを確認（Canvas経由）
      expect(mockToBlob).toHaveBeenCalled();
    });
  });
});
