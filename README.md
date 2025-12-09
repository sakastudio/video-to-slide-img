# Video to Slide Image

動画からスライドを自動検出し、画像として抽出するWebアプリケーション。

**全処理がブラウザ内で完結** - サーバーへのアップロードは一切行わず、プライバシーを完全に保護します。

## Demo

https://sakastudio.github.io/video-to-slide-img/

## Features

- 動画ファイルからスライド切り替えを自動検出
- 検出間隔・感度の調整が可能
- 個別PNG / 一括ZIPダウンロード
- オフライン完全対応（サーバー通信なし）

## Usage

1. 動画ファイルをドラッグ＆ドロップまたは選択
2. 必要に応じてパラメータを調整
   - **判定頻度**: フレームをチェックする間隔（秒）
   - **閾値**: スライド切り替えと判定する差分の割合（%）
3. 「抽出開始」をクリック
4. 検出されたスライドを確認し、ダウンロード

## Tech Stack

- React 19 + TypeScript
- Vite
- pixelmatch（フレーム差分検出）
- JSZip（一括エクスポート）
- Rust + WebAssembly（高速フレーム処理）

## Development

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト
npm run test:run

# リント
npm run lint
```

## Architecture

```
src/
├── App.tsx              # メインコンポーネント
├── components/          # UIコンポーネント
│   ├── VideoInput       # 動画ファイル選択
│   ├── ParameterPanel   # パラメータ設定
│   ├── ProgressIndicator # 進捗表示
│   └── SlideGallery     # 抽出結果一覧
├── services/            # ビジネスロジック
│   ├── videoProcessor   # 処理オーケストレーター
│   ├── frameExtractor   # フレーム抽出
│   ├── differenceDetector # 差分検出
│   └── exportService    # エクスポート
└── types/               # 型定義
```

## License

MIT
