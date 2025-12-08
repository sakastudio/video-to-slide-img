/**
 * 抽出パラメータ
 */
export interface ExtractionParams {
  /** サンプリング間隔（秒） */
  interval: number;
  /** 差分閾値（0-100%） */
  threshold: number;
}

/**
 * デフォルトパラメータ
 */
export const DEFAULT_PARAMS: ExtractionParams = {
  interval: 1.0,
  threshold: 10,
};

/**
 * サポートされている動画形式
 */
export const SUPPORTED_FORMATS = ['video/mp4', 'video/webm', 'video/ogg'] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

/**
 * 動画読み込みエラー
 */
export type VideoLoadError = {
  type: 'UNSUPPORTED_FORMAT' | 'LOAD_FAILED';
  message: string;
};

/**
 * 処理エラー
 */
export type ProcessingError = {
  type: 'CANCELLED' | 'EXTRACTION_FAILED' | 'UNKNOWN';
  message: string;
};

/**
 * 進捗状態
 */
export interface ProgressState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  currentTime: number;
  totalDuration: number;
  slidesFound: number;
  errorMessage?: string;
}

/**
 * 抽出されたスライド
 */
export interface ExtractedSlide {
  id: string;
  sequenceNumber: number;
  timestamp: number;
  imageData: ImageData;
  thumbnailUrl: string;
}

/**
 * 差分検出結果
 */
export interface DifferenceResult {
  isDifferent: boolean;
  diffRatio: number;
  diffPixelCount: number;
}

/**
 * 処理結果
 */
export type ProcessingResult =
  | { success: true; slides: ExtractedSlide[] }
  | { success: false; error: ProcessingError };

/**
 * アプリケーション状態
 */
export interface AppState {
  video: {
    file: File | null;
    element: HTMLVideoElement | null;
    duration: number;
  };
  params: ExtractionParams;
  processing: {
    status: 'idle' | 'processing' | 'completed' | 'error';
    currentTime: number;
    errorMessage: string | null;
  };
  slides: ExtractedSlide[];
}
