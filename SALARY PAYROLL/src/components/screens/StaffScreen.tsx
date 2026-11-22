import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Calendar,
  Phone,
  ArrowRight,
  Archive,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  formatINR,
  maskAadhaar,
  formatDateDDMMYYYY,
  calculateStaffMonthlySalary,
  getDaysInMonth,
  formatMonthName,
  getAdvanceLedger,
  getPreviousMonth,
} from '../../utils/payrollCalculator';
import { Employee, LeaveRecord, LeaveType } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AadhaarField } from '../common/AadhaarField';
import { PayslipModal } from '../common/PayslipModal';
import confetti from 'canvas-confetti';

interface StaffScreenProps {
  searchQuery?: string;
}

export const StaffScreen: React.FC<StaffScreenProps> = ({ searchQuery = '' }) => {
  const {
    employees,
    leaves,
    advances,
    settings,
    addEmployee,
    updateEmployee,
    archiveEmployee,
    restoreEmployee,
    saveLeaveRecord,
    deleteLeaveRecord,
  } = useData();

  const { language, t } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');

  // Selected staff member for Attendance/Leave Calendar & Details
  const [selectedStaff, setSelectedStaff] = useState<Employee | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<string>(() => {
    return new Date().toISOString().substring(0, 7);
  });

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Employee | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [designation, setDesignation] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [paidLeavesAllowed, setPaidLeavesAllowed] = useState('2');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');

  // Payslip modal
  const [payslipStaff, setPayslipStaff] = useState<Employee | null>(null);
  const [payslipMonth, setPayslipMonth] = useState<string>(getPreviousMonth());

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const allStaff = employees.filter((e) => e.type === 'fixed');

  const filteredStaff = allStaff.filter((emp) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'active'
        ? emp.status === 'active'
        : emp.status === 'archived';

    const effectiveQuery = (searchQuery || searchTerm).toLowerCase().trim();
    const matchesSearch =
      !effectiveQuery ||
      emp.name.toLowerCase().includes(effectiveQuery) ||
      (emp.designation && emp.designation.toLowerCase().includes(effectiveQuery)) ||
      (emp.phone && emp.phone.includes(effectiveQuery)) ||
      (emp.aadhaar && emp.aadhaar.includes(effectiveQuery));

    return matchesStatus && matchesSearch;
  });

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setName('');
    setPhone('');
    setAadhaar('');
    setDesignation('Supervisor');
    setMonthlySalary('30000');
    setPaidLeavesAllowed('2');
    setJoiningDate(new Date().toISOString().substring(0, 10));
    setNotes('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingStaff(emp);
    setName(emp.name);
    setPhone(emp.phone || '');
    setAadhaar(emp.aadhaar || '');
    setDesignation(emp.designation || '');
    setMonthlySalary(String(emp.monthlySalary || 0));
    setPaidLeavesAllowed(String(emp.paidLeavesPerMonth ?? 2));
    setJoiningDate(emp.joiningDate);
    setNotes(emp.notes || '');
    setShowAddModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingStaff) {
      await updateEmployee(editingStaff.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        aadhaar: aadhaar.trim() || undefined,
        designation: designation.trim() || 'Staff',
        monthlySalary: parseFloat(monthlySalary) || 0,
        paidLeavesPerMonth: parseInt(paidLeavesAllowed, 10) || 2,
        joiningDate,
        notes: notes.trim() || undefined,
      });
      if (selectedStaff?.id === editingStaff.id) {
        setSelectedStaff({
          ...editingStaff,
          name,
          phone,
          aadhaar,
          designation,
          monthlySalary: parseFloat(monthlySalary) || 0,
          paidLeavesPerMonth: parseInt(paidLeavesAllowed, 10) || 2,
          joiningDate,
          notes,
        });
      }
    } else {
      await addEmployee({
        type: 'fixed',
        name: name.trim(),
        phone: phone.trim() || undefined,
        aadhaar: aadhaar.trim() || undefined,
        designation: designation.trim() || 'Staff',
        monthlySalary: parseFloat(monthlySalary) || 0,
        paidLeavesPerMonth: parseInt(paidLeavesAllowed, 10) || 2,
        joiningDate,
        status: 'active',
        notes: notes.trim() || undefined,
      });
      confetti({ particleCount: 40, spread: 50 });
    }

    setShowAddModal(false);
  };

  const handleArchive = (emp: Employee) => {
    setConfirmDialog({
      isOpen: true,
      title: `${t('archive')} ${emp.name}?`,
      message:
        'Archiving will remove this staff member from active lists while preserving historical salary records and leaves.',
      isDangerous: true,
      confirmText: t('archive'),
      onConfirm: async () => {
        await archiveEmployee(emp.id);
        if (selectedStaff?.id === emp.id) setSelectedStaff(null);
      },
    });
  };

  const handleRestore = async (emp: Employee) => {
    await restoreEmployee(emp.id);
    if (selectedStaff?.id === emp.id) {
      setSelectedStaff({ ...emp, status: 'active' });
    }
  };

  // Toggle leave status for a day:
  // (none / present) -> absent -> half_day -> paid_leave -> (none)
  const handleToggleDayLeave = async (dayNumber: number) => {
    if (!selectedStaff) return;
    const dateStr = `${calendarMonth}-${String(dayNumber).padStart(2, '0')}`;
    const existing = leaves.find((l) => l.employeeId === selectedStaff.id && l.date === dateStr);

    let nextType: LeaveType | null = null;
    if (!existing || existing.type === 'present') {
      nextType = 'absent';
    } else if (existing.type === 'absent') {
      nextType = 'half_day';
    } else if (existing.type === 'half_day') {
      nextType = 'paid_leave';
    } else if (existing.type === 'paid_leave') {
      nextType = 'present';
    }

    if (nextType === 'present' && existing) {
      await deleteLeaveRecord(existing.id);
    } else if (nextType) {
      await saveLeaveRecord({
        id: existing?.id,
        employeeId: selectedStaff.id,
        date: dateStr,
        type: nextType,
      });
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('fixedStaffTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400">
            Monthly fixed salary personnel • Leave tracker & automatic per-day rate deduction
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#00b884]/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewStaff')}</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, designation, phone, or Aadhaar..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm outline-none focus:border-[#00b884] focus:ring-2 focus:ring-[#00b884]/20"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center w-full sm:w-auto">
          {(['active', 'archived', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                filterStatus === status
                  ? 'bg-[#00b884] text-white border-[#00b884] shadow-md shadow-[#00b884]/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {status === 'active' ? t('active') : status === 'archived' ? t('archived') : t('all')}
            </button>
          ))}
        </div>
      </div>

      {/* Staff List Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((st) => {
          const isArchived = st.status === 'archived';
          const ledger = getAdvanceLedger(advances, st.id);

          return (
            <div
              key={st.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none hover:shadow-md transition-all flex flex-col justify-between ${
                isArchived
                  ? 'border-slate-200 dark:border-slate-800 opacity-75'
                  : 'border-slate-100 dark:border-slate-800/80 hover:border-[#00b884]/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isArchived
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {st.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                        {st.name}
                      </h4>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {st.designation || 'Staff'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isArchived
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {isArchived ? t('archived') : t('active')}
                  </span>
                </div>

                <div className="space-y-1.5 my-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-semibold">
                    <span>Fixed Monthly Salary:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatINR(st.monthlySalary || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Paid Leaves Allowed:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {st.paidLeavesPerMonth ?? 2} days/month
                    </span>
                  </div>
                  {st.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{st.phone}</span>
                    </div>
                  )}
                  {st.aadhaar && (
                    <div className="font-mono text-[11px] text-slate-400">
                      Aadhaar: {maskAadhaar(st.aadhaar)}
                    </div>
                  )}
                  {ledger.totalGiven > 0 && (
                    <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pending Advance: {formatINR(ledger.balancePending)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedStaff(st)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <span>Attendance & Leaves</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(st)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={t('edit')}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>

                  {isArchived ? (
                    <button
                      onClick={() => handleRestore(st)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title={t('restore')}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(st)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      title={t('archive')}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Attendance & Leave Tracker Calendar Modal */}
      {selectedStaff && (
        <Modal
          isOpen={!!selectedStaff}
          onClose={() => setSelectedStaff(null)}
          title={`${selectedStaff.name} — Attendance & Leave Calendar`}
          maxWidth="2xl"
        >
          {(() => {
            const daysCount = getDaysInMonth(calendarMonth, settings.monthDayBasis);
            const staffCalc = calculateStaffMonthlySalary(
              selectedStaff,
              calendarMonth,
              leaves,
              advances,
              settings
            );

            return (
              <div className="space-y-4">
                {/* Month Picker & Salary Calculation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const [y, m] = calendarMonth.split('-').map(Number);
                        const d = new Date(y, m - 2, 1);
                        setCalendarMonth(d.toISOString().substring(0, 7));
                      }}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {formatMonthName(calendarMonth, language)}
                    </span>
                    <button
                      onClick={() => {
                        const [y, m] = calendarMonth.split('-').map(Number);
                        const d = new Date(y, m, 1);
                        setCalendarMonth(d.toISOString().substring(0, 7));
                      }}
                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right text-xs">
                    <div className="text-slate-400">
                      Per-day Rate ({staffCalc.totalDaysInMonth} days basis):
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatINR(staffCalc.perDayRate)}/day
                    </div>
                  </div>
                </div>

                {/* Salary summary for selected month */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <span className="text-slate-400 block">Base Salary:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatINR(staffCalc.monthlySalary)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    <span className="block opacity-80">Paid Leaves Used:</span>
                    <span className="font-bold">
                      {staffCalc.paidLeavesUsed} / {selectedStaff.paidLeavesPerMonth ?? 2}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                    <span className="block opacity-80">Unpaid Deduction:</span>
                    <span className="font-bold">
                      -{formatINR(staffCalc.leaveDeduction)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    <span className="block opacity-80">{t('netPayable')}:</span>
                    <span className="font-extrabold text-sm">
                      {formatINR(staffCalc.netPayable)}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 py-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Legend:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-emerald-500"></span>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-rose-500"></span>
                    <span>Absent (1 day)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-amber-500"></span>
                    <span>Half Day (0.5 day)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    <span>Paid Leave (0 ded.)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  {t('clickToToggleLeave')}
                </p>

                {/* Monthly Calendar Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                    <div
                      key={dayName}
                      className="text-center text-[10px] font-bold text-slate-400 uppercase py-1"
                    >
                      {dayName}
                    </div>
                  ))}

                  {/* Offset empty days for first day of month */}
                  {(() => {
                    const [y, m] = calendarMonth.split('-').map(Number);
                    const firstDayOfWeek = new Date(y, m - 1, 1).getDay();
                    const emptySlots = [];
                    for (let i = 0; i < firstDayOfWeek; i++) {
                      emptySlots.push(<div key={`empty-${i}`} className="p-2"></div>);
                    }
                    return emptySlots;
                  })()}

                  {/* Days */}
                  {Array.from({ length: daysCount }).map((_, index) => {
                    const dayNum = index + 1;
                    const dateStr = `${calendarMonth}-${String(dayNum).padStart(2, '0')}`;
                    const leave = leaves.find(
                      (l) => l.employeeId === selectedStaff.id && l.date === dateStr
                    );

                    let statusClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300';
                    let label = 'Present';

                    if (leave?.type === 'absent') {
                      statusClass = 'bg-rose-500 text-white border-rose-600 shadow-sm';
                      label = 'Absent';
                    } else if (leave?.type === 'half_day') {
                      statusClass = 'bg-amber-500 text-white border-amber-600 shadow-sm';
                      label = 'Half Day';
                    } else if (leave?.type === 'paid_leave') {
                      statusClass = 'bg-blue-600 text-white border-blue-700 shadow-sm';
                      label = 'Paid Lv';
                    }

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => handleToggleDayLeave(dayNum)}
                        className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-between min-h-[56px] sm:min-h-[64px] ${statusClass}`}
                      >
                        <span className="text-xs sm:text-sm font-bold">{dayNum}</span>
                        <span className="text-[9px] uppercase tracking-tighter font-semibold">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setPayslipStaff(selectedStaff);
                      setPayslipMonth(calendarMonth);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    View Payslip for this Month
                  </button>

                  <button
                    onClick={() => setSelectedStaff(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingStaff ? `Edit ${editingStaff.name}` : t('addNewStaff')}
        maxWidth="md"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('fullName')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anil Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('roleDesignation')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Supervisor / Accountant"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('monthlyFixedSalary')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="30000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('paidLeavesAllowed')}
              </label>
              <input
                type="number"
                min="0"
                value={paidLeavesAllowed}
                onChange={(e) => setPaidLeavesAllowed(e.target.value)}
                placeholder="2"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('joiningDate')}
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('phone')} ({t('optional')})
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
            />
          </div>

          <AadhaarField value={aadhaar} onChange={(val) => setAadhaar(val)} required={false} />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('notes')} ({t('optional')})
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Department, responsibilities, or notes..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={confirmDialog.isDangerous}
      />

      {/* Payslip Modal */}
      {payslipStaff && (
        <PayslipModal
          isOpen={!!payslipStaff}
          onClose={() => setPayslipStaff(null)}
          employee={payslipStaff}
          month={payslipMonth}
          staffCalc={calculateStaffMonthlySalary(
            payslipStaff,
            payslipMonth,
            leaves,
            advances,
            settings
          )}
          settings={settings}
        />
      )}
    </div>
  );
};
