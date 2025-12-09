export type Language = 'ja' | 'en';

export const seoMeta = {
  ja: {
    title: 'Video to Slide - 動画からスライドを自動抽出',
    description:
      '動画からスライドを自動検出して画像として保存。ブラウザ内で完結、サーバーアップロード不要。プレゼン動画、講義動画からスライド画像を簡単抽出。',
  },
  en: {
    title: 'Video to Slide - Extract Slides from Video Automatically',
    description:
      'Free online tool to extract slides from video automatically. No upload required, all processing in browser. Extract presentation slides with ease.',
  },
} as const;

export const translations = {
  ja: {
    // App
    appTitle: '動画スライド抽出ツール',
    appDescription:
      '動画からスライドを自動検出して画像として保存できます。すべての処理はブラウザ内で完結し、サーバーへのアップロードは行いません。',
    step1: '1. 動画を選択',
    step2: '2. パラメータを設定',
    step3: '3. 抽出を実行',
    step4: '4. スライドをダウンロード',
    supportedFormats: '対応形式: MP4, WebM, OGG',

    // VideoInput
    selectVideo: '動画ファイルを選択',
    selectAnotherVideo: '別の動画を選択',
    unsupportedFormat: 'MP4、WebM、OGG形式の動画を選択してください',
    loadFailed: '動画の読み込みに失敗しました',

    // ParameterPanel
    extractionParams: '抽出パラメータ',
    samplingInterval: 'サンプリング間隔（秒）',
    diffThreshold: '差分閾値（%）',
    default: 'デフォルト',
    resetToDefault: 'デフォルトに戻す',

    // Action buttons
    startExtraction: 'スライド抽出を開始',
    cancel: 'キャンセル',
    reset: 'リセット',

    // ProgressIndicator
    detectedSlides: '検出されたスライド',
    slides: '枚',
    extractionComplete: '抽出完了',
    error: 'エラー',

    // SlideGallery
    detectedSlidesCount: '検出されたスライド ({count}枚)',
    selectAll: '全選択',
    deselectAll: '全解除',
    downloadSelected: '選択をダウンロード ({count}枚)',
    download: 'ダウンロード',
    slideAlt: 'スライド {number}',
  },
  en: {
    // App
    appTitle: 'Video Slide Extractor',
    appDescription:
      'Automatically detect and save slides from videos as images. All processing is done in your browser - no server upload required.',
    step1: '1. Select Video',
    step2: '2. Set Parameters',
    step3: '3. Extract',
    step4: '4. Download Slides',
    supportedFormats: 'Supported formats: MP4, WebM, OGG',

    // VideoInput
    selectVideo: 'Select Video File',
    selectAnotherVideo: 'Select Another Video',
    unsupportedFormat: 'Please select a video in MP4, WebM, or OGG format',
    loadFailed: 'Failed to load video',

    // ParameterPanel
    extractionParams: 'Extraction Parameters',
    samplingInterval: 'Sampling Interval (sec)',
    diffThreshold: 'Difference Threshold (%)',
    default: 'Default',
    resetToDefault: 'Reset to Default',

    // Action buttons
    startExtraction: 'Start Extraction',
    cancel: 'Cancel',
    reset: 'Reset',

    // ProgressIndicator
    detectedSlides: 'Detected Slides',
    slides: '',
    extractionComplete: 'Extraction Complete',
    error: 'Error',

    // SlideGallery
    detectedSlidesCount: 'Detected Slides ({count})',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    downloadSelected: 'Download Selected ({count})',
    download: 'Download',
    slideAlt: 'Slide {number}',
  },
} as const;

export type TranslationKey = keyof typeof translations.ja;
