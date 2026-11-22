import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  Table,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  formatINR,
  getPreviousMonth,
  formatMonthName,
  maskAadhaar,
  calculateLabourMonthlySalary,
  calculateStaffMonthlySalary,
  formatDateDDMMYYYY,
} from '../../utils/payrollCalculator';
import {
  Employee,
  LabourMonthlyCalculation,
  StaffMonthlyCalculation,
  PaymentMode,
} from '../../types';
import { Modal } from '../common/Modal';
import { PayslipModal } from '../common/PayslipModal';
import { DayWiseCalendarModal } from '../common/DayWiseCalendarModal';
import confetti from 'canvas-confetti';

interface MonthlySalaryScreenProps {
  searchQuery?: string;
}

export const MonthlySalaryScreen: React.FC<MonthlySalaryScreenProps> = ({ searchQuery = '' }) => {
  const {
    employees,
    workTypes,
    employeeRates,
    workEntries,
    advances,
    leaves,
    salaryPayments,
    settings,
    recordSalaryPayment,
  } = useData();

  const { t } = useTheme();

  // Prompt: Default view shows the PREVIOUS month's salary (since salary is paid after month end)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getPreviousMonth());
  const [activeTab, setActiveTab] = useState<'labour' | 'staff'>('labour');

  // Expanded details per worker card
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Payment Recording Modal
  const [paymentModalEmployee, setPaymentModalEmployee] = useState<Employee | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentGross, setPaymentGross] = useState<number>(0);
  const [paymentAdvanceDeducted, setPaymentAdvanceDeducted] = useState<number>(0);
  const [paymentCarryForward, setPaymentCarryForward] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Payslip Modal
  const [payslipEmployee, setPayslipEmployee] = useState<Employee | null>(null);
  const [selectedLabourCalc, setSelectedLabourCalc] = useState<LabourMonthlyCalculation | undefined>();
  const [selectedStaffCalc, setSelectedStaffCalc] = useState<StaffMonthlyCalculation | undefined>();

  // Day-wise Calendar Verification Modal
  const [dayWiseModalEmployee, setDayWiseModalEmployee] = useState<Employee | null>(null);
  const [dayWiseLabourCalc, setDayWiseLabourCalc] = useState<LabourMonthlyCalculation | undefined>();

  const activeLabourers = employees.filter((e) => e.type === 'labour');
  const activeStaff = employees.filter((e) => e.type === 'fixed');

  const monthName = formatMonthName(selectedMonth, 'en');

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Labour Calculations
  const labourCalculations = activeLabourers.map((emp) => {
    const calc = calculateLabourMonthlySalary(
      emp,
      selectedMonth,
      workEntries,
      workTypes,
      employeeRates,
      advances,
      settings
    );
    const payment = salaryPayments.find(
      (sp) => sp.employeeId === emp.id && sp.month === selectedMonth
    );
    return { employee: emp, calc, payment };
  });

  // Staff Calculations
  const staffCalculations = activeStaff.map((emp) => {
    const calc = calculateStaffMonthlySalary(emp, selectedMonth, leaves, advances, settings);
    const payment = salaryPayments.find(
      (sp) => sp.employeeId === emp.id && sp.month === selectedMonth
    );
    return { employee: emp, calc, payment };
  });

  // Aggregates for Labour
  const labourTotalGross = labourCalculations.reduce((sum, item) => sum + item.calc.grossSalary, 0);
  const labourTotalAdvanceDeducted = labourCalculations.reduce(
    (sum, item) => sum + item.calc.advancesDeducted,
    0
  );
  const labourTotalNet = labourCalculations.reduce((sum, item) => sum + item.calc.netPayable, 0);
  const labourPaidCount = labourCalculations.filter((i) => i.payment?.status === 'paid').length;

  // Aggregates for Staff
  const staffTotalGross = staffCalculations.reduce(
    (sum, item) => sum + item.calc.grossSalaryAfterLeaves,
    0
  );
  const staffTotalAdvanceDeducted = staffCalculations.reduce(
    (sum, item) => sum + item.calc.advancesDeducted,
    0
  );
  const staffTotalNet = staffCalculations.reduce((sum, item) => sum + item.calc.netPayable, 0);
  const staffPaidCount = staffCalculations.filter((i) => i.payment?.status === 'paid').length;

  // Real-time search query filtering
  const q = searchQuery.toLowerCase().trim();
  const displayedLabourCalculations = labourCalculations.filter(({ employee }) => {
    if (!q) return true;
    return (
      employee.name.toLowerCase().includes(q) ||
      (employee.phone && employee.phone.includes(q)) ||
      (employee.aadhaar && employee.aadhaar.includes(q))
    );
  });

  const displayedStaffCalculations = staffCalculations.filter(({ employee }) => {
    if (!q) return true;
    return (
      employee.name.toLowerCase().includes(q) ||
      (employee.designation && employee.designation.toLowerCase().includes(q)) ||
      (employee.phone && employee.phone.includes(q)) ||
      (employee.aadhaar && employee.aadhaar.includes(q))
    );
  });

  // Open Payment Modal
  const handleOpenPaymentModal = (
    employee: Employee,
    netPayable: number,
    grossSalary: number,
    advanceDeducted: number,
    carryForward: number
  ) => {
    setPaymentModalEmployee(employee);
    setPaymentAmount(netPayable);
    setPaymentGross(grossSalary);
    setPaymentAdvanceDeducted(advanceDeducted);
    setPaymentCarryForward(carryForward);
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setPaymentMode('cash');
    setPaymentNotes('');
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalEmployee) return;

    await recordSalaryPayment({
      employeeId: paymentModalEmployee.id,
      month: selectedMonth,
      status: 'paid',
      grossAmount: paymentGross,
      advancesDeducted: paymentAdvanceDeducted,
      netAmount: paymentAmount,
      carryForwardAdvance: paymentCarryForward,
      paidDate: paymentDate,
      paymentMode,
      notes: paymentNotes.trim() || undefined,
    });

    confetti({ particleCount: 60, spread: 70 });
    setPaymentModalEmployee(null);
  };

  // Open Payslip
  const handleOpenPayslip = (
    employee: Employee,
    labourCalc?: LabourMonthlyCalculation,
    staffCalc?: StaffMonthlyCalculation
  ) => {
    setPayslipEmployee(employee);
    setSelectedLabourCalc(labourCalc);
    setSelectedStaffCalc(staffCalc);
  };

  // Open Day-wise Attendance Calendar
  const handleOpenDayWise = (employee: Employee, labourCalc: LabourMonthlyCalculation) => {
    setDayWiseModalEmployee(employee);
    setDayWiseLabourCalc(labourCalc);
  };

  // WhatsApp Share helper
  const handleShareWhatsApp = (
    employee: Employee,
    gross: number,
    advancesCut: number,
    net: number,
    details?: string
  ) => {
    let msg = `*SALARY STATEMENT — ${monthName.toUpperCase()}*\n`;
    msg += `*${settings.companyName || 'M/S GANESH AGRO'}*\n`;
    msg += `Worker: *${employee.name}*\n`;
    if (employee.phone) msg += `Mobile: ${employee.phone}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Gross Earnings: ${formatINR(gross)}\n`;
    if (advancesCut > 0) {
      msg += `Advance Deductions: -${formatINR(advancesCut)}\n`;
    }
    if (details) {
      msg += `${details}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*FINAL NET CASH TO PAY:* *${formatINR(net)}*\n\n`;
    msg += `_M/S GANESH AGRO, Sangrur • www.ganeshagrosangrur.com_`;

    const cleanPhone = (employee.phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  };

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'labour') {
      const rows = labourCalculations.map((item, idx) => ({
        'S.No': idx + 1,
        'Employee Name': item.employee.name,
        'Aadhaar': maskAadhaar(item.employee.aadhaar),
        'Days Worked': item.calc.totalDaysWorked,
        'Regular Hours': item.calc.totalRegularHours,
        'Overtime Hours': item.calc.totalOvertimeHours,
        'Pieces Done': item.calc.totalPieceQuantity,
        'Gross Earnings (₹)': item.calc.grossSalary,
        'Advance Deducted (₹)': item.calc.advancesDeducted,
        'Net Payable (₹)': item.calc.netPayable,
        'Status': item.payment?.status === 'paid' ? 'Paid' : 'Pending',
        'Payment Date': item.payment?.paidDate || '-',
        'Payment Mode': item.payment?.paymentMode || '-',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `Labour_${selectedMonth}`);
    } else {
      const rows = staffCalculations.map((item, idx) => ({
        'S.No': idx + 1,
        'Employee Name': item.employee.name,
        'Role': item.employee.designation || 'Staff',
        'Base Salary (₹)': item.calc.monthlySalary,
        'Days': item.calc.totalDaysInMonth,
        'Unpaid Leaves': item.calc.unpaidLeaves,
        'Leave Deduction (₹)': item.calc.leaveDeduction,
        'Gross (₹)': item.calc.grossSalaryAfterLeaves,
        'Advance Cut (₹)': item.calc.advancesDeducted,
        'Net Payable (₹)': item.calc.netPayable,
        'Status': item.payment?.status === 'paid' ? 'Paid' : 'Pending',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `Staff_${selectedMonth}`);
    }

    XLSX.writeFile(wb, `SalarySheet_${activeTab}_${selectedMonth}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName || 'M/S GANESH AGRO', 148, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`SALARY SHEET — ${activeTab.toUpperCase()} (${monthName.toUpperCase()})`, 148, 23, {
      align: 'center',
    });

    if (activeTab === 'labour') {
      const bodyData = labourCalculations.map((item, idx) => [
        idx + 1,
        item.employee.name,
        maskAadhaar(item.employee.aadhaar),
        `${item.calc.totalDaysWorked} days`,
        `${item.calc.totalRegularHours}h`,
        `${item.calc.totalOvertimeHours}h`,
        item.calc.totalPieceQuantity || '-',
        item.calc.grossSalary.toFixed(2),
        item.calc.advancesDeducted.toFixed(2),
        item.calc.netPayable.toFixed(2),
        item.payment?.status === 'paid' ? 'PAID' : 'PENDING',
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['#', 'Worker Name', 'Aadhaar', 'Days', 'Reg Hrs', 'OT Hrs', 'Pieces', 'Gross (Rs)', 'Advance (Rs)', 'Net Payable (Rs)', 'Status']],
        body: bodyData,
        theme: 'striped',
        headStyles: { fillColor: [0, 184, 132] },
        styles: { fontSize: 8 },
        foot: [['Total', `${labourCalculations.length} Workers`, '', '', '', '', '', labourTotalGross.toFixed(2), labourTotalAdvanceDeducted.toFixed(2), labourTotalNet.toFixed(2), `${labourPaidCount}/${labourCalculations.length} Paid`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });
    } else {
      const bodyData = staffCalculations.map((item, idx) => [
        idx + 1,
        item.employee.name,
        item.employee.designation || 'Staff',
        item.calc.monthlySalary.toFixed(2),
        `${item.calc.unpaidLeaves} days`,
        item.calc.leaveDeduction.toFixed(2),
        item.calc.grossSalaryAfterLeaves.toFixed(2),
        item.calc.advancesDeducted.toFixed(2),
        item.calc.netPayable.toFixed(2),
        item.payment?.status === 'paid' ? 'PAID' : 'PENDING',
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['#', 'Staff Name', 'Designation', 'Base Salary (Rs)', 'Unpaid Leaves', 'Leave Ded. (Rs)', 'Gross (Rs)', 'Advance Ded. (Rs)', 'Net Payable (Rs)', 'Status']],
        body: bodyData,
        theme: 'striped',
        headStyles: { fillColor: [0, 184, 132] },
        styles: { fontSize: 8 },
        foot: [['Total', `${staffCalculations.length} Staff`, '', '', '', '', staffTotalGross.toFixed(2), staffTotalAdvanceDeducted.toFixed(2), staffTotalNet.toFixed(2), `${staffPaidCount}/${staffCalculations.length} Paid`]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });
    }

    doc.save(`SalarySheet_${activeTab}_${selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-5xl mx-auto">
      {/* Month Navigation Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePrevMonth}
            className="w-10 h-10 sm:w-auto sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev Month</span>
          </button>

          <div className="text-center">
            <span className="text-[11px] font-bold text-[#00b884] uppercase tracking-wider block">
              Salary Payroll Month
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {monthName}
            </div>
            {selectedMonth === getPreviousMonth() && (
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[10px] font-bold text-[#00b884]">
                Default: Previous Month (Paid Now)
              </span>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="w-10 h-10 sm:w-auto sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
          >
            <span className="hidden sm:inline">Next Month</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher & Export buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex bg-[#f8fafc] dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('labour')}
              className={`flex-1 sm:flex-initial py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'labour'
                  ? 'bg-[#00b884] text-white shadow-md shadow-[#00b884]/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Labour Wages ({activeLabourers.length})
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex-1 sm:flex-initial py-2.5 px-6 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'staff'
                  ? 'bg-[#00b884] text-white shadow-md shadow-[#00b884]/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Fixed Staff ({activeStaff.length})
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#00b884]" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/20 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none text-left">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Total Gross Wages</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {formatINR(activeTab === 'labour' ? labourTotalGross : staffTotalGross)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Earned before advance offsets</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none text-left">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Advances Deducted</span>
          <span className="text-xl sm:text-2xl font-bold text-rose-500 mt-1 block">
            -{formatINR(activeTab === 'labour' ? labourTotalAdvanceDeducted : staffTotalAdvanceDeducted)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Adjusted in this month cycle</span>
        </div>

        <div className="p-5 bg-[#e6f7f0] dark:bg-[#00b884]/15 rounded-3xl border border-[#00b884]/30 text-left">
          <span className="text-[11px] text-[#064e3b] dark:text-[#00b884] uppercase font-bold tracking-wider block">
            Net Cash Payable
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#00b884] mt-1 block">
            {formatINR(activeTab === 'labour' ? labourTotalNet : staffTotalNet)}
          </span>
          <span className="text-xs text-[#064e3b]/80 dark:text-[#00b884]/80 mt-1 block">
            {activeTab === 'labour'
              ? `${labourPaidCount} of ${labourCalculations.length} Workers Paid`
              : `${staffPaidCount} of ${staffCalculations.length} Staff Paid`}
          </span>
        </div>
      </div>

      {/* SALARY CARDS LIST */}
      <div className="space-y-4">
        {activeTab === 'labour' ? (
          displayedLabourCalculations.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-500">
                {searchQuery ? `No labourers match "${searchQuery}".` : 'No labourers found.'}
              </p>
            </div>
          ) : (
            displayedLabourCalculations.map(({ employee, calc, payment }) => {
              const isPaid = payment?.status === 'paid';
              const isExpanded = expandedRows[employee.id] === true;

              return (
                <div
                  key={employee.id}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none transition-all ${
                    isPaid
                      ? 'border-[#00b884]/30 dark:border-[#00b884]/20'
                      : 'border-slate-100 dark:border-slate-800'
                  }`}
                >
                  {/* Top: Worker Header & Payment Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center shadow-sm ${
                          isPaid
                            ? 'bg-[#00b884] text-white shadow-[#00b884]/20'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {employee.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg leading-tight">
                          {employee.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {employee.phone || maskAadhaar(employee.aadhaar) || 'Labourer'} • {calc.totalDaysWorked} days worked
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                        isPaid
                          ? 'bg-[#e6f7f0] text-[#00b884] dark:bg-[#00b884]/20'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isPaid ? 'PAID ✓' : 'UNPAID'}
                    </span>
                  </div>

                  {/* Financial Overview Grid */}
                  <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#f8fafc] dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Gross
                      </span>
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {formatINR(calc.grossSalary)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Advance Cut
                      </span>
                      <span className="text-sm sm:text-base font-bold text-rose-500">
                        -{formatINR(calc.advancesDeducted)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#00b884] font-bold uppercase tracking-wider block">
                        Net Payable
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#00b884]">
                        {formatINR(calc.netPayable)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {!isPaid ? (
                      <button
                        onClick={() =>
                          handleOpenPaymentModal(
                            employee,
                            calc.netPayable,
                            calc.grossSalary,
                            calc.advancesDeducted,
                            calc.carryForwardToNextMonth
                          )
                        }
                        className="px-4 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/20 flex items-center gap-1.5 transition-all"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Mark Paid</span>
                      </button>
                    ) : (
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-[#e6f7f0] dark:bg-[#00b884]/15 px-3 py-1.5 rounded-xl text-[#064e3b] dark:text-[#00b884] font-medium">
                        <CheckCircle2 className="w-4 h-4 text-[#00b884]" />
                        <span>
                          Paid on {payment?.paidDate ? formatDateDDMMYYYY(payment.paidDate) : '-'} via {(payment?.paymentMode || 'cash').toUpperCase()}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleOpenPayslip(employee, calc)}
                      className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-[#00b884]" />
                      <span>Payslip PDF</span>
                    </button>

                    <button
                      onClick={() =>
                        handleShareWhatsApp(
                          employee,
                          calc.grossSalary,
                          calc.advancesDeducted,
                          calc.netPayable,
                          `Days worked: ${calc.totalDaysWorked} | Regular: ${calc.totalRegularHours}h | Overtime: ${calc.totalOvertimeHours}h`
                        )
                      }
                      className="px-3 py-2 rounded-2xl bg-[#e6f7f0] dark:bg-[#00b884]/15 hover:bg-[#d4f2e3] text-[#064e3b] dark:text-[#00b884] text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleOpenDayWise(employee, calc)}
                      className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition-all"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Attendance Grid</span>
                    </button>

                    <button
                      onClick={() => toggleExpand(employee.id)}
                      className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 py-1 px-2"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Breakdown'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expandable Breakdown Drawer */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                      <div className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        Work Type & Overtime Breakdown
                      </div>

                      <div className="space-y-2">
                        {calc.workTypeBreakdowns.map((wt, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-[#f8fafc] dark:bg-slate-800 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800"
                          >
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {wt.workTypeName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {wt.payModel === 'hourly'
                                  ? `${wt.regularHours} reg hrs + ${wt.overtimeHours} OT hrs (@ ₹${wt.rate}/h)`
                                  : `${wt.quantity} pieces (@ ₹${wt.rate}/pc)`}
                              </div>
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatINR(wt.totalAmount)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {calc.carryForwardToNextMonth > 0 && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                          <strong>Notice:</strong> Advance exceeds salary by{' '}
                          <strong>{formatINR(calc.carryForwardToNextMonth)}</strong>. This remaining
                          balance is automatically carried forward to next month.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* Staff Cards */
          displayedStaffCalculations.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-500">
                {searchQuery ? `No staff match "${searchQuery}".` : 'No fixed staff found.'}
              </p>
            </div>
          ) : (
            displayedStaffCalculations.map(({ employee, calc, payment }) => {
              const isPaid = payment?.status === 'paid';
              const isExpanded = expandedRows[employee.id] === true;

              return (
                <div
                  key={employee.id}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none transition-all ${
                    isPaid
                      ? 'border-[#00b884]/30 dark:border-[#00b884]/20'
                      : 'border-slate-100 dark:border-slate-800'
                  }`}
                >
                  {/* Staff Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center shadow-sm ${
                          isPaid
                            ? 'bg-[#00b884] text-white shadow-[#00b884]/20'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {employee.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg leading-tight">
                          {employee.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {employee.designation || 'Staff'} • Base {formatINR(calc.monthlySalary)}/mo
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                        isPaid
                          ? 'bg-[#e6f7f0] text-[#00b884] dark:bg-[#00b884]/20'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {isPaid ? 'PAID ✓' : 'UNPAID'}
                    </span>
                  </div>

                  {/* Financial Summary Strip */}
                  <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#f8fafc] dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Base Salary
                      </span>
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {formatINR(calc.monthlySalary)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Leave & Adv Cuts
                      </span>
                      <span className="text-sm sm:text-base font-bold text-rose-500">
                        -{formatINR(calc.leaveDeduction + calc.advancesDeducted)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#00b884] font-bold uppercase tracking-wider block">
                        Net Payable
                      </span>
                      <span className="text-sm sm:text-base font-black text-[#00b884]">
                        {formatINR(calc.netPayable)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {!isPaid ? (
                      <button
                        onClick={() =>
                          handleOpenPaymentModal(
                            employee,
                            calc.netPayable,
                            calc.grossSalaryAfterLeaves,
                            calc.advancesDeducted,
                            calc.carryForwardToNextMonth
                          )
                        }
                        className="px-4 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/20 flex items-center gap-1.5 transition-all"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Mark Paid</span>
                      </button>
                    ) : (
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-[#e6f7f0] dark:bg-[#00b884]/15 px-3 py-1.5 rounded-xl text-[#064e3b] dark:text-[#00b884] font-medium">
                        <CheckCircle2 className="w-4 h-4 text-[#00b884]" />
                        <span>Paid on {payment?.paidDate ? formatDateDDMMYYYY(payment.paidDate) : '-'}</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleOpenPayslip(employee, undefined, calc)}
                      className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-[#00b884]" />
                      <span>Payslip PDF</span>
                    </button>

                    <button
                      onClick={() =>
                        handleShareWhatsApp(
                          employee,
                          calc.grossSalaryAfterLeaves,
                          calc.advancesDeducted,
                          calc.netPayable,
                          `Base: ${formatINR(calc.monthlySalary)} | Unpaid Leaves: ${calc.unpaidLeaves} days`
                        )
                      }
                      className="px-3 py-2 rounded-2xl bg-[#e6f7f0] dark:bg-[#00b884]/15 hover:bg-[#d4f2e3] text-[#064e3b] dark:text-[#00b884] text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => toggleExpand(employee.id)}
                      className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 py-1 px-2"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Breakdown'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Staff Breakdown Drawer */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="p-3 bg-[#f8fafc] dark:bg-slate-800 rounded-2xl space-y-1.5 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Per-Day Rate basis:</span>
                          <strong className="text-slate-900 dark:text-white">
                            {formatINR(calc.perDayRate)} / day ({calc.totalDaysInMonth} days basis)
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Paid Leaves Allowed / Used:</span>
                          <strong className="text-slate-900 dark:text-white">
                            {calc.paidLeavesUsed} of {employee.paidLeavesPerMonth ?? 2} days
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Unpaid Leaves:</span>
                          <strong className="text-rose-500">
                            {calc.unpaidLeaves} days (-{formatINR(calc.leaveDeduction)})
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

      {/* Payment Recording Modal */}
      {paymentModalEmployee && (
        <Modal
          isOpen={true}
          onClose={() => setPaymentModalEmployee(null)}
          title={`Record Salary Payment: ${paymentModalEmployee.name}`}
        >
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="p-4 bg-[#e6f7f0] dark:bg-[#00b884]/15 rounded-2xl border border-[#00b884]/30">
              <span className="text-xs text-[#064e3b] dark:text-[#00b884] block font-bold uppercase tracking-wider">
                Net Salary Due for {monthName}
              </span>
              <span className="text-2xl font-black text-[#00b884]">
                {formatINR(paymentAmount)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-[#00b884]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'upi', 'bank'] as PaymentMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMode(m)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold uppercase transition-all border ${
                      paymentMode === m
                        ? 'bg-[#00b884] text-white border-[#00b884] shadow-md shadow-[#00b884]/20'
                        : 'bg-[#f8fafc] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Optional Notes / Voucher No.
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via PhonePe or Cash in hand"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#00b884]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPaymentModalEmployee(null)}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/25"
              >
                Confirm Paid
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Payslip Modal */}
      {payslipEmployee && (
        <PayslipModal
          isOpen={true}
          onClose={() => setPayslipEmployee(null)}
          employee={payslipEmployee}
          month={selectedMonth}
          labourCalc={selectedLabourCalc}
          staffCalc={selectedStaffCalc}
          settings={settings}
        />
      )}

      {/* Day-wise Calendar Modal */}
      {dayWiseModalEmployee && dayWiseLabourCalc && (
        <DayWiseCalendarModal
          isOpen={true}
          onClose={() => setDayWiseModalEmployee(null)}
          employee={dayWiseModalEmployee}
          month={selectedMonth}
          labourCalc={dayWiseLabourCalc}
        />
      )}
    </div>
  );
};
