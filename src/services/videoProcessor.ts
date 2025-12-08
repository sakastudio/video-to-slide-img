import { FrameExtractor } from './frameExtractor';
import { detectDifference } from './differenceDetector';
import { isWebCodecsSupported, WebCodecsProcessor } from './webcodecs';
import type {
  ExtractionParams,
  ProgressState,
  ProcessingResult,
  ExtractedSlide,
} from '../types';

/**
 * 動画処理サービス
 * フレーム抽出と差分検出を組み合わせてスライドを抽出する
 * WebCodecs対応ブラウザではWorkerベースの高速処理を使用
 */
export class VideoProcessor {
  private frameExtractor: FrameExtractor;
  private webCodecsProcessor: WebCodecsProcessor | null = null;
  private cancelled = false;
  private useWebCodecs: boolean;

  constructor() {
    this.frameExtractor = new FrameExtractor();
    this.useWebCodecs = isWebCodecsSupported();
  }

  /**
   * WebCodecsを使用するかどうかを判定
   */
  private shouldUseWebCodecs(file?: File): boolean {
    if (!this.useWebCodecs || !file) {
      return false;
    }
    // MP4形式のみWebCodecs対応
    return file.type === 'video/mp4';
  }

  /**
   * パラメータのバリデーション
   */
  private validateParams(params: ExtractionParams): string | null {
    if (params.interval <= 0) {
      return 'サンプリング間隔は0より大きい値を指定してください';
    }
    if (params.threshold < 0 || params.threshold > 100) {
      return '差分閾値は0〜100の範囲で指定してください';
    }
    return null;
  }

  /**
   * ユニークIDを生成
   */
  private generateId(): string {
    return `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ImageDataからサムネイルURLを生成
   */
  private createThumbnailUrl(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /**
   * メインスレッドをブロックしないようにするための待機
   */
  private async yieldToMain(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * 動画を処理してスライドを抽出する
   * @param video 動画要素
   * @param params 抽出パラメータ
   * @param onProgress 進捗コールバック
   * @param onSlideDetected スライド検出コールバック
   * @param file 動画ファイル（WebCodecs使用時に必要）
   */
  async processVideo(
    video: HTMLVideoElement,
    params: ExtractionParams,
    onProgress: (state: ProgressState) => void,
    onSlideDetected?: (slide: ExtractedSlide) => void,
    file?: File
  ): Promise<ProcessingResult> {
    this.cancelled = false;

    // パラメータバリデーション
    const validationError = this.validateParams(params);
    if (validationError) {
      return {
        success: false,
        error: {
          type: 'EXTRACTION_FAILED',
          message: validationError,
        },
      };
    }

    // WebCodecs対応の場合は高速処理を使用
    if (this.shouldUseWebCodecs(file)) {
      return this.processWithWebCodecs(file!, video.duration, params, onProgress, onSlideDetected);
    }

    // フォールバック: Canvas API処理
    return this.processWithCanvas(video, params, onProgress, onSlideDetected);
  }

  /**
   * WebCodecsを使用した高速処理
   */
  private async processWithWebCodecs(
    file: File,
    duration: number,
    params: ExtractionParams,
    onProgress: (state: ProgressState) => void,
    onSlideDetected?: (slide: ExtractedSlide) => void
  ): Promise<ProcessingResult> {
    this.webCodecsProcessor = new WebCodecsProcessor();
    try {
      return await this.webCodecsProcessor.processVideo(
        file,
        duration,
        params,
        onProgress,
        onSlideDetected
      );
    } finally {
      this.webCodecsProcessor = null;
    }
  }

  /**
   * Canvas APIを使用した従来処理
   */
  private async processWithCanvas(
    video: HTMLVideoElement,
    params: ExtractionParams,
    onProgress: (state: ProgressState) => void,
    onSlideDetected?: (slide: ExtractedSlide) => void
  ): Promise<ProcessingResult> {
    const { interval, threshold } = params;
    const duration = video.duration;
    const slides: ExtractedSlide[] = [];
    let sequenceNumber = 1;
    let previousFrame: ImageData | null = null;

    try {
      // 初期進捗通知
      onProgress({
        status: 'processing',
        currentTime: 0,
        totalDuration: duration,
        slidesFound: 0,
      });

      // 最初のフレームを抽出
      const firstFrame = await this.frameExtractor.extractFrame(video, 0);
      const firstSlide: ExtractedSlide = {
        id: this.generateId(),
        sequenceNumber: sequenceNumber++,
        timestamp: 0,
        imageData: firstFrame,
        thumbnailUrl: this.createThumbnailUrl(firstFrame),
      };
      slides.push(firstSlide);
      onSlideDetected?.(firstSlide);
      previousFrame = firstFrame;

      // 進捗更新
      onProgress({
        status: 'processing',
        currentTime: 0,
        totalDuration: duration,
        slidesFound: slides.length,
      });

      // インターバルごとにフレームを抽出
      for (let time = interval; time < duration; time += interval) {
        // キャンセルチェック
        if (this.cancelled) {
          return {
            success: false,
            error: {
              type: 'CANCELLED',
              message: '処理がキャンセルされました',
            },
          };
        }

        // メインスレッドに処理を戻す
        await this.yieldToMain();

        // フレーム抽出
        const currentFrame = await this.frameExtractor.extractFrame(video, time);

        // 差分検出
        if (previousFrame) {
          const diff = detectDifference(previousFrame, currentFrame, threshold);

          if (diff.isDifferent) {
            // スライド切り替えを検出
            const newSlide: ExtractedSlide = {
              id: this.generateId(),
              sequenceNumber: sequenceNumber++,
              timestamp: time,
              imageData: currentFrame,
              thumbnailUrl: this.createThumbnailUrl(currentFrame),
            };
            slides.push(newSlide);
            onSlideDetected?.(newSlide);
          }
        }

        previousFrame = currentFrame;

        // 進捗更新
        onProgress({
          status: 'processing',
          currentTime: time,
          totalDuration: duration,
          slidesFound: slides.length,
        });
      }

      // 完了
      onProgress({
        status: 'completed',
        currentTime: duration,
        totalDuration: duration,
        slidesFound: slides.length,
      });

      return {
        success: true,
        slides,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';

      onProgress({
        status: 'error',
        currentTime: 0,
        totalDuration: duration,
        slidesFound: slides.length,
        errorMessage: message,
      });

      return {
        success: false,
        error: {
          type: 'EXTRACTION_FAILED',
          message,
        },
      };
    } finally {
      this.frameExtractor.dispose();
    }
  }

  /**
   * 処理をキャンセルする
   */
  cancel(): void {
    this.cancelled = true;
    // WebCodecsProcessorのキャンセル
    this.webCodecsProcessor?.cancel();
  }
}
