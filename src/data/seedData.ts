import {
  Employee,
  WorkType,
  EmployeeRate,
  WorkEntry,
  Advance,
  LeaveRecord,
  SalaryPayment,
  GlobalSettings,
} from '../types';

export const initialSettings: GlobalSettings = {
  companyName: 'M/S GANESH AGRO',
  companyAddress: 'Industrial Focal Point, Patiala Road, Sangrur, Punjab - 148001',
  companyPhone: '+91 98120 44555',
  companyWebsite: 'www.ganeshagrosangrur.com',
  companyEmail: 'info@ganeshagrosangrur.com',
  standardHoursPerDay: 8,
  overtimeMultiplier: 1.5,
  monthDayBasis: 'calendar',
  currencySymbol: '₹',
  language: 'en',
  theme: 'light',
  allowPieceRateHours: true,
};

export const initialWorkTypes: WorkType[] = [
  {
    id: 'wt_simple_labour',
    name: 'Simple Labour Work',
    nameHi: 'Simple Labour Work',
    payModel: 'hourly',
    defaultRate: 100, // ₹100/hour (8 hours = ₹800/day)
    standardHours: 8,
    overtimeMultiplier: 1.5, // ₹150/hour overtime
    isBuiltIn: true,
    active: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'wt_filter_wash',
    name: 'Filter Wash & Assembly',
    nameHi: 'Filter Wash & Assembly',
    payModel: 'piece',
    defaultRate: 25, // ₹25 per filter washed
    isBuiltIn: true,
    allowHoursForPiece: true,
    active: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'wt_charge',
    name: 'Charge & Machinery Fitting',
    nameHi: 'Charge & Machinery Fitting',
    payModel: 'hourly',
    defaultRate: 120, // ₹120/hour
    standardHours: 8,
    overtimeMultiplier: 1.5, // ₹180/hour overtime
    isBuiltIn: true,
    active: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'wt_lathe_turning',
    name: 'Welding & Lathe Fabrication',
    nameHi: 'Welding & Lathe Fabrication',
    payModel: 'hourly',
    defaultRate: 150, // ₹150/hour
    standardHours: 8,
    overtimeMultiplier: 1.5,
    isBuiltIn: false,
    active: true,
    createdAt: '2026-01-01',
  },
];

export const initialEmployees: Employee[] = [
  // 3 Labourers
  {
    id: 'emp_labour_1',
    type: 'labour',
    name: 'Ramesh Kumar',
    phone: '9876543210',
    aadhaar: '542198763214',
    joiningDate: '2025-04-10',
    status: 'active',
    notes: 'Experienced in agricultural implement fabrication and machine assembly.',
    createdAt: '2025-04-10',
    updatedAt: '2026-11-01',
  },
  {
    id: 'emp_labour_2',
    type: 'labour',
    name: 'Suresh Prajapati',
    phone: '9812309876',
    aadhaar: '782341908561',
    joiningDate: '2025-07-15',
    status: 'active',
    notes: 'Tractor filter washing, painting, and parts assembly specialist.',
    createdAt: '2025-07-15',
    updatedAt: '2026-11-01',
  },
  {
    id: 'emp_labour_3',
    type: 'labour',
    name: 'Dinesh Yadav',
    phone: '9845012345',
    aadhaar: '321098456712',
    joiningDate: '2026-01-05',
    status: 'active',
    notes: 'General factory helper and agricultural machinery loading.',
    createdAt: '2026-01-05',
    updatedAt: '2026-11-01',
  },
  // 1 Fixed Staff
  {
    id: 'emp_staff_1',
    type: 'fixed',
    name: 'Anil Sharma',
    phone: '9899011223',
    aadhaar: '908712345678',
    joiningDate: '2024-11-01',
    status: 'active',
    designation: 'Plant & Production Supervisor',
    monthlySalary: 32000, // ₹32,000 / month
    paidLeavesPerMonth: 2, // 2 paid leaves allowed
    notes: 'Oversees agricultural implement manufacturing, quality testing, and factory staff.',
    createdAt: '2024-11-01',
    updatedAt: '2026-11-01',
  },
];

// Individual labourer rates (can vary from default)
export const initialEmployeeRates: EmployeeRate[] = [
  // Ramesh Kumar rates
  {
    id: 'rate_rk_1',
    employeeId: 'emp_labour_1',
    workTypeId: 'wt_simple_labour',
    rate: 110, // ₹110/hr (higher than default ₹100)
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'rate_rk_2',
    employeeId: 'emp_labour_1',
    workTypeId: 'wt_filter_wash',
    rate: 28, // ₹28/filter
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'rate_rk_3',
    employeeId: 'emp_labour_1',
    workTypeId: 'wt_charge',
    rate: 130,
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'rate_rk_4',
    employeeId: 'emp_labour_1',
    workTypeId: 'wt_lathe_turning',
    rate: 160,
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },

  // Suresh Prajapati rates
  {
    id: 'rate_sp_1',
    employeeId: 'emp_labour_2',
    workTypeId: 'wt_simple_labour',
    rate: 100,
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'rate_sp_2',
    employeeId: 'emp_labour_2',
    workTypeId: 'wt_filter_wash',
    rate: 30, // ₹30/filter for Suresh
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'rate_sp_3',
    employeeId: 'emp_labour_2',
    workTypeId: 'wt_charge',
    rate: 120,
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },

  // Dinesh Yadav rates (standard)
  {
    id: 'rate_dy_1',
    employeeId: 'emp_labour_3',
    workTypeId: 'wt_simple_labour',
    rate: 90, // ₹90/hr for junior helper
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'rate_dy_2',
    employeeId: 'emp_labour_3',
    workTypeId: 'wt_filter_wash',
    rate: 25,
    effectiveFrom: '2026-01-01',
    createdAt: '2026-01-01',
  },
];

// Generate work entries for previous month (October 2026) and current month (November 2026)
export const generateSeedWorkEntries = (): WorkEntry[] => {
  const entries: WorkEntry[] = [];
  let idCounter = 1;

  // October 2026 entries (previous month)
  // 24 working days in Oct
  for (let day = 1; day <= 28; day++) {
    // Skip Sundays
    const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(2026, 9, day);
    if (dateObj.getDay() === 0) continue; // Sunday

    // Ramesh Kumar
    if (day % 4 !== 0) {
      const otHours = day % 6 === 0 ? 2 : 0; // occasional OT
      entries.push({
        id: `we_${idCounter++}`,
        employeeId: 'emp_labour_1',
        date: dateStr,
        workTypeId: 'wt_simple_labour',
        hours: 8 + otHours,
        note: otHours > 0 ? 'Urgent assembly shift' : undefined,
        createdAt: dateStr,
      });

      // Also washed filters on some days
      if (day % 3 === 0) {
        entries.push({
          id: `we_${idCounter++}`,
          employeeId: 'emp_labour_1',
          date: dateStr,
          workTypeId: 'wt_filter_wash',
          quantity: 15,
          createdAt: dateStr,
        });
      }
    }

    // Suresh Prajapati
    if (day % 5 !== 0) {
      entries.push({
        id: `we_${idCounter++}`,
        employeeId: 'emp_labour_2',
        date: dateStr,
        workTypeId: 'wt_filter_wash',
        quantity: 35,
        note: 'Engine intake filters',
        createdAt: dateStr,
      });

      if (day % 2 === 0) {
        entries.push({
          id: `we_${idCounter++}`,
          employeeId: 'emp_labour_2',
          date: dateStr,
          workTypeId: 'wt_charge',
          hours: 4,
          createdAt: dateStr,
        });
      }
    }

    // Dinesh Yadav
    if (day % 7 !== 0) {
      entries.push({
        id: `we_${idCounter++}`,
        employeeId: 'emp_labour_3',
        date: dateStr,
        workTypeId: 'wt_simple_labour',
        hours: 8,
        createdAt: dateStr,
      });
    }
  }

  // Current month (November 2026 up to today 16th)
  for (let day = 1; day <= 16; day++) {
    const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(2026, 10, day);
    if (dateObj.getDay() === 0) continue;

    // Ramesh
    entries.push({
      id: `we_${idCounter++}`,
      employeeId: 'emp_labour_1',
      date: dateStr,
      workTypeId: 'wt_simple_labour',
      hours: day === 16 ? 9 : 8,
      note: day === 16 ? 'Today overtime 1 hr' : undefined,
      isEdited: day === 14,
      createdAt: dateStr,
    });

    // Suresh
    entries.push({
      id: `we_${idCounter++}`,
      employeeId: 'emp_labour_2',
      date: dateStr,
      workTypeId: 'wt_filter_wash',
      quantity: day === 16 ? 42 : 30,
      createdAt: dateStr,
    });

    // Dinesh
    entries.push({
      id: `we_${idCounter++}`,
      employeeId: 'emp_labour_3',
      date: dateStr,
      workTypeId: 'wt_simple_labour',
      hours: 8,
      createdAt: dateStr,
    });
  }

  return entries;
};

export const initialAdvances: Advance[] = [
  {
    id: 'adv_rk_1',
    employeeId: 'emp_labour_1',
    amount: 2500,
    date: '2026-10-12',
    mode: 'this_month',
    note: 'Festival expense advance for Diwali',
    createdAt: '2026-10-12',
  },
  {
    id: 'adv_sp_1',
    employeeId: 'emp_labour_2',
    amount: 3000,
    date: '2026-10-05',
    mode: 'installments',
    installmentsCount: 3,
    note: 'Children school fees loan (₹1,000/mo over 3 months)',
    createdAt: '2026-10-05',
  },
  {
    id: 'adv_dy_1',
    employeeId: 'emp_labour_3',
    amount: 1500,
    date: '2026-11-04',
    mode: 'this_month',
    note: 'Medical checkup advance',
    createdAt: '2026-11-04',
  },
  {
    id: 'adv_staff_1',
    employeeId: 'emp_staff_1',
    amount: 5000,
    date: '2026-10-20',
    mode: 'upcoming_month',
    targetMonth: '2026-11',
    note: 'House maintenance advance (to deduct in Nov)',
    createdAt: '2026-10-20',
  },
];

export const initialLeaves: LeaveRecord[] = [
  // October 2026 leaves for Anil Sharma
  {
    id: 'leave_1',
    employeeId: 'emp_staff_1',
    date: '2026-10-08',
    type: 'paid_leave',
    note: 'Family function (paid leave)',
    createdAt: '2026-10-08',
  },
  {
    id: 'leave_2',
    employeeId: 'emp_staff_1',
    date: '2026-10-21',
    type: 'half_day',
    note: 'Dentist appointment afternoon',
    createdAt: '2026-10-21',
  },
  // November 2026 leaves
  {
    id: 'leave_3',
    employeeId: 'emp_staff_1',
    date: '2026-11-06',
    type: 'absent',
    note: 'Personal errand',
    createdAt: '2026-11-06',
  },
];

export const initialSalaryPayments: SalaryPayment[] = [
  // October payment already recorded as paid for Ramesh
  {
    id: 'sp_rk_oct',
    employeeId: 'emp_labour_1',
    month: '2026-10',
    grossAmount: 22880,
    advancesDeducted: 2500,
    carryForwardAdvance: 0,
    netAmount: 20380,
    status: 'paid',
    paidDate: '2026-11-05',
    paymentMode: 'upi',
    notes: 'Paid via GPay ref UPI/2611059912',
    updatedAt: '2026-11-05',
  },
];
