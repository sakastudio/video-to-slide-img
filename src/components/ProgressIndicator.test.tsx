import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressIndicator } from './ProgressIndicator';
import type { ProgressState } from '../types';

describe('ProgressIndicator', () => {
  describe('idle状態', () => {
    it('何も表示されない', () => {
      const state: ProgressState = {
        status: 'idle',
        currentTime: 0,
        totalDuration: 0,
        slidesFound: 0,
      };

      const { container } = render(<ProgressIndicator state={state} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('processing状態', () => {
    it('プログレスバーが表示される', () => {
      const state: ProgressState = {
        status: 'processing',
        currentTime: 30,
        totalDuration: 120,
        slidesFound: 5,
      };

      render(<ProgressIndicator state={state} />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('プログレスバーの幅が正しく計算される', () => {
      const state: ProgressState = {
        status: 'processing',
        currentTime: 60,
        totalDuration: 120,
        slidesFound: 5,
      };

      render(<ProgressIndicator state={state} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('経過時間と総時間が表示される', () => {
      const state: ProgressState = {
        status: 'processing',
        currentTime: 65, // 1:05
        totalDuration: 185, // 3:05
        slidesFound: 5,
      };

      render(<ProgressIndicator state={state} />);
      expect(screen.getByText('1:05 / 3:05')).toBeInTheDocument();
    });

    it('進捗パーセンテージが表示される', () => {
      const state: ProgressState = {
        status: 'processing',
        currentTime: 25,
        totalDuration: 100,
        slidesFound: 5,
      };

      render(<ProgressIndicator state={state} />);
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('検出されたスライド数が表示される', () => {
      const state: ProgressState = {
        status: 'processing',
        currentTime: 30,
        totalDuration: 120,
        slidesFound: 8,
      };

      render(<ProgressIndicator state={state} />);
      expect(screen.getByText('検出されたスライド: 8枚')).toBeInTheDocument();
    });

    it('totalDurationが0の場合、0%と表示される', () => {
      const state: ProgressState = {
        status: 'processing',
        currentTime: 0,
        totalDuration: 0,
        slidesFound: 0,
      };

      render(<ProgressIndicator state={state} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('completed状態', () => {
    it('完了メッセージが表示される', () => {
      const state: ProgressState = {
        status: 'completed',
        currentTime: 120,
        totalDuration: 120,
        slidesFound: 10,
      };

      render(<ProgressIndicator state={state} />);
      expect(screen.getByText('抽出完了')).toBeInTheDocument();
    });

    it('最終的なスライド数が表示される', () => {
      const state: ProgressState = {
        status: 'completed',
        currentTime: 120,
        totalDuration: 120,
        slidesFound: 15,
      };

      render(<ProgressIndicator state={state} />);
      expect(screen.getByText('検出されたスライド: 15枚')).toBeInTheDocument();
    });
  });

  describe('error状態', () => {
    it('エラーメッセージが表示される', () => {
      const state: ProgressState = {
        status: 'error',
        currentTime: 30,
        totalDuration: 120,
        slidesFound: 3,
        errorMessage: '処理中にエラーが発生しました',
      };

      render(<ProgressIndicator state={state} />);
      expect(screen.getByText('エラー: 処理中にエラーが発生しました')).toBeInTheDocument();
    });
  });
});
