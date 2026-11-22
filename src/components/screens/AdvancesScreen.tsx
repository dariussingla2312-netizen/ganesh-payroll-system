import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  AlertCircle,
  TrendingDown,
  Clock,
  ArrowRight,
  User,
  CheckCircle2,
  Coins,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  formatINR,
  formatDateDDMMYYYY,
  getAdvanceLedger,
  getAdvancesDueForMonth,
} from '../../utils/payrollCalculator';
import { Advance } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CircularProgress } from '../common/CircularProgress';
import confetti from 'canvas-confetti';

interface AdvancesScreenProps {
  searchQuery?: string;
}

export const AdvancesScreen: React.FC<AdvancesScreenProps> = ({ searchQuery = '' }) => {
  const {
    employees,
    advances,
    salaryPayments,
    addAdvance,
    deleteAdvance,
  } = useData();

  const { t } = useTheme();

  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  // Add Advance Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [empId, setEmpId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [mode, setMode] = useState<'this_month' | 'upcoming_month' | 'installments'>('this_month');
  const [targetMonth, setTargetMonth] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('3');
  const [note, setNote] = useState('');

  // Confirm delete dialog
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeEmployees = employees.filter((e) => e.status === 'active');

  // Filtered advances
  const filteredAdvances = advances.filter((adv) => {
    const matchesEmp = selectedEmpFilter === 'all' || adv.employeeId === selectedEmpFilter;
    const matchesMonth =
      selectedMonthFilter === 'all' || adv.date.startsWith(selectedMonthFilter);
    const emp = employees.find((e) => e.id === adv.employeeId);
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (emp && emp.name.toLowerCase().includes(q)) ||
      (adv.note && adv.note.toLowerCase().includes(q));

    return matchesEmp && matchesMonth && matchesQuery;
  });

  // Calculate totals across all advances
  const totalGivenAll = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalDeductedAll = salaryPayments
    .filter((sp) => sp.status === 'paid')
    .reduce((sum, sp) => sum + (sp.advancesDeducted || 0), 0);
  const balancePendingAll = Math.max(0, totalGivenAll - totalDeductedAll);
  const recoveryPct = totalGivenAll > 0 ? Math.round((totalDeductedAll / totalGivenAll) * 100) : 0;

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(amount);
    if (!empId || isNaN(amtNum) || amtNum <= 0) return;

    await addAdvance({
      employeeId: empId,
      amount: amtNum,
      date,
      mode,
      targetMonth: mode === 'upcoming_month' ? targetMonth : undefined,
      installmentsCount: mode === 'installments' ? parseInt(installmentsCount, 10) || 3 : undefined,
      note: note.trim() || undefined,
    });

    setAmount('');
    setNote('');
    setShowAddModal(false);
    confetti({ particleCount: 40, spread: 50 });
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await deleteAdvance(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884] flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <span>Advance & Loan Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track worker advances, multi-month EMI installments & automated payroll offsets
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#00b884]/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Advance</span>
        </button>
      </div>

      {/* Aggregate Metric Cards matching Behance gauge layout */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none text-left">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Issued</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatINR(totalGivenAll)}
          </div>
          <div className="text-xs text-slate-400 mt-1">All time advances</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none text-left">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recovered</div>
          <div className="text-xl sm:text-2xl font-bold text-[#00b884]">
            {formatINR(totalDeductedAll)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Deducted in salaries</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none text-left">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Balance</div>
          <div className="text-xl sm:text-2xl font-bold text-rose-500">
            {formatINR(balancePendingAll)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Active loan capital</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-center gap-3">
          <CircularProgress
            value={totalDeductedAll}
            max={totalGivenAll || 1}
            size={56}
            strokeWidth={6}
            color="#00b884"
            trackColor="#e6f7f0"
            label={`${recoveryPct}%`}
            sublabel="Paid"
          />
          <div className="text-left">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recovery</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{recoveryPct}% cleared</span>
          </div>
        </div>
      </div>

      {/* Filters: Employee & Month */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/30 dark:shadow-none">
        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Filter by Employee
          </label>
          <select
            value={selectedEmpFilter}
            onChange={(e) => setSelectedEmpFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:border-[#00b884]"
          >
            <option value="all">All Employees ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.type === 'labour' ? 'Labour' : 'Staff'})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-56">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Filter by Month
          </label>
          <input
            type="month"
            value={selectedMonthFilter === 'all' ? '' : selectedMonthFilter}
            onChange={(e) => setSelectedMonthFilter(e.target.value || 'all')}
            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:border-[#00b884]"
          />
        </div>

        {selectedMonthFilter !== 'all' && (
          <button
            onClick={() => setSelectedMonthFilter('all')}
            className="self-end sm:self-center px-3 py-2 text-xs text-rose-500 font-bold hover:underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Per-Employee Ledger Banner if filtering by person */}
      {selectedEmpFilter !== 'all' && (() => {
        const emp = employees.find((e) => e.id === selectedEmpFilter);
        if (!emp) return null;
        const ledger = getAdvanceLedger(advances, emp.id);

        return (
          <div className="p-5 bg-[#e6f7f0] dark:bg-[#00b884]/15 border border-[#00b884]/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h4 className="font-bold text-[#064e3b] dark:text-[#00b884] text-base">
                Advance Ledger: {emp.name}
              </h4>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Total advances issued: <strong>{formatINR(ledger.totalGiven)}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block font-semibold">Remaining Due Balance:</span>
              <span className="text-lg font-black text-rose-500">
                {formatINR(ledger.balancePending)}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Advances Records List */}
      <div className="space-y-3">
        {filteredAdvances.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No advances match the current filter
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Tap "Record New Advance" to issue an advance or split an installment.
            </p>
          </div>
        ) : (
          filteredAdvances
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((adv) => {
              const emp = employees.find((e) => e.id === adv.employeeId);

              return (
                <div
                  key={adv.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm shadow-slate-200/30 dark:shadow-none hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center font-black text-base flex-shrink-0">
                      ₹
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          {formatINR(adv.amount)}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          to {emp?.name || 'Worker'}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {emp?.type === 'labour' ? 'Labour' : 'Staff'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>Issued: {formatDateDDMMYYYY(adv.date)}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#00b884]">
                          {adv.mode === 'this_month' && 'Deduct in same month'}
                          {adv.mode === 'upcoming_month' && `Adjust in ${adv.targetMonth}`}
                          {adv.mode === 'installments' && `Split into ${adv.installmentsCount || 3} EMIs`}
                        </span>
                        {adv.note && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-500">"{adv.note}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setConfirmDeleteId(adv.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                      title="Delete Advance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Add Advance Modal */}
      {showAddModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          title="Record New Advance / Loan"
        >
          <form onSubmit={handleSaveAdvance} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Select Worker / Staff *
              </label>
              <select
                required
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-[#00b884]"
              >
                <option value="">-- Choose Person --</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.type === 'labour' ? 'Labour' : 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Advance Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-[#00b884]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Date Given *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-[#00b884]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Deduction Mode *
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="this_month"
                    checked={mode === 'this_month'}
                    onChange={() => setMode('this_month')}
                    className="accent-[#00b884]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Deduct in this month's salary
                    </span>
                    <span className="text-slate-400">
                      Full amount is deducted in the salary of the month the date falls in.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="upcoming_month"
                    checked={mode === 'upcoming_month'}
                    onChange={() => setMode('upcoming_month')}
                    className="accent-[#00b884]"
                  />
                  <div className="text-xs flex-1">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Adjust in upcoming target month
                    </span>
                    <span className="text-slate-400">
                      Do not deduct now, pick an upcoming month to cut the salary.
                    </span>
                    {mode === 'upcoming_month' && (
                      <input
                        type="month"
                        required
                        value={targetMonth}
                        onChange={(e) => setTargetMonth(e.target.value)}
                        className="mt-2 w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-bold"
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="installments"
                    checked={mode === 'installments'}
                    onChange={() => setMode('installments')}
                    className="accent-[#00b884]"
                  />
                  <div className="text-xs flex-1">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Split into monthly installments (EMI)
                    </span>
                    <span className="text-slate-400">
                      Deduct equally over several consecutive months.
                    </span>
                    {mode === 'installments' && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Number of months:</span>
                        <select
                          value={installmentsCount}
                          onChange={(e) => setInstallmentsCount(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-bold"
                        >
                          <option value="2">2 Months</option>
                          <option value="3">3 Months</option>
                          <option value="4">4 Months</option>
                          <option value="6">6 Months</option>
                        </select>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Note / Purpose (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Festival advance, Medical expense"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#00b884]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/25"
              >
                Save Advance
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete Advance Entry?"
        message="Are you sure you want to delete this advance record? This will remove the automatic deduction from future salary calculations."
        confirmText="Delete Advance"
        isDangerous={true}
        onConfirm={handleDelete}
      />
    </div>
  );
};
