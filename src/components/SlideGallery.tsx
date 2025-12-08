import { useCallback, useState, useMemo } from 'react';
import type { ExtractedSlide } from '../types';

interface SlideGalleryProps {
  slides: ExtractedSlide[];
  onDownloadSingle: (slide: ExtractedSlide) => void;
  onDownloadSelected: (slides: ExtractedSlide[]) => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SlideGallery({
  slides,
  onDownloadSingle,
  onDownloadSelected,
}: SlideGalleryProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleDownloadSingle = useCallback(
    (slide: ExtractedSlide) => () => {
      onDownloadSingle(slide);
    },
    [onDownloadSingle]
  );

  const handleToggleSelect = useCallback((slideId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(slideId)) {
        next.delete(slideId);
      } else {
        next.add(slideId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(slides.map((s) => s.id)));
  }, [slides]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedSlides = useMemo(
    () => slides.filter((slide) => selectedIds.has(slide.id)),
    [slides, selectedIds]
  );

  const handleDownloadSelectedClick = useCallback(() => {
    onDownloadSelected(selectedSlides);
  }, [onDownloadSelected, selectedSlides]);

  const isAllSelected = selectedIds.size === slides.length && slides.length > 0;
  const hasSelection = selectedIds.size > 0;

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="slide-gallery" data-testid="slide-gallery">
      <div className="gallery-header">
        <h3>検出されたスライド ({slides.length}枚)</h3>
        <div className="gallery-actions">
          <button
            type="button"
            onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
            className="select-toggle-button"
            data-testid="select-toggle-button"
          >
            {isAllSelected ? '全解除' : '全選択'}
          </button>
          <button
            type="button"
            onClick={handleDownloadSelectedClick}
            className="download-selected-button"
            data-testid="download-selected-button"
            disabled={!hasSelection}
          >
            選択をダウンロード ({selectedIds.size}枚)
          </button>
        </div>
      </div>

      <div className="gallery-grid">
        {slides.map((slide) => {
          const isSelected = selectedIds.has(slide.id);
          return (
            <div
              key={slide.id}
              className={`slide-card ${isSelected ? 'slide-card-selected' : ''}`}
              data-testid="slide-card"
            >
              <label className="slide-checkbox-label">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelect(slide.id)}
                  className="slide-checkbox"
                  data-testid={`slide-checkbox-${slide.sequenceNumber}`}
                />
                <img
                  src={slide.thumbnailUrl}
                  alt={`スライド ${slide.sequenceNumber}`}
                  className="slide-thumbnail"
                />
              </label>
              <div className="slide-info">
                <span className="slide-number">#{slide.sequenceNumber}</span>
                <span className="slide-timestamp">{formatTimestamp(slide.timestamp)}</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadSingle(slide)}
                className="download-single-button"
                data-testid={`download-slide-${slide.sequenceNumber}`}
              >
                ダウンロード
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
