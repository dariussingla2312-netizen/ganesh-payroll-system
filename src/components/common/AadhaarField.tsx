import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { maskAadhaar, validateAadhaar } from '../../utils/payrollCalculator';
import { useTheme } from '../../context/ThemeContext';

interface AadhaarFieldProps {
  value?: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  required?: boolean;
  label?: string;
}

export const AadhaarField: React.FC<AadhaarFieldProps> = ({
  value = '',
  onChange,
  readOnly = false,
  required = false,
  label,
}) => {
  const { t } = useTheme();
  const [isRevealed, setIsRevealed] = useState(false);

  const cleanValue = (value || '').replace(/\s+/g, '');
  const isValid = !cleanValue || validateAadhaar(cleanValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;
    const input = e.target.value.replace(/\D/g, '').slice(0, 12);
    onChange(input);
  };

  const getDisplayValue = () => {
    if (!cleanValue) return '';
    if (readOnly) {
      return isRevealed
        ? cleanValue.replace(/(\d{4})(?=\d)/g, '$1 ')
        : maskAadhaar(cleanValue);
    }
    // When editing:
    return isRevealed
      ? cleanValue.replace(/(\d{4})(?=\d)/g, '$1 ')
      : maskAadhaar(cleanValue);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label || t('aadhaarNumber')}{' '}
          {required ? (
            <span className="text-rose-500">*</span>
          ) : (
            <span className="text-slate-400 font-normal">({t('optional')})</span>
          )}
        </label>
        {cleanValue.length === 12 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Valid
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          type={isRevealed ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          readOnly={readOnly}
          value={isRevealed ? cleanValue : getDisplayValue()}
          onChange={handleChange}
          placeholder="1234 5678 9012"
          maxLength={14}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-wider transition-colors ${
            !isValid && cleanValue
              ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
          }`}
        />

        {cleanValue.length > 0 && (
          <button
            type="button"
            onClick={() => setIsRevealed(!isRevealed)}
            className="absolute right-2.5 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
            title={isRevealed ? t('hide') : t('reveal')}
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!isValid && cleanValue && (
        <p className="text-[11px] text-rose-500 mt-1">{t('aadhaarValidationMsg')}</p>
      )}
    </div>
  );
};
