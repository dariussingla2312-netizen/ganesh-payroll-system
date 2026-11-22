import {
  Employee,
  WorkType,
  EmployeeRate,
  WorkEntry,
  Advance,
  LeaveRecord,
  GlobalSettings,
  WorkTypeSummary,
  LabourMonthlyCalculation,
  StaffMonthlyCalculation,
} from '../types';

/**
 * Format number in Indian numbering system (e.g. ₹1,25,000 or ₹1,25,000.50)
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0.00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Round to 2 decimal places
  const rounded = absAmount.toFixed(2);
  const [integerPart, decimalPart] = rounded.split('.');

  // Indian format: last 3 digits, then groups of 2
  let result = '';
  if (integerPart.length <= 3) {
    result = integerPart;
  } else {
    const last3 = integerPart.substring(integerPart.length - 3);
    const remaining = integerPart.substring(0, integerPart.length - 3);
    const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${formattedRemaining},${last3}`;
  }

  const sign = isNegative ? '-' : '';
  if (showDecimals) {
    return `${sign}₹${result}.${decimalPart}`;
  }
  return `${sign}₹${result}`;
}

/**
 * Validates a 12-digit Indian Aadhaar number
 */
export function validateAadhaar(aadhaar?: string): boolean {
  if (!aadhaar) return false;
  const cleaned = aadhaar.replace(/\s+/g, '');
  return /^\d{12}$/.test(cleaned);
}

/**
 * Masks Aadhaar number as XXXX XXXX 1234
 */
export function maskAadhaar(aadhaar?: string): string {
  if (!aadhaar) return '';
  const cleaned = aadhaar.replace(/\s+/g, '');
  if (cleaned.length !== 12) return aadhaar;
  return `XXXX XXXX ${cleaned.slice(-4)}`;
}

/**
 * Formats Aadhaar as XXXX XXXX XXXX for readable display
 */
export function formatAadhaar(aadhaar?: string): string {
  if (!aadhaar) return '';
  const cleaned = aadhaar.replace(/\s+/g, '');
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * Convert YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD
 */
export function parseDateDDMMYYYY(str: string): string {
  if (!str) return '';
  const parts = str.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
}

/**
 * Get days in a specific month (YYYY-MM)
 */
export function getDaysInMonth(yearMonth: string, basis: 'calendar' | 'fixed_30' = 'calendar'): number {
  if (basis === 'fixed_30') return 30;
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

/**
 * Format Month string (YYYY-MM) to human readable (e.g. October 2026)
 */
export function formatMonthName(yearMonth: string, _lang: 'en' | 'hi' = 'en'): string {
  if (!yearMonth) return '';
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const date = new Date(year, month, 1);

  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Returns previous month in YYYY-MM format
 */
export function getPreviousMonth(yearMonth?: string): string {
  let baseDate: Date;
  if (yearMonth) {
    const [y, m] = yearMonth.split('-').map(Number);
    baseDate = new Date(y, m - 1, 1);
  } else {
    baseDate = new Date();
  }
  baseDate.setMonth(baseDate.getMonth() - 1);
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns next month in YYYY-MM format
 */
export function getNextMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const baseDate = new Date(y, m - 1, 1);
  baseDate.setMonth(baseDate.getMonth() + 1);
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get effective rate for an employee on a given date for a work type
 */
export function getRateForDate(
  rates: EmployeeRate[],
  employeeId: string,
  workTypeId: string,
  workDate: string,
  fallbackRate: number
): number {
  const matching = rates.filter(
    (r) =>
      r.employeeId === employeeId &&
      r.workTypeId === workTypeId &&
      r.effectiveFrom <= workDate
  );

  if (matching.length === 0) {
    return fallbackRate;
  }

  // Sort by effectiveFrom descending
  matching.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matching[0].rate;
}

/**
 * Calculates work earnings for an employee on a single day.
 * Respects standard daily hours (default 8) across all hourly work types.
 * Overtime beyond 8 hours is paid at the work type's overtime multiplier.
 */
export function calculateDayWork(
  entries: WorkEntry[],
  workTypes: WorkType[],
  rates: EmployeeRate[],
  workDate: string,
  settings: GlobalSettings
) {
  const workTypeMap = new Map<string, WorkType>();
  workTypes.forEach((wt) => workTypeMap.set(wt.id, wt));

  // Filter entries for this employee and date
  const dayEntries = entries.filter((e) => e.date === workDate);

  let totalPieceQuantity = 0;
  let pieceEarnings = 0;

  // Process piece entries first
  const hourlyEntries: {
    entry: WorkEntry;
    workType: WorkType;
    rate: number;
    hours: number;
    overtimeMultiplier: number;
  }[] = [];

  let totalHourlyHours = 0;

  for (const entry of dayEntries) {
    const wt = workTypeMap.get(entry.workTypeId);
    if (!wt) continue;

    const rate = getRateForDate(rates, entry.employeeId, entry.workTypeId, workDate, wt.defaultRate);

    if (wt.payModel === 'piece') {
      const qty = entry.quantity || 0;
      totalPieceQuantity += qty;
      pieceEarnings += qty * rate;

      // In case piece work has hours enabled
      if (settings.allowPieceRateHours && entry.hours && entry.hours > 0) {
        hourlyEntries.push({
          entry,
          workType: wt,
          rate,
          hours: entry.hours,
          overtimeMultiplier: wt.overtimeMultiplier ?? settings.overtimeMultiplier ?? 1.5,
        });
        totalHourlyHours += entry.hours;
      }
    } else {
      // Hourly entry
      const hours = entry.hours || 0;
      if (hours > 0) {
        hourlyEntries.push({
          entry,
          workType: wt,
          rate,
          hours,
          overtimeMultiplier: wt.overtimeMultiplier ?? settings.overtimeMultiplier ?? 1.5,
        });
        totalHourlyHours += hours;
      }
    }
  }

  const standardDailyHours = settings.standardHoursPerDay || 8;
  const regularHoursTotal = Math.min(totalHourlyHours, standardDailyHours);
  const overtimeHoursTotal = Math.max(0, totalHourlyHours - standardDailyHours);

  let regularEarnings = 0;
  let overtimeEarnings = 0;

  // Distribute regular hours sequentially across hourly entries
  let remainingRegularToAllocate = regularHoursTotal;

  for (const item of hourlyEntries) {
    const regularForThis = Math.min(remainingRegularToAllocate, item.hours);
    const overtimeForThis = item.hours - regularForThis;

    regularEarnings += regularForThis * item.rate;
    overtimeEarnings += overtimeForThis * item.rate * item.overtimeMultiplier;

    remainingRegularToAllocate -= regularForThis;
  }

  const totalDayEarnings = Math.round((pieceEarnings + regularEarnings + overtimeEarnings) * 100) / 100;

  return {
    date: workDate,
    entries: dayEntries,
    totalHourlyHours,
    regularHours: Math.round(regularHoursTotal * 100) / 100,
    overtimeHours: Math.round(overtimeHoursTotal * 100) / 100,
    pieceQuantity: totalPieceQuantity,
    regularEarnings: Math.round(regularEarnings * 100) / 100,
    overtimeEarnings: Math.round(overtimeEarnings * 100) / 100,
    pieceEarnings: Math.round(pieceEarnings * 100) / 100,
    totalDayEarnings,
  };
}

/**
 * Calculates advance due for an employee in a specific target month.
 */
export function getAdvancesDueForMonth(
  advances: Advance[],
  employeeId: string,
  targetMonth: string // YYYY-MM
): { totalDue: number; details: { advance: Advance; amountDue: number }[] } {
  const details: { advance: Advance; amountDue: number }[] = [];
  let totalDue = 0;

  const empAdvances = advances.filter((a) => a.employeeId === employeeId);

  for (const adv of empAdvances) {
    const advMonth = adv.date.substring(0, 7); // YYYY-MM of advance date

    if (adv.mode === 'this_month') {
      if (advMonth === targetMonth) {
        details.push({ advance: adv, amountDue: adv.amount });
        totalDue += adv.amount;
      }
    } else if (adv.mode === 'upcoming_month') {
      if (adv.targetMonth === targetMonth) {
        details.push({ advance: adv, amountDue: adv.amount });
        totalDue += adv.amount;
      }
    } else if (adv.mode === 'installments') {
      const installments = Math.max(1, adv.installmentsCount || 1);
      const monthlyPortion = Math.round((adv.amount / installments) * 100) / 100;

      // Determine starting month for installments (targetMonth if specified, else advMonth)
      const startMonth = adv.targetMonth || advMonth;
      const [startYear, startM] = startMonth.split('-').map(Number);
      const [currYear, currM] = targetMonth.split('-').map(Number);

      const monthDiff = (currYear - startYear) * 12 + (currM - startM);

      if (monthDiff >= 0 && monthDiff < installments) {
        // Last installment absorbs any remainder from rounding
        let portion = monthlyPortion;
        if (monthDiff === installments - 1) {
          portion = Math.round((adv.amount - monthlyPortion * (installments - 1)) * 100) / 100;
        }
        details.push({ advance: adv, amountDue: portion });
        totalDue += portion;
      }
    }
  }

  return { totalDue: Math.round(totalDue * 100) / 100, details };
}

/**
 * Calculates cumulative advance carryover across consecutive months up to the target month.
 */
export function calculateAdvanceCarryover(
  employeeId: string,
  targetMonth: string,
  advances: Advance[],
  getGrossEarningsForMonth: (m: string) => number
): { broughtForward: number } {
  // Find the earliest advance month for this employee
  const empAdvances = advances.filter((a) => a.employeeId === employeeId);
  if (empAdvances.length === 0) return { broughtForward: 0 };

  const dates = empAdvances.map((a) => a.targetMonth || a.date.substring(0, 7));
  dates.sort();
  const earliestMonth = dates[0];

  if (earliestMonth >= targetMonth) {
    return { broughtForward: 0 };
  }

  // Iterate from earliestMonth up to targetMonth - 1
  let currentIter = earliestMonth;
  let carryForward = 0;

  while (currentIter < targetMonth) {
    const gross = getGrossEarningsForMonth(currentIter);
    const { totalDue } = getAdvancesDueForMonth(advances, employeeId, currentIter);
    const totalDueWithCarry = Math.round((totalDue + carryForward) * 100) / 100;

    if (totalDueWithCarry > gross) {
      carryForward = Math.round((totalDueWithCarry - gross) * 100) / 100;
    } else {
      carryForward = 0;
    }

    currentIter = getNextMonth(currentIter);
  }

  return { broughtForward: carryForward };
}

/**
 * Calculates total advances ledger for an employee:
 * - Total given
 * - Total deducted (up to current month or all time)
 * - Balance pending
 */
export function getAdvanceLedger(
  advances: Advance[],
  employeeId: string,
  totalDeducted: number = 0
) {
  const empAdvances = advances.filter((a) => a.employeeId === employeeId);
  const totalGiven = empAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const balancePending = Math.max(0, Math.round((totalGiven - totalDeducted) * 100) / 100);

  return {
    totalGiven: Math.round(totalGiven * 100) / 100,
    totalDeducted: Math.round(totalDeducted * 100) / 100,
    balancePending,
    advances: empAdvances,
  };
}

/**
 * Calculates complete monthly salary for a Labour employee.
 */
export function calculateLabourMonthlySalary(
  employee: Employee,
  month: string, // YYYY-MM
  entries: WorkEntry[],
  workTypes: WorkType[],
  rates: EmployeeRate[],
  advances: Advance[],
  settings: GlobalSettings
): LabourMonthlyCalculation {
  const workTypeMap = new Map<string, WorkType>();
  workTypes.forEach((wt) => workTypeMap.set(wt.id, wt));

  // Filter entries for this employee and this month
  const empEntries = entries.filter(
    (e) => e.employeeId === employee.id && e.date.startsWith(month)
  );

  // Group entries by date
  const dateSet = new Set<string>();
  empEntries.forEach((e) => dateSet.add(e.date));
  const sortedDates = Array.from(dateSet).sort();

  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalPieceQuantity = 0;
  let grossRegularAmount = 0;
  let grossOvertimeAmount = 0;
  let grossPieceAmount = 0;

  const dayWiseDetails: LabourMonthlyCalculation['dayWiseDetails'] = [];

  // Track per work type breakdown
  const wtBreakdownMap = new Map<string, WorkTypeSummary>();

  workTypes.forEach((wt) => {
    wtBreakdownMap.set(wt.id, {
      workTypeId: wt.id,
      workTypeName: wt.name,
      workTypeNameHi: wt.nameHi,
      payModel: wt.payModel,
      rate: wt.defaultRate,
      regularHours: 0,
      overtimeHours: 0,
      quantity: 0,
      regularAmount: 0,
      overtimeAmount: 0,
      pieceAmount: 0,
      totalAmount: 0,
    });
  });

  for (const date of sortedDates) {
    const dayCalc = calculateDayWork(entries, workTypes, rates, date, settings);
    dayWiseDetails.push({
      date,
      entries: dayCalc.entries,
      regularHours: dayCalc.regularHours,
      overtimeHours: dayCalc.overtimeHours,
      pieceQuantity: dayCalc.pieceQuantity,
      dayEarnings: dayCalc.totalDayEarnings,
    });

    totalRegularHours += dayCalc.regularHours;
    totalOvertimeHours += dayCalc.overtimeHours;
    totalPieceQuantity += dayCalc.pieceQuantity;
    grossRegularAmount += dayCalc.regularEarnings;
    grossOvertimeAmount += dayCalc.overtimeEarnings;
    grossPieceAmount += dayCalc.pieceEarnings;

    // Attribute to work types
    const standardDailyHours = settings.standardHoursPerDay || 8;
    let remainingRegular = Math.min(dayCalc.totalHourlyHours, standardDailyHours);

    for (const entry of dayCalc.entries) {
      const wt = workTypeMap.get(entry.workTypeId);
      if (!wt) continue;

      const rate = getRateForDate(rates, employee.id, wt.id, date, wt.defaultRate);
      let summary = wtBreakdownMap.get(wt.id);
      if (!summary) {
        summary = {
          workTypeId: wt.id,
          workTypeName: wt.name,
          workTypeNameHi: wt.nameHi,
          payModel: wt.payModel,
          rate,
          regularHours: 0,
          overtimeHours: 0,
          quantity: 0,
          regularAmount: 0,
          overtimeAmount: 0,
          pieceAmount: 0,
          totalAmount: 0,
        };
        wtBreakdownMap.set(wt.id, summary);
      }

      summary.rate = rate; // update with active rate

      if (wt.payModel === 'piece') {
        const qty = entry.quantity || 0;
        summary.quantity += qty;
        const amount = qty * rate;
        summary.pieceAmount += amount;
        summary.totalAmount += amount;
      } else {
        const hrs = entry.hours || 0;
        const regHrs = Math.min(remainingRegular, hrs);
        const otHrs = hrs - regHrs;
        const otMult = wt.overtimeMultiplier ?? settings.overtimeMultiplier ?? 1.5;

        summary.regularHours += regHrs;
        summary.overtimeHours += otHrs;

        const regAmt = regHrs * rate;
        const otAmt = otHrs * rate * otMult;

        summary.regularAmount += regAmt;
        summary.overtimeAmount += otAmt;
        summary.totalAmount += regAmt + otAmt;

        remainingRegular -= regHrs;
      }
    }
  }

  const grossSalary = Math.round((grossRegularAmount + grossOvertimeAmount + grossPieceAmount) * 100) / 100;

  // Helper to get gross earnings for any month for carryover calculation
  const getGrossForMonth = (m: string): number => {
    const mEntries = entries.filter((e) => e.employeeId === employee.id && e.date.startsWith(m));
    const dates = Array.from(new Set(mEntries.map((e) => e.date)));
    let total = 0;
    for (const d of dates) {
      const res = calculateDayWork(entries, workTypes, rates, d, settings);
      total += res.totalDayEarnings;
    }
    return Math.round(total * 100) / 100;
  };

  const { broughtForward } = calculateAdvanceCarryover(employee.id, month, advances, getGrossForMonth);
  const { totalDue: monthAdvancesDue } = getAdvancesDueForMonth(advances, employee.id, month);

  const totalAdvanceToDeduct = Math.round((monthAdvancesDue + broughtForward) * 100) / 100;

  let advancesDeducted = 0;
  let carryForwardToNextMonth = 0;
  let netPayable = 0;

  if (totalAdvanceToDeduct > grossSalary) {
    advancesDeducted = grossSalary;
    carryForwardToNextMonth = Math.round((totalAdvanceToDeduct - grossSalary) * 100) / 100;
    netPayable = 0;
  } else {
    advancesDeducted = totalAdvanceToDeduct;
    carryForwardToNextMonth = 0;
    netPayable = Math.round((grossSalary - advancesDeducted) * 100) / 100;
  }

  // Round breakdown amounts
  const workTypeBreakdowns = Array.from(wtBreakdownMap.values())
    .filter((wt) => wt.totalAmount > 0 || wt.regularHours > 0 || wt.quantity > 0)
    .map((b) => ({
      ...b,
      regularHours: Math.round(b.regularHours * 100) / 100,
      overtimeHours: Math.round(b.overtimeHours * 100) / 100,
      regularAmount: Math.round(b.regularAmount * 100) / 100,
      overtimeAmount: Math.round(b.overtimeAmount * 100) / 100,
      pieceAmount: Math.round(b.pieceAmount * 100) / 100,
      totalAmount: Math.round(b.totalAmount * 100) / 100,
    }));

  return {
    employeeId: employee.id,
    month,
    totalDaysWorked: sortedDates.length,
    totalRegularHours: Math.round(totalRegularHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    totalPieceQuantity,
    grossRegularAmount: Math.round(grossRegularAmount * 100) / 100,
    grossOvertimeAmount: Math.round(grossOvertimeAmount * 100) / 100,
    grossPieceAmount: Math.round(grossPieceAmount * 100) / 100,
    grossSalary,
    advancesDue: totalAdvanceToDeduct,
    advancesDeducted: Math.round(advancesDeducted * 100) / 100,
    carryForwardToNextMonth,
    broughtForwardFromPrevMonth: broughtForward,
    netPayable,
    workTypeBreakdowns,
    dayWiseDetails,
  };
}

/**
 * Calculates complete monthly salary for Fixed-salary Staff.
 */
export function calculateStaffMonthlySalary(
  employee: Employee,
  month: string, // YYYY-MM
  leaves: LeaveRecord[],
  advances: Advance[],
  settings: GlobalSettings,
  allLeaves?: LeaveRecord[]
): StaffMonthlyCalculation {
  const monthlySalary = employee.monthlySalary || 0;
  const totalDaysInMonth = getDaysInMonth(month, settings.monthDayBasis);
  const perDayRate = Math.round((monthlySalary / totalDaysInMonth) * 100) / 100;

  // Filter leaves for this employee and month
  const empLeaves = leaves.filter(
    (l) => l.employeeId === employee.id && l.date.startsWith(month)
  );

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;

  for (const l of empLeaves) {
    if (l.type === 'present') presentDays += 1;
    else if (l.type === 'absent') absentDays += 1;
    else if (l.type === 'half_day') halfDays += 1;
  }

  // Half day = 0.5 absence
  const totalAbsenceEquivalent = absentDays + halfDays * 0.5;

  const paidLeavesAllowed = employee.paidLeavesPerMonth ?? 2;
  const paidLeavesUsed = Math.min(totalAbsenceEquivalent, paidLeavesAllowed);
  const unpaidLeaves = Math.max(0, totalAbsenceEquivalent - paidLeavesUsed);

  const leaveDeduction = Math.round(unpaidLeaves * perDayRate * 100) / 100;
  const grossSalaryAfterLeaves = Math.max(0, Math.round((monthlySalary - leaveDeduction) * 100) / 100);

  // Helper to compute staff gross for carryover calculation
  const getStaffGrossForMonth = (m: string): number => {
    const days = getDaysInMonth(m, settings.monthDayBasis);
    const dayRate = monthlySalary / days;
    const lList = (allLeaves || leaves).filter((l) => l.employeeId === employee.id && l.date.startsWith(m));
    let abs = 0;
    let half = 0;
    for (const l of lList) {
      if (l.type === 'absent') abs += 1;
      else if (l.type === 'half_day') half += 1;
    }
    const totAbs = abs + half * 0.5;
    const unp = Math.max(0, totAbs - paidLeavesAllowed);
    return Math.max(0, Math.round((monthlySalary - unp * dayRate) * 100) / 100);
  };

  const { broughtForward } = calculateAdvanceCarryover(employee.id, month, advances, getStaffGrossForMonth);
  const { totalDue: monthAdvancesDue } = getAdvancesDueForMonth(advances, employee.id, month);

  const totalAdvanceToDeduct = Math.round((monthAdvancesDue + broughtForward) * 100) / 100;

  let advancesDeducted = 0;
  let carryForwardToNextMonth = 0;
  let netPayable = 0;

  if (totalAdvanceToDeduct > grossSalaryAfterLeaves) {
    advancesDeducted = grossSalaryAfterLeaves;
    carryForwardToNextMonth = Math.round((totalAdvanceToDeduct - grossSalaryAfterLeaves) * 100) / 100;
    netPayable = 0;
  } else {
    advancesDeducted = totalAdvanceToDeduct;
    carryForwardToNextMonth = 0;
    netPayable = Math.round((grossSalaryAfterLeaves - advancesDeducted) * 100) / 100;
  }

  return {
    employeeId: employee.id,
    month,
    monthlySalary,
    totalDaysInMonth,
    perDayRate,
    presentDays,
    absentDays,
    halfDays,
    paidLeavesUsed: Math.round(paidLeavesUsed * 10) / 10,
    unpaidLeaves: Math.round(unpaidLeaves * 10) / 10,
    leaveDeduction,
    grossSalaryAfterLeaves,
    advancesDue: totalAdvanceToDeduct,
    advancesDeducted: Math.round(advancesDeducted * 100) / 100,
    carryForwardToNextMonth,
    broughtForwardFromPrevMonth: broughtForward,
    netPayable,
  };
}
