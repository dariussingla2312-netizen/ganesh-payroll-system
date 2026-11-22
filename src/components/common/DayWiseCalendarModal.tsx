import React from 'react';
import { Calendar, Clock, Package, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Employee, LabourMonthlyCalculation, GlobalSettings } from '../../types';
import { formatINR, formatDateDDMMYYYY, formatMonthName } from '../../utils/payrollCalculator';
import { useTheme } from '../../context/ThemeContext';

interface DayWiseCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  month: string;
  labourCalc?: LabourMonthlyCalculation;
  settings?: GlobalSettings;
}

export const DayWiseCalendarModal: React.FC<DayWiseCalendarModalProps> = ({
  isOpen,
  onClose,
  employee,
  month,
  labourCalc,
}) => {
  const { t } = useTheme();

  if (!labourCalc) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Daily Work & Attendance Breakdown — ${employee.name} (${formatMonthName(month, 'en')})`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Summary banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#e6f7f0] dark:bg-[#00b884]/15 border border-[#00b884]/30 rounded-2xl text-xs">
          <div>
            <span className="text-[#064e3b] dark:text-[#00b884] font-medium">Days Worked:</span>{' '}
            <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
              {labourCalc.totalDaysWorked} days
            </span>
          </div>
          <div>
            <span className="text-[#064e3b] dark:text-[#00b884] font-medium">Regular Hours:</span>{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {labourCalc.totalRegularHours}h
            </span>
          </div>
          {labourCalc.totalOvertimeHours > 0 && (
            <div>
              <span className="text-[#064e3b] dark:text-[#00b884] font-medium">Overtime:</span>{' '}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {labourCalc.totalOvertimeHours}h (@ 1.5x)
              </span>
            </div>
          )}
          <div>
            <span className="text-[#064e3b] dark:text-[#00b884] font-medium">Total Gross:</span>{' '}
            <span className="font-black text-[#00b884] text-sm">
              {formatINR(labourCalc.grossSalary)}
            </span>
          </div>
        </div>

        {/* Day-by-day table */}
        {labourCalc.dayWiseDetails.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            No work entries recorded for this worker in {formatMonthName(month, 'en')}.
          </div>
        ) : (
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#f8fafc] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Work Description</th>
                    <th className="p-3 text-center">Regular</th>
                    <th className="p-3 text-center">OT</th>
                    <th className="p-3 text-center">Pieces</th>
                    <th className="p-3 text-right">Day Wages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {labourCalc.dayWiseDetails.map((day) => (
                    <tr
                      key={day.date}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {formatDateDDMMYYYY(day.date)}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {day.entries.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              {entry.hours ? (
                                <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
                                  <Clock className="w-3 h-3 text-[#00b884]" />
                                  {entry.hours}h
                                </span>
                              ) : null}
                              {entry.quantity ? (
                                <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
                                  <Package className="w-3 h-3 text-blue-500" />
                                  {entry.quantity} pcs
                                </span>
                              ) : null}
                              {entry.note && (
                                <span className="text-[10px] text-slate-400 italic">
                                  ({entry.note})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center font-medium text-slate-700 dark:text-slate-300">
                        {day.regularHours > 0 ? `${day.regularHours}h` : '-'}
                      </td>
                      <td className="p-3 text-center font-bold text-amber-500">
                        {day.overtimeHours > 0 ? `${day.overtimeHours}h` : '-'}
                      </td>
                      <td className="p-3 text-center font-medium text-blue-600 dark:text-blue-400">
                        {day.pieceQuantity > 0 ? day.pieceQuantity : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-[#00b884]">
                        {formatINR(day.dayEarnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/20"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </Modal>
  );
};
