import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { useTheme } from '../../context/ThemeContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isDangerous = false,
}) => {
  const { t } = useTheme();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-2xl flex-shrink-0 ${
            isDangerous
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {cancelText || 'Cancel'}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-5 py-2.5 text-xs font-bold rounded-2xl text-white transition-all shadow-md ${
            isDangerous
              ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-rose-600/25'
              : 'bg-[#00b884] hover:bg-[#00a375] active:scale-95 shadow-[#00b884]/25'
          }`}
        >
          {confirmText || 'Confirm'}
        </button>
      </div>
    </Modal>
  );
};
