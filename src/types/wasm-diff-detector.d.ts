declare module 'wasm-diff-detector' {
  export function detect_difference(
    frame1: Uint8Array,
    frame2: Uint8Array,
    width: number,
    height: number,
    color_threshold: number
  ): number;

  export function detect_difference_ratio(
    frame1: Uint8Array,
    frame2: Uint8Array,
    width: number,
    height: number,
    color_threshold: number
  ): number;

  export default function init(): Promise<void>;
}
