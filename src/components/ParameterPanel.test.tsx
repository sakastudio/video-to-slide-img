import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParameterPanel } from './ParameterPanel';
import { DEFAULT_PARAMS, type ExtractionParams } from '../types';

describe('ParameterPanel', () => {
  const mockOnChange = vi.fn();
  const defaultParams: ExtractionParams = { interval: 1.0, threshold: 10 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('サンプリング間隔の入力フィールドが表示される', () => {
      render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
      const input = screen.getByTestId('interval-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(1.0);
    });

    it('差分閾値の入力フィールドが表示される', () => {
      render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
      const input = screen.getByTestId('threshold-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(10);
    });

    it('デフォルト値のヒントが表示される', () => {
      render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
      expect(screen.getByText(`デフォルト: ${DEFAULT_PARAMS.interval}秒`)).toBeInTheDocument();
      expect(screen.getByText(`デフォルト: ${DEFAULT_PARAMS.threshold}%`)).toBeInTheDocument();
    });

    it('デフォルトに戻すボタンが表示される', () => {
      render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
      expect(screen.getByText('デフォルトに戻す')).toBeInTheDocument();
    });
  });

  describe('入力バリデーション', () => {
    describe('サンプリング間隔', () => {
      it('正の数値の場合、onChangeが呼ばれる', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('interval-input');

        fireEvent.change(input, { target: { value: '2.5' } });
        fireEvent.blur(input);

        expect(mockOnChange).toHaveBeenCalledWith({ ...defaultParams, interval: 2.5 });
      });

      it('0以下の値の場合、onChangeは呼ばれない', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('interval-input');

        fireEvent.change(input, { target: { value: '0' } });
        fireEvent.blur(input);

        expect(mockOnChange).not.toHaveBeenCalled();
      });

      it('負の値の場合、onChangeは呼ばれない', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('interval-input');

        fireEvent.change(input, { target: { value: '-1' } });
        fireEvent.blur(input);

        expect(mockOnChange).not.toHaveBeenCalled();
      });

      it('非数値の場合、onChangeは呼ばれない', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('interval-input');

        fireEvent.change(input, { target: { value: 'abc' } });
        fireEvent.blur(input);

        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    describe('差分閾値', () => {
      it('0-100の範囲内の値の場合、onChangeが呼ばれる', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('threshold-input');

        fireEvent.change(input, { target: { value: '50' } });
        fireEvent.blur(input);

        expect(mockOnChange).toHaveBeenCalledWith({ ...defaultParams, threshold: 50 });
      });

      it('0の場合もonChangeが呼ばれる', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('threshold-input');

        fireEvent.change(input, { target: { value: '0' } });
        fireEvent.blur(input);

        expect(mockOnChange).toHaveBeenCalledWith({ ...defaultParams, threshold: 0 });
      });

      it('100の場合もonChangeが呼ばれる', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('threshold-input');

        fireEvent.change(input, { target: { value: '100' } });
        fireEvent.blur(input);

        expect(mockOnChange).toHaveBeenCalledWith({ ...defaultParams, threshold: 100 });
      });

      it('100より大きい値の場合、onChangeは呼ばれない', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('threshold-input');

        fireEvent.change(input, { target: { value: '101' } });
        fireEvent.blur(input);

        expect(mockOnChange).not.toHaveBeenCalled();
      });

      it('負の値の場合、onChangeは呼ばれない', () => {
        render(<ParameterPanel params={defaultParams} onChange={mockOnChange} />);
        const input = screen.getByTestId('threshold-input');

        fireEvent.change(input, { target: { value: '-5' } });
        fireEvent.blur(input);

        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('デフォルト復元', () => {
    it('デフォルトに戻すボタンをクリックするとDEFAULT_PARAMSでonChangeが呼ばれる', () => {
      const customParams: ExtractionParams = { interval: 5.0, threshold: 25 };
      render(<ParameterPanel params={customParams} onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('デフォルトに戻す'));

      expect(mockOnChange).toHaveBeenCalledWith(DEFAULT_PARAMS);
    });
  });

  describe('disabled状態', () => {
    it('disabled=trueの場合、全ての入力フィールドが無効化される', () => {
      render(<ParameterPanel params={defaultParams} onChange={mockOnChange} disabled />);

      expect(screen.getByTestId('interval-input')).toBeDisabled();
      expect(screen.getByTestId('threshold-input')).toBeDisabled();
      expect(screen.getByText('デフォルトに戻す')).toBeDisabled();
    });
  });
});
