import { useCallback } from 'react';
import { DEFAULT_PARAMS, type ExtractionParams } from '../types';

interface ParameterPanelProps {
  params: ExtractionParams;
  onChange: (params: ExtractionParams) => void;
  disabled?: boolean;
}

export function ParameterPanel({ params, onChange, disabled = false }: ParameterPanelProps) {
  const handleIntervalChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(event.target.value);
      if (!isNaN(value) && value > 0) {
        onChange({ ...params, interval: value });
      }
    },
    [params, onChange]
  );

  const handleThresholdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(event.target.value);
      if (!isNaN(value) && value >= 0 && value <= 100) {
        onChange({ ...params, threshold: value });
      }
    },
    [params, onChange]
  );

  const handleReset = useCallback(() => {
    onChange(DEFAULT_PARAMS);
  }, [onChange]);

  return (
    <div className="parameter-panel">
      <h3>抽出パラメータ</h3>

      <div className="parameter-field">
        <label htmlFor="interval">
          サンプリング間隔（秒）
          <span className="default-hint">デフォルト: {DEFAULT_PARAMS.interval}秒</span>
        </label>
        <input
          id="interval"
          type="number"
          min="0.1"
          step="0.1"
          value={params.interval}
          onChange={handleIntervalChange}
          disabled={disabled}
          data-testid="interval-input"
        />
      </div>

      <div className="parameter-field">
        <label htmlFor="threshold">
          差分閾値（%）
          <span className="default-hint">デフォルト: {DEFAULT_PARAMS.threshold}%</span>
        </label>
        <input
          id="threshold"
          type="number"
          min="0"
          max="100"
          step="1"
          value={params.threshold}
          onChange={handleThresholdChange}
          disabled={disabled}
          data-testid="threshold-input"
        />
      </div>

      <button
        type="button"
        onClick={handleReset}
        disabled={disabled}
        className="reset-button"
      >
        デフォルトに戻す
      </button>
    </div>
  );
}
