import { useRef, useCallback, useState, useEffect } from 'react';
import { SUPPORTED_FORMATS, type VideoLoadError } from '../types';
import { useLanguage } from '../i18n';

interface VideoInputProps {
  onVideoLoad: (video: HTMLVideoElement, file: File) => void;
  onError: (error: VideoLoadError) => void;
  disabled?: boolean;
}

export function VideoInput({ onVideoLoad, onError, disabled = false }: VideoInputProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!SUPPORTED_FORMATS.includes(file.type as (typeof SUPPORTED_FORMATS)[number])) {
        onError({
          type: 'UNSUPPORTED_FORMAT',
          message: t('unsupportedFormat'),
        });
        return false;
      }
      return true;
    },
    [onError, t]
  );

  // previewUrlが設定された後、video要素がDOMに追加されてからソースを設定
  useEffect(() => {
    if (!previewUrl || !pendingFile) return;

    const video = videoRef.current;
    if (!video) return;

    const file = pendingFile;

    video.src = previewUrl;
    video.onloadedmetadata = () => {
      onVideoLoad(video, file);
    };
    video.onerror = () => {
      onError({
        type: 'LOAD_FAILED',
        message: t('loadFailed'),
      });
    };

    setPendingFile(null);
  }, [previewUrl, pendingFile, onVideoLoad, onError, t]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!validateFile(file)) return;

      // 古いURLを解放
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setFileName(file.name);
      setPendingFile(file);
    },
    [previewUrl, validateFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="video-input">
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_FORMATS.join(',')}
        onChange={handleFileChange}
        disabled={disabled}
        style={{ display: 'none' }}
        data-testid="video-file-input"
      />

      {!previewUrl ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="video-select-button"
          data-testid="video-select-button"
        >
          {t('selectVideo')}
        </button>
      ) : (
        <div className="video-preview-container">
          <video
            ref={videoRef}
            controls
            className="video-preview"
            data-testid="video-preview"
          />
          {fileName && <p className="video-filename">{fileName}</p>}
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="video-change-button"
          >
            {t('selectAnotherVideo')}
          </button>
        </div>
      )}
    </div>
  );
}
