import React, { useState } from 'react';
import {
  CalendarCheck,
  CreditCard,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileText,
  Download,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Building2,
  Phone,
  MapPin,
  Globe,
  MoreHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  formatINR,
  calculateDayWork,
  calculateLabourMonthlySalary,
  calculateStaffMonthlySalary,
  getPreviousMonth,
  formatMonthName,
  formatDateDDMMYYYY,
} from '../../utils/payrollCalculator';
import { Modal } from '../common/Modal';
import { AadhaarField } from '../common/AadhaarField';
import { CircularProgress } from '../common/CircularProgress';
import confetti from 'canvas-confetti';

interface DashboardScreenProps {
  setCurrentTab: (tab: string) => void;
  searchQuery?: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ setCurrentTab }) => {
  const {
    employees,
    workTypes,
    employeeRates,
    workEntries,
    advances,
    leaves,
    salaryPayments,
    settings,
    loadDemoData,
    addEmployee,
    addAdvance,
  } = useData();

  const { t } = useTheme();

  // Modals state
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [demoLoadedNotification, setDemoLoadedNotification] = useState(false);
  const [selectedChartPeriod, setSelectedChartPeriod] = useState<'year' | 'month'>('year');

  // Mini calendar state
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // New Employee form state
  const [empType, setEmpType] = useState<'labour' | 'fixed'>('labour');
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empAadhaar, setEmpAadhaar] = useState('');
  const [empJoiningDate, setEmpJoiningDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [empDesignation, setEmpDesignation] = useState('');
  const [empMonthlySalary, setEmpMonthlySalary] = useState('');
  const [empPaidLeaves, setEmpPaidLeaves] = useState('2');
  const [empNotes, setEmpNotes] = useState('');

  // New Advance form state
  const [advEmpId, setAdvEmpId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advDate, setAdvDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [advMode, setAdvMode] = useState<'this_month' | 'upcoming_month' | 'installments'>('this_month');
  const [advTargetMonth, setAdvTargetMonth] = useState('');
  const [advInstallments, setAdvInstallments] = useState('3');
  const [advNote, setAdvNote] = useState('');

  const todayStr = new Date().toISOString().substring(0, 10);
  const previousMonthStr = getPreviousMonth();

  const activeLabourers = employees.filter((e) => e.type === 'labour' && e.status === 'active');
  const activeStaff = employees.filter((e) => e.type === 'fixed' && e.status === 'active');
  const totalActiveWorkers = activeLabourers.length + activeStaff.length;

  // 1. Today's live labour cost & present workers count
  let todayCost = 0;
  let workersPresentTodayCount = 0;
  let totalTodayHours = 0;
  let totalTodayPieces = 0;

  for (const emp of activeLabourers) {
    const dayRes = calculateDayWork(workEntries, workTypes, employeeRates, todayStr, settings);
    if (dayRes.totalDayEarnings > 0 || dayRes.totalHourlyHours > 0 || dayRes.pieceQuantity > 0) {
      todayCost += dayRes.totalDayEarnings;
      workersPresentTodayCount += 1;
      totalTodayHours += dayRes.totalHourlyHours;
      totalTodayPieces += dayRes.pieceQuantity;
    }
  }

  // 2. Previous month's payable total & unpaid count
  let prevMonthNetPayable = 0;
  let prevMonthGrossTotal = 0;
  let prevMonthAdvanceTotal = 0;
  let unpaidSalariesCount = 0;

  for (const emp of activeLabourers) {
    const calc = calculateLabourMonthlySalary(
      emp,
      previousMonthStr,
      workEntries,
      workTypes,
      employeeRates,
      advances,
      settings
    );
    prevMonthGrossTotal += calc.grossSalary;
    prevMonthAdvanceTotal += calc.advancesDeducted;

    const payment = salaryPayments.find(
      (sp) => sp.employeeId === emp.id && sp.month === previousMonthStr
    );
    if (!payment || payment.status !== 'paid') {
      if (calc.netPayable > 0) {
        prevMonthNetPayable += calc.netPayable;
        unpaidSalariesCount += 1;
      }
    }
  }

  for (const st of activeStaff) {
    const calc = calculateStaffMonthlySalary(st, previousMonthStr, leaves, advances, settings);
    prevMonthGrossTotal += calc.monthlySalary;
    prevMonthAdvanceTotal += calc.advancesDeducted;

    const payment = salaryPayments.find(
      (sp) => sp.employeeId === st.id && sp.month === previousMonthStr
    );
    if (!payment || payment.status !== 'paid') {
      if (calc.netPayable > 0) {
        prevMonthNetPayable += calc.netPayable;
        unpaidSalariesCount += 1;
      }
    }
  }

  // 3. Total pending advances
  const totalAdvancesGiven = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalAdvancesDeducted = salaryPayments
    .filter((sp) => sp.status === 'paid')
    .reduce((sum, sp) => sum + (sp.advancesDeducted || 0), 0);
  const totalPendingAdvances = Math.max(0, totalAdvancesGiven - totalAdvancesDeducted);
  const advanceRecoveryPercent = totalAdvancesGiven > 0
    ? Math.round((totalAdvancesDeducted / totalAdvancesGiven) * 100)
    : 100;

  const handleLoadDemo = async () => {
    await loadDemoData();
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    setDemoLoadedNotification(true);
    setTimeout(() => setDemoLoadedNotification(false), 4000);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    await addEmployee({
      type: empType,
      name: empName.trim(),
      phone: empPhone.trim() || undefined,
      aadhaar: empAadhaar.trim() || undefined,
      joiningDate: empJoiningDate,
      status: 'active',
      designation: empType === 'fixed' ? empDesignation.trim() || 'Staff' : undefined,
      monthlySalary: empType === 'fixed' ? parseFloat(empMonthlySalary) || 0 : undefined,
      paidLeavesPerMonth: empType === 'fixed' ? parseInt(empPaidLeaves, 10) || 2 : undefined,
      notes: empNotes.trim() || undefined,
    });

    setEmpName('');
    setEmpPhone('');
    setEmpAadhaar('');
    setEmpDesignation('');
    setEmpMonthlySalary('');
    setEmpNotes('');
    setShowAddEmployeeModal(false);
    confetti({ particleCount: 40, spread: 50 });
  };

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(advAmount);
    if (!advEmpId || isNaN(amountNum) || amountNum <= 0) return;

    await addAdvance({
      employeeId: advEmpId,
      amount: amountNum,
      date: advDate,
      mode: advMode,
      targetMonth: advMode === 'upcoming_month' ? advTargetMonth : undefined,
      installmentsCount: advMode === 'installments' ? parseInt(advInstallments, 10) || 3 : undefined,
      note: advNote.trim() || undefined,
    });

    setAdvAmount('');
    setAdvNote('');
    setShowAddAdvanceModal(false);
    confetti({ particleCount: 40, spread: 50 });
  };

  // Mini Calendar Calculations
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  // Mock bar chart days
  const weekDays = [
    { day: 'M', hours: '8.0h', height: '65%', dark: false },
    { day: 'T', hours: '9.5h', height: '80%', dark: true },
    { day: 'W', hours: '8.0h', height: '65%', dark: false },
    { day: 'T', hours: '10h', height: '90%', dark: true },
    { day: 'F', hours: '8.5h', height: '70%', dark: false },
    { day: 'S', hours: '6.0h', height: '50%', dark: true },
    { day: 'S', hours: '0h', height: '10%', dark: false },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-[1400px] mx-auto">
      {/* Toast Notification */}
      {demoLoadedNotification && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#00b884]" />
            <span>Sample data loaded successfully for M/S GANESH AGRO (Sangrur, Punjab)!</span>
          </div>
        </div>
      )}

      {/* TOP ROW: 4 CIRCULAR PROGRESS CARDS (Exactly matching the Behance reference) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Active Workforce */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-between gap-3 hover:border-emerald-200 transition-all">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Workforce Present
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {workersPresentTodayCount} <span className="text-xs font-semibold text-slate-400">/ {totalActiveWorkers || 4}</span>
            </div>
            <span className="text-[11px] font-bold text-[#00b884] dark:text-emerald-400 mt-1 inline-block">
              {totalActiveWorkers > 0 ? Math.round((workersPresentTodayCount / totalActiveWorkers) * 100) : 0}% Active Today
            </span>
          </div>
          <CircularProgress
            value={workersPresentTodayCount}
            max={totalActiveWorkers || 4}
            size={68}
            strokeWidth={6}
            color="#00b884"
            bgColor="#e6f7f0"
            centerText={`${workersPresentTodayCount}/${totalActiveWorkers || 4}`}
            centerSubtext="Workers"
          />
        </div>

        {/* Card 2: Today's Labour Cost */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-between gap-3 hover:border-emerald-200 transition-all">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Today's Wage Cost
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatINR(todayCost)}
            </div>
            <span className="text-[11px] font-bold text-[#00b884] dark:text-emerald-400 mt-1 inline-block">
              {totalTodayHours}h Logged
            </span>
          </div>
          <CircularProgress
            value={todayCost > 0 ? 85 : 0}
            max={100}
            size={68}
            strokeWidth={6}
            color="#10b981"
            bgColor="#ecfdf5"
            centerText={`${Math.round(totalTodayHours)}h`}
            centerSubtext="Hours"
          />
        </div>

        {/* Card 3: Pending Advances */}
        <div
          onClick={() => setCurrentTab('advances')}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-between gap-3 cursor-pointer hover:border-rose-300 transition-all"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Pending Advances
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatINR(totalPendingAdvances)}
            </div>
            <span className="text-[11px] font-bold text-slate-500 mt-1 inline-block">
              {advanceRecoveryPercent}% Recovered
            </span>
          </div>
          <CircularProgress
            value={advanceRecoveryPercent}
            max={100}
            size={68}
            strokeWidth={6}
            color="#064e3b"
            bgColor="#f1f5f9"
            centerText={`${advanceRecoveryPercent}%`}
            centerSubtext="Paid"
          />
        </div>

        {/* Card 4: Unpaid Month Salaries */}
        <div
          onClick={() => setCurrentTab('salary')}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex items-center justify-between gap-3 cursor-pointer hover:border-amber-300 transition-all"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Salaries Due
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {formatINR(prevMonthNetPayable)}
            </div>
            <span className="text-[11px] font-bold text-amber-600 mt-1 inline-block">
              {unpaidSalariesCount} Pending
            </span>
          </div>
          <CircularProgress
            value={totalActiveWorkers - unpaidSalariesCount}
            max={totalActiveWorkers || 4}
            size={68}
            strokeWidth={6}
            color="#00b884"
            bgColor="#fef3c7"
            centerText={`${unpaidSalariesCount}`}
            centerSubtext="Due"
          />
        </div>
      </div>

      {/* MAIN 3-COLUMN HIGH-END GRID (Directly matching Behance Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ======================================================== */}
        {/* COLUMN 1: Company Profile & Fast Actions (lg:col-span-3) */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Main Identity Card (Matches Mia Torres Card in Behance) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none text-center">
            {/* Soft rounded-3xl Avatar */}
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-[#00b884] to-[#10b981] flex items-center justify-center text-white shadow-xl shadow-[#00b884]/25 mb-4">
              <Building2 className="w-12 h-12" />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {settings.companyName || 'M/S GANESH AGRO'}
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Agricultural Machinery & Equipment
            </p>

            {/* Badges Pill Row */}
            <div className="flex items-center justify-center gap-2 mt-3 mb-5">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                GA-148001
              </span>
              <span className="px-3 py-1 rounded-full bg-[#e6f7f0] dark:bg-emerald-950/60 text-[11px] font-bold text-[#00b884] dark:text-emerald-400 border border-[#00b884]/20">
                Active Unit
              </span>
            </div>

            {/* Attributes list */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5 text-xs text-left">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Facility Type</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Manufacturing</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Hub / City</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#00b884]" />
                  Sangrur, Punjab
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Domain</span>
                <a
                  href="https://www.ganeshagrosangrur.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#00b884] hover:underline flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" />
                  ganeshagrosangrur.com
                </a>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Phone</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#00b884]" />
                  {settings.companyPhone || '+91 98120 44555'}
                </span>
              </div>
            </div>

            {/* Quick Hero Buttons */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={() => setCurrentTab('daily-entry')}
                className="w-full py-3 px-4 rounded-2xl bg-[#00b884] hover:bg-[#059669] active:scale-95 text-white font-bold text-xs shadow-md shadow-[#00b884]/25 transition-all flex items-center justify-center gap-2"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Mark Today's Work</span>
              </button>

              <button
                onClick={() => setShowAddAdvanceModal(true)}
                className="w-full py-2.5 px-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Give Advance / Loan</span>
              </button>

              <button
                onClick={() => setShowAddEmployeeModal(true)}
                className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-[#00b884]" />
                <span>Add New Employee</span>
              </button>
            </div>
          </div>

          {/* Quick Demo Reset Chip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm text-center">
            <button
              onClick={handleLoadDemo}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00b884]" />
              <span>Reset & Reload Sample Data</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 2: Performance Charts & Work Hours (lg:col-span-6) */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 space-y-4">
          {/* Performance Overview (Wave Line Chart matching reference) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Production & Wage Overview
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    86.75%
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#e6f7f0] dark:bg-emerald-950/60 text-[#00b884] dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +2.05% increased
                  </span>
                </div>
              </div>

              <select
                value={selectedChartPeriod}
                onChange={(e) => setSelectedChartPeriod(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="year">Last Year</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Smooth SVG Wave Area Chart matching the screenshot */}
            <div className="relative pt-6 pb-2">
              <svg viewBox="0 0 500 160" className="w-full h-44 overflow-visible">
                <defs>
                  <linearGradient id="mintWave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00b884" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#00b884" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2="500" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#e2e8f0" />

                {/* Area fill */}
                <path
                  d="M 10 110 Q 55 95 100 100 T 190 90 T 280 80 T 370 70 T 450 75 L 450 140 L 10 140 Z"
                  fill="url(#mintWave)"
                />

                {/* Wave Line */}
                <path
                  d="M 10 110 Q 55 95 100 100 T 190 90 T 280 80 T 370 70 T 450 75"
                  fill="none"
                  stroke="#00b884"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Highlight active point (matching Sept 2035 80.5% in Behance) */}
                <circle cx="370" cy="70" r="5" fill="#064e3b" stroke="#ffffff" strokeWidth="2.5" />
                <rect x="340" y="32" width="60" height="24" rx="6" fill="#ffffff" stroke="#e2e8f0" />
                <text x="370" y="48" fontSize="9" fontWeight="bold" fill="#0f172a" textAnchor="middle">
                  80.5%
                </text>
              </svg>

              {/* Month X-Axis labels */}
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2 px-1">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span className="text-[#00b884] font-bold">Sept</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>
          </div>

          {/* 2 Sub-widgets row: Hours Logged & Documents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Widget A: Hours Logged (Bar chart matching reference) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  Hours Logged
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                  This Week
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {totalTodayHours > 0 ? `${totalTodayHours}h` : '34h 30m'}
                </div>
                <p className="text-[11px] text-slate-400 font-medium mb-4">
                  {totalTodayPieces > 0 ? `${totalTodayPieces} units assembled` : 'Weekly output on schedule'}
                </p>
              </div>

              {/* Bar chart with alternating mint and dark teal bars */}
              <div className="flex items-end justify-between gap-2 h-28 pt-2 border-t border-slate-100 dark:border-slate-800">
                {weekDays.map((w, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div
                      style={{ height: w.height }}
                      className={`w-full max-w-[20px] rounded-lg transition-all duration-500 ${
                        w.dark
                          ? 'bg-[#064e3b] dark:bg-emerald-600'
                          : 'bg-[#00b884] dark:bg-emerald-400'
                      }`}
                      title={`${w.day}: ${w.hours}`}
                    />
                    <span className="text-[10px] font-bold text-slate-400">{w.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget B: Recent Documents & Payslips (matching reference) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  Documents & Slips
                </span>
                <button
                  onClick={() => setCurrentTab('salary')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Document Item 1 */}
                <div
                  onClick={() => setCurrentTab('salary')}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#00b884] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        Payroll_Summary_{previousMonthStr}.pdf
                      </div>
                      <div className="text-[10px] text-slate-400">PDF • 1.24 MB</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>

                {/* Document Item 2 */}
                <div
                  onClick={() => setCurrentTab('advances')}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-[#00b884] flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        Advances_Ledger_Sangrur.pdf
                      </div>
                      <div className="text-[10px] text-slate-400">PDF • 895 KB</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              </div>

              <button
                onClick={() => setCurrentTab('salary')}
                className="mt-3 w-full py-2 rounded-xl text-center text-xs font-bold text-[#00b884] hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
              >
                View All Salary Slips →
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLUMN 3: Calendar & Payroll Summary (lg:col-span-3)     */}
        {/* ======================================================== */}
        <div className="lg:col-span-3 space-y-4">
          {/* Interactive Mini Calendar (Matching June 2035 in reference) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {calendarDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 mb-2">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Calendar days grid with Behance style color squares */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty_${i}`} className="p-1 text-slate-300 dark:text-slate-700"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected = dayNum === 2; // sample active day matching image
                const isPresent = [4, 6, 8, 11, 13, 14, 15, 18, 20, 22].includes(dayNum);
                const isLeave = [26, 27].includes(dayNum);

                let cellStyle = 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
                if (isSelected) {
                  cellStyle = 'bg-[#064e3b] text-white shadow-sm';
                } else if (isPresent) {
                  cellStyle = 'bg-[#00b884] text-white';
                } else if (isLeave) {
                  cellStyle = 'bg-[#e6f7f0] dark:bg-emerald-950 text-[#00b884]';
                }

                return (
                  <div
                    key={dayNum}
                    className={`h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all ${cellStyle}`}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>

            {/* Attendance Legend (matching reference) */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
              <div>
                <span className="text-slate-400 block text-[9px]">Present</span>
                <span className="text-[#064e3b] dark:text-emerald-400 font-extrabold">13</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Late / Half</span>
                <span className="text-[#00b884] font-extrabold">5</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">On Leave</span>
                <span className="text-emerald-700 font-extrabold">2</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Absent</span>
                <span className="text-rose-500 font-extrabold">1</span>
              </div>
            </div>
          </div>

          {/* Payroll Summary Card (Directly matching Behance reference) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm shadow-slate-200/40 dark:shadow-none">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                Payroll Summary
              </span>
              <button
                onClick={() => setCurrentTab('salary')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Base / Regular Wages</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatINR(prevMonthGrossTotal > 0 ? prevMonthGrossTotal : 45000)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Overtime Allowances</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹3,200.00
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Piece Assembly Work</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹8,250.00
                </span>
              </div>

              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                <span>Advance Deductions</span>
                <span className="font-bold">
                  -{formatINR(prevMonthAdvanceTotal > 0 ? prevMonthAdvanceTotal : 4500)}
                </span>
              </div>

              {/* Total Row */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Net Cash Payable
                  </span>
                  <span className="text-xl font-black text-[#00b884] dark:text-emerald-400">
                    {formatINR(prevMonthNetPayable > 0 ? prevMonthNetPayable : 51950)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setCurrentTab('salary')}
                className="mt-3 w-full py-3 rounded-2xl bg-[#00b884] hover:bg-[#059669] active:scale-95 text-white font-bold text-xs shadow-md shadow-[#00b884]/25 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Disburse Salaries</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODALS: ADD EMPLOYEE & ADD ADVANCE                       */}
      {/* ======================================================== */}

      {/* Add Advance Modal */}
      <Modal
        isOpen={showAddAdvanceModal}
        onClose={() => setShowAddAdvanceModal(false)}
        title="Give Advance / Loan"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAdvance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Worker <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={advEmpId}
              onChange={(e) => setAdvEmpId(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none"
            >
              <option value="">-- Choose Employee --</option>
              <optgroup label="Labourers">
                {activeLabourers.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.phone || 'Labour'})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Fixed Staff">
                {activeStaff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.designation || 'Staff'})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={advAmount}
                onChange={(e) => setAdvAmount(e.target.value)}
                placeholder="2000"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={advDate}
                onChange={(e) => setAdvDate(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              How to deduct?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name="dashboardAdvMode"
                  checked={advMode === 'this_month'}
                  onChange={() => setAdvMode('this_month')}
                  className="text-[#00b884]"
                />
                <span className="text-xs font-bold">Deduct in this month's salary</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="radio"
                  name="dashboardAdvMode"
                  checked={advMode === 'installments'}
                  onChange={() => setAdvMode('installments')}
                  className="text-[#00b884]"
                />
                <span className="text-xs font-bold">Split into monthly installments</span>
              </label>
            </div>
          </div>

          {advMode === 'installments' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Number of Months:
              </label>
              <select
                value={advInstallments}
                onChange={(e) => setAdvInstallments(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              >
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                <option value="4">4 Months</option>
                <option value="6">6 Months</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Note / Reason
            </label>
            <input
              type="text"
              value={advNote}
              onChange={(e) => setAdvNote(e.target.value)}
              placeholder="e.g. Festival advance, Medical..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddAdvanceModal(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#00b884] hover:bg-[#059669] text-white shadow-sm"
            >
              Save Advance
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        title="Add New Employee"
        maxWidth="md"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEmpType('labour')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                empType === 'labour'
                  ? 'border-[#00b884] bg-emerald-50 dark:bg-emerald-950/60 text-[#00b884] dark:text-emerald-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600'
              }`}
            >
              Labour (Daily / Piece Rate)
            </button>
            <button
              type="button"
              onClick={() => setEmpType('fixed')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                empType === 'fixed'
                  ? 'border-[#00b884] bg-emerald-50 dark:bg-emerald-950/60 text-[#00b884] dark:text-emerald-300 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600'
              }`}
            >
              Fixed Staff (Monthly Salary)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Joining Date
              </label>
              <input
                type="date"
                required
                value={empJoiningDate}
                onChange={(e) => setEmpJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
              />
            </div>
          </div>

          <AadhaarField value={empAadhaar} onChange={(val) => setEmpAadhaar(val)} required={false} />

          {empType === 'fixed' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Salary (₹)
                </label>
                <input
                  type="number"
                  required
                  value={empMonthlySalary}
                  onChange={(e) => setEmpMonthlySalary(e.target.value)}
                  placeholder="30000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={empDesignation}
                  onChange={(e) => setEmpDesignation(e.target.value)}
                  placeholder="Supervisor"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddEmployeeModal(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#00b884] hover:bg-[#059669] text-white shadow-sm"
            >
              Save Employee
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
