import React from 'react';
import {
  Sun,
  Moon,
  LogOut,
  Building2,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { theme, toggleTheme, t } = useTheme();
  const { currentUser, logout, isFirebase } = useAuth();
  const { settings } = useData();

  const navLinks = [
    { id: 'dashboard', label: t('dashboard') },
    { id: 'daily-entry', label: t('dailyEntry') },
    { id: 'labourers', label: t('labourers') },
    { id: 'staff', label: t('fixedStaff') },
    { id: 'advances', label: t('advances') },
    { id: 'salary', label: t('salary') },
    { id: 'reports', label: t('reports') },
    { id: 'settings', label: t('settings') },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Company Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {settings.companyName || 'M/S GANESH AGRO'}
                </h1>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                  Sangrur, Punjab
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Agricultural Machinery & Equipment • {settings.companyWebsite || 'www.ganeshagrosangrur.com'}
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === link.id
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Controls: Theme, Status, User */}
          <div className="flex items-center gap-2">
            {/* Sync status badge */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isFirebase
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}
              title={isFirebase ? t('firebaseConnected') : t('demoModeActive')}
            >
              {isFirebase ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sync Online</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <CloudOff className="w-3.5 h-3.5" />
                  <span>Offline / Demo</span>
                </>
              )}
            </div>

            {/* Dark/Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* User Profile / Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title={t('logout')}
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
