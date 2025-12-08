import { useCallback } from 'react';
import type { ExtractedSlide } from '../types';

interface SlideGalleryProps {
  slides: ExtractedSlide[];
  onDownloadSingle: (slide: ExtractedSlide) => void;
  onDownloadAll: () => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SlideGallery({
  slides,
  onDownloadSingle,
  onDownloadAll,
}: SlideGalleryProps) {
  const handleDownloadSingle = useCallback(
    (slide: ExtractedSlide) => () => {
      onDownloadSingle(slide);
    },
    [onDownloadSingle]
  );

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="slide-gallery" data-testid="slide-gallery">
      <div className="gallery-header">
        <h3>検出されたスライド ({slides.length}枚)</h3>
        <button
          type="button"
          onClick={onDownloadAll}
          className="download-all-button"
          data-testid="download-all-button"
        >
          すべてダウンロード (ZIP)
        </button>
      </div>

      <div className="gallery-grid">
        {slides.map((slide) => (
          <div key={slide.id} className="slide-card" data-testid="slide-card">
            <img
              src={slide.thumbnailUrl}
              alt={`スライド ${slide.sequenceNumber}`}
              className="slide-thumbnail"
            />
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
        ))}
      </div>
    </div>
  );
}
