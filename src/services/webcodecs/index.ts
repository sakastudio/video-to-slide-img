export { WebCodecsProcessor } from './WebCodecsProcessor';
export { MP4Demuxer } from './MP4Demuxer';
export type { DecoderConfig, MP4Info, MP4VideoTrack, MP4Sample } from './types';

/**
 * WebCodecs APIがサポートされているか確認
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof VideoDecoder !== 'undefined' &&
    typeof EncodedVideoChunk !== 'undefined' &&
    typeof VideoFrame !== 'undefined'
  );
}

/**
 * 指定されたコーデックがサポートされているか確認
 */
export async function isCodecSupported(codec: string): Promise<boolean> {
  if (!isWebCodecsSupported()) {
    return false;
  }

  try {
    const result = await VideoDecoder.isConfigSupported({
      codec,
      codedWidth: 1920,
      codedHeight: 1080,
    });
    return result.supported ?? false;
  } catch {
    return false;
  }
}

/**
 * H.264 (AVC) がサポートされているか確認
 * MP4の主要コーデック
 */
export async function isH264Supported(): Promise<boolean> {
  // 一般的なH.264プロファイルをチェック
  const profiles = [
    'avc1.42E01E', // Baseline Profile
    'avc1.4D401E', // Main Profile
    'avc1.64001E', // High Profile
  ];

  for (const profile of profiles) {
    if (await isCodecSupported(profile)) {
      return true;
    }
  }
  return false;
}
