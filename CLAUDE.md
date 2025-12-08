# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

動画からスライドを自動検出して画像として抽出するWebアプリケーション。全処理がブラウザ内で完結し、サーバーへのアップロードは行わない。

## コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# リント
npm run lint

# テスト（監視モード）
npm test

# テスト（単発実行）
npm run test:run

# 単一テストファイル実行
npm run test:run src/services/videoProcessor.test.ts
```

## アーキテクチャ

### ディレクトリ構成

```
src/
├── App.tsx           # メインコンポーネント（状態管理の中心）
├── components/       # UIコンポーネント
│   ├── VideoInput    # 動画ファイル選択
│   ├── ParameterPanel # パラメータ設定UI
│   ├── ProgressIndicator # 進捗表示
│   └── SlideGallery  # 抽出結果一覧
├── services/         # ビジネスロジック
│   ├── videoProcessor.ts     # オーケストレーター
│   ├── frameExtractor.ts     # Canvas API経由のフレーム抽出
│   ├── differenceDetector.ts # pixelmatchによる差分検出
│   └── exportService.ts      # PNG/ZIPエクスポート
└── types/            # 型定義（ExtractionParams, ExtractedSlide等）
```

### 処理フロー

1. `VideoInput` で動画ファイルを読み込み
2. `ParameterPanel` で判定頻度（秒）と閾値（%）を設定
3. `VideoProcessor.processVideo()` がオーケストレーション
   - `FrameExtractor` が指定間隔でフレーム抽出
   - `detectDifference()` で前フレームと比較
   - 閾値を超えたらスライド切り替えと判定
4. `SlideGallery` で結果表示、`ExportService` でダウンロード

### 主要な型

```typescript
ExtractionParams { interval: number, threshold: number }
ExtractedSlide { id, sequenceNumber, timestamp, imageData, thumbnailUrl }
ProcessingResult = { success: true, slides } | { success: false, error }
```

## 技術スタック

- React 19 + TypeScript
- Vite（開発・ビルド）
- Vitest + Testing Library（テスト）
- pixelmatch（差分検出）
- JSZip（一括エクスポート）

## デプロイ

GitHub Pagesに`/video-to-slide-img/`パスでデプロイ（`vite.config.ts`の`base`設定）

---

## AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

### Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files MUST be written in the target language configured for this specification (see spec.json.language).

### Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

### Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously
