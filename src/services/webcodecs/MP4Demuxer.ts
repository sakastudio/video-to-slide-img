import { createFile, DataStream, type ISOFile, type Sample } from 'mp4box';
import type { DecoderConfig } from './types';

export interface DemuxerCallbacks {
  onConfig: (config: DecoderConfig) => void;
  onChunk: (chunk: EncodedVideoChunk, timestamp: number) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

// mp4boxのトラック情報の型
interface MP4VideoTrackInfo {
  id: number;
  codec: string;
  track_width: number;
  track_height: number;
  timescale: number;
  duration: number;
  nb_samples: number;
  video?: {
    width: number;
    height: number;
  };
}

interface MP4FileInfo {
  duration: number;
  timescale: number;
  videoTracks: MP4VideoTrackInfo[];
}

/**
 * MP4Demuxer - MP4ファイルをパースしてVideoDecoderに渡せる形式に変換
 */
export class MP4Demuxer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private file: ISOFile<any, any>;
  private callbacks: DemuxerCallbacks;
  private videoTrack: MP4VideoTrackInfo | null = null;

  constructor(callbacks: DemuxerCallbacks) {
    this.callbacks = callbacks;
    this.file = createFile();
    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.file.onReady = (info: MP4FileInfo) => {
      this.handleReady(info);
    };

    this.file.onError = (module: string, message: string) => {
      this.callbacks.onError(new Error(`${module}: ${message}`));
    };

    this.file.onSamples = (_trackId: number, _ref: unknown, samples: Sample[]) => {
      this.handleSamples(samples);
    };
  }

  private handleReady(info: MP4FileInfo): void {
    // ビデオトラックを取得
    const videoTrack = info.videoTracks[0];
    if (!videoTrack) {
      this.callbacks.onError(new Error('No video track found in MP4 file'));
      return;
    }

    this.videoTrack = videoTrack;

    // VideoDecoderConfigを生成
    const config = this.createDecoderConfig(videoTrack);
    if (!config) {
      this.callbacks.onError(new Error('Failed to create decoder config'));
      return;
    }

    this.callbacks.onConfig(config);

    // サンプル抽出を開始
    this.file.setExtractionOptions(videoTrack.id, undefined, {
      nbSamples: Infinity,
    });
    this.file.start();
  }

  private createDecoderConfig(track: MP4VideoTrackInfo): DecoderConfig | null {
    // codec description を取得（avcC/hvcC/av1C/vpcC）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trak = this.file.getTrackById(track.id) as any;

    let description: Uint8Array | undefined;
    const entry = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0];
    if (entry) {
      // codec configurationボックスをバイナリデータにシリアライズ
      const codecBox = entry.avcC || entry.hvcC || entry.av1C || entry.vpcC;
      if (codecBox && typeof codecBox.write === 'function') {
        const stream = new DataStream();
        codecBox.write(stream);
        // ボックスヘッダ（8バイト: サイズ4バイト + タイプ4バイト）をスキップして内容のみ取得
        description = new Uint8Array(stream.buffer, 8);
      }
    }

    const width = track.video?.width ?? track.track_width;
    const height = track.video?.height ?? track.track_height;

    return {
      codec: track.codec,
      codedWidth: width,
      codedHeight: height,
      description,
    };
  }

  private handleSamples(samples: Sample[]): void {
    for (const sample of samples) {
      // データが存在しない場合はスキップ
      if (!sample.data) {
        continue;
      }

      // タイムスタンプを秒単位で計算
      const timestampInSeconds = sample.cts / sample.timescale;
      // マイクロ秒単位のタイムスタンプ（WebCodecs API用）
      const timestampInMicroseconds = (sample.cts / sample.timescale) * 1_000_000;
      const durationInMicroseconds = (sample.duration / sample.timescale) * 1_000_000;

      const chunk = new EncodedVideoChunk({
        type: sample.is_sync ? 'key' : 'delta',
        timestamp: timestampInMicroseconds,
        duration: durationInMicroseconds,
        data: sample.data,
      });

      this.callbacks.onChunk(chunk, timestampInSeconds);
    }
  }

  /**
   * ファイルデータを追加
   */
  appendBuffer(data: ArrayBuffer, offset: number): void {
    const buffer = data as ArrayBuffer & { fileStart: number };
    buffer.fileStart = offset;
    this.file.appendBuffer(buffer);
  }

  /**
   * 全データの読み込み完了を通知
   */
  flush(): void {
    this.file.flush();
    this.callbacks.onComplete();
  }

  /**
   * 処理を停止
   */
  stop(): void {
    this.file.stop();
  }

  /**
   * ビデオトラック情報を取得
   */
  getVideoTrack(): MP4VideoTrackInfo | null {
    return this.videoTrack;
  }
}
