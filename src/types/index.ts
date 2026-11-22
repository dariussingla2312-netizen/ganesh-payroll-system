export type EmployeeType = 'labour' | 'fixed';
export type EmployeeStatus = 'active' | 'archived';
export type PayModel = 'hourly' | 'piece';
export type AdvanceMode = 'this_month' | 'upcoming_month' | 'installments';
export type LeaveType = 'present' | 'absent' | 'half_day' | 'paid_leave';
export type PaymentStatus = 'pending' | 'paid';
export type PaymentMode = 'cash' | 'upi' | 'bank';

export interface Employee {
  id: string;
  type: EmployeeType;
  name: string;
  phone?: string;
  aadhaar?: string; // 12-digit number
  joiningDate: string; // YYYY-MM-DD
  status: EmployeeStatus;
  notes?: string;
  // For fixed staff
  designation?: string;
  monthlySalary?: number;
  paidLeavesPerMonth?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkType {
  id: string;
  name: string;
  nameHi?: string;
  payModel: PayModel; // 'hourly' or 'piece'
  defaultRate: number;
  standardHours?: number; // default 8
  overtimeMultiplier?: number; // default 1.5, or 1.0
  isBuiltIn?: boolean;
  allowHoursForPiece?: boolean;
  active: boolean;
  createdAt?: string;
}

export interface EmployeeRate {
  id: string;
  employeeId: string;
  workTypeId: string;
  rate: number;
  effectiveFrom: string; // YYYY-MM-DD
  createdAt: string;
}

export interface WorkEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  workTypeId: string;
  hours?: number; // for hourly (or piece if allowed)
  quantity?: number; // for piece rate
  note?: string;
  isEdited?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Advance {
  id: string;
  employeeId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  mode: AdvanceMode;
  targetMonth?: string; // YYYY-MM for upcoming_month
  installmentsCount?: number; // e.g. 3 months
  note?: string;
  createdAt: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: LeaveType;
  note?: string;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  grossAmount: number;
  advancesDeducted: number;
  carryForwardAdvance: number;
  netAmount: number;
  status: PaymentStatus;
  paidDate?: string;
  paymentMode?: PaymentMode;
  notes?: string;
  updatedAt: string;
}

export interface GlobalSettings {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyEmail?: string;
  standardHoursPerDay: number; // default 8
  overtimeMultiplier: number; // default 1.5
  monthDayBasis: 'calendar' | 'fixed_30';
  currencySymbol: string; // '₹'
  language: 'en' | 'hi';
  theme: 'light' | 'dark';
  allowPieceRateHours: boolean;
}

export interface WorkTypeSummary {
  workTypeId: string;
  workTypeName: string;
  workTypeNameHi?: string;
  payModel: PayModel;
  rate: number;
  regularHours: number;
  overtimeHours: number;
  quantity: number;
  regularAmount: number;
  overtimeAmount: number;
  pieceAmount: number;
  totalAmount: number;
}

export interface LabourMonthlyCalculation {
  employeeId: string;
  month: string; // YYYY-MM
  totalDaysWorked: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalPieceQuantity: number;
  grossRegularAmount: number;
  grossOvertimeAmount: number;
  grossPieceAmount: number;
  grossSalary: number;
  advancesDue: number;
  advancesDeducted: number;
  carryForwardToNextMonth: number;
  broughtForwardFromPrevMonth: number;
  netPayable: number;
  workTypeBreakdowns: WorkTypeSummary[];
  dayWiseDetails: {
    date: string;
    entries: WorkEntry[];
    regularHours: number;
    overtimeHours: number;
    pieceQuantity: number;
    dayEarnings: number;
  }[];
}

export interface StaffMonthlyCalculation {
  employeeId: string;
  month: string; // YYYY-MM
  monthlySalary: number;
  totalDaysInMonth: number;
  perDayRate: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeavesUsed: number;
  unpaidLeaves: number;
  leaveDeduction: number;
  grossSalaryAfterLeaves: number;
  advancesDue: number;
  advancesDeducted: number;
  carryForwardToNextMonth: number;
  broughtForwardFromPrevMonth: number;
  netPayable: number;
}
