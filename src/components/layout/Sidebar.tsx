import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Briefcase,
  CreditCard,
  FileSpreadsheet,
  BarChart3,
  Settings as SettingsIcon,
  Building2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onCloseMobile,
}) => {
  const { t } = useTheme();
  const { settings } = useData();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily-entry', label: 'Daily Work', icon: CalendarCheck },
    { id: 'labourers', label: 'Labourers', icon: Users },
    { id: 'staff', label: 'Fixed Staff', icon: Briefcase },
    { id: 'advances', label: 'Advances & Loans', icon: CreditCard },
    { id: 'salary', label: 'Payroll & Salaries', icon: FileSpreadsheet },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-full transition-colors select-none">
      <div>
        {/* Brand Logo Header */}
        <div
          className="p-6 cursor-pointer flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800/80"
          onClick={() => handleNavClick('dashboard')}
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00b884] to-[#10b981] flex items-center justify-center text-white shadow-lg shadow-[#00b884]/25 flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight truncate">
              {settings.companyName || 'M/S GANESH AGRO'}
            </h1>
            <p className="text-[11px] font-semibold text-[#00b884] dark:text-emerald-400 truncate">
              Sangrur, Punjab
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left group ${
                  isActive
                    ? 'bg-[#00b884] text-white shadow-md shadow-[#00b884]/25 translate-x-1'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promo / Domain Card */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-100/80 dark:border-emerald-900/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-[#00b884] text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
              M/S GANESH AGRO
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2.5">
            Agricultural Machinery & Equipment Manufacturing
          </p>
          <a
            href="https://www.ganeshagrosangrur.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00b884] hover:text-[#059669] dark:text-emerald-400 transition-colors"
          >
            <span>ganeshagrosangrur.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </aside>
  );
};
