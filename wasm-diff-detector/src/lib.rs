use wasm_bindgen::prelude::*;

/// RGB色空間での色差を計算（0.0-1.0）
#[inline]
fn color_delta(r1: u8, g1: u8, b1: u8, r2: u8, g2: u8, b2: u8) -> f64 {
    let dr = (r1 as i32 - r2 as i32).abs() as f64 / 255.0;
    let dg = (g1 as i32 - g2 as i32).abs() as f64 / 255.0;
    let db = (b1 as i32 - b2 as i32).abs() as f64 / 255.0;

    // 最大色差を返す（より厳密にはYIQ色空間での計算が良いが、パフォーマンス優先）
    dr.max(dg).max(db)
}

/// 2つのフレーム間のピクセル差分を検出する
///
/// # Arguments
/// * `frame1` - 比較元フレームのRGBAデータ
/// * `frame2` - 比較先フレームのRGBAデータ
/// * `width` - フレームの幅
/// * `height` - フレームの高さ
/// * `color_threshold` - 色差の閾値（0.0-1.0）
///
/// # Returns
/// 差分ピクセル数
#[wasm_bindgen]
pub fn detect_difference(
    frame1: &[u8],
    frame2: &[u8],
    width: u32,
    height: u32,
    color_threshold: f64,
) -> u32 {
    let total_pixels = (width * height) as usize;
    let expected_len = total_pixels * 4; // RGBA

    // 入力検証
    if frame1.len() != expected_len || frame2.len() != expected_len {
        return 0;
    }

    let mut diff_count: u32 = 0;

    for i in 0..total_pixels {
        let idx = i * 4;

        let r1 = frame1[idx];
        let g1 = frame1[idx + 1];
        let b1 = frame1[idx + 2];
        // a1 = frame1[idx + 3] // アルファは無視

        let r2 = frame2[idx];
        let g2 = frame2[idx + 1];
        let b2 = frame2[idx + 2];

        let delta = color_delta(r1, g1, b1, r2, g2, b2);

        if delta > color_threshold {
            diff_count += 1;
        }
    }

    diff_count
}

/// 差分率を直接計算して返す（パーセンテージ）
#[wasm_bindgen]
pub fn detect_difference_ratio(
    frame1: &[u8],
    frame2: &[u8],
    width: u32,
    height: u32,
    color_threshold: f64,
) -> f64 {
    let total_pixels = (width * height) as usize;
    if total_pixels == 0 {
        return 0.0;
    }

    let diff_count = detect_difference(frame1, frame2, width, height, color_threshold);
    (diff_count as f64 / total_pixels as f64) * 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identical_frames() {
        let frame: Vec<u8> = vec![255, 0, 0, 255, 0, 255, 0, 255]; // 2 pixels
        let diff = detect_difference(&frame, &frame, 2, 1, 0.1);
        assert_eq!(diff, 0);
    }

    #[test]
    fn test_different_frames() {
        let frame1: Vec<u8> = vec![255, 0, 0, 255, 0, 255, 0, 255]; // red, green
        let frame2: Vec<u8> = vec![0, 0, 255, 255, 255, 255, 0, 255]; // blue, yellow
        let diff = detect_difference(&frame1, &frame2, 2, 1, 0.1);
        assert_eq!(diff, 2);
    }

    #[test]
    fn test_difference_ratio() {
        let frame1: Vec<u8> = vec![255, 0, 0, 255, 0, 0, 0, 255]; // red, black
        let frame2: Vec<u8> = vec![255, 0, 0, 255, 255, 255, 255, 255]; // red, white
        let ratio = detect_difference_ratio(&frame1, &frame2, 2, 1, 0.1);
        assert!((ratio - 50.0).abs() < 0.01); // 50% difference
    }
}
