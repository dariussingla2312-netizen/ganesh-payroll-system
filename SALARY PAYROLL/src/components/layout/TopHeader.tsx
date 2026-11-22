import React from 'react';
import {
  Search,
  Settings as SettingsIcon,
  Moon,
  Sun,
  LogOut,
  Menu,
  Cloud,
  CloudOff,
  Building2,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface TopHeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenMobileMenu,
  searchQuery,
  setSearchQuery,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, logout, isFirebase } = useAuth();
  const { settings } = useData();

  const getTabLabel = (id: string) => {
    switch (id) {
      case 'dashboard':
        return 'Dashboard & Operations';
      case 'daily-entry':
        return 'Daily Work Entry';
      case 'labourers':
        return 'Labour Workers Directory';
      case 'staff':
        return 'Fixed-Salary Staff';
      case 'advances':
        return 'Advances & Loan Ledger';
      case 'salary':
        return 'Monthly Payroll & Salaries';
      case 'reports':
        return 'Analytics & Wage Reports';
      case 'settings':
        return 'Settings & Work Types';
      default:
        return 'Staff Payroll Manager';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Breadcrumb / Screen Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <span
                onClick={() => setCurrentTab('dashboard')}
                className="hover:text-[#00b884] cursor-pointer transition-colors"
              >
                M/S GANESH AGRO
              </span>
              <span>/</span>
              <span className="text-[#00b884] dark:text-emerald-400 font-bold capitalize">
                {currentTab.replace('-', ' ')}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              {getTabLabel(currentTab)}
            </h2>
          </div>
        </div>

        {/* Center / Right: Search Input + Controls + User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search Input */}
          <div className="relative hidden md:block w-64 lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search worker or record..."
              className="w-full pl-9 pr-8 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#00b884] focus:ring-2 focus:ring-[#00b884]/20 transition-all text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sync Online Status Chip */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isFirebase
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}
          >
            {isFirebase ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#00b884] animate-pulse"></span>
                <Cloud className="w-3.5 h-3.5 text-[#00b884]" />
                <span className="hidden xl:inline">Sync Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden xl:inline">Offline / Demo</span>
              </>
            )}
          </div>

          {/* Settings shortcut button */}
          <button
            onClick={() => setCurrentTab('settings')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* User Profile Chip (matches Behance avatar pill) */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00b884] to-[#10b981] text-white flex items-center justify-center font-black text-xs shadow-sm shadow-[#00b884]/30 flex-shrink-0">
              GA
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                {currentUser?.displayName || 'Owner'}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                M/S GANESH AGRO
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
