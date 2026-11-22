import { describe, it, expect } from 'vitest';
import {
  formatINR,
  validateAadhaar,
  maskAadhaar,
  formatDateDDMMYYYY,
  parseDateDDMMYYYY,
  getDaysInMonth,
  getRateForDate,
  calculateDayWork,
  getAdvancesDueForMonth,
  calculateAdvanceCarryover,
  calculateLabourMonthlySalary,
  calculateStaffMonthlySalary,
} from './payrollCalculator';
import {
  Employee,
  WorkType,
  EmployeeRate,
  WorkEntry,
  Advance,
  LeaveRecord,
  GlobalSettings,
} from '../types';

const defaultSettings: GlobalSettings = {
  companyName: 'Apex Precision Engineering Workshop',
  standardHoursPerDay: 8,
  overtimeMultiplier: 1.5,
  monthDayBasis: 'calendar',
  currencySymbol: '₹',
  language: 'en',
  theme: 'light',
  allowPieceRateHours: false,
};

const sampleWorkTypes: WorkType[] = [
  {
    id: 'wt_simple',
    name: 'Simple Labour Work',
    nameHi: 'Simple Labour Work',
    payModel: 'hourly',
    defaultRate: 100, // ₹100/hr -> 8hr = ₹800
    standardHours: 8,
    overtimeMultiplier: 1.5, // ₹150/hr for OT
    active: true,
  },
  {
    id: 'wt_filter',
    name: 'Filter Wash',
    nameHi: 'Filter Wash',
    payModel: 'piece',
    defaultRate: 25, // ₹25 per filter
    active: true,
  },
  {
    id: 'wt_charge',
    name: 'Charge',
    nameHi: 'Charge',
    payModel: 'hourly',
    defaultRate: 120, // ₹120/hr
    standardHours: 8,
    overtimeMultiplier: 1.5, // ₹180/hr for OT
    active: true,
  },
  {
    id: 'wt_custom',
    name: 'Heavy Lathe Turning',
    nameHi: 'Heavy Lathe Turning',
    payModel: 'hourly',
    defaultRate: 150,
    standardHours: 8,
    overtimeMultiplier: 1.5,
    active: true,
  },
];

const labourEmployee: Employee = {
  id: 'emp_labour_1',
  type: 'labour',
  name: 'Ramesh Kumar',
  phone: '9876543210',
  aadhaar: '123456789012',
  joiningDate: '2026-01-15',
  status: 'active',
  createdAt: '2026-01-15',
  updatedAt: '2026-01-15',
};

const sampleRates: EmployeeRate[] = [
  {
    id: 'rate_1',
    employeeId: 'emp_labour_1',
    workTypeId: 'wt_simple',
    rate: 100,
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'rate_2',
    employeeId: 'emp_labour_1',
    workTypeId: 'wt_filter',
    rate: 25,
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'rate_3',
    employeeId: 'emp_labour_1',
    workTypeId: 'wt_charge',
    rate: 120,
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
];

describe('Indian Currency and Aadhaar Formatting Utilities', () => {
  it('formats Indian currency properly with commas and rupee symbol', () => {
    expect(formatINR(125000)).toBe('₹1,25,000.00');
    expect(formatINR(125000, false)).toBe('₹1,25,000');
    expect(formatINR(850.5)).toBe('₹850.50');
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR(10000000)).toBe('₹1,00,00,000.00');
  });

  it('validates 12-digit Aadhaar number correctly', () => {
    expect(validateAadhaar('123456789012')).toBe(true);
    expect(validateAadhaar('1234 5678 9012')).toBe(true);
    expect(validateAadhaar('12345678901')).toBe(false); // 11 digits
    expect(validateAadhaar('1234567890123')).toBe(false); // 13 digits
    expect(validateAadhaar('1234abcd9012')).toBe(false); // contains letters
    expect(validateAadhaar('')).toBe(false);
  });

  it('masks Aadhaar number displaying only the last 4 digits', () => {
    expect(maskAadhaar('123456789012')).toBe('XXXX XXXX 9012');
    expect(maskAadhaar('1234 5678 9012')).toBe('XXXX XXXX 9012');
  });

  it('formats dates between DD/MM/YYYY and YYYY-MM-DD', () => {
    expect(formatDateDDMMYYYY('2026-10-15')).toBe('15/10/2026');
    expect(parseDateDDMMYYYY('15/10/2026')).toBe('2026-10-15');
  });
});

describe('Rate Lookup with Effective Dates', () => {
  it('respects effectiveFrom date when rates change', () => {
    const historicalRates: EmployeeRate[] = [
      {
        id: 'r1',
        employeeId: 'emp_1',
        workTypeId: 'wt_simple',
        rate: 80,
        effectiveFrom: '2026-01-01',
        createdAt: '2026-01-01',
      },
      {
        id: 'r2',
        employeeId: 'emp_1',
        workTypeId: 'wt_simple',
        rate: 100,
        effectiveFrom: '2026-06-01',
        createdAt: '2026-06-01',
      },
    ];

    // Work on 2026-05-15 must use old rate 80
    expect(getRateForDate(historicalRates, 'emp_1', 'wt_simple', '2026-05-15', 50)).toBe(80);
    // Work on 2026-06-01 must use new rate 100
    expect(getRateForDate(historicalRates, 'emp_1', 'wt_simple', '2026-06-01', 50)).toBe(100);
    // Work on 2026-10-01 must use new rate 100
    expect(getRateForDate(historicalRates, 'emp_1', 'wt_simple', '2026-10-01', 50)).toBe(100);
  });
});

describe('1. Overtime above 8 hours', () => {
  it('calculates 10 hours work as 8 regular hours and 2 overtime hours at 1.5x rate', () => {
    const entries: WorkEntry[] = [
      {
        id: 'entry_1',
        employeeId: 'emp_labour_1',
        date: '2026-10-05',
        workTypeId: 'wt_simple',
        hours: 10,
        createdAt: '2026-10-05',
      },
    ];

    const result = calculateDayWork(entries, sampleWorkTypes, sampleRates, '2026-10-05', defaultSettings);

    // Rate = ₹100/hr
    // 8 regular hours * 100 = 800
    // 2 overtime hours * 100 * 1.5 = 300
    // Total = 1100
    expect(result.regularHours).toBe(8);
    expect(result.overtimeHours).toBe(2);
    expect(result.regularEarnings).toBe(800);
    expect(result.overtimeEarnings).toBe(300);
    expect(result.totalDayEarnings).toBe(1100);
  });
});

describe('2. Multiple work types in one day', () => {
  it('calculates combined hours and applies overtime after total hourly hours exceed 8', () => {
    // 5 hours of Simple Labour Work (rate ₹100) + 5 hours of Charge (rate ₹120) = 10 total hours
    // Regular hours = 8 (5 hrs Simple + 3 hrs Charge)
    // Overtime hours = 2 (2 hrs Charge @ 120 * 1.5 = 360)
    const entries: WorkEntry[] = [
      {
        id: 'entry_1',
        employeeId: 'emp_labour_1',
        date: '2026-10-06',
        workTypeId: 'wt_simple',
        hours: 5,
        createdAt: '2026-10-06',
      },
      {
        id: 'entry_2',
        employeeId: 'emp_labour_1',
        date: '2026-10-06',
        workTypeId: 'wt_charge',
        hours: 5,
        createdAt: '2026-10-06',
      },
    ];

    const result = calculateDayWork(entries, sampleWorkTypes, sampleRates, '2026-10-06', defaultSettings);

    expect(result.totalHourlyHours).toBe(10);
    expect(result.regularHours).toBe(8);
    expect(result.overtimeHours).toBe(2);
    // Simple: 5 reg hrs * 100 = 500
    // Charge: 3 reg hrs * 120 = 360, 2 ot hrs * 120 * 1.5 = 360
    // Regular total: 500 + 360 = 860
    // OT total: 360
    // Total day: 860 + 360 = 1220
    expect(result.regularEarnings).toBe(860);
    expect(result.overtimeEarnings).toBe(360);
    expect(result.totalDayEarnings).toBe(1220);
  });
});

describe('3. Piece rates', () => {
  it('calculates piece-rate work based on quantity x rate per piece', () => {
    // 40 filters washed @ ₹25/filter = ₹1000
    const entries: WorkEntry[] = [
      {
        id: 'entry_piece',
        employeeId: 'emp_labour_1',
        date: '2026-10-07',
        workTypeId: 'wt_filter',
        quantity: 40,
        createdAt: '2026-10-07',
      },
    ];

    const result = calculateDayWork(entries, sampleWorkTypes, sampleRates, '2026-10-07', defaultSettings);

    expect(result.pieceQuantity).toBe(40);
    expect(result.pieceEarnings).toBe(1000);
    expect(result.regularHours).toBe(0);
    expect(result.overtimeHours).toBe(0);
    expect(result.totalDayEarnings).toBe(1000);
  });

  it('correctly combines piece-rate work and hourly work on the same day', () => {
    // 20 filters washed (20 * 25 = 500) + 8 hours Simple Labour (8 * 100 = 800) = 1300
    const entries: WorkEntry[] = [
      {
        id: 'entry_piece',
        employeeId: 'emp_labour_1',
        date: '2026-10-08',
        workTypeId: 'wt_filter',
        quantity: 20,
        createdAt: '2026-10-08',
      },
      {
        id: 'entry_hourly',
        employeeId: 'emp_labour_1',
        date: '2026-10-08',
        workTypeId: 'wt_simple',
        hours: 8,
        createdAt: '2026-10-08',
      },
    ];

    const result = calculateDayWork(entries, sampleWorkTypes, sampleRates, '2026-10-08', defaultSettings);

    expect(result.pieceQuantity).toBe(20);
    expect(result.pieceEarnings).toBe(500);
    expect(result.regularEarnings).toBe(800);
    expect(result.totalDayEarnings).toBe(1300);
  });
});

describe('4. Advances deducted in the same month', () => {
  it('deducts advance when mode is this_month in the same month', () => {
    const advances: Advance[] = [
      {
        id: 'adv_1',
        employeeId: 'emp_labour_1',
        amount: 2000,
        date: '2026-10-10',
        mode: 'this_month',
        note: 'Diwali expense advance',
        createdAt: '2026-10-10',
      },
    ];

    const octDue = getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-10');
    expect(octDue.totalDue).toBe(2000);

    const novDue = getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-11');
    expect(novDue.totalDue).toBe(0);
  });
});

describe('5. Advances moved to a later month', () => {
  it('deducts advance in target month when mode is upcoming_month', () => {
    const advances: Advance[] = [
      {
        id: 'adv_2',
        employeeId: 'emp_labour_1',
        amount: 3000,
        date: '2026-10-12',
        mode: 'upcoming_month',
        targetMonth: '2026-12',
        note: 'Festival loan to deduct in Dec',
        createdAt: '2026-10-12',
      },
    ];

    // In October (taken month): should not be due
    expect(getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-10').totalDue).toBe(0);
    // In November: should not be due
    expect(getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-11').totalDue).toBe(0);
    // In December: exactly 3000 due
    expect(getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-12').totalDue).toBe(3000);
  });
});

describe('6. Installments', () => {
  it('splits advance across specified number of months evenly', () => {
    // 3000 over 3 months starting October 2026 = 1000 in Oct, 1000 in Nov, 1000 in Dec
    const advances: Advance[] = [
      {
        id: 'adv_installments',
        employeeId: 'emp_labour_1',
        amount: 3000,
        date: '2026-10-05',
        mode: 'installments',
        installmentsCount: 3,
        note: 'Bicycle loan in 3 installments',
        createdAt: '2026-10-05',
      },
    ];

    expect(getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-10').totalDue).toBe(1000);
    expect(getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-11').totalDue).toBe(1000);
    expect(getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-12').totalDue).toBe(1000);
    expect(getAdvancesDueForMonth(advances, 'emp_labour_1', '2027-01').totalDue).toBe(0);
  });

  it('absorbs any fractional remainder cleanly on the final installment', () => {
    // 1000 over 3 months = 333.33 + 333.33 + 333.34 = 1000.00
    const advances: Advance[] = [
      {
        id: 'adv_frac',
        employeeId: 'emp_labour_1',
        amount: 1000,
        date: '2026-10-01',
        mode: 'installments',
        installmentsCount: 3,
        createdAt: '2026-10-01',
      },
    ];

    const m1 = getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-10').totalDue;
    const m2 = getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-11').totalDue;
    const m3 = getAdvancesDueForMonth(advances, 'emp_labour_1', '2026-12').totalDue;

    expect(m1).toBe(333.33);
    expect(m2).toBe(333.33);
    expect(m3).toBe(333.34);
    expect(Math.round((m1 + m2 + m3) * 100) / 100).toBe(1000);
  });
});

describe('7. Advance larger than salary (Automatic carry forward)', () => {
  it('caps deduction at earned salary and carries forward remaining balance to next month', () => {
    // Worker works 5 days of 8 hours @ ₹100/hr = ₹4,000 gross in October
    const entries: WorkEntry[] = [
      { id: 'e1', employeeId: 'emp_labour_1', date: '2026-10-01', workTypeId: 'wt_simple', hours: 8, createdAt: '2026-10-01' },
      { id: 'e2', employeeId: 'emp_labour_1', date: '2026-10-02', workTypeId: 'wt_simple', hours: 8, createdAt: '2026-10-02' },
      { id: 'e3', employeeId: 'emp_labour_1', date: '2026-10-03', workTypeId: 'wt_simple', hours: 8, createdAt: '2026-10-03' },
      { id: 'e4', employeeId: 'emp_labour_1', date: '2026-10-04', workTypeId: 'wt_simple', hours: 8, createdAt: '2026-10-04' },
      { id: 'e5', employeeId: 'emp_labour_1', date: '2026-10-05', workTypeId: 'wt_simple', hours: 8, createdAt: '2026-10-05' },
    ];

    // Advance of ₹6,000 taken in October to deduct in October
    const advances: Advance[] = [
      {
        id: 'adv_large',
        employeeId: 'emp_labour_1',
        amount: 6000,
        date: '2026-10-01',
        mode: 'this_month',
        createdAt: '2026-10-01',
      },
    ];

    // October Calculation:
    // Gross = ₹4,000
    // Advance due = ₹6,000
    // Deducted = ₹4,000 (salary cannot be negative)
    // Net Payable = 0
    // Carry forward to November = ₹2,000
    const octCalc = calculateLabourMonthlySalary(
      labourEmployee,
      '2026-10',
      entries,
      sampleWorkTypes,
      sampleRates,
      advances,
      defaultSettings
    );

    expect(octCalc.grossSalary).toBe(4000);
    expect(octCalc.advancesDue).toBe(6000);
    expect(octCalc.advancesDeducted).toBe(4000);
    expect(octCalc.netPayable).toBe(0);
    expect(octCalc.carryForwardToNextMonth).toBe(2000);

    // In November, worker works 10 days of 8 hours @ ₹100/hr = ₹8,000 gross
    const novEntries: WorkEntry[] = [
      ...entries,
      ...Array.from({ length: 10 }).map((_, i) => ({
        id: `e_nov_${i}`,
        employeeId: 'emp_labour_1',
        date: `2026-11-${String(i + 1).padStart(2, '0')}`,
        workTypeId: 'wt_simple',
        hours: 8,
        createdAt: '2026-11-01',
      })),
    ];

    const novCalc = calculateLabourMonthlySalary(
      labourEmployee,
      '2026-11',
      novEntries,
      sampleWorkTypes,
      sampleRates,
      advances,
      defaultSettings
    );

    // November Calculation:
    // Gross = ₹8,000
    // Advances due = ₹2,000 (carried forward from October)
    // Deducted = ₹2,000
    // Net Payable = 8,000 - 2,000 = ₹6,000
    // Carry forward to Dec = 0
    expect(novCalc.grossSalary).toBe(8000);
    expect(novCalc.broughtForwardFromPrevMonth).toBe(2000);
    expect(novCalc.advancesDue).toBe(2000);
    expect(novCalc.advancesDeducted).toBe(2000);
    expect(novCalc.netPayable).toBe(6000);
    expect(novCalc.carryForwardToNextMonth).toBe(0);
  });
});

describe('8. Fixed-salary leave deduction with 28/30/31-day months, half days, and paid leaves', () => {
  const staffEmployee: Employee = {
    id: 'emp_staff_1',
    type: 'fixed',
    name: 'Anil Sharma (Factory Manager)',
    phone: '9812345678',
    aadhaar: '987654321098',
    joiningDate: '2025-06-01',
    status: 'active',
    designation: 'Production Supervisor',
    monthlySalary: 31000, // ₹31,000/month
    paidLeavesPerMonth: 2, // 2 paid leaves allowed
    createdAt: '2025-06-01',
    updatedAt: '2025-06-01',
  };

  it('calculates 31-day month correctly (e.g. October)', () => {
    // In October (31 days):
    // Salary = 31,000 => perDayRate = 31,000 / 31 = ₹1000/day
    // Suppose 1 absent day and 2 half days = 1 + 2 * 0.5 = 2 days total absence
    // Allowed paid leaves = 2.
    // Unpaid leaves = 0 => 0 deduction! Net = 31,000
    const leaves: LeaveRecord[] = [
      { id: 'l1', employeeId: 'emp_staff_1', date: '2026-10-05', type: 'absent', createdAt: '2026-10-05' },
      { id: 'l2', employeeId: 'emp_staff_1', date: '2026-10-12', type: 'half_day', createdAt: '2026-10-12' },
      { id: 'l3', employeeId: 'emp_staff_1', date: '2026-10-19', type: 'half_day', createdAt: '2026-10-19' },
    ];

    const result = calculateStaffMonthlySalary(staffEmployee, '2026-10', leaves, [], defaultSettings);

    expect(result.totalDaysInMonth).toBe(31);
    expect(result.perDayRate).toBe(1000);
    expect(result.paidLeavesUsed).toBe(2);
    expect(result.unpaidLeaves).toBe(0);
    expect(result.leaveDeduction).toBe(0);
    expect(result.grossSalaryAfterLeaves).toBe(31000);
    expect(result.netPayable).toBe(31000);
  });

  it('calculates unpaid leaves and half-days exceeding allowed limit', () => {
    // 3 absent days + 1 half day = 3.5 absence days
    // Allowed paid leaves = 2
    // Unpaid leaves = 1.5 days
    // Deduction in Oct (31 days, ₹1000/day) = 1.5 * 1000 = ₹1500
    // Gross after leaves = 31000 - 1500 = ₹29,500
    const leaves: LeaveRecord[] = [
      { id: 'l1', employeeId: 'emp_staff_1', date: '2026-10-02', type: 'absent', createdAt: '2026-10-02' },
      { id: 'l2', employeeId: 'emp_staff_1', date: '2026-10-03', type: 'absent', createdAt: '2026-10-03' },
      { id: 'l3', employeeId: 'emp_staff_1', date: '2026-10-04', type: 'absent', createdAt: '2026-10-04' },
      { id: 'l4', employeeId: 'emp_staff_1', date: '2026-10-05', type: 'half_day', createdAt: '2026-10-05' },
    ];

    const result = calculateStaffMonthlySalary(staffEmployee, '2026-10', leaves, [], defaultSettings);

    expect(result.paidLeavesUsed).toBe(2);
    expect(result.unpaidLeaves).toBe(1.5);
    expect(result.leaveDeduction).toBe(1500);
    expect(result.grossSalaryAfterLeaves).toBe(29500);
    expect(result.netPayable).toBe(29500);
  });

  it('calculates 30-day month (e.g. November)', () => {
    // Salary = ₹30,000, November has 30 days => perDayRate = ₹1000/day
    const staff30k: Employee = { ...staffEmployee, monthlySalary: 30000 };
    const leaves: LeaveRecord[] = [
      { id: 'l1', employeeId: 'emp_staff_1', date: '2026-11-05', type: 'absent', createdAt: '2026-11-05' },
      { id: 'l2', employeeId: 'emp_staff_1', date: '2026-11-06', type: 'absent', createdAt: '2026-11-06' },
      { id: 'l3', employeeId: 'emp_staff_1', date: '2026-11-07', type: 'absent', createdAt: '2026-11-07' }, // 3 absences, 2 paid -> 1 unpaid
    ];

    const result = calculateStaffMonthlySalary(staff30k, '2026-11', leaves, [], defaultSettings);

    expect(result.totalDaysInMonth).toBe(30);
    expect(result.perDayRate).toBe(1000);
    expect(result.unpaidLeaves).toBe(1);
    expect(result.leaveDeduction).toBe(1000);
    expect(result.netPayable).toBe(29000);
  });

  it('calculates 28-day month (February non-leap year)', () => {
    // 2025-02 has 28 days
    expect(getDaysInMonth('2025-02')).toBe(28);
    // 2024-02 has 29 days (leap year)
    expect(getDaysInMonth('2024-02')).toBe(29);

    const staff28k: Employee = { ...staffEmployee, monthlySalary: 28000 };
    // 3 absent days, 2 paid leaves allowed => 1 unpaid leave
    const leaves: LeaveRecord[] = [
      { id: 'l1', employeeId: 'emp_staff_1', date: '2025-02-05', type: 'absent', createdAt: '2025-02-05' },
      { id: 'l2', employeeId: 'emp_staff_1', date: '2025-02-06', type: 'absent', createdAt: '2025-02-06' },
      { id: 'l3', employeeId: 'emp_staff_1', date: '2025-02-07', type: 'absent', createdAt: '2025-02-07' },
    ];

    const result = calculateStaffMonthlySalary(staff28k, '2025-02', leaves, [], defaultSettings);

    expect(result.totalDaysInMonth).toBe(28);
    expect(result.perDayRate).toBe(1000);
    expect(result.unpaidLeaves).toBe(1);
    expect(result.leaveDeduction).toBe(1000);
    expect(result.netPayable).toBe(27000);
  });

  it('supports fixed 30-day basis setting regardless of calendar month length', () => {
    const fixed30Settings: GlobalSettings = {
      ...defaultSettings,
      monthDayBasis: 'fixed_30',
    };

    expect(getDaysInMonth('2026-10', 'fixed_30')).toBe(30);
    expect(getDaysInMonth('2025-02', 'fixed_30')).toBe(30);

    const staff30k: Employee = { ...staffEmployee, monthlySalary: 30000 };
    const leaves: LeaveRecord[] = [
      { id: 'l1', employeeId: 'emp_staff_1', date: '2025-02-05', type: 'absent', createdAt: '2025-02-05' },
      { id: 'l2', employeeId: 'emp_staff_1', date: '2025-02-06', type: 'absent', createdAt: '2025-02-06' },
      { id: 'l3', employeeId: 'emp_staff_1', date: '2025-02-07', type: 'absent', createdAt: '2025-02-07' },
    ];

    const result = calculateStaffMonthlySalary(staff30k, '2025-02', leaves, [], fixed30Settings);
    expect(result.totalDaysInMonth).toBe(30);
    expect(result.perDayRate).toBe(1000);
  });
});
