import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  Archive,
  RefreshCw,
  Phone,
  Calendar,
  FileSpreadsheet,
  Clock,
  Package,
  CreditCard,
  History,
  CheckCircle2,
  Trash2,
  Eye,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  formatINR,
  maskAadhaar,
  formatDateDDMMYYYY,
  getRateForDate,
  calculateLabourMonthlySalary,
  getAdvanceLedger,
  getPreviousMonth,
} from '../../utils/payrollCalculator';
import { Employee, WorkType, EmployeeRate } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AadhaarField } from '../common/AadhaarField';
import { PayslipModal } from '../common/PayslipModal';
import confetti from 'canvas-confetti';

interface LabourersScreenProps {
  searchQuery?: string;
}

export const LabourersScreen: React.FC<LabourersScreenProps> = ({ searchQuery = '' }) => {
  const {
    employees,
    workTypes,
    employeeRates,
    workEntries,
    advances,
    settings,
    addEmployee,
    updateEmployee,
    archiveEmployee,
    restoreEmployee,
    setEmployeeRate,
  } = useData();

  const { t } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');

  // Selected labourer for Detail View
  const [selectedLabourer, setSelectedLabourer] = useState<Employee | null>(null);
  const [detailTab, setDetailTab] = useState<'rates' | 'history' | 'advances' | 'salary'>('rates');

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');
  const [initialRates, setInitialRates] = useState<Record<string, number>>({});

  // Rate change modal state
  const [rateModalWorkType, setRateModalWorkType] = useState<WorkType | null>(null);
  const [newRateValue, setNewRateValue] = useState<string>('');
  const [rateEffectiveFrom, setRateEffectiveFrom] = useState<string>(() =>
    new Date().toISOString().substring(0, 10)
  );

  // Confirm dialog state
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

  // Payslip modal state
  const [payslipEmployee, setPayslipEmployee] = useState<Employee | null>(null);
  const [payslipMonth, setPayslipMonth] = useState<string>(getPreviousMonth());

  const allLabourers = employees.filter((e) => e.type === 'labour');

  const filteredLabourers = allLabourers.filter((emp) => {
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
      (emp.phone && emp.phone.includes(effectiveQuery)) ||
      (emp.aadhaar && emp.aadhaar.includes(effectiveQuery));

    return matchesStatus && matchesSearch;
  });

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setName('');
    setPhone('');
    setAadhaar('');
    setJoiningDate(new Date().toISOString().substring(0, 10));
    setNotes('');
    const ratesInit: Record<string, number> = {};
    workTypes.forEach((wt) => {
      ratesInit[wt.id] = wt.defaultRate;
    });
    setInitialRates(ratesInit);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setPhone(emp.phone || '');
    setAadhaar(emp.aadhaar || '');
    setJoiningDate(emp.joiningDate);
    setNotes(emp.notes || '');
    setShowAddModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingEmployee) {
      await updateEmployee(editingEmployee.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        aadhaar: aadhaar.trim() || undefined,
        joiningDate,
        notes: notes.trim() || undefined,
      });
      if (selectedLabourer?.id === editingEmployee.id) {
        setSelectedLabourer({ ...editingEmployee, name, phone, aadhaar, joiningDate, notes });
      }
    } else {
      await addEmployee(
        {
          type: 'labour',
          name: name.trim(),
          phone: phone.trim() || undefined,
          aadhaar: aadhaar.trim() || undefined,
          joiningDate,
          status: 'active',
          notes: notes.trim() || undefined,
        },
        initialRates
      );
      confetti({ particleCount: 40, spread: 50 });
    }

    setShowAddModal(false);
  };

  const handleArchive = (emp: Employee) => {
    setConfirmDialog({
      isOpen: true,
      title: `${t('archive')} ${emp.name}?`,
      message:
        'Archiving will hide this labourer from daily entries while keeping all past work, wages, and advances completely safe.',
      isDangerous: true,
      confirmText: t('archive'),
      onConfirm: async () => {
        await archiveEmployee(emp.id);
        if (selectedLabourer?.id === emp.id) {
          setSelectedLabourer(null);
        }
      },
    });
  };

  const handleRestore = async (emp: Employee) => {
    await restoreEmployee(emp.id);
    if (selectedLabourer?.id === emp.id) {
      setSelectedLabourer({ ...emp, status: 'active' });
    }
  };

  const handleSaveNewRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabourer || !rateModalWorkType) return;
    const rateNum = parseFloat(newRateValue);
    if (isNaN(rateNum) || rateNum < 0) return;

    await setEmployeeRate(selectedLabourer.id, rateModalWorkType.id, rateNum, rateEffectiveFrom);
    setRateModalWorkType(null);
    setNewRateValue('');
    confetti({ particleCount: 30, spread: 40 });
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('labourList')}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {allLabourers.length} Labourers registered ({allLabourers.filter((e) => e.status === 'active').length} active)
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#00b884]/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewLabourer')}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search workers by name, phone, or Aadhaar..."
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

      {/* Labourers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLabourers.map((emp) => {
          const isArchived = emp.status === 'archived';
          const ledger = getAdvanceLedger(advances, emp.id);

          return (
            <div
              key={emp.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none hover:shadow-md transition-all flex flex-col justify-between ${
                isArchived
                  ? 'border-slate-200 dark:border-slate-800 opacity-75'
                  : 'border-slate-100 dark:border-slate-800/80 hover:border-[#00b884]/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${
                        isArchived
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          : 'bg-[#e6f7f0] dark:bg-emerald-950/80 text-[#00b884] dark:text-emerald-300'
                      }`}
                    >
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                        {emp.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {maskAadhaar(emp.aadhaar) || 'No Aadhaar'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                      isArchived
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'bg-[#e6f7f0] dark:bg-emerald-950/60 text-[#00b884] dark:text-emerald-300 border border-[#00b884]/20'
                    }`}
                  >
                    {isArchived ? t('archived') : t('active')}
                  </span>
                </div>

                <div className="space-y-1.5 my-3.5 text-xs text-slate-500 dark:text-slate-400">
                  {emp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{emp.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Joined: {formatDateDDMMYYYY(emp.joiningDate)}</span>
                  </div>
                  {ledger.totalGiven > 0 && (
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Advance Balance: {formatINR(ledger.balancePending)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedLabourer(emp)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00b884] hover:underline"
                >
                  <span>View Details & Rates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(emp)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={t('edit')}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>

                  {isArchived ? (
                    <button
                      onClick={() => handleRestore(emp)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title={t('restore')}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(emp)}
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

      {/* Labourer Detail Modal */}
      {selectedLabourer && (
        <Modal
          isOpen={!!selectedLabourer}
          onClose={() => setSelectedLabourer(null)}
          title={`${selectedLabourer.name} — Labourer Details`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Worker summary header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block">Phone:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedLabourer.phone || 'None'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Aadhaar:</span>
                <AadhaarField value={selectedLabourer.aadhaar} readOnly />
              </div>
              <div>
                <span className="text-slate-400 block">Joining Date:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatDateDDMMYYYY(selectedLabourer.joiningDate)}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold gap-1">
              <button
                onClick={() => setDetailTab('rates')}
                className={`py-2 px-3.5 rounded-xl transition-all ${
                  detailTab === 'rates'
                    ? 'bg-[#00b884] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('ratesTab')}
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={`py-2 px-3.5 rounded-xl transition-all ${
                  detailTab === 'history'
                    ? 'bg-[#00b884] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('workHistoryTab')}
              </button>
              <button
                onClick={() => setDetailTab('advances')}
                className={`py-2 px-3.5 rounded-xl transition-all ${
                  detailTab === 'advances'
                    ? 'bg-[#00b884] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('advancesTab')}
              </button>
              <button
                onClick={() => setDetailTab('salary')}
                className={`py-2 px-3.5 rounded-xl transition-all ${
                  detailTab === 'salary'
                    ? 'bg-[#00b884] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('salaryTab')}
              </button>
            </div>

            {/* TAB 1: RATES BY WORK TYPE */}
            {detailTab === 'rates' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Rates are configured individually for this worker. Changing a rate records an effective date, preserving historical salaries.
                </p>

                <div className="space-y-2">
                  {workTypes.map((wt) => {
                    const todayStr = new Date().toISOString().substring(0, 10);
                    const currentRate = getRateForDate(
                      employeeRates,
                      selectedLabourer.id,
                      wt.id,
                      todayStr,
                      wt.defaultRate
                    );

                    // Rate history for this work type
                    const history = employeeRates.filter(
                      (r) => r.employeeId === selectedLabourer.id && r.workTypeId === wt.id
                    );
                    history.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

                    return (
                      <div
                        key={wt.id}
                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {wt.name}
                          </div>
                          <div className="text-slate-400">
                            Pay Model: {wt.payModel === 'piece' ? 'Piece Rate (Per item)' : 'Hourly Rate'} • Default: ₹{wt.defaultRate}
                          </div>
                          {history.length > 1 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {history.length} rate revisions recorded
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">{t('currentRate')}</span>
                            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                              ₹{currentRate}
                              <span className="text-xs font-normal">
                                {wt.payModel === 'piece' ? '/pc' : '/hr'}
                              </span>
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setRateModalWorkType(wt);
                              setNewRateValue(String(currentRate));
                              setRateEffectiveFrom(new Date().toISOString().substring(0, 10));
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-semibold"
                          >
                            {t('changeRate')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: WORK HISTORY */}
            {detailTab === 'history' && (
              <div className="space-y-3">
                {workEntries.filter((w) => w.employeeId === selectedLabourer.id).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    {t('noWorkHistory')}
                  </div>
                ) : (
                  <div className="max-h-[50vh] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Work Type</th>
                          <th className="p-2.5 text-center">Units</th>
                          <th className="p-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {workEntries
                          .filter((w) => w.employeeId === selectedLabourer.id)
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 35)
                          .map((entry) => {
                            const wt = workTypes.find((t) => t.id === entry.workTypeId);
                            return (
                              <tr key={entry.id} className="text-slate-700 dark:text-slate-300">
                                <td className="p-2.5 font-medium whitespace-nowrap">
                                  {formatDateDDMMYYYY(entry.date)}
                                </td>
                                <td className="p-2.5">{wt?.name || entry.workTypeId}</td>
                                <td className="p-2.5 text-center font-semibold">
                                  {entry.hours ? `${entry.hours} hrs` : `${entry.quantity} pcs`}
                                </td>
                                <td className="p-2.5 text-slate-400">
                                  {entry.note || '-'}
                                  {entry.isEdited && (
                                    <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-bold">
                                      {t('edited')}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ADVANCES */}
            {detailTab === 'advances' && (
              <div className="space-y-3">
                {advances.filter((a) => a.employeeId === selectedLabourer.id).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No advances recorded for this worker.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {advances
                      .filter((a) => a.employeeId === selectedLabourer.id)
                      .map((adv) => (
                        <div
                          key={adv.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatINR(adv.amount)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Date: {formatDateDDMMYYYY(adv.date)} • Mode:{' '}
                              {adv.mode === 'this_month'
                                ? 'Deduct in same month'
                                : adv.mode === 'upcoming_month'
                                ? `Upcoming (${adv.targetMonth})`
                                : `${adv.installmentsCount} installments`}
                            </div>
                            {adv.note && <div className="text-slate-500 italic mt-0.5">{adv.note}</div>}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SALARY */}
            {detailTab === 'salary' && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Previous Month ({formatDateDDMMYYYY(`${payslipMonth}-01`).slice(3)})
                    </span>
                    <p className="text-slate-400 text-[11px]">Ready for payslip download & WhatsApp</p>
                  </div>
                  <button
                    onClick={() => {
                      setPayslipEmployee(selectedLabourer);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    View Payslip
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Change Rate Modal */}
      {rateModalWorkType && selectedLabourer && (
        <Modal
          isOpen={!!rateModalWorkType}
          onClose={() => setRateModalWorkType(null)}
          title={`Update Rate: ${rateModalWorkType.name}`}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveNewRate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Rate (₹ {rateModalWorkType.payModel === 'piece' ? 'per piece' : 'per hour'})
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={newRateValue}
                onChange={(e) => setNewRateValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('effectiveFrom')}
              </label>
              <input
                type="date"
                required
                value={rateEffectiveFrom}
                onChange={(e) => setRateEffectiveFrom(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The new rate applies only for work on or after this date. Past months remain stable.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRateModalWorkType(null)}
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
      )}

      {/* Add / Edit Labourer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingEmployee ? `Edit ${editingEmployee.name}` : t('addNewLabourer')}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('fullName')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('phone')} ({t('optional')})
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>
          </div>

          <AadhaarField value={aadhaar} onChange={(val) => setAadhaar(val)} required={false} />

          {!editingEmployee && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Rates for this worker (Override defaults if needed):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {workTypes.map((wt) => (
                  <div
                    key={wt.id}
                    className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {wt.name} ({wt.payModel === 'piece' ? '₹/pc' : '₹/h'})
                    </span>
                    <input
                      type="number"
                      placeholder={`Def: ${wt.defaultRate}`}
                      defaultValue={wt.defaultRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setInitialRates((prev) => ({ ...prev, [wt.id]: val }));
                        }
                      }}
                      className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-right font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('notes')} ({t('optional')})
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Skills, emergency contact, or notes..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
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
      {payslipEmployee && (
        <PayslipModal
          isOpen={!!payslipEmployee}
          onClose={() => setPayslipEmployee(null)}
          employee={payslipEmployee}
          month={payslipMonth}
          labourCalc={calculateLabourMonthlySalary(
            payslipEmployee,
            payslipMonth,
            workEntries,
            workTypes,
            employeeRates,
            advances,
            settings
          )}
          settings={settings}
        />
      )}
    </div>
  );
};
