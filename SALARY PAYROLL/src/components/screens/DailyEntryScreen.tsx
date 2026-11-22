import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Package,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Save,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Minus,
  Check,
  Briefcase,
  IndianRupee,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  formatINR,
  formatDateDDMMYYYY,
  calculateDayWork,
  getRateForDate,
  maskAadhaar,
} from '../../utils/payrollCalculator';
import { WorkEntry, WorkType } from '../../types';
import confetti from 'canvas-confetti';

interface LocalEntryRow {
  id?: string;
  workTypeId: string;
  hours: number | string;
  quantity: number | string;
  note: string;
  isEdited?: boolean;
}

interface DailyEntryScreenProps {
  searchQuery?: string;
}

export const DailyEntryScreen: React.FC<DailyEntryScreenProps> = ({ searchQuery = '' }) => {
  const {
    employees,
    workTypes,
    employeeRates,
    workEntries,
    settings,
    saveDailyWorkEntries,
    deleteWorkEntry,
  } = useData();

  const { t } = useTheme();

  // Selected date (default today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });

  const [dateEntriesMap, setDateEntriesMap] = useState<Record<string, LocalEntryRow[]>>({});
  const [notification, setNotification] = useState<string | null>(null);

  const activeLabourers = employees.filter((e) => e.type === 'labour' && e.status === 'active');
  const activeWorkTypes = workTypes.filter((wt) => wt.active);

  // Filter labourers in real time by the search query (name, phone, or masked Aadhaar)
  const displayedLabourers = activeLabourers.filter((emp) => {
    if (!searchQuery?.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      emp.name.toLowerCase().includes(q) ||
      (emp.phone && emp.phone.includes(q)) ||
      (emp.aadhaar && emp.aadhaar.includes(q))
    );
  });

  // Load existing entries for selectedDate into local state
  useEffect(() => {
    const map: Record<string, LocalEntryRow[]> = {};

    activeLabourers.forEach((emp) => {
      const existing = workEntries.filter(
        (we) => we.employeeId === emp.id && we.date === selectedDate
      );

      if (existing.length > 0) {
        map[emp.id] = existing.map((e) => ({
          id: e.id,
          workTypeId: e.workTypeId,
          hours: e.hours !== undefined ? e.hours : '',
          quantity: e.quantity !== undefined ? e.quantity : '',
          note: e.note || '',
          isEdited: e.isEdited,
        }));
      } else {
        // Default empty entry for worker with default work type
        const defaultWt = activeWorkTypes[0]?.id || 'wt_simple_labour';
        map[emp.id] = [
          {
            workTypeId: defaultWt,
            hours: '',
            quantity: '',
            note: '',
          },
        ];
      }
    });

    setDateEntriesMap(map);
  }, [selectedDate, workEntries, employees, workTypes]);

  // Handle row changes
  const updateEntryRow = (
    employeeId: string,
    rowIndex: number,
    field: keyof LocalEntryRow,
    value: any
  ) => {
    setDateEntriesMap((prev) => {
      const currentList = prev[employeeId] ? [...prev[employeeId]] : [];
      if (currentList[rowIndex]) {
        currentList[rowIndex] = { ...currentList[rowIndex], [field]: value };
      }
      return { ...prev, [employeeId]: currentList };
    });
  };

  // 1-Tap Attendance selection (Full Day 8h, Half Day 4h, Absent 0h)
  const setQuickAttendance = (employeeId: string, rowIndex: number, hours: number) => {
    setDateEntriesMap((prev) => {
      const currentList = prev[employeeId] ? [...prev[employeeId]] : [];
      const row = currentList[rowIndex] || {
        workTypeId: activeWorkTypes[0]?.id || 'wt_simple_labour',
        hours: '',
        quantity: '',
        note: '',
      };

      currentList[rowIndex] = {
        ...row,
        hours: hours > 0 ? hours : '',
        quantity: '',
        note: hours === 0 ? 'Absent' : row.note === 'Absent' ? '' : row.note,
      };

      return { ...prev, [employeeId]: currentList };
    });
  };

  // Adjust piece quantity with stepper (+ or -)
  const adjustPieceQuantity = (employeeId: string, rowIndex: number, delta: number) => {
    setDateEntriesMap((prev) => {
      const currentList = prev[employeeId] ? [...prev[employeeId]] : [];
      const row = currentList[rowIndex];
      if (!row) return prev;

      const currentVal = typeof row.quantity === 'number' ? row.quantity : parseFloat(row.quantity as string) || 0;
      const newVal = Math.max(0, currentVal + delta);

      currentList[rowIndex] = {
        ...row,
        quantity: newVal > 0 ? newVal : '',
      };
      return { ...prev, [employeeId]: currentList };
    });
  };

  // Add a specific or next available work type row for worker
  const addWorkTypeForWorker = (employeeId: string, specificWorkTypeId?: string) => {
    setDateEntriesMap((prev) => {
      const currentList = prev[employeeId] ? [...prev[employeeId]] : [];
      const usedIds = new Set(currentList.map((r) => r.workTypeId));
      const targetId =
        specificWorkTypeId ||
        activeWorkTypes.find((wt) => !usedIds.has(wt.id))?.id ||
        activeWorkTypes[0]?.id ||
        '';

      return {
        ...prev,
        [employeeId]: [
          ...currentList,
          {
            workTypeId: targetId,
            hours: '',
            quantity: '',
            note: '',
          },
        ],
      };
    });
  };

  // Remove a row
  const removeRowForWorker = (employeeId: string, rowIndex: number) => {
    setDateEntriesMap((prev) => {
      const currentList = prev[employeeId] ? [...prev[employeeId]] : [];
      const rowToRemove = currentList[rowIndex];
      if (rowToRemove?.id) {
        deleteWorkEntry(rowToRemove.id);
      }
      currentList.splice(rowIndex, 1);
      if (currentList.length === 0) {
        currentList.push({
          workTypeId: activeWorkTypes[0]?.id || '',
          hours: '',
          quantity: '',
          note: '',
        });
      }
      return { ...prev, [employeeId]: currentList };
    });
  };

  // Quick Action: Mark All Present 8 hrs
  const handleMarkAll8Hours = () => {
    const hourlyType = activeWorkTypes.find((wt) => wt.payModel === 'hourly') || activeWorkTypes[0];
    const newMap = { ...dateEntriesMap };

    activeLabourers.forEach((emp) => {
      newMap[emp.id] = [
        {
          id: newMap[emp.id]?.[0]?.id,
          workTypeId: hourlyType?.id || 'wt_simple_labour',
          hours: 8,
          quantity: '',
          note: '',
        },
      ];
    });

    setDateEntriesMap(newMap);
    showToast('✓ All active labourers marked 8 Hours Present');
  };

  // Quick Action: Copy Yesterday's Entries
  const handleCopyYesterday = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const prevDateObj = new Date(y, m - 1, d - 1);
    const yesterdayStr = prevDateObj.toISOString().substring(0, 10);

    const yesterdayEntries = workEntries.filter((we) => we.date === yesterdayStr);

    if (yesterdayEntries.length === 0) {
      showToast(`No entries found for yesterday (${formatDateDDMMYYYY(yesterdayStr)})`);
      return;
    }

    const newMap = { ...dateEntriesMap };

    activeLabourers.forEach((emp) => {
      const empYest = yesterdayEntries.filter((we) => we.employeeId === emp.id);
      if (empYest.length > 0) {
        newMap[emp.id] = empYest.map((e) => ({
          workTypeId: e.workTypeId,
          hours: e.hours !== undefined ? e.hours : '',
          quantity: e.quantity !== undefined ? e.quantity : '',
          note: e.note || '',
        }));
      }
    });

    setDateEntriesMap(newMap);
    showToast("✓ Copied yesterday's work entries");
  };

  // Calculate live earnings for a worker based on dateEntriesMap
  const getLiveDayCalculation = (employeeId: string) => {
    const rows = dateEntriesMap[employeeId] || [];
    const simulatedEntries: WorkEntry[] = rows.map((r, i) => ({
      id: r.id || `sim_${i}`,
      employeeId,
      date: selectedDate,
      workTypeId: r.workTypeId,
      hours: typeof r.hours === 'number' ? r.hours : parseFloat(r.hours as string) || 0,
      quantity: typeof r.quantity === 'number' ? r.quantity : parseFloat(r.quantity as string) || 0,
      note: r.note,
      createdAt: selectedDate,
    }));

    return calculateDayWork(simulatedEntries, workTypes, employeeRates, selectedDate, settings);
  };

  // Save all entries
  const handleSaveAll = async () => {
    const entriesToSave: (Omit<WorkEntry, 'id' | 'createdAt'> & { id?: string })[] = [];

    for (const emp of activeLabourers) {
      const rows = dateEntriesMap[emp.id] || [];
      for (const row of rows) {
        const hrs = typeof row.hours === 'number' ? row.hours : parseFloat(row.hours as string);
        const qty = typeof row.quantity === 'number' ? row.quantity : parseFloat(row.quantity as string);

        const hasHours = !isNaN(hrs) && hrs > 0;
        const hasQty = !isNaN(qty) && qty > 0;
        const isAbsentExplicit = row.note === 'Absent';

        if (hasHours || hasQty || isAbsentExplicit) {
          entriesToSave.push({
            id: row.id,
            employeeId: emp.id,
            date: selectedDate,
            workTypeId: row.workTypeId,
            hours: hasHours ? hrs : undefined,
            quantity: hasQty ? qty : undefined,
            note: row.note?.trim() || undefined,
          });
        }
      }
    }

    if (entriesToSave.length === 0) {
      showToast('Please enter hours or pieces for at least one worker.');
      return;
    }

    await saveDailyWorkEntries(entriesToSave);
    confetti({ particleCount: 50, spread: 60 });
    showToast("✓ Today's work saved successfully!");
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Compute total day statistics
  let totalDayPayout = 0;
  let totalPresentCount = 0;
  let totalRegularHoursAll = 0;
  let totalOvertimeHoursAll = 0;
  let totalPiecesAll = 0;

  activeLabourers.forEach((emp) => {
    const res = getLiveDayCalculation(emp.id);
    totalDayPayout += res.totalDayEarnings;
    if (res.totalDayEarnings > 0 || res.totalHourlyHours > 0 || res.pieceQuantity > 0) {
      totalPresentCount += 1;
    }
    totalRegularHoursAll += res.regularHours;
    totalOvertimeHoursAll += res.overtimeHours;
    totalPiecesAll += res.pieceQuantity;
  });

  return (
    <div className="space-y-6 pb-36 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {notification && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 p-4 bg-[#00b884] text-white rounded-2xl shadow-xl shadow-[#00b884]/20 flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-top">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Date Navigation & Easy Control Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
        {/* Date Row with Big Arrow Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <button
              onClick={() => {
                const [y, m, d] = selectedDate.split('-').map(Number);
                const prev = new Date(y, m - 1, d - 1);
                setSelectedDate(prev.toISOString().substring(0, 10));
              }}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev Day</span>
            </button>

            <div className="text-center flex items-center gap-3 relative px-2">
              <div className="w-10 h-10 rounded-2xl bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884] flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {formatDateDDMMYYYY(selectedDate)}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {selectedDate === new Date().toISOString().substring(0, 10)
                    ? 'Today • Workshop Shift'
                    : new Date(selectedDate).toLocaleDateString('en-IN', {
                        weekday: 'short',
                      })}
                </div>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>

            <button
              onClick={() => {
                const [y, m, d] = selectedDate.split('-').map(Number);
                const next = new Date(y, m - 1, d + 1);
                setSelectedDate(next.toISOString().substring(0, 10));
              }}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95"
              title="Next Day"
            >
              <span>Next Day</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Header Save Action */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleSaveAll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#00b884]/25 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Today's Work</span>
            </button>
          </div>
        </div>

        {/* 1-Tap Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleMarkAll8Hours}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold bg-[#00b884] hover:bg-[#00a375] active:scale-95 text-white shadow-md shadow-[#00b884]/25 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Mark All 8h Present</span>
          </button>

          <button
            type="button"
            onClick={handleCopyYesterday}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold bg-[#e6f7f0] dark:bg-[#00b884]/15 text-[#064e3b] dark:text-[#00b884] hover:bg-[#d8f3e5] active:scale-95 transition-all"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Yesterday</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().substring(0, 10))}
            className="col-span-2 sm:col-span-1 py-2.5 px-4 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
          >
            Jump to Today
          </button>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm shadow-slate-200/40 dark:shadow-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Workers Present</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{totalPresentCount}</span>
            <span className="text-xs text-slate-400 font-semibold">/ {activeLabourers.length} active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm shadow-slate-200/40 dark:shadow-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Regular Hours</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{totalRegularHoursAll}h</span>
            <span className="text-xs text-slate-400 font-semibold">standard shift</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm shadow-slate-200/40 dark:shadow-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overtime Hours</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-amber-500">{totalOvertimeHoursAll}h</span>
            <span className="text-xs text-amber-500 font-semibold">(@ 1.5x OT)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm shadow-slate-200/40 dark:shadow-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Day Wages Total</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-[#00b884]">{formatINR(totalDayPayout)}</span>
          </div>
        </div>
      </div>

      {/* Search status indicator if searching */}
      {searchQuery?.trim() && (
        <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-500">
          <span>
            Filtering workers matching: <strong className="text-[#00b884]">"{searchQuery}"</strong> ({displayedLabourers.length} of {activeLabourers.length})
          </span>
        </div>
      )}

      {/* Labourers Cards List */}
      <div className="space-y-4">
        {displayedLabourers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm shadow-slate-200/30">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No workers match "{searchQuery}"
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Check spelling or clear the top search bar to view all active labourers.
            </p>
          </div>
        ) : (
          displayedLabourers.map((emp) => {
          const rows = dateEntriesMap[emp.id] || [];
          const liveCalc = getLiveDayCalculation(emp.id);
          const usedWorkTypeIds = new Set(rows.map((r) => r.workTypeId));
          const unusedWorkTypes = activeWorkTypes.filter((wt) => !usedWorkTypeIds.has(wt.id));

          return (
            <div
              key={emp.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/30 dark:shadow-none transition-all ${
                liveCalc.totalDayEarnings > 0
                  ? 'border-[#00b884]/40 dark:border-[#00b884]/30'
                  : 'border-slate-100 dark:border-slate-800'
              }`}
            >
              {/* Worker Name, Phone & Today's Earnings Badge */}
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                      liveCalc.totalDayEarnings > 0
                        ? 'bg-[#00b884] text-white shadow-[#00b884]/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {emp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                      {emp.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {emp.phone || maskAadhaar(emp.aadhaar) || 'Agricultural Worker'} • {rows.length} work task{rows.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Big Live Earnings Display */}
                <div className="text-right bg-[#f8fafc] dark:bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Earned Today</span>
                  <span className="text-base sm:text-lg font-black text-[#00b884]">
                    {formatINR(liveCalc.totalDayEarnings)}
                  </span>
                </div>
              </div>

              {/* LIST OF WORK TASKS UNDER THIS LABOURER */}
              <div className="space-y-3.5">
                {rows.map((row, rIdx) => {
                  const currentWt = activeWorkTypes.find((wt) => wt.id === row.workTypeId) || activeWorkTypes[0];
                  if (!currentWt) return null;

                  const effectiveRate = getRateForDate(
                    employeeRates,
                    emp.id,
                    currentWt.id,
                    selectedDate,
                    currentWt.defaultRate
                  );

                  const hrsVal = typeof row.hours === 'number' ? row.hours : parseFloat(row.hours as string) || 0;
                  const qtyVal = typeof row.quantity === 'number' ? row.quantity : parseFloat(row.quantity as string) || 0;

                  const isHourly = currentWt.payModel === 'hourly';
                  const isFullDay = isHourly && hrsVal === 8;
                  const isHalfDay = isHourly && hrsVal === 4;
                  const isAbsent = isHourly && (row.note === 'Absent' || (hrsVal === 0 && qtyVal === 0 && row.hours !== ''));

                  // Calculate line earnings for this row
                  const lineEarnings = isHourly
                    ? Math.min(hrsVal, 8) * effectiveRate + Math.max(0, hrsVal - 8) * effectiveRate * (currentWt.overtimeMultiplier || 1.5)
                    : qtyVal * effectiveRate;

                  return (
                    <div
                      key={rIdx}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-[#f8fafc] dark:bg-slate-800/50 space-y-3"
                    >
                      {/* Work Type Header & Selector */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Work Type #{rIdx + 1}:
                          </span>
                          <div className="relative inline-block flex-1 sm:max-w-xs">
                            <select
                              value={row.workTypeId}
                              onChange={(e) => updateEntryRow(emp.id, rIdx, 'workTypeId', e.target.value)}
                              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold py-1.5 pl-3 pr-8 rounded-xl outline-none focus:border-[#00b884] shadow-sm"
                            >
                              {activeWorkTypes.map((wt) => {
                                const rateForOption = getRateForDate(
                                  employeeRates,
                                  emp.id,
                                  wt.id,
                                  selectedDate,
                                  wt.defaultRate
                                );
                                return (
                                  <option key={wt.id} value={wt.id}>
                                    {wt.name} ({wt.payModel === 'piece' ? 'Piece' : 'Hourly'} @ ₹{rateForOption}/{wt.payModel === 'piece' ? 'pc' : 'hr'})
                                  </option>
                                );
                              })}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        {/* Line Earnings Subtotal & Remove Button */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Task Wages:{' '}
                            <span className="text-sm font-black text-[#00b884]">
                              {formatINR(lineEarnings)}
                            </span>
                          </span>

                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRowForWorker(emp.id, rIdx)}
                              className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                              title="Remove this task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* CONTROLS BASED ON PAY MODEL */}
                      {isHourly ? (
                        /* HOURLY CONTROLS */
                        <div className="space-y-2.5 pt-1">
                          <div className="grid grid-cols-3 gap-2">
                            {/* 8h Full Day */}
                            <button
                              type="button"
                              onClick={() => setQuickAttendance(emp.id, rIdx, 8)}
                              className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
                                isFullDay
                                  ? 'bg-[#00b884] text-white border-[#00b884] shadow-md shadow-[#00b884]/25'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {isFullDay && <Check className="w-3.5 h-3.5" />}
                              <span>8h Full Day</span>
                            </button>

                            {/* 4h Half Day */}
                            <button
                              type="button"
                              onClick={() => setQuickAttendance(emp.id, rIdx, 4)}
                              className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
                                isHalfDay
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {isHalfDay && <Check className="w-3.5 h-3.5" />}
                              <span>4h Half Day</span>
                            </button>

                            {/* Absent */}
                            <button
                              type="button"
                              onClick={() => setQuickAttendance(emp.id, rIdx, 0)}
                              className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${
                                isAbsent
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/25'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {isAbsent && <Check className="w-3.5 h-3.5" />}
                              <span>Absent</span>
                            </button>
                          </div>

                          {/* Overtime Chips & Custom Hours */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs text-slate-400 font-semibold mr-1">Overtime:</span>
                            {[9, 10, 11, 12].map((otH) => (
                              <button
                                key={otH}
                                type="button"
                                onClick={() => setQuickAttendance(emp.id, rIdx, otH)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                                  hrsVal === otH
                                    ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {otH}h (+{otH - 8} OT)
                              </button>
                            ))}

                            {/* Custom hour input with ample space and no clipping */}
                            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={row.hours !== undefined ? row.hours : ''}
                                onChange={(e) => updateEntryRow(emp.id, rIdx, 'hours', e.target.value)}
                                placeholder="Custom"
                                className="w-20 px-2.5 py-1 text-xs font-bold text-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:border-[#00b884] text-slate-800 dark:text-slate-100"
                              />
                              <span className="text-xs text-slate-400 font-medium">hrs</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* PIECE-RATE CONTROLS */
                        <div className="space-y-2.5 pt-1">
                          {/* Stepper with - and + */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => adjustPieceQuantity(emp.id, rIdx, -5)}
                              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold active:scale-90 transition-all hover:bg-slate-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={row.quantity}
                              onChange={(e) => updateEntryRow(emp.id, rIdx, 'quantity', e.target.value)}
                              placeholder="0 units / pieces"
                              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-center outline-none focus:border-[#00b884]"
                            />

                            <button
                              type="button"
                              onClick={() => adjustPieceQuantity(emp.id, rIdx, 5)}
                              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold active:scale-90 transition-all hover:bg-slate-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Quick preset chips */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Add:</span>
                            {[10, 20, 30, 50, 100].map((qty) => (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => updateEntryRow(emp.id, rIdx, 'quantity', qty)}
                                className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-[#064e3b] dark:text-[#00b884] border border-[#00b884]/30 hover:bg-[#e6f7f0]"
                              >
                                +{qty} pcs
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ACTION BAR: ADD ANY WORK TYPE UNDER THIS LABOURER */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    + Add Work Under {emp.name.split(' ')[0]}:
                  </span>

                  {/* Render buttons for all active work types not yet added */}
                  {unusedWorkTypes.map((wt) => {
                    const effRate = getRateForDate(employeeRates, emp.id, wt.id, selectedDate, wt.defaultRate);
                    return (
                      <button
                        key={wt.id}
                        type="button"
                        onClick={() => addWorkTypeForWorker(emp.id, wt.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#e6f7f0] hover:bg-[#d8f3e5] dark:bg-[#00b884]/15 dark:hover:bg-[#00b884]/25 text-[#064e3b] dark:text-[#00b884] border border-[#00b884]/30 transition-all active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{wt.name} (₹{effRate}/{wt.payModel === 'piece' ? 'pc' : 'hr'})</span>
                      </button>
                    );
                  })}

                  {/* If all work types are already added, allow adding an extra row */}
                  {unusedWorkTypes.length === 0 && (
                    <button
                      type="button"
                      onClick={() => addWorkTypeForWorker(emp.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00b884] text-white hover:bg-[#00a375] transition-all active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Extra Work Entry</span>
                    </button>
                  )}
                </div>

                {rows[0]?.isEdited && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Edited Record
                  </span>
                )}
              </div>
            </div>
          );
        }))}
      </div>

      {/* DOCKED BOTTOM BAR: CLEANLY ALIGNED, NO OVERLAPPING SIDEBAR */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-6 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Today's Wages ({formatDateDDMMYYYY(selectedDate)})
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#00b884]">
                {formatINR(totalDayPayout)}
              </span>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                • {totalPresentCount} of {activeLabourers.length} active workers present
              </span>
            </div>
          </div>

          <button
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] active:scale-95 text-white font-bold text-sm sm:text-base shadow-xl shadow-[#00b884]/25 transition-all"
          >
            <Save className="w-5 h-5" />
            <span>Save Today's Work</span>
          </button>
        </div>
      </div>
    </div>
  );
};
