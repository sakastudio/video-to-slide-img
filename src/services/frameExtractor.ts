/** 比較用のデフォルト縮小サイズ */
export const DEFAULT_COMPARE_WIDTH = 320;
export const DEFAULT_COMPARE_HEIGHT = 180;

/**
 * フレーム抽出サービス
 * Canvas APIを使用して動画フレームからImageDataを取得する
 */
export class FrameExtractor {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private scaledCanvas: HTMLCanvasElement | null = null;
  private scaledContext: CanvasRenderingContext2D | null = null;

  /**
   * 動画の指定時刻からフレームを抽出する
   * @param video - 対象の動画要素
   * @param time - 抽出する時刻（秒）
   * @returns 抽出されたImageData
   */
  async extractFrame(video: HTMLVideoElement, time: number): Promise<ImageData> {
    // Canvas要素の初期化（再利用）
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }

    if (!this.context) {
      throw new Error('Failed to get canvas 2d context');
    }

    // Canvasサイズを動画サイズに合わせる
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;

    // 指定時刻へシーク
    await this.seekTo(video, time);

    // 動画フレームをCanvasに描画
    this.context.drawImage(video, 0, 0);

    // ImageDataを取得
    return this.context.getImageData(0, 0, video.videoWidth, video.videoHeight);
  }

  /**
   * フル解像度フレームと縮小版フレームを同時に抽出
   * @param video - 対象の動画要素
   * @param time - 抽出する時刻（秒）
   * @param compareWidth - 比較用画像の幅
   * @param compareHeight - 比較用画像の高さ
   * @returns フル解像度と縮小版のImageData
   */
  async extractFrameWithScaled(
    video: HTMLVideoElement,
    time: number,
    compareWidth: number = DEFAULT_COMPARE_WIDTH,
    compareHeight: number = DEFAULT_COMPARE_HEIGHT
  ): Promise<{ full: ImageData; scaled: ImageData }> {
    // フルサイズCanvas初期化
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }

    // 縮小版Canvas初期化
    if (!this.scaledCanvas) {
      this.scaledCanvas = document.createElement('canvas');
      this.scaledContext = this.scaledCanvas.getContext('2d');
    }

    if (!this.context || !this.scaledContext) {
      throw new Error('Failed to get canvas 2d context');
    }

    // Canvasサイズ設定
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;
    this.scaledCanvas.width = compareWidth;
    this.scaledCanvas.height = compareHeight;

    // 指定時刻へシーク
    await this.seekTo(video, time);

    // フルサイズ描画
    this.context.drawImage(video, 0, 0);

    // 縮小版描画（高品質スケーリング）
    this.scaledContext.drawImage(
      video,
      0,
      0,
      video.videoWidth,
      video.videoHeight,
      0,
      0,
      compareWidth,
      compareHeight
    );

    return {
      full: this.context.getImageData(0, 0, video.videoWidth, video.videoHeight),
      scaled: this.scaledContext.getImageData(0, 0, compareWidth, compareHeight),
    };
  }

  /**
   * 縮小版フレームのみを抽出（高速比較用）
   */
  async extractScaledFrame(
    video: HTMLVideoElement,
    time: number,
    compareWidth: number = DEFAULT_COMPARE_WIDTH,
    compareHeight: number = DEFAULT_COMPARE_HEIGHT
  ): Promise<ImageData> {
    if (!this.scaledCanvas) {
      this.scaledCanvas = document.createElement('canvas');
      this.scaledContext = this.scaledCanvas.getContext('2d');
    }

    if (!this.scaledContext) {
      throw new Error('Failed to get canvas 2d context');
    }

    this.scaledCanvas.width = compareWidth;
    this.scaledCanvas.height = compareHeight;

    await this.seekTo(video, time);

    this.scaledContext.drawImage(
      video,
      0,
      0,
      video.videoWidth,
      video.videoHeight,
      0,
      0,
      compareWidth,
      compareHeight
    );

    return this.scaledContext.getImageData(0, 0, compareWidth, compareHeight);
  }

  /**
   * 動画を指定時刻へシークする
   * @param video - 対象の動画要素
   * @param time - シーク先の時刻（秒）
   */
  private seekTo(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Failed to seek video'));
      };

      video.addEventListener('seeked', onSeeked);
      video.addEventListener('error', onError);

      // 現在位置が既に指定時刻の場合はイベントが発火しないので直接解決
      if (video.currentTime === time) {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        resolve();
        return;
      }

      video.currentTime = time;

      // タイムアウト設定（5秒）
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        reject(new Error('Seek timeout'));
      }, 5000);
    });
  }

  /**
   * リソースを解放する
   */
  dispose(): void {
    this.canvas = null;
    this.context = null;
    this.scaledCanvas = null;
    this.scaledContext = null;
  }
}
