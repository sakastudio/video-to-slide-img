import { useCallback, useState, useEffect } from 'react';
import { DEFAULT_PARAMS, type ExtractionParams } from '../types';
import { useLanguage } from '../i18n';

interface ParameterPanelProps {
  params: ExtractionParams;
  onChange: (params: ExtractionParams) => void;
  disabled?: boolean;
}

export function ParameterPanel({ params, onChange, disabled = false }: ParameterPanelProps) {
  const { t } = useLanguage();
  const [intervalInput, setIntervalInput] = useState(String(params.interval));
  const [thresholdInput, setThresholdInput] = useState(String(params.threshold));

  useEffect(() => {
    setIntervalInput(String(params.interval));
  }, [params.interval]);

  useEffect(() => {
    setThresholdInput(String(params.threshold));
  }, [params.threshold]);

  const handleIntervalChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setIntervalInput(event.target.value);
    },
    []
  );

  const handleIntervalBlur = useCallback(() => {
    const value = parseFloat(intervalInput);
    if (!isNaN(value) && value > 0) {
      onChange({ ...params, interval: value });
    } else {
      setIntervalInput(String(params.interval));
    }
  }, [intervalInput, params, onChange]);

  const handleThresholdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setThresholdInput(event.target.value);
    },
    []
  );

  const handleThresholdBlur = useCallback(() => {
    const value = parseFloat(thresholdInput);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      onChange({ ...params, threshold: value });
    } else {
      setThresholdInput(String(params.threshold));
    }
  }, [thresholdInput, params, onChange]);

  const handleReset = useCallback(() => {
    onChange(DEFAULT_PARAMS);
  }, [onChange]);

  return (
    <div className="parameter-panel">
      <h3>{t('extractionParams')}</h3>

      <div className="parameter-field">
        <label htmlFor="interval">
          {t('samplingInterval')}
          <span className="default-hint">
            {t('default')}: {DEFAULT_PARAMS.interval}s
          </span>
        </label>
        <input
          id="interval"
          type="number"
          min="0.1"
          step="0.1"
          value={intervalInput}
          onChange={handleIntervalChange}
          onBlur={handleIntervalBlur}
          disabled={disabled}
          data-testid="interval-input"
        />
      </div>

      <div className="parameter-field">
        <label htmlFor="threshold">
          {t('diffThreshold')}
          <span className="default-hint">
            {t('default')}: {DEFAULT_PARAMS.threshold}%
          </span>
        </label>
        <input
          id="threshold"
          type="number"
          min="0"
          max="100"
          step="1"
          value={thresholdInput}
          onChange={handleThresholdChange}
          onBlur={handleThresholdBlur}
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
        {t('resetToDefault')}
      </button>
    </div>
  );
}
