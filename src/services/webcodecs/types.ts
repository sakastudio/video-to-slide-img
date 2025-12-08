/**
 * MP4Box.js 関連の型定義
 */

export interface MP4Info {
  duration: number;
  timescale: number;
  brands: string[];
  videoTracks: MP4VideoTrack[];
  audioTracks: MP4AudioTrack[];
}

export interface MP4VideoTrack {
  id: number;
  codec: string;
  language: string;
  track_width: number;
  track_height: number;
  timescale: number;
  duration: number;
  nb_samples: number;
  video: {
    width: number;
    height: number;
  };
}

export interface MP4AudioTrack {
  id: number;
  codec: string;
  language: string;
  timescale: number;
  duration: number;
  nb_samples: number;
  audio: {
    sample_rate: number;
    channel_count: number;
  };
}

export interface MP4Sample {
  number: number;
  track_id: number;
  timescale: number;
  description_index: number;
  description: MP4SampleDescription;
  data: Uint8Array;
  size: number;
  duration: number;
  cts: number;
  dts: number;
  is_sync: boolean;
  is_leading: number;
  depends_on: number;
  is_depended_on: number;
  has_redundancy: number;
  degradation_priority: number;
  offset: number;
}

export interface MP4SampleDescription {
  avcC?: {
    configurationVersion: number;
    AVCProfileIndication: number;
    profile_compatibility: number;
    AVCLevelIndication: number;
    lengthSizeMinusOne: number;
    nb_SPS_nalus: number;
    SPS: Array<{ length: number; nalu: Uint8Array }>;
    nb_PPS_nalus: number;
    PPS: Array<{ length: number; nalu: Uint8Array }>;
  };
  hvcC?: unknown;
  av1C?: unknown;
  vpcC?: unknown;
}

export interface MP4BoxFile {
  onReady?: (info: MP4Info) => void;
  onError?: (error: Error) => void;
  onSamples?: (trackId: number, ref: unknown, samples: MP4Sample[]) => void;
  appendBuffer(data: ArrayBuffer & { fileStart?: number }): number;
  start(): void;
  stop(): void;
  flush(): void;
  setExtractionOptions(
    trackId: number,
    user?: unknown,
    options?: { nbSamples?: number; rapAlignment?: boolean }
  ): void;
  getTrackById(trackId: number): MP4VideoTrack | MP4AudioTrack | undefined;
}

/**
 * VideoDecoder 設定を生成するためのヘルパー型
 */
export interface DecoderConfig {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  description?: Uint8Array;
}
