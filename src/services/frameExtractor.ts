/**
 * フレーム抽出サービス
 * Canvas APIを使用して動画フレームからImageDataを取得する
 */
export class FrameExtractor {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;

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
  }
}
