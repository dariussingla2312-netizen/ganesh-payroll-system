import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Building2,
  Globe,
  Sun,
  Moon,
  Database,
  Download,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Cloud,
  CloudOff,
  Save,
  ShieldCheck,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { WorkType, GlobalSettings } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import confetti from 'canvas-confetti';

export const SettingsScreen: React.FC = () => {
  const {
    workTypes,
    settings,
    updateSettings,
    addWorkType,
    updateWorkType,
    deleteWorkType,
    loadDemoData,
    exportBackupJSON,
    importBackupJSON,
    isFirebaseActive,
  } = useData();

  const { theme, toggleTheme, t } = useTheme();

  // Company Details
  const [companyName, setCompanyName] = useState(settings.companyName || 'M/S GANESH AGRO');
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress || 'Industrial Focal Point, Sangrur, Punjab 148001');
  const [companyPhone, setCompanyPhone] = useState(settings.companyPhone || '+91 98765 43210');
  const [companyWebsite, setCompanyWebsite] = useState(settings.companyWebsite || 'www.ganeshagrosangrur.com');
  const [companyEmail, setCompanyEmail] = useState(settings.companyEmail || 'info@ganeshagrosangrur.com');
  const [standardHours, setStandardHours] = useState(String(settings.standardHoursPerDay || 8));
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(String(settings.overtimeMultiplier || 1.5));
  const [monthDayBasis, setMonthDayBasis] = useState<'calendar' | 'fixed_30'>(settings.monthDayBasis || 'calendar');
  const [allowPieceHours, setAllowPieceHours] = useState(settings.allowPieceRateHours ?? true);

  // New Work Type Modal
  const [showAddWorkTypeModal, setShowAddWorkTypeModal] = useState(false);
  const [editingWorkType, setEditingWorkType] = useState<WorkType | null>(null);
  const [wtName, setWtName] = useState('');
  const [wtPayModel, setWtPayModel] = useState<'hourly' | 'piece'>('hourly');
  const [wtRate, setWtRate] = useState('');
  const [wtOtMult, setWtOtMult] = useState('1.5');

  // Confirmation dialog
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

  const [notification, setNotification] = useState<string | null>(null);

  // Custom Firebase config state in localStorage
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      companyName: companyName.trim(),
      companyAddress: companyAddress.trim() || undefined,
      companyPhone: companyPhone.trim() || undefined,
      companyWebsite: companyWebsite.trim() || undefined,
      companyEmail: companyEmail.trim() || undefined,
      standardHoursPerDay: parseFloat(standardHours) || 8,
      overtimeMultiplier: parseFloat(overtimeMultiplier) || 1.5,
      monthDayBasis,
      allowPieceRateHours: allowPieceHours,
    });
    showToast('Company and global payroll rules updated successfully!');
    confetti({ particleCount: 35, spread: 45 });
  };

  const handleOpenAddWorkType = () => {
    setEditingWorkType(null);
    setWtName('');
    setWtPayModel('hourly');
    setWtRate('120');
    setWtOtMult('1.5');
    setShowAddWorkTypeModal(true);
  };

  const handleOpenEditWorkType = (wt: WorkType) => {
    setEditingWorkType(wt);
    setWtName(wt.name);
    setWtPayModel(wt.payModel);
    setWtRate(String(wt.defaultRate));
    setWtOtMult(String(wt.overtimeMultiplier ?? 1.5));
    setShowAddWorkTypeModal(true);
  };

  const handleSaveWorkType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wtName.trim()) return;

    const rateNum = parseFloat(wtRate) || 0;
    const otMultNum = parseFloat(wtOtMult) || 1.5;

    if (editingWorkType) {
      await updateWorkType(editingWorkType.id, {
        name: wtName.trim(),
        payModel: wtPayModel,
        defaultRate: rateNum,
        overtimeMultiplier: otMultNum,
      });
      showToast('Work type updated successfully!');
    } else {
      await addWorkType({
        name: wtName.trim(),
        payModel: wtPayModel,
        defaultRate: rateNum,
        overtimeMultiplier: otMultNum,
        active: true,
      });
      showToast('New custom work type created!');
      confetti({ particleCount: 30, spread: 40 });
    }

    setShowAddWorkTypeModal(false);
  };

  const handleDeleteWorkType = (wt: WorkType) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Work Type: ${wt.name}?`,
      message: 'This will remove the work type from active entry options. Existing work entries will keep their historical record.',
      isDangerous: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        await deleteWorkType(wt.id);
        showToast(`Work type ${wt.name} removed.`);
      },
    });
  };

  // Download Full JSON Backup
  const handleDownloadBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ganesh_Agro_Payroll_Backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON Backup downloaded successfully!');
  };

  // Import Backup JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await importBackupJSON(text);
        showToast('Backup restored successfully!');
        confetti({ particleCount: 50, spread: 60 });
      } catch (err: any) {
        alert('Failed to import backup: ' + (err?.message || 'Invalid format'));
      }
    };
    reader.readAsText(file);
  };

  // Save custom Firebase config
  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbApiKey || !fbProjectId) {
      alert('Please provide at least API Key and Project ID');
      return;
    }
    const config = {
      apiKey: fbApiKey.trim(),
      authDomain: `${fbProjectId.trim()}.firebaseapp.com`,
      projectId: fbProjectId.trim(),
      storageBucket: `${fbProjectId.trim()}.appspot.com`,
    };
    localStorage.setItem('staff_payroll_firebase_config', JSON.stringify(config));
    alert('Firebase configuration saved! Please reload the page to activate real-time Firestore sync.');
    window.location.reload();
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {notification && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 p-4 bg-[#00b884] text-white rounded-2xl shadow-xl shadow-[#00b884]/20 flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-top">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm shadow-slate-200/40 dark:shadow-none">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884] flex items-center justify-center">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <span>Workshop & System Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            M/S GANESH AGRO, Sangrur • Manage work rates, domain configuration & cloud backups
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDemoData().then(() => showToast('Demo factory data re-initialized!'))}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Work Types Management Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Custom Work Types & Pay Models
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hourly wages, piece rates (Filter Wash, Assembly), and custom rates overridden per labourer.
            </p>
          </div>

          <button
            onClick={handleOpenAddWorkType}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Work Type</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {workTypes.map((wt) => (
            <div
              key={wt.id}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/60 flex flex-col justify-between gap-3 hover:border-slate-200 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {wt.name}
                  </h4>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      wt.payModel === 'piece'
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884]'
                    }`}
                  >
                    {wt.payModel === 'piece' ? 'Piece Rate' : 'Hourly Rate'}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Default Rate:</span>
                    <strong className="text-slate-900 dark:text-white">
                      ₹{wt.defaultRate} {wt.payModel === 'piece' ? '/ piece' : '/ hour'}
                    </strong>
                  </div>
                  {wt.payModel === 'hourly' && (
                    <div className="flex justify-between">
                      <span>Overtime Multiplier:</span>
                      <strong className="text-amber-500">
                        {wt.overtimeMultiplier ?? 1.5}x standard rate
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <button
                  onClick={() => handleOpenEditWorkType(wt)}
                  className="px-3 py-1 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Edit
                </button>

                {!wt.isBuiltIn && (
                  <button
                    onClick={() => handleDeleteWorkType(wt)}
                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global & Company Settings Form */}
      <form
        onSubmit={handleSaveGeneralSettings}
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4"
      >
        <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#00b884]" />
          <span>M/S GANESH AGRO Identity & Global Payroll Rules</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-[#00b884]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Contact Phone
            </label>
            <input
              type="text"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold outline-none focus:border-[#00b884]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Registered Factory Address
          </label>
          <input
            type="text"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            placeholder="Industrial Focal Point, Sangrur, Punjab 148001"
            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#00b884]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Official Website / Domain
            </label>
            <input
              type="text"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="www.ganeshagrosangrur.com"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium outline-none focus:border-[#00b884]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Official Email Address
            </label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="info@ganeshagrosangrur.com"
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium outline-none focus:border-[#00b884]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Standard Daily Shift (Hours)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={standardHours}
              onChange={(e) => setStandardHours(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-[#00b884]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Overtime Multiplier (1.0x to 2.5x)
            </label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="3.0"
              value={overtimeMultiplier}
              onChange={(e) => setOvertimeMultiplier(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-[#00b884]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Fixed Staff Per-Day Salary Basis
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-[#f8fafc] dark:bg-slate-800">
              <input
                type="radio"
                name="basis"
                checked={monthDayBasis === 'calendar'}
                onChange={() => setMonthDayBasis('calendar')}
                className="accent-[#00b884]"
              />
              <div>
                <span className="text-xs font-bold block text-slate-900 dark:text-white">Actual Calendar Days</span>
                <span className="text-[11px] text-slate-400">
                  Rate = Salary / 31 (in Oct), 30 (in Nov), 28 (in Feb)
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-[#f8fafc] dark:bg-slate-800">
              <input
                type="radio"
                name="basis"
                checked={monthDayBasis === 'fixed_30'}
                onChange={() => setMonthDayBasis('fixed_30')}
                className="accent-[#00b884]"
              />
              <div>
                <span className="text-xs font-bold block text-slate-900 dark:text-white">Fixed 30 Days Standard</span>
                <span className="text-[11px] text-slate-400">Rate = Salary / 30 every month</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#00b884]/25 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save General Settings</span>
          </button>
        </div>
      </form>

      {/* Language, Theme & Appearance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3">
          Theme & Language
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              System Language
            </label>
            <div className="py-2.5 px-4 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>English (Default)</span>
              <span className="text-[10px] bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884] px-2.5 py-0.5 rounded-full font-bold">Active</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Theme Mode
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'border-[#00b884] bg-[#e6f7f0] text-[#00b884] shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'border-[#00b884] bg-[#00b884]/20 text-[#00b884] shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                <Moon className="w-4 h-4 text-[#00b884]" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup and Data Export */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
          <Database className="w-5 h-5 text-[#00b884]" />
          <span>Local Backup & Data Export</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[#00b884] bg-[#f8fafc] dark:bg-slate-800/50 text-left transition-all group"
          >
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-[#00b884]">
                Download Complete JSON Backup
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Full snapshot of workers, attendance, advances, rates & payments
              </span>
            </div>
            <Download className="w-5 h-5 text-[#00b884] flex-shrink-0" />
          </button>

          <label className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00b884] bg-[#f8fafc] dark:bg-slate-800/50 cursor-pointer transition-all">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Restore / Import JSON File
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Load previously saved factory JSON backup file
              </span>
            </div>
            <Upload className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Firebase Configuration & Offline Persistence Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm shadow-slate-200/40 dark:shadow-none space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Cloud Sync & Firebase Status
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live multi-device real-time sync with Google Cloud Firestore
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold ${
              isFirebaseActive
                ? 'bg-[#e6f7f0] text-[#00b884] dark:bg-[#00b884]/20'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {isFirebaseActive ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
            <span>{isFirebaseActive ? 'Active Online' : 'Local Storage Mode'}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {isFirebaseActive
            ? 'Your application is synchronized with Google Cloud Firestore in real-time. Offline persistence is active so entries made without internet connectivity will automatically queue and sync on reconnection.'
            : 'Currently operating in browser local storage demo mode. Connect your Firebase credentials to enable multi-device sync across all workshop computers and phones.'}
        </p>

        {!isFirebaseActive && (
          <form onSubmit={handleSaveFirebaseConfig} className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Connect Real Firebase Project:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">API Key</label>
                <input
                  type="text"
                  value={fbApiKey}
                  onChange={(e) => setFbApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Project ID</label>
                <input
                  type="text"
                  value={fbProjectId}
                  onChange={(e) => setFbProjectId(e.target.value)}
                  placeholder="ganesh-agro-sangrur"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white text-xs font-bold shadow-md shadow-[#00b884]/20"
            >
              Save & Connect Firebase
            </button>
          </form>
        )}
      </div>

      {/* Add / Edit Work Type Modal */}
      <Modal
        isOpen={showAddWorkTypeModal}
        onClose={() => setShowAddWorkTypeModal(false)}
        title={editingWorkType ? `Edit Work Type: ${editingWorkType.name}` : 'Create Custom Work Type'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveWorkType} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Work Type Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={wtName}
              onChange={(e) => setWtName(e.target.value)}
              placeholder="e.g. Combine Blade Fitting, Polishing..."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-[#00b884]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Pay Model <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWtPayModel('hourly')}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                  wtPayModel === 'hourly'
                    ? 'border-[#00b884] bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                Hourly Wage
              </button>

              <button
                type="button"
                onClick={() => setWtPayModel('piece')}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                  wtPayModel === 'piece'
                    ? 'border-[#00b884] bg-[#e6f7f0] dark:bg-[#00b884]/20 text-[#00b884]'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                Piece / Unit Rate
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Default Rate (₹ {wtPayModel === 'piece' ? '/ piece' : '/ hour'}){' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={wtRate}
                onChange={(e) => setWtRate(e.target.value)}
                placeholder="100"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-[#00b884]"
              />
            </div>

            {wtPayModel === 'hourly' ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Overtime Multiplier (e.g. 1.5x)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="3.0"
                  value={wtOtMult}
                  onChange={(e) => setWtOtMult(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-[#00b884]"
                />
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddWorkTypeModal(false)}
              className="px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-2xl bg-[#00b884] hover:bg-[#00a375] text-white shadow-md shadow-[#00b884]/25"
            >
              Save Work Type
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
    </div>
  );
};
