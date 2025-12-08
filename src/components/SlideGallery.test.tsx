import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlideGallery } from './SlideGallery';
import type { ExtractedSlide } from '../types';

describe('SlideGallery', () => {
  const mockOnDownloadSingle = vi.fn();
  const mockOnDownloadAll = vi.fn();

  const createMockSlide = (id: string, sequenceNumber: number, timestamp: number): ExtractedSlide => ({
    id,
    sequenceNumber,
    timestamp,
    imageData: new ImageData(100, 100),
    thumbnailUrl: `data:image/png;base64,mock-${id}`,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('空のスライドリスト', () => {
    it('スライドがない場合は何も表示されない', () => {
      const { container } = render(
        <SlideGallery
          slides={[]}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('スライドの表示', () => {
    const mockSlides: ExtractedSlide[] = [
      createMockSlide('slide-1', 1, 0),
      createMockSlide('slide-2', 2, 30),
      createMockSlide('slide-3', 3, 65),
    ];

    it('ギャラリーが表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );
      expect(screen.getByTestId('slide-gallery')).toBeInTheDocument();
    });

    it('スライド数がヘッダーに表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );
      expect(screen.getByText('検出されたスライド (3枚)')).toBeInTheDocument();
    });

    it('各スライドカードが表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );
      const cards = screen.getAllByTestId('slide-card');
      expect(cards).toHaveLength(3);
    });

    it('各スライドにシーケンス番号が表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('各スライドにタイムスタンプが表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );
      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByText('0:30')).toBeInTheDocument();
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('サムネイル画像が表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(3);
      expect(images[0]).toHaveAttribute('alt', 'スライド 1');
      expect(images[1]).toHaveAttribute('alt', 'スライド 2');
      expect(images[2]).toHaveAttribute('alt', 'スライド 3');
    });
  });

  describe('ダウンロード機能', () => {
    const mockSlides: ExtractedSlide[] = [
      createMockSlide('slide-1', 1, 0),
      createMockSlide('slide-2', 2, 30),
    ];

    it('すべてダウンロードボタンが表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );
      expect(screen.getByTestId('download-all-button')).toBeInTheDocument();
      expect(screen.getByText('すべてダウンロード (ZIP)')).toBeInTheDocument();
    });

    it('すべてダウンロードボタンをクリックするとonDownloadAllが呼ばれる', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      fireEvent.click(screen.getByTestId('download-all-button'));

      expect(mockOnDownloadAll).toHaveBeenCalledTimes(1);
    });

    it('各スライドに個別ダウンロードボタンが表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      expect(screen.getByTestId('download-slide-1')).toBeInTheDocument();
      expect(screen.getByTestId('download-slide-2')).toBeInTheDocument();
    });

    it('個別ダウンロードボタンをクリックすると対応するスライドでonDownloadSingleが呼ばれる', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      fireEvent.click(screen.getByTestId('download-slide-1'));

      expect(mockOnDownloadSingle).toHaveBeenCalledTimes(1);
      expect(mockOnDownloadSingle).toHaveBeenCalledWith(mockSlides[0]);
    });

    it('異なるスライドのダウンロードボタンをクリックすると正しいスライドが渡される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadAll={mockOnDownloadAll}
        />
      );

      fireEvent.click(screen.getByTestId('download-slide-2'));

      expect(mockOnDownloadSingle).toHaveBeenCalledWith(mockSlides[1]);
    });
  });
});
