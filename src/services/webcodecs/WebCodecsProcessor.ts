import type {
  ExtractionParams,
  ProgressState,
  ExtractedSlide,
  ProcessingResult,
} from '../../types';
import type { WorkerMessage, ExtractedSlideData } from '../workers/workerTypes';

/**
 * WebCodecsProcessor - Web Workerを使用した高速動画処理
 */
export class WebCodecsProcessor {
  private worker: Worker | null = null;

  /**
   * ExtractedSlideDataをExtractedSlideに変換
   * サムネイルURLをメインスレッドで生成
   */
  private convertSlide(data: ExtractedSlideData): ExtractedSlide {
    // ImageDataからサムネイルURLを生成
    const thumbnailUrl = this.createThumbnailUrl(data.imageData);

    return {
      id: data.id,
      sequenceNumber: data.sequenceNumber,
      timestamp: data.timestamp,
      imageData: data.imageData,
      thumbnailUrl,
    };
  }

  /**
   * ImageDataからData URLを生成
   */
  private createThumbnailUrl(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /**
   * 動画ファイルを処理してスライドを抽出
   */
  async processVideo(
    file: File,
    duration: number,
    params: ExtractionParams,
    onProgress: (state: ProgressState) => void,
    onSlideDetected?: (slide: ExtractedSlide) => void
  ): Promise<ProcessingResult> {
    return new Promise((resolve) => {
      // Viteの動的Workerインポートを使用
      this.worker = new Worker(
        new URL('../workers/videoDecoder.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;

        switch (message.type) {
          case 'ready':
            // Workerの準備完了、処理を開始
            this.worker!.postMessage({
              type: 'start',
              file,
              params,
              duration,
            });
            break;

          case 'progress':
            onProgress(message.state);
            break;

          case 'slide':
            if (onSlideDetected) {
              const slide = this.convertSlide(message.slide);
              onSlideDetected(slide);
            }
            break;

          case 'complete':
            resolve({
              success: true,
              slides: message.slides.map((s) => this.convertSlide(s)),
            });
            this.cleanup();
            break;

          case 'error':
            // キャンセルの場合は専用のエラータイプ
            const isCancelled = message.message.includes('キャンセル');
            resolve({
              success: false,
              error: {
                type: isCancelled ? 'CANCELLED' : 'EXTRACTION_FAILED',
                message: message.message,
              },
            });
            this.cleanup();
            break;
        }
      };

      this.worker.onerror = (error) => {
        resolve({
          success: false,
          error: {
            type: 'EXTRACTION_FAILED',
            message: error.message || 'Worker error',
          },
        });
        this.cleanup();
      };
    });
  }

  /**
   * 処理をキャンセル
   */
  cancel(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'cancel' });
    }
  }

  /**
   * リソースをクリーンアップ
   */
  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
