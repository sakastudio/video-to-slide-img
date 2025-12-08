import { useState, useCallback, useRef } from 'react';
import { VideoInput } from './components/VideoInput';
import { ParameterPanel } from './components/ParameterPanel';
import { ProgressIndicator } from './components/ProgressIndicator';
import { SlideGallery } from './components/SlideGallery';
import { VideoProcessor } from './services/videoProcessor';
import { ExportService } from './services/exportService';
import {
  DEFAULT_PARAMS,
  type ExtractionParams,
  type ProgressState,
  type ExtractedSlide,
  type VideoLoadError,
} from './types';
import './App.css';

function App() {
  // State
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [params, setParams] = useState<ExtractionParams>(DEFAULT_PARAMS);
  const [progress, setProgress] = useState<ProgressState>({
    status: 'idle',
    currentTime: 0,
    totalDuration: 0,
    slidesFound: 0,
  });
  const [slides, setSlides] = useState<ExtractedSlide[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const processorRef = useRef<VideoProcessor | null>(null);
  const exportServiceRef = useRef(new ExportService());

  // Handlers
  const handleVideoLoad = useCallback((videoElement: HTMLVideoElement) => {
    setVideo(videoElement);
    setError(null);
    setSlides([]);
    setProgress({
      status: 'idle',
      currentTime: 0,
      totalDuration: videoElement.duration,
      slidesFound: 0,
    });
  }, []);

  const handleVideoError = useCallback((err: VideoLoadError) => {
    setError(err.message);
  }, []);

  const handleParamsChange = useCallback((newParams: ExtractionParams) => {
    setParams(newParams);
  }, []);

  const handleSlideDetected = useCallback((slide: ExtractedSlide) => {
    setSlides((prev) => [...prev, slide]);
  }, []);

  const handleStartExtraction = useCallback(async () => {
    if (!video) return;

    setError(null);
    setSlides([]);

    const processor = new VideoProcessor();
    processorRef.current = processor;

    const result = await processor.processVideo(
      video,
      params,
      setProgress,
      handleSlideDetected
    );

    if (!result.success && result.error.type !== 'CANCELLED') {
      setError(result.error.message);
    }

    processorRef.current = null;
  }, [video, params, handleSlideDetected]);

  const handleCancel = useCallback(() => {
    processorRef.current?.cancel();
    setProgress((prev) => ({
      ...prev,
      status: 'idle',
    }));
  }, []);

  const handleDownloadSingle = useCallback((slide: ExtractedSlide) => {
    exportServiceRef.current.downloadSingle(slide);
  }, []);

  const handleDownloadAll = useCallback(() => {
    exportServiceRef.current.downloadAll(slides);
  }, [slides]);

  const handleReset = useCallback(() => {
    processorRef.current?.cancel();
    setVideo(null);
    setSlides([]);
    setError(null);
    setProgress({
      status: 'idle',
      currentTime: 0,
      totalDuration: 0,
      slidesFound: 0,
    });
  }, []);

  const isProcessing = progress.status === 'processing';
  const canStartExtraction = video !== null && !isProcessing;

  return (
    <div className="app">
      <header className="app-header">
        <h1>動画スライド抽出ツール</h1>
        <p className="app-description">
          動画からスライドを自動検出して画像として保存できます。
          すべての処理はブラウザ内で完結し、サーバーへのアップロードは行いません。
        </p>
      </header>

      <main className="app-main">
        <section className="input-section">
          <h2>1. 動画を選択</h2>
          <VideoInput
            onVideoLoad={handleVideoLoad}
            onError={handleVideoError}
            disabled={isProcessing}
          />
        </section>

        {video && (
          <section className="params-section">
            <h2>2. パラメータを設定</h2>
            <ParameterPanel
              params={params}
              onChange={handleParamsChange}
              disabled={isProcessing}
            />
          </section>
        )}

        {video && (
          <section className="action-section">
            <h2>3. 抽出を実行</h2>
            <div className="action-buttons">
              {!isProcessing ? (
                <button
                  type="button"
                  onClick={handleStartExtraction}
                  disabled={!canStartExtraction}
                  className="start-button"
                >
                  スライド抽出を開始
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="cancel-button"
                >
                  キャンセル
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="reset-button"
              >
                リセット
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <ProgressIndicator state={progress} />

        {slides.length > 0 && (
          <section className="gallery-section">
            <h2>4. スライドをダウンロード</h2>
            <SlideGallery
              slides={slides}
              onDownloadSingle={handleDownloadSingle}
              onDownloadAll={handleDownloadAll}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>対応形式: MP4, WebM, OGG</p>
      </footer>
    </div>
  );
}

export default App;
