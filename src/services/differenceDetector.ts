import pixelmatch from 'pixelmatch';
import type { DifferenceResult } from '../types';

/**
 * 2つのフレーム間のピクセル差分を検出する
 * @param frame1 - 比較元のフレーム
 * @param frame2 - 比較先のフレーム
 * @param threshold - 差分閾値（0-100%）
 * @returns 差分検出結果
 */
export function detectDifference(
  frame1: ImageData,
  frame2: ImageData,
  threshold: number
): DifferenceResult {
  // 寸法チェック
  if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
    throw new Error(
      `Frame dimensions do not match: ${frame1.width}x${frame1.height} vs ${frame2.width}x${frame2.height}`
    );
  }

  const width = frame1.width;
  const height = frame1.height;
  const totalPixels = width * height;

  // pixelmatchで差分ピクセル数を計算
  // threshold: 0.1はpixelmatchの色差許容値（デフォルト）
  const diffPixelCount = pixelmatch(
    frame1.data,
    frame2.data,
    undefined, // 差分画像は不要
    width,
    height,
    { threshold: 0.1 }
  );

  // 差分率を計算（パーセンテージ）
  const diffRatio = (diffPixelCount / totalPixels) * 100;

  // 閾値との比較
  const isDifferent = diffRatio > threshold;

  return {
    isDifferent,
    diffRatio,
    diffPixelCount,
  };
}

/**
 * DifferenceDetector サービスクラス
 */
export class DifferenceDetector {
  /**
   * 2つのフレーム間のピクセル差分を検出する
   */
  detectDifference(
    frame1: ImageData,
    frame2: ImageData,
    threshold: number
  ): DifferenceResult {
    return detectDifference(frame1, frame2, threshold);
  }
}
