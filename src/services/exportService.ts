import JSZip from 'jszip';
import type { ExtractedSlide } from '../types';

/**
 * シーケンス番号からファイル名を生成する
 * @param sequenceNumber - シーケンス番号
 * @param prefix - ファイル名のプレフィックス
 * @returns 生成されたファイル名
 */
export function generateFilename(sequenceNumber: number, prefix = 'slide'): string {
  const paddedNumber = sequenceNumber.toString().padStart(3, '0');
  return `${prefix}_${paddedNumber}.png`;
}

/**
 * エクスポートサービス
 * 画像の個別/一括エクスポート機能を提供
 */
export class ExportService {
  /**
   * ImageDataをBlobに変換する
   */
  private async imageDataToBlob(imageData: ImageData): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  }

  /**
   * ファイルをダウンロードする
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 単一スライドをPNGとしてダウンロード
   */
  async downloadSingle(slide: ExtractedSlide): Promise<void> {
    const blob = await this.imageDataToBlob(slide.imageData);
    const filename = generateFilename(slide.sequenceNumber);
    this.downloadBlob(blob, filename);
  }

  /**
   * 全スライドをZIPとしてダウンロード
   */
  async downloadAll(slides: ExtractedSlide[]): Promise<void> {
    if (slides.length === 0) {
      return;
    }

    const zip = new JSZip();

    // 各スライドをZIPに追加
    for (const slide of slides) {
      const blob = await this.imageDataToBlob(slide.imageData);
      const filename = generateFilename(slide.sequenceNumber);
      zip.file(filename, blob);
    }

    // ZIPを生成してダウンロード
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(zipBlob, 'slides.zip');
  }
}
