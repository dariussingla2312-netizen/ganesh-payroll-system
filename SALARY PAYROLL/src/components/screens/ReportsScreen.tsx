import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  IndianRupee,
  Users,
  Briefcase,
  PieChart,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import {
  formatINR,
  getPreviousMonth,
  formatMonthName,
  calculateLabourMonthlySalary,
  calculateStaffMonthlySalary,
} from '../../utils/payrollCalculator';
import { CircularProgress } from '../common/CircularProgress';

export const ReportsScreen: React.FC = () => {
  const {
    employees,
    workTypes,
    employeeRates,
    workEntries,
    advances,
    leaves,
    settings,
  } = useData();

  const { t } = useTheme();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => getPreviousMonth());

  const monthName = formatMonthName(selectedMonth, 'en');

  const activeLabourers = employees.filter((e) => e.type === 'labour');
  const activeStaff = employees.filter((e) => e.type === 'fixed');

  // Compute labour statistics
  const labourCalcs = activeLabourers.map((emp) => ({
    employee: emp,
    calc: calculateLabourMonthlySalary(
      emp,
      selectedMonth,
      workEntries,
      workTypes,
      employeeRates,
      advances,
      settings
    ),
  }));

  // Compute staff statistics
  const staffCalcs = activeStaff.map((emp) => ({
    employee: emp,
    calc: calculateStaffMonthlySalary(emp, selectedMonth, leaves, advances, settings),
  }));

  const totalLabourGross = labourCalcs.reduce((sum, i) => sum + i.calc.grossSalary, 0);
  const totalStaffGross = staffCalcs.reduce((sum, i) => sum + i.calc.grossSalaryAfterLeaves, 0);
  const totalGrossDistributed = totalLabourGross + totalStaffGross;

  // Aggregate cost by Work Type
  const workTypeCostMap = new Map<
    string,
    { name: string; hours: number; quantity: number; amount: number }
  >();

  workTypes.forEach((wt) => {
    workTypeCostMap.set(wt.id, {
      name: wt.name,
      hours: 0,
      quantity: 0,
      amount: 0,
    });
  });

  labourCalcs.forEach(({ calc }) => {
    calc.workTypeBreakdowns.forEach((wt) => {
      const existing = workTypeCostMap.get(wt.workTypeId);
      if (existing) {
        existing.hours += wt.regularHours + wt.overtimeHours;
        existing.quantity += wt.quantity;
        existing.amount += wt.totalAmount;
      }
    });
  });

  const workTypeSummaries = Array.from(workTypeCostMap.values()).filter(
    (item) => item.amount > 0 || item.hours > 0 || item.quantity > 0
  );

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

  // Export report to Excel
  const handleExportReportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Cost by Person
    const personRows = [
      ...labourCalcs.map((item) => ({
        'Category': 'Labour',
        'Employee Name': item.employee.name,
        'Days Worked / Present': item.calc.totalDaysWorked,
        'Gross Earnings (₹)': item.calc.grossSalary,
        'Advance Deducted (₹)': item.calc.advancesDeducted,
        'Net Payable (₹)': item.calc.netPayable,
      })),
      ...staffCalcs.map((item) => ({
        'Category': 'Fixed Staff',
        'Employee Name': item.employee.name,
        'Days Worked / Present': `${item.calc.totalDaysInMonth - item.calc.unpaidLeaves} days`,
        'Gross Earnings (₹)': item.calc.grossSalaryAfterLeaves,
        'Advance Deducted (₹)': item.calc.advancesDeducted,
        'Net Payable (₹)': item.calc.netPayable,
      })),
    ];

    const wsPerson = XLSX.utils.json_to_sheet(personRows);
    XLSX.utils.book_append_sheet(wb, wsPerson, 'Cost_By_Person');

    // Sheet 2: Cost by Work Type
    const wtRows = workTypeSummaries.map((item) => ({
      'Work Type': item.name,
      'Total Hours': item.hours,
      'Total Pieces': item.quantity,
      'Total Wages (₹)': item.amount,
      '% of Labour Cost': totalLabourGross > 0 ? `${((item.amount / totalLabourGross) * 100).toFixed(1)}%` : '0%',
    }));

    const wsWt = XLSX.utils.json_to_sheet(wtRows);
    XLSX.utils.book_append_sheet(wb, wsWt, 'Cost_By_WorkType');

    XLSX.writeFile(wb, `Ganesh_Agro_Payroll_Report_${selectedMonth}.xlsx`);
  };

  const labourPct = totalGrossDistributed > 0 ? Math.round((totalLabourGross / totalGrossDistributed) * 100) : 0;
  const staffPct = totalGrossDistributed > 0 ? 100 - labourPct : 0;

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span>Payroll Analytics & Cost Reports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            M/S GANESH AGRO • Real-time wage allocation, piece-rate breakdown and monthly expenditure
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-[#f8fafc] dark:bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:text-[#00b884] transition-colors"
              title="Prev Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
            <button
              onClick={handleNextMonth}
              className="p-1 hover:text-[#00b884] transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportReportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/20 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none text-left">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Factory Payroll
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white block">
            {formatINR(totalGrossDistributed)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {monthName} combined wage bill
          </span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none text-left flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Labour Wages ({labourPct}%)
            </span>
            <span className="text-2xl font-black text-[#00b884] block">
              {formatINR(totalLabourGross)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              Hourly + piece jobs
            </span>
          </div>
          <CircularProgress
            value={totalLabourGross}
            max={totalGrossDistributed || 1}
            size={52}
            strokeWidth={5}
            color="#00b884"
            trackColor="#e6f7f0"
            label={`${labourPct}%`}
          />
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-none text-left flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Fixed Staff ({staffPct}%)
            </span>
            <span className="text-2xl font-black text-[#064e3b] dark:text-[#00b884] block">
              {formatINR(totalStaffGross)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              Office & management
            </span>
          </div>
          <CircularProgress
            value={totalStaffGross}
            max={totalGrossDistributed || 1}
            size={52}
            strokeWidth={5}
            color="#064e3b"
            trackColor="#e6f7f0"
            label={`${staffPct}%`}
          />
        </div>
      </div>

      {/* Section 1: Cost by Work Type */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Work Type Allocation ({monthName})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribution of labour expenditure across simple labour, filter wash, and custom jobs
            </p>
          </div>
        </div>

        {workTypeSummaries.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            No labour work recorded for {monthName}.
          </p>
        ) : (
          <div className="space-y-4">
            {workTypeSummaries.map((wt) => {
              const pct = totalLabourGross > 0 ? (wt.amount / totalLabourGross) * 100 : 0;

              return (
                <div key={wt.name} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {wt.name}
                      </span>
                      <span className="text-slate-400 ml-2">
                        {wt.hours > 0 && `${wt.hours}h`}
                        {wt.hours > 0 && wt.quantity > 0 && ' • '}
                        {wt.quantity > 0 && `${wt.quantity} pieces`}
                      </span>
                    </div>
                    <div className="text-right font-bold text-slate-900 dark:text-white">
                      {formatINR(wt.amount)}{' '}
                      <span className="text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
                    </div>
                  </div>

                  {/* Progress Bar in Behance mint */}
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00b884] to-[#10b981] transition-all duration-500"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Cost by Worker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3">
          Personnel Cost Breakdown ({monthName})
        </h3>

        <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Worker Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-center">Days Worked</th>
                <th className="p-3.5 text-right">Gross Earnings</th>
                <th className="p-3.5 text-right">Advance Ded.</th>
                <th className="p-3.5 text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {labourCalcs.map(({ employee, calc }) => (
                <tr key={employee.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {employee.name}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884] font-bold">
                      Labour
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-medium">{calc.totalDaysWorked}</td>
                  <td className="p-3.5 text-right font-medium">{formatINR(calc.grossSalary)}</td>
                  <td className="p-3.5 text-right text-rose-500 font-medium">
                    {calc.advancesDeducted > 0 ? `-${formatINR(calc.advancesDeducted)}` : '-'}
                  </td>
                  <td className="p-3.5 text-right font-black text-[#00b884]">
                    {formatINR(calc.netPayable)}
                  </td>
                </tr>
              ))}

              {staffCalcs.map(({ employee, calc }) => (
                <tr key={employee.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {employee.name}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 font-bold">
                      Staff ({employee.designation || 'Office'})
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-medium">
                    {calc.totalDaysInMonth - calc.unpaidLeaves}
                  </td>
                  <td className="p-3.5 text-right font-medium">{formatINR(calc.grossSalaryAfterLeaves)}</td>
                  <td className="p-3.5 text-right text-rose-500 font-medium">
                    {calc.advancesDeducted > 0 ? `-${formatINR(calc.advancesDeducted)}` : '-'}
                  </td>
                  <td className="p-3.5 text-right font-black text-[#00b884]">
                    {formatINR(calc.netPayable)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
