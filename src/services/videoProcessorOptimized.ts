import {
  FrameExtractor,
  DEFAULT_COMPARE_WIDTH,
  DEFAULT_COMPARE_HEIGHT,
} from './frameExtractor';
import type {
  ExtractionParams,
  ProgressState,
  ProcessingResult,
  ExtractedSlide,
} from '../types';
import type { WorkerResponse } from '../workers/diffDetectorWorker';

/**
 * 最適化された動画処理サービス
 * - 縮小画像での高速比較
 * - Web Worker + Wasmによる差分検出
 */
export class VideoProcessorOptimized {
  private frameExtractor: FrameExtractor;
  private worker: Worker | null = null;
  private workerReady = false;
  private cancelled = false;
  private pendingRequests = new Map<
    number,
    {
      resolve: (result: { isDifferent: boolean; diffRatio: number }) => void;
      reject: (error: Error) => void;
    }
  >();
  private requestId = 0;

  constructor() {
    this.frameExtractor = new FrameExtractor();
  }

  /**
   * Workerを初期化
   */
  private async initWorker(): Promise<void> {
    if (this.workerReady && this.worker) return;

    return new Promise((resolve, reject) => {
      this.worker = new Worker(
        new URL('../workers/diffDetectorWorker.ts', import.meta.url),
        { type: 'module' }
      );

      const onMessage = (e: MessageEvent<WorkerResponse>) => {
        const response = e.data;

        switch (response.type) {
          case 'READY':
            this.workerReady = true;
            resolve();
            break;
          case 'INIT_ERROR':
            reject(new Error(response.error));
            break;
          case 'DIFF_RESULT': {
            const pending = this.pendingRequests.get(response.payload.id);
            if (pending) {
              pending.resolve({
                isDifferent: response.payload.isDifferent,
                diffRatio: response.payload.diffRatio,
              });
              this.pendingRequests.delete(response.payload.id);
            }
            break;
          }
          case 'DIFF_ERROR': {
            const pendingErr = this.pendingRequests.get(response.payload.id);
            if (pendingErr) {
              pendingErr.reject(new Error(response.payload.error));
              this.pendingRequests.delete(response.payload.id);
            }
            break;
          }
        }
      };

      this.worker.addEventListener('message', onMessage);
      this.worker.postMessage({ type: 'INIT' });
    });
  }

  /**
   * Workerで差分検出を実行
   */
  private detectDifferenceAsync(
    frame1: Uint8Array,
    frame2: Uint8Array,
    width: number,
    height: number,
    threshold: number
  ): Promise<{ isDifferent: boolean; diffRatio: number }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = this.requestId++;
      this.pendingRequests.set(id, { resolve, reject });

      this.worker.postMessage({
        type: 'DETECT_DIFF',
        payload: { id, frame1, frame2, width, height, threshold },
      });
    });
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
   * 動画を処理してスライドを抽出する（最適化版）
   */
  async processVideo(
    video: HTMLVideoElement,
    params: ExtractionParams,
    onProgress: (state: ProgressState) => void,
    onSlideDetected?: (slide: ExtractedSlide) => void
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
    let previousScaledFrame: Uint8Array | null = null;

    try {
      // Worker初期化
      await this.initWorker();

      // 初期進捗通知
      onProgress({
        status: 'processing',
        currentTime: 0,
        totalDuration: duration,
        slidesFound: 0,
      });

      // 最初のフレームを抽出（フル解像度 + 縮小版）
      const firstFrames = await this.frameExtractor.extractFrameWithScaled(
        video,
        0,
        DEFAULT_COMPARE_WIDTH,
        DEFAULT_COMPARE_HEIGHT
      );

      const firstSlide: ExtractedSlide = {
        id: this.generateId(),
        sequenceNumber: sequenceNumber++,
        timestamp: 0,
        imageData: firstFrames.full,
        thumbnailUrl: this.createThumbnailUrl(firstFrames.full),
      };
      slides.push(firstSlide);
      onSlideDetected?.(firstSlide);
      previousScaledFrame = new Uint8Array(firstFrames.scaled.data);

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

        // メインスレッドに処理を戻す（UIの応答性維持）
        await this.yieldToMain();

        // まず縮小版フレームで高速比較
        const scaledFrame = await this.frameExtractor.extractScaledFrame(
          video,
          time,
          DEFAULT_COMPARE_WIDTH,
          DEFAULT_COMPARE_HEIGHT
        );
        const currentScaledData = new Uint8Array(scaledFrame.data);

        // Workerで差分検出（Wasm使用）
        if (previousScaledFrame) {
          const diff = await this.detectDifferenceAsync(
            previousScaledFrame,
            currentScaledData,
            DEFAULT_COMPARE_WIDTH,
            DEFAULT_COMPARE_HEIGHT,
            threshold
          );

          if (diff.isDifferent) {
            // スライド切り替えを検出 → フル解像度フレームを取得
            const fullFrame = await this.frameExtractor.extractFrame(video, time);
            const newSlide: ExtractedSlide = {
              id: this.generateId(),
              sequenceNumber: sequenceNumber++,
              timestamp: time,
              imageData: fullFrame,
              thumbnailUrl: this.createThumbnailUrl(fullFrame),
            };
            slides.push(newSlide);
            onSlideDetected?.(newSlide);
          }
        }

        previousScaledFrame = currentScaledData;

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
      const message =
        error instanceof Error ? error.message : '不明なエラーが発生しました';

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

  /**
   * リソースを解放する
   */
  dispose(): void {
    this.cancel();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.workerReady = false;
    this.pendingRequests.clear();
  }
}
