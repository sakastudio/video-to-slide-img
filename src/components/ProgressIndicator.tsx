import type { ProgressState } from '../types';
import { useLanguage } from '../i18n';

interface ProgressIndicatorProps {
  state: ProgressState;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ProgressIndicator({ state }: ProgressIndicatorProps) {
  const { t, language } = useLanguage();
  const { status, currentTime, totalDuration, slidesFound, errorMessage } = state;

  if (status === 'idle') {
    return null;
  }

  const progressPercent =
    totalDuration > 0 ? Math.round((currentTime / totalDuration) * 100) : 0;

  const slidesCountText =
    language === 'ja'
      ? `${t('detectedSlides')}: ${slidesFound}${t('slides')}`
      : `${t('detectedSlides')}: ${slidesFound}`;

  return (
    <div className="progress-indicator" data-testid="progress-indicator">
      {status === 'processing' && (
        <>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${progressPercent}%` }}
              data-testid="progress-bar"
            />
          </div>
          <div className="progress-info">
            <span className="progress-time">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
            <span className="progress-percent">{progressPercent}%</span>
          </div>
          <p className="slides-count">{slidesCountText}</p>
        </>
      )}

      {status === 'completed' && (
        <div className="progress-completed">
          <p className="completed-message">{t('extractionComplete')}</p>
          <p className="slides-count">{slidesCountText}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="progress-error">
          <p className="error-message">
            {t('error')}: {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
