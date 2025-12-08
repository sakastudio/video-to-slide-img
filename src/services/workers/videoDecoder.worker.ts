import { MP4Demuxer } from '../webcodecs/MP4Demuxer';
import { detectDifference } from '../differenceDetector';
import type { DecoderConfig } from '../webcodecs/types';
import type { WorkerCommand, WorkerMessage, ExtractedSlideData } from './workerTypes';
import type { ExtractionParams, ProgressState } from '../../types';

// Worker のグローバル状態
let cancelled = false;
let decoder: VideoDecoder | null = null;
let demuxer: MP4Demuxer | null = null;

// 処理状態
let interval = 1.0;
let threshold = 10;
let duration = 0;
let lastSampledTime = -Infinity;
let previousImageData: ImageData | null = null;
let sequenceNumber = 0;
let slides: ExtractedSlideData[] = [];
let pendingFrames: Array<{ frame: VideoFrame; timestamp: number }> = [];
let isProcessingFrames = false;

/**
 * メインスレッドにメッセージを送信
 */
function postWorkerMessage(message: WorkerMessage): void {
  self.postMessage(message);
}

/**
 * ユニークIDを生成
 */
function generateId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * VideoFrameをImageDataに変換
 */
function frameToImageData(frame: VideoFrame): ImageData {
  const width = frame.displayWidth;
  const height = frame.displayHeight;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(frame, 0, 0);

  return ctx.getImageData(0, 0, width, height);
}

/**
 * フレームを処理（差分検出とスライド判定）
 */
async function processFrame(frame: VideoFrame, timestamp: number): Promise<void> {
  if (cancelled) {
    frame.close();
    return;
  }

  try {
    const imageData = frameToImageData(frame);

    // 最初のフレームまたは差分検出
    let isNewSlide = false;
    if (previousImageData === null) {
      // 最初のフレームは必ずスライドとして登録
      isNewSlide = true;
    } else {
      // 差分検出
      const diff = detectDifference(previousImageData, imageData, threshold);
      isNewSlide = diff.isDifferent;
    }

    if (isNewSlide) {
      sequenceNumber++;
      const slide: ExtractedSlideData = {
        id: generateId(),
        sequenceNumber,
        timestamp,
        imageData,
        thumbnailUrl: '', // メインスレッドで生成
      };
      slides.push(slide);
      postWorkerMessage({ type: 'slide', slide });
    }

    previousImageData = imageData;

    // 進捗通知
    const progressState: ProgressState = {
      status: 'processing',
      currentTime: timestamp,
      totalDuration: duration,
      slidesFound: slides.length,
    };
    postWorkerMessage({ type: 'progress', state: progressState });
  } finally {
    frame.close();
  }
}

/**
 * ペンディングフレームを順次処理
 */
async function processPendingFrames(): Promise<void> {
  if (isProcessingFrames) return;
  isProcessingFrames = true;

  while (pendingFrames.length > 0 && !cancelled) {
    const { frame, timestamp } = pendingFrames.shift()!;
    await processFrame(frame, timestamp);
  }

  isProcessingFrames = false;
}

/**
 * VideoDecoderを初期化
 */
function initDecoder(config: DecoderConfig): void {
  decoder = new VideoDecoder({
    output: (frame: VideoFrame) => {
      if (cancelled) {
        frame.close();
        return;
      }

      // フレームのタイムスタンプ（秒）
      const timestamp = frame.timestamp / 1_000_000;

      // interval間隔でサンプリング
      if (timestamp - lastSampledTime >= interval) {
        lastSampledTime = timestamp;
        pendingFrames.push({ frame, timestamp });
        processPendingFrames();
      } else {
        frame.close();
      }
    },
    error: (error: DOMException) => {
      if (!cancelled) {
        postWorkerMessage({ type: 'error', message: error.message });
      }
    },
  });

  decoder.configure({
    codec: config.codec,
    codedWidth: config.codedWidth,
    codedHeight: config.codedHeight,
    description: config.description,
  });
}

/**
 * 動画ファイルを処理
 */
async function processVideo(file: File, params: ExtractionParams, totalDuration: number): Promise<void> {
  // 状態をリセット
  cancelled = false;
  interval = params.interval;
  threshold = params.threshold;
  duration = totalDuration;
  lastSampledTime = -Infinity;
  previousImageData = null;
  sequenceNumber = 0;
  slides = [];
  pendingFrames = [];
  isProcessingFrames = false;

  // 初期進捗通知
  postWorkerMessage({
    type: 'progress',
    state: {
      status: 'processing',
      currentTime: 0,
      totalDuration: duration,
      slidesFound: 0,
    },
  });

  return new Promise<void>((resolve, reject) => {
    demuxer = new MP4Demuxer({
      onConfig: (config) => {
        initDecoder(config);
      },
      onChunk: (chunk, _timestamp) => {
        if (cancelled) return;

        // すべてのチャンクをデコード
        if (decoder) {
          decoder.decode(chunk);
        }
      },
      onError: (error) => {
        if (!cancelled) {
          postWorkerMessage({ type: 'error', message: error.message });
          reject(error);
        }
      },
      onComplete: async () => {
        if (cancelled) {
          resolve();
          return;
        }

        // デコーダーをフラッシュして残りのフレームを処理
        if (decoder) {
          await decoder.flush();
        }

        // ペンディングフレームの処理完了を待つ
        while (pendingFrames.length > 0 && !cancelled) {
          await new Promise((r) => setTimeout(r, 10));
        }

        // 完了通知
        postWorkerMessage({
          type: 'progress',
          state: {
            status: 'completed',
            currentTime: duration,
            totalDuration: duration,
            slidesFound: slides.length,
          },
        });
        postWorkerMessage({ type: 'complete', slides });
        resolve();
      },
    });

    // ファイルを読み込んでdemuxerに渡す
    const reader = new FileReader();
    reader.onload = () => {
      if (cancelled) {
        resolve();
        return;
      }

      const arrayBuffer = reader.result as ArrayBuffer;
      demuxer!.appendBuffer(arrayBuffer, 0);
      demuxer!.flush();
    };
    reader.onerror = () => {
      if (!cancelled) {
        postWorkerMessage({ type: 'error', message: 'Failed to read file' });
        reject(new Error('Failed to read file'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * リソースをクリーンアップ
 */
function cleanup(): void {
  if (decoder) {
    try {
      decoder.close();
    } catch {
      // ignore
    }
    decoder = null;
  }
  if (demuxer) {
    demuxer.stop();
    demuxer = null;
  }
  pendingFrames.forEach(({ frame }) => {
    try {
      frame.close();
    } catch {
      // ignore
    }
  });
  pendingFrames = [];
}

/**
 * メインスレッドからのメッセージを処理
 */
self.onmessage = async (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;

  switch (command.type) {
    case 'start':
      try {
        await processVideo(command.file, command.params, command.duration);
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          postWorkerMessage({ type: 'error', message });
        }
      } finally {
        cleanup();
      }
      break;

    case 'cancel':
      cancelled = true;
      cleanup();
      postWorkerMessage({ type: 'error', message: '処理がキャンセルされました' });
      break;
  }
};

// Worker準備完了を通知
postWorkerMessage({ type: 'ready' });
