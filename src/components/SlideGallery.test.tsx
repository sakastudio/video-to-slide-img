import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test/testUtils';
import { SlideGallery } from './SlideGallery';
import type { ExtractedSlide } from '../types';

describe('SlideGallery', () => {
  const mockOnDownloadSingle = vi.fn();
  const mockOnDownloadSelected = vi.fn();

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
          onDownloadSelected={mockOnDownloadSelected}
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
          onDownloadSelected={mockOnDownloadSelected}
        />
      );
      expect(screen.getByTestId('slide-gallery')).toBeInTheDocument();
    });

    it('スライド数がヘッダーに表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadSelected={mockOnDownloadSelected}
        />
      );
      // Check for header text containing slide count
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/3/);
    });

    it('各スライドカードが表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadSelected={mockOnDownloadSelected}
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
          onDownloadSelected={mockOnDownloadSelected}
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
          onDownloadSelected={mockOnDownloadSelected}
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
          onDownloadSelected={mockOnDownloadSelected}
        />
      );
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(3);
    });
  });

  describe('ダウンロード機能', () => {
    const mockSlides: ExtractedSlide[] = [
      createMockSlide('slide-1', 1, 0),
      createMockSlide('slide-2', 2, 30),
    ];

    it('選択をダウンロードボタンが表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadSelected={mockOnDownloadSelected}
        />
      );
      expect(screen.getByTestId('download-selected-button')).toBeInTheDocument();
    });

    it('選択をダウンロードボタンは選択がない場合は無効', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadSelected={mockOnDownloadSelected}
        />
      );

      expect(screen.getByTestId('download-selected-button')).toBeDisabled();
    });

    it('全選択ボタンをクリックするとすべて選択される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadSelected={mockOnDownloadSelected}
        />
      );

      fireEvent.click(screen.getByTestId('select-toggle-button'));

      // Check that the button text changed to deselect (works for both languages)
      expect(screen.getByText(/全解除|Deselect All/i)).toBeInTheDocument();
    });

    it('スライドを選択してダウンロードするとonDownloadSelectedが選択されたスライドで呼ばれる', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadSelected={mockOnDownloadSelected}
        />
      );

      // 1枚目を選択
      fireEvent.click(screen.getByTestId('slide-checkbox-1'));

      // ダウンロードボタンをクリック
      fireEvent.click(screen.getByTestId('download-selected-button'));

      expect(mockOnDownloadSelected).toHaveBeenCalledTimes(1);
      expect(mockOnDownloadSelected).toHaveBeenCalledWith([mockSlides[0]]);
    });

    it('各スライドに個別ダウンロードボタンが表示される', () => {
      render(
        <SlideGallery
          slides={mockSlides}
          onDownloadSingle={mockOnDownloadSingle}
          onDownloadSelected={mockOnDownloadSelected}
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
          onDownloadSelected={mockOnDownloadSelected}
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
          onDownloadSelected={mockOnDownloadSelected}
        />
      );

      fireEvent.click(screen.getByTestId('download-slide-2'));

      expect(mockOnDownloadSingle).toHaveBeenCalledWith(mockSlides[1]);
    });
  });
});
