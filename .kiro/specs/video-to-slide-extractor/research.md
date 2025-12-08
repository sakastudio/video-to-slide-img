# Research & Design Decisions

## Summary
- **Feature**: `video-to-slide-extractor`
- **Discovery Scope**: New Feature (greenfield)
- **Key Findings**:
  - Canvas API + HTMLVideoElement.drawImage()がブラウザ内フレーム抽出の標準的アプローチ
  - Pixelmatchライブラリが軽量かつ高速なピクセル差分検出を提供（閾値設定可能）
  - JSZipがクライアントサイドZIP生成のデファクトスタンダード

## Research Log

### ブラウザ内動画フレーム抽出
- **Context**: ローカル動画からフレームを抽出する方法の調査
- **Sources Consulted**:
  - [MDN - Manipulating video using canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas)
  - [Stack Overflow - Capture frames from video](https://stackoverflow.com/questions/19175174/capture-frames-from-video-with-html5-and-javascript)
  - [video-to-frames library](https://github.com/bertyhell/video-to-frames)
- **Findings**:
  - `CanvasRenderingContext2D.drawImage(video, 0, 0)`で現在フレームを描画
  - `canvas.getContext('2d').getImageData()`でピクセルデータ取得
  - 2D Canvasでのフレーム描画は約0.5ms、ピクセル読み取りは約6ms/フレーム
  - WebCodecs APIはより高速だがブラウザサポートが限定的
- **Implications**: 1秒間隔のサンプリングでは2D Canvas APIで十分な性能。WebCodecsは将来の最適化オプション。

### ピクセル差分検出アルゴリズム
- **Context**: フレーム間の差分を検出する最適な方法
- **Sources Consulted**:
  - [Pixelmatch GitHub](https://github.com/mapbox/pixelmatch)
  - [Pixelmatch npm](https://www.npmjs.com/package/pixelmatch)
  - [Stack Overflow - Compare two images](https://stackoverflow.com/questions/6066111/compare-two-images-in-javascript)
- **Findings**:
  - Pixelmatch: 約150行、依存なし、typed arraysで高速動作
  - threshold: 0-1の範囲、デフォルト0.1、小さいほど厳密
  - YIQ NTSC色空間ベースの知覚的色差計算
  - アンチエイリアス検出機能あり
  - 戻り値: 差異ピクセル数（総ピクセル数との比率で閾値判定可能）
- **Implications**: Pixelmatchを採用。閾値はパーセンテージ（差異ピクセル割合）として実装。

### クライアントサイドZIP生成
- **Context**: 複数画像の一括ダウンロード機能
- **Sources Consulted**:
  - [JSZip Documentation](https://stuk.github.io/jszip/)
  - [JSZip Examples](https://stuk.github.io/jszip/documentation/examples.html)
  - [client-zip npm](https://www.npmjs.com/package/client-zip)
- **Findings**:
  - JSZip: 成熟、広く使用、MIT/GPLv3デュアルライセンス
  - `zip.file(name, content)` → `zip.generateAsync({type: 'blob'})`
  - client-zip: より高速だが圧縮なし
  - fflate: 最高性能だがAPI複雑
- **Implications**: JSZipを採用。安定性と使いやすさを優先。

### Vite + React + TypeScript構成
- **Context**: プロジェクト構成のベストプラクティス
- **Sources Consulted**:
  - [Vite Getting Started](https://vite.dev/guide/)
  - [Advanced Guide to Vite with React 2025](https://codeparrot.ai/blogs/advanced-guide-to-using-vite-with-react-in-2025)
  - [React TypeScript Best Practices](https://dev.to/oppaaaii/best-practices-for-using-typescript-in-react-with-vite-1dhf)
- **Findings**:
  - `npm create vite@latest -- --template react-ts`
  - ESモジュールベースで高速起動
  - strict TypeScript設定推奨
  - Vitest統合でテスト環境構築
- **Implications**: 標準的なVite + React + TypeScript構成を採用。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Feature-based | 機能単位でコンポーネント・ロジック・型を配置 | 小規模プロジェクトに適切、シンプル | 大規模化時に見通し悪化 | 本プロジェクトの規模に最適 |
| Layered | UI / Services / Utils の層構造 | 責務分離が明確 | 過度な抽象化の懸念 | サービス層のみ採用 |
| Atomic Design | atoms/molecules/organisms階層 | 再利用性高い | 小規模では過剰 | 不採用 |

## Design Decisions

### Decision: フレーム抽出方式
- **Context**: 動画からフレームを抽出する技術選定
- **Alternatives Considered**:
  1. Canvas 2D API - 標準的、広いサポート
  2. WebCodecs API - 高速だがサポート限定
  3. FFmpeg.wasm - 高機能だがサイズ大
- **Selected Approach**: Canvas 2D API
- **Rationale**: 1秒間隔サンプリングでは十分な性能。追加依存なし。全主要ブラウザサポート。
- **Trade-offs**: WebCodecsより低速だが、ユースケースでは問題なし
- **Follow-up**: 性能問題発生時にWebCodecs移行を検討

### Decision: 差分検出ライブラリ
- **Context**: ピクセル差分計算の実装方式
- **Alternatives Considered**:
  1. Pixelmatch - 軽量、高速、閾値設定可能
  2. Resemble.js - 機能豊富だがサイズ大
  3. 自前実装 - カスタマイズ可能だが工数大
- **Selected Approach**: Pixelmatch
- **Rationale**: 150行・依存なし・typed arrays対応で最適
- **Trade-offs**: 視覚的差分表示機能は不要だが、ライブラリに含まれる
- **Follow-up**: なし

### Decision: ZIP生成ライブラリ
- **Context**: 一括ダウンロード機能の実装
- **Alternatives Considered**:
  1. JSZip - 成熟、安定、圧縮対応
  2. client-zip - 高速だが圧縮なし
  3. fflate - 最高性能だがAPI複雑
- **Selected Approach**: JSZip
- **Rationale**: 広く使用され安定。ドキュメント充実。
- **Trade-offs**: client-zipより低速だが実用上問題なし
- **Follow-up**: なし

### Decision: 状態管理
- **Context**: Reactアプリケーションの状態管理方式
- **Alternatives Considered**:
  1. useState/useReducer - シンプル、追加依存なし
  2. Zustand - 軽量状態管理
  3. Redux - 大規模向け
- **Selected Approach**: useState + useReducer
- **Rationale**: 単一ページ・単一機能で外部ライブラリ不要
- **Trade-offs**: 複雑化時はZustand移行を検討
- **Follow-up**: なし

## Risks & Mitigations
- **大容量動画でのメモリ不足** — フレームを逐次処理し、不要なImageDataを即座に解放
- **ブラウザ間の動画コーデックサポート差異** — MP4/WebM/OGGのみサポートとし、非対応形式はエラー表示
- **長時間処理でのUIフリーズ** — requestAnimationFrame/setTimeout活用でメインスレッドをブロックしない設計

## References
- [MDN - Manipulating video using canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas)
- [Pixelmatch GitHub](https://github.com/mapbox/pixelmatch)
- [JSZip Documentation](https://stuk.github.io/jszip/)
- [Vite Getting Started](https://vite.dev/guide/)
