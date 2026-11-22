import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
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
import {
  initialEmployees,
  initialWorkTypes,
  initialEmployeeRates,
  generateSeedWorkEntries,
  initialAdvances,
  initialLeaves,
  initialSalaryPayments,
  initialSettings,
} from '../data/seedData';

interface DataContextType {
  employees: Employee[];
  workTypes: WorkType[];
  employeeRates: EmployeeRate[];
  workEntries: WorkEntry[];
  advances: Advance[];
  leaves: LeaveRecord[];
  salaryPayments: SalaryPayment[];
  settings: GlobalSettings;
  isLoading: boolean;
  isFirebaseActive: boolean;

  // Actions
  addEmployee: (emp: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>, initialRates?: Record<string, number>) => Promise<string>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  archiveEmployee: (id: string) => Promise<void>;
  restoreEmployee: (id: string) => Promise<void>;

  addWorkType: (wt: Omit<WorkType, 'id'>) => Promise<string>;
  updateWorkType: (id: string, updates: Partial<WorkType>) => Promise<void>;
  deleteWorkType: (id: string) => Promise<void>;

  setEmployeeRate: (employeeId: string, workTypeId: string, rate: number, effectiveFrom: string) => Promise<void>;

  saveDailyWorkEntries: (entriesToSave: (Omit<WorkEntry, 'id' | 'createdAt'> & { id?: string })[]) => Promise<void>;
  deleteWorkEntry: (id: string) => Promise<void>;

  addAdvance: (adv: Omit<Advance, 'id' | 'createdAt'>) => Promise<string>;
  deleteAdvance: (id: string) => Promise<void>;

  saveLeaveRecord: (leave: Omit<LeaveRecord, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  deleteLeaveRecord: (id: string) => Promise<void>;

  recordSalaryPayment: (payment: Omit<SalaryPayment, 'id' | 'updatedAt'>) => Promise<void>;
  updateSettings: (updates: Partial<GlobalSettings>) => Promise<void>;

  loadDemoData: () => Promise<void>;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  employees: 'staff_payroll_employees',
  workTypes: 'staff_payroll_work_types',
  employeeRates: 'staff_payroll_employee_rates',
  workEntries: 'staff_payroll_work_entries',
  advances: 'staff_payroll_advances',
  leaves: 'staff_payroll_leaves',
  salaryPayments: 'staff_payroll_salary_payments',
  settings: 'staff_payroll_settings',
  version: 'staff_payroll_data_version',
};

const CURRENT_DATA_VERSION = 'ganesh_agro_sangrur_v7';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [employeeRates, setEmployeeRates] = useState<EmployeeRate[]>([]);
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize or fallback to seed data in localStorage
  const initLocalData = useCallback(() => {
    try {
      const storedVersion = localStorage.getItem(LOCAL_STORAGE_KEYS.version);
      if (storedVersion !== CURRENT_DATA_VERSION) {
        // Upgrade / Migrate to M/S GANESH AGRO (Sangrur, Punjab)
        localStorage.setItem(LOCAL_STORAGE_KEYS.employees, JSON.stringify(initialEmployees));
        localStorage.setItem(LOCAL_STORAGE_KEYS.workTypes, JSON.stringify(initialWorkTypes));
        localStorage.setItem(LOCAL_STORAGE_KEYS.employeeRates, JSON.stringify(initialEmployeeRates));
        localStorage.setItem(LOCAL_STORAGE_KEYS.workEntries, JSON.stringify(generateSeedWorkEntries()));
        localStorage.setItem(LOCAL_STORAGE_KEYS.advances, JSON.stringify(initialAdvances));
        localStorage.setItem(LOCAL_STORAGE_KEYS.leaves, JSON.stringify(initialLeaves));
        localStorage.setItem(LOCAL_STORAGE_KEYS.salaryPayments, JSON.stringify(initialSalaryPayments));
        localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(initialSettings));
        localStorage.setItem('staff_payroll_lang', 'en');
        localStorage.setItem(LOCAL_STORAGE_KEYS.version, CURRENT_DATA_VERSION);
      }

      const rawSettings = localStorage.getItem(LOCAL_STORAGE_KEYS.settings);
      let loadedSettings: GlobalSettings = initialSettings;
      if (rawSettings) {
        try {
          loadedSettings = { ...initialSettings, ...JSON.parse(rawSettings) };
        } catch (e) {}
      }
      loadedSettings.companyName = 'M/S GANESH AGRO';
      loadedSettings.companyAddress = 'Industrial Focal Point, Patiala Road, Sangrur, Punjab - 148001';
      loadedSettings.companyWebsite = 'www.ganeshagrosangrur.com';
      loadedSettings.companyEmail = loadedSettings.companyEmail || 'info@ganeshagrosangrur.com';
      loadedSettings.language = 'en';
      localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(loadedSettings));
      localStorage.setItem('staff_payroll_lang', 'en');

      setEmployees(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.employees) || JSON.stringify(initialEmployees)));
      setWorkTypes(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.workTypes) || JSON.stringify(initialWorkTypes)));
      setEmployeeRates(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.employeeRates) || JSON.stringify(initialEmployeeRates)));
      setWorkEntries(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.workEntries) || '[]'));
      setAdvances(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.advances) || '[]'));
      setLeaves(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.leaves) || '[]'));
      setSalaryPayments(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.salaryPayments) || '[]'));
      setSettings(loadedSettings);
    } catch (e) {
      console.error('Error loading local data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured && db) {
      // Setup real-time Firestore onSnapshot listeners
      setIsLoading(true);

      const unsubs = [
        onSnapshot(collection(db, 'employees'), (snapshot) => {
          const items: Employee[] = [];
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Employee));
          if (items.length > 0) {
            setEmployees(items);
            localStorage.setItem(LOCAL_STORAGE_KEYS.employees, JSON.stringify(items));
          } else {
            // First time in Firestore: seed initial employees
            initLocalData();
          }
        }),

        onSnapshot(collection(db, 'workTypes'), (snapshot) => {
          const items: WorkType[] = [];
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as WorkType));
          if (items.length > 0) {
            setWorkTypes(items);
            localStorage.setItem(LOCAL_STORAGE_KEYS.workTypes, JSON.stringify(items));
          }
        }),

        onSnapshot(collection(db, 'employeeRates'), (snapshot) => {
          const items: EmployeeRate[] = [];
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as EmployeeRate));
          setEmployeeRates(items);
          localStorage.setItem(LOCAL_STORAGE_KEYS.employeeRates, JSON.stringify(items));
        }),

        onSnapshot(collection(db, 'workEntries'), (snapshot) => {
          const items: WorkEntry[] = [];
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as WorkEntry));
          setWorkEntries(items);
          localStorage.setItem(LOCAL_STORAGE_KEYS.workEntries, JSON.stringify(items));
        }),

        onSnapshot(collection(db, 'advances'), (snapshot) => {
          const items: Advance[] = [];
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Advance));
          setAdvances(items);
          localStorage.setItem(LOCAL_STORAGE_KEYS.advances, JSON.stringify(items));
        }),

        onSnapshot(collection(db, 'leaves'), (snapshot) => {
          const items: LeaveRecord[] = [];
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as LeaveRecord));
          setLeaves(items);
          localStorage.setItem(LOCAL_STORAGE_KEYS.leaves, JSON.stringify(items));
        }),

        onSnapshot(collection(db, 'salaryPayments'), (snapshot) => {
          const items: SalaryPayment[] = [];
          snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as SalaryPayment));
          setSalaryPayments(items);
          localStorage.setItem(LOCAL_STORAGE_KEYS.salaryPayments, JSON.stringify(items));
        }),

        onSnapshot(collection(db, 'settings'), (snapshot) => {
          let s = initialSettings;
          snapshot.forEach((doc) => {
            if (doc.id === 'global') {
              s = { ...initialSettings, ...doc.data() } as GlobalSettings;
            }
          });
          if (!s.companyName || s.companyName === 'Bharat Precision Engineering Works' || s.companyName === 'Staff Payroll Manager' || s.companyName === 'Sharma Agro & Engineering Works') {
            s.companyName = 'M/S GANESH AGRO';
          }
          s.language = 'en';
          setSettings(s);
          localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(s));
          setIsLoading(false);
        }),
      ];

      return () => {
        unsubs.forEach((unsub) => unsub());
      };
    } else {
      // Local storage mode
      initLocalData();

      // Listen for cross-tab storage changes
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key && Object.values(LOCAL_STORAGE_KEYS).includes(e.key)) {
          initLocalData();
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [initLocalData]);

  // CRUD Implementations

  const addEmployee = async (
    empData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>,
    initialRates?: Record<string, number>
  ): Promise<string> => {
    const id = `emp_${Date.now()}`;
    const now = new Date().toISOString();
    const newEmp: Employee = {
      ...empData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'employees', id), newEmp);
      if (initialRates) {
        for (const [wtId, rate] of Object.entries(initialRates)) {
          const rateId = `rate_${id}_${wtId}_${Date.now()}`;
          const rateRecord: EmployeeRate = {
            id: rateId,
            employeeId: id,
            workTypeId: wtId,
            rate,
            effectiveFrom: empData.joiningDate || now.substring(0, 10),
            createdAt: now,
          };
          await setDoc(doc(db, 'employeeRates', rateId), rateRecord);
        }
      }
    } else {
      const updated = [...employees, newEmp];
      setEmployees(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.employees, JSON.stringify(updated));

      if (initialRates) {
        const newRatesList = [...employeeRates];
        for (const [wtId, rate] of Object.entries(initialRates)) {
          const rateRecord: EmployeeRate = {
            id: `rate_${id}_${wtId}_${Date.now()}`,
            employeeId: id,
            workTypeId: wtId,
            rate,
            effectiveFrom: empData.joiningDate || now.substring(0, 10),
            createdAt: now,
          };
          newRatesList.push(rateRecord);
        }
        setEmployeeRates(newRatesList);
        localStorage.setItem(LOCAL_STORAGE_KEYS.employeeRates, JSON.stringify(newRatesList));
      }
    }
    return id;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<void> => {
    const now = new Date().toISOString();
    const updatedEmp = { ...updates, updatedAt: now };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'employees', id), updatedEmp, { merge: true });
    } else {
      const updated = employees.map((e) => (e.id === id ? { ...e, ...updatedEmp } : e));
      setEmployees(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.employees, JSON.stringify(updated));
    }
  };

  const archiveEmployee = async (id: string): Promise<void> => {
    await updateEmployee(id, { status: 'archived' });
  };

  const restoreEmployee = async (id: string): Promise<void> => {
    await updateEmployee(id, { status: 'active' });
  };

  const addWorkType = async (wtData: Omit<WorkType, 'id'>): Promise<string> => {
    const id = `wt_${Date.now()}`;
    const newWt: WorkType = {
      ...wtData,
      id,
      createdAt: new Date().toISOString().substring(0, 10),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'workTypes', id), newWt);
    } else {
      const updated = [...workTypes, newWt];
      setWorkTypes(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.workTypes, JSON.stringify(updated));
    }
    return id;
  };

  const updateWorkType = async (id: string, updates: Partial<WorkType>): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'workTypes', id), updates, { merge: true });
    } else {
      const updated = workTypes.map((wt) => (wt.id === id ? { ...wt, ...updates } : wt));
      setWorkTypes(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.workTypes, JSON.stringify(updated));
    }
  };

  const deleteWorkType = async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'workTypes', id));
    } else {
      const updated = workTypes.filter((wt) => wt.id !== id);
      setWorkTypes(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.workTypes, JSON.stringify(updated));
    }
  };

  const setEmployeeRate = async (
    employeeId: string,
    workTypeId: string,
    rate: number,
    effectiveFrom: string
  ): Promise<void> => {
    const id = `rate_${employeeId}_${workTypeId}_${Date.now()}`;
    const newRate: EmployeeRate = {
      id,
      employeeId,
      workTypeId,
      rate,
      effectiveFrom,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'employeeRates', id), newRate);
    } else {
      const updated = [...employeeRates, newRate];
      setEmployeeRates(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.employeeRates, JSON.stringify(updated));
    }
  };

  const saveDailyWorkEntries = async (
    entriesToSave: (Omit<WorkEntry, 'id' | 'createdAt'> & { id?: string })[]
  ): Promise<void> => {
    const now = new Date().toISOString();

    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      for (const entry of entriesToSave) {
        const isExisting = !!entry.id;
        const entryId = entry.id || `we_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const record: WorkEntry = {
          ...entry,
          id: entryId,
          isEdited: isExisting ? true : false,
          updatedAt: isExisting ? now : undefined,
          createdAt: isExisting ? (entry as WorkEntry).createdAt || now : now,
        };
        batch.set(doc(db, 'workEntries', entryId), record);
      }
      await batch.commit();
    } else {
      const existingMap = new Map<string, WorkEntry>();
      workEntries.forEach((e) => existingMap.set(e.id, e));

      for (const entry of entriesToSave) {
        if (entry.id && existingMap.has(entry.id)) {
          const old = existingMap.get(entry.id)!;
          existingMap.set(entry.id, {
            ...old,
            ...entry,
            isEdited: true,
            updatedAt: now,
          });
        } else {
          const newId = entry.id || `we_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          existingMap.set(newId, {
            ...entry,
            id: newId,
            createdAt: now,
          });
        }
      }

      const updated = Array.from(existingMap.values());
      setWorkEntries(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.workEntries, JSON.stringify(updated));
    }
  };

  const deleteWorkEntry = async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'workEntries', id));
    } else {
      const updated = workEntries.filter((e) => e.id !== id);
      setWorkEntries(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.workEntries, JSON.stringify(updated));
    }
  };

  const addAdvance = async (advData: Omit<Advance, 'id' | 'createdAt'>): Promise<string> => {
    const id = `adv_${Date.now()}`;
    const newAdv: Advance = {
      ...advData,
      id,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'advances', id), newAdv);
    } else {
      const updated = [...advances, newAdv];
      setAdvances(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.advances, JSON.stringify(updated));
    }
    return id;
  };

  const deleteAdvance = async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'advances', id));
    } else {
      const updated = advances.filter((a) => a.id !== id);
      setAdvances(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.advances, JSON.stringify(updated));
    }
  };

  const saveLeaveRecord = async (
    leaveData: Omit<LeaveRecord, 'id' | 'createdAt'> & { id?: string }
  ): Promise<void> => {
    const now = new Date().toISOString();
    // Check if a leave for this employee on this date already exists
    const existing = leaves.find(
      (l) => l.employeeId === leaveData.employeeId && l.date === leaveData.date
    );

    const id = leaveData.id || existing?.id || `leave_${Date.now()}`;
    const record: LeaveRecord = {
      ...leaveData,
      id,
      createdAt: existing?.createdAt || now,
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'leaves', id), record);
    } else {
      const updated = leaves.filter((l) => l.id !== id);
      updated.push(record);
      setLeaves(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.leaves, JSON.stringify(updated));
    }
  };

  const deleteLeaveRecord = async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'leaves', id));
    } else {
      const updated = leaves.filter((l) => l.id !== id);
      setLeaves(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.leaves, JSON.stringify(updated));
    }
  };

  const recordSalaryPayment = async (paymentData: Omit<SalaryPayment, 'id' | 'updatedAt'>): Promise<void> => {
    const existing = salaryPayments.find(
      (sp) => sp.employeeId === paymentData.employeeId && sp.month === paymentData.month
    );
    const id = existing?.id || `sp_${paymentData.employeeId}_${paymentData.month}`;
    const record: SalaryPayment = {
      ...paymentData,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'salaryPayments', id), record);
    } else {
      const updated = salaryPayments.filter((sp) => sp.id !== id);
      updated.push(record);
      setSalaryPayments(updated);
      localStorage.setItem(LOCAL_STORAGE_KEYS.salaryPayments, JSON.stringify(updated));
    }
  };

  const updateSettings = async (updates: Partial<GlobalSettings>): Promise<void> => {
    const newSettings = { ...settings, ...updates };
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'settings', 'global'), newSettings, { merge: true });
    } else {
      setSettings(newSettings);
      localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(newSettings));
    }
  };

  const loadDemoData = async (): Promise<void> => {
    setIsLoading(true);
    const seedEntries = generateSeedWorkEntries();

    if (isFirebaseConfigured && db) {
      const firestore = db;
      const batch = writeBatch(firestore);

      // Employees
      initialEmployees.forEach((emp) => batch.set(doc(firestore, 'employees', emp.id), emp));
      // Work Types
      initialWorkTypes.forEach((wt) => batch.set(doc(firestore, 'workTypes', wt.id), wt));
      // Rates
      initialEmployeeRates.forEach((r) => batch.set(doc(firestore, 'employeeRates', r.id), r));
      // Advances
      initialAdvances.forEach((a) => batch.set(doc(firestore, 'advances', a.id), a));
      // Leaves
      initialLeaves.forEach((l) => batch.set(doc(firestore, 'leaves', l.id), l));
      // Salary payments
      initialSalaryPayments.forEach((p) => batch.set(doc(firestore, 'salaryPayments', p.id), p));
      // Work entries
      seedEntries.forEach((e) => batch.set(doc(firestore, 'workEntries', e.id), e));
      // Settings
      batch.set(doc(firestore, 'settings', 'global'), initialSettings);

      await batch.commit();
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEYS.employees, JSON.stringify(initialEmployees));
      localStorage.setItem(LOCAL_STORAGE_KEYS.workTypes, JSON.stringify(initialWorkTypes));
      localStorage.setItem(LOCAL_STORAGE_KEYS.employeeRates, JSON.stringify(initialEmployeeRates));
      localStorage.setItem(LOCAL_STORAGE_KEYS.workEntries, JSON.stringify(seedEntries));
      localStorage.setItem(LOCAL_STORAGE_KEYS.advances, JSON.stringify(initialAdvances));
      localStorage.setItem(LOCAL_STORAGE_KEYS.leaves, JSON.stringify(initialLeaves));
      localStorage.setItem(LOCAL_STORAGE_KEYS.salaryPayments, JSON.stringify(initialSalaryPayments));
      localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(initialSettings));

      setEmployees(initialEmployees);
      setWorkTypes(initialWorkTypes);
      setEmployeeRates(initialEmployeeRates);
      setWorkEntries(seedEntries);
      setAdvances(initialAdvances);
      setLeaves(initialLeaves);
      setSalaryPayments(initialSalaryPayments);
      setSettings(initialSettings);
    }

    setIsLoading(false);
  };

  const exportBackupJSON = (): string => {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      employees,
      workTypes,
      employeeRates,
      workEntries,
      advances,
      leaves,
      salaryPayments,
      settings,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importBackupJSON = async (jsonStr: string): Promise<void> => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.employees || !data.workTypes) {
        throw new Error('Invalid backup file format');
      }

      setIsLoading(true);

      if (isFirebaseConfigured && db) {
        // Upload to firestore
        const firestore = db;
        const batch = writeBatch(firestore);
        if (Array.isArray(data.employees)) {
          data.employees.forEach((e: Employee) => batch.set(doc(firestore, 'employees', e.id), e));
        }
        if (Array.isArray(data.workTypes)) {
          data.workTypes.forEach((wt: WorkType) => batch.set(doc(firestore, 'workTypes', wt.id), wt));
        }
        if (Array.isArray(data.employeeRates)) {
          data.employeeRates.forEach((r: EmployeeRate) => batch.set(doc(firestore, 'employeeRates', r.id), r));
        }
        if (Array.isArray(data.workEntries)) {
          data.workEntries.forEach((e: WorkEntry) => batch.set(doc(firestore, 'workEntries', e.id), e));
        }
        if (Array.isArray(data.advances)) {
          data.advances.forEach((a: Advance) => batch.set(doc(firestore, 'advances', a.id), a));
        }
        if (Array.isArray(data.leaves)) {
          data.leaves.forEach((l: LeaveRecord) => batch.set(doc(firestore, 'leaves', l.id), l));
        }
        if (Array.isArray(data.salaryPayments)) {
          data.salaryPayments.forEach((p: SalaryPayment) => batch.set(doc(firestore, 'salaryPayments', p.id), p));
        }
        if (data.settings) {
          batch.set(doc(firestore, 'settings', 'global'), data.settings);
        }
        await batch.commit();
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEYS.employees, JSON.stringify(data.employees || []));
        localStorage.setItem(LOCAL_STORAGE_KEYS.workTypes, JSON.stringify(data.workTypes || []));
        localStorage.setItem(LOCAL_STORAGE_KEYS.employeeRates, JSON.stringify(data.employeeRates || []));
        localStorage.setItem(LOCAL_STORAGE_KEYS.workEntries, JSON.stringify(data.workEntries || []));
        localStorage.setItem(LOCAL_STORAGE_KEYS.advances, JSON.stringify(data.advances || []));
        localStorage.setItem(LOCAL_STORAGE_KEYS.leaves, JSON.stringify(data.leaves || []));
        localStorage.setItem(LOCAL_STORAGE_KEYS.salaryPayments, JSON.stringify(data.salaryPayments || []));
        if (data.settings) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(data.settings));
        }
        initLocalData();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DataContext.Provider
      value={{
        employees,
        workTypes,
        employeeRates,
        workEntries,
        advances,
        leaves,
        salaryPayments,
        settings,
        isLoading,
        isFirebaseActive: isFirebaseConfigured,

        addEmployee,
        updateEmployee,
        archiveEmployee,
        restoreEmployee,

        addWorkType,
        updateWorkType,
        deleteWorkType,

        setEmployeeRate,

        saveDailyWorkEntries,
        deleteWorkEntry,

        addAdvance,
        deleteAdvance,

        saveLeaveRecord,
        deleteLeaveRecord,

        recordSalaryPayment,
        updateSettings,

        loadDemoData,
        exportBackupJSON,
        importBackupJSON,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
