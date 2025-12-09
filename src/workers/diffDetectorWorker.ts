/**
 * 差分検出Web Worker
 * Wasm (Rust) を使用して高速なピクセル差分検出を行う
 */

import init, { detect_difference_ratio } from 'wasm-diff-detector';

let wasmInitialized = false;

/**
 * Wasmモジュールを初期化
 */
async function initWasm(): Promise<void> {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

/**
 * Worker メッセージタイプ
 */
export type WorkerMessage =
  | { type: 'INIT' }
  | {
      type: 'DETECT_DIFF';
      payload: {
        id: number;
        frame1: Uint8Array;
        frame2: Uint8Array;
        width: number;
        height: number;
        threshold: number;
      };
    };

export type WorkerResponse =
  | { type: 'READY' }
  | { type: 'INIT_ERROR'; error: string }
  | {
      type: 'DIFF_RESULT';
      payload: {
        id: number;
        isDifferent: boolean;
        diffRatio: number;
      };
    }
  | { type: 'DIFF_ERROR'; payload: { id: number; error: string } };

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const message = e.data;

  switch (message.type) {
    case 'INIT': {
      try {
        await initWasm();
        self.postMessage({ type: 'READY' } as WorkerResponse);
      } catch (error) {
        self.postMessage({
          type: 'INIT_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        } as WorkerResponse);
      }
      break;
    }

    case 'DETECT_DIFF': {
      const { id, frame1, frame2, width, height, threshold } = message.payload;
      try {
        // Wasm関数を呼び出して差分率を計算
        // color_threshold: 0.1 (pixelmatchと同等の色差許容値)
        const diffRatio = detect_difference_ratio(
          frame1,
          frame2,
          width,
          height,
          0.1
        );

        self.postMessage({
          type: 'DIFF_RESULT',
          payload: {
            id,
            isDifferent: diffRatio > threshold,
            diffRatio,
          },
        } as WorkerResponse);
      } catch (error) {
        self.postMessage({
          type: 'DIFF_ERROR',
          payload: {
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        } as WorkerResponse);
      }
      break;
    }
  }
};
