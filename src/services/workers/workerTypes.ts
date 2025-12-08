import type { ExtractionParams, ProgressState } from '../../types';

/**
 * Worker に送信するコマンド（メインスレッド → Worker）
 */
export type WorkerCommand =
  | { type: 'start'; file: File; params: ExtractionParams; duration: number }
  | { type: 'cancel' };

/**
 * Worker からのメッセージ（Worker → メインスレッド）
 */
export type WorkerMessage =
  | { type: 'ready' }
  | { type: 'progress'; state: ProgressState }
  | { type: 'slide'; slide: ExtractedSlideData }
  | { type: 'complete'; slides: ExtractedSlideData[] }
  | { type: 'error'; message: string };

/**
 * Worker から送信されるスライドデータ
 * ImageData は structured clone でコピーされる
 */
export interface ExtractedSlideData {
  id: string;
  sequenceNumber: number;
  timestamp: number;
  imageData: ImageData;
  thumbnailUrl: string;
}
