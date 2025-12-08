import { FrameExtractor } from './frameExtractor';
import { detectDifference } from './differenceDetector';
import type {
  ExtractionParams,
  ProgressState,
  ProcessingResult,
  ExtractedSlide,
} from '../types';

/**
 * 動画処理サービス
 * フレーム抽出と差分検出を組み合わせてスライドを抽出する
 */
export class VideoProcessor {
  private frameExtractor: FrameExtractor;
  private cancelled = false;

  constructor() {
    this.frameExtractor = new FrameExtractor();
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
   */
  async processVideo(
    video: HTMLVideoElement,
    params: ExtractionParams,
    onProgress: (state: ProgressState) => void
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
      slides.push({
        id: this.generateId(),
        sequenceNumber: sequenceNumber++,
        timestamp: 0,
        imageData: firstFrame,
        thumbnailUrl: this.createThumbnailUrl(firstFrame),
      });
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
            slides.push({
              id: this.generateId(),
              sequenceNumber: sequenceNumber++,
              timestamp: time,
              imageData: currentFrame,
              thumbnailUrl: this.createThumbnailUrl(currentFrame),
            });
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
  }
}
