import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  Menu,
  Users,
  Briefcase,
  Settings as SettingsIcon,
  BarChart3,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab }) => {
  const { t } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'daily-entry', label: t('dailyEntry'), icon: CalendarCheck },
    { id: 'advances', label: t('advances'), icon: CreditCard },
    { id: 'salary', label: t('salary'), icon: FileSpreadsheet },
  ];

  const moreTabs = [
    { id: 'labourers', label: t('labourers'), icon: Users, desc: 'Hourly & piece-rate worker rates' },
    { id: 'staff', label: t('fixedStaff'), icon: Briefcase, desc: 'Fixed monthly salary & leaves' },
    { id: 'reports', label: t('reports'), icon: BarChart3, desc: 'Analytics & wage exports' },
    { id: 'settings', label: t('settings'), icon: SettingsIcon, desc: 'Work types & global configs' },
  ];

  const handleSelectTab = (tabId: string) => {
    setCurrentTab(tabId);
    setShowMoreMenu(false);
  };

  const isMoreActive = moreTabs.some((m) => m.id === currentTab);

  return (
    <>
      {/* Slide-up "More" sheet on mobile */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="fixed bottom-16 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-2xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {t('more')}
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-3">
              {moreTabs.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 safe-bottom">
        <div className="grid grid-cols-5 h-16">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
                  active
                    ? 'text-[#00b884] dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    active ? 'bg-emerald-50 dark:bg-emerald-950/80 scale-105' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] tracking-tight truncate max-w-[65px]">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
              isMoreActive || showMoreMenu
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                isMoreActive || showMoreMenu ? 'bg-emerald-50 dark:bg-emerald-950/80 scale-105' : ''
              }`}
            >
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight">{t('more')}</span>
          </button>
        </div>
      </div>
    </>
  );
};
