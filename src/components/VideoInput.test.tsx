import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test/testUtils';
import { VideoInput } from './VideoInput';
import { SUPPORTED_FORMATS } from '../types';

describe('VideoInput', () => {
  const mockOnVideoLoad = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('動画選択ボタンが表示される', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      expect(screen.getByTestId('video-select-button')).toBeInTheDocument();
    });

    it('ファイル入力要素は非表示である', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      const input = screen.getByTestId('video-file-input');
      expect(input).toHaveStyle({ display: 'none' });
    });

    it('正しいaccept属性が設定されている', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      const input = screen.getByTestId('video-file-input');
      expect(input).toHaveAttribute('accept', SUPPORTED_FORMATS.join(','));
    });
  });

  describe('形式バリデーション', () => {
    it('サポートされていない形式の場合、エラーコールバックが呼ばれる', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      const input = screen.getByTestId('video-file-input');

      const invalidFile = new File(['dummy'], 'test.avi', { type: 'video/avi' });
      fireEvent.change(input, { target: { files: [invalidFile] } });

      expect(mockOnError).toHaveBeenCalledWith({
        type: 'UNSUPPORTED_FORMAT',
        message: expect.any(String),
      });
      expect(mockOnVideoLoad).not.toHaveBeenCalled();
    });

    it('MP4形式は受け入れられる', async () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      const input = screen.getByTestId('video-file-input');

      const validFile = new File(['dummy'], 'test.mp4', { type: 'video/mp4' });
      fireEvent.change(input, { target: { files: [validFile] } });

      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('WebM形式は受け入れられる', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      const input = screen.getByTestId('video-file-input');

      const validFile = new File(['dummy'], 'test.webm', { type: 'video/webm' });
      fireEvent.change(input, { target: { files: [validFile] } });

      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('OGG形式は受け入れられる', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      const input = screen.getByTestId('video-file-input');

      const validFile = new File(['dummy'], 'test.ogg', { type: 'video/ogg' });
      fireEvent.change(input, { target: { files: [validFile] } });

      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('ファイルが選択されなかった場合、何も起きない', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      const input = screen.getByTestId('video-file-input');

      fireEvent.change(input, { target: { files: [] } });

      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnVideoLoad).not.toHaveBeenCalled();
    });
  });

  describe('disabled状態', () => {
    it('disabled=trueの場合、ボタンが無効化される', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} disabled />);
      expect(screen.getByTestId('video-select-button')).toBeDisabled();
    });

    it('disabled=trueの場合、ファイル入力も無効化される', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} disabled />);
      expect(screen.getByTestId('video-file-input')).toBeDisabled();
    });
  });

  describe('ボタンクリック', () => {
    it('ボタンクリックでファイル入力がトリガーされる', () => {
      render(<VideoInput onVideoLoad={mockOnVideoLoad} onError={mockOnError} />);
      const button = screen.getByTestId('video-select-button');
      const input = screen.getByTestId('video-file-input');

      const clickSpy = vi.spyOn(input, 'click');
      fireEvent.click(button);

      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
