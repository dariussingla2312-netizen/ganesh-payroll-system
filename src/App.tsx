import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { BottomNav } from './components/layout/BottomNav';
import { LoginScreen } from './components/screens/LoginScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { DailyEntryScreen } from './components/screens/DailyEntryScreen';
import { LabourersScreen } from './components/screens/LabourersScreen';
import { StaffScreen } from './components/screens/StaffScreen';
import { AdvancesScreen } from './components/screens/AdvancesScreen';
import { MonthlySalaryScreen } from './components/screens/MonthlySalaryScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { ReportsScreen } from './components/screens/ReportsScreen';

const MainApp: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-slate-950 text-slate-600 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#00b884] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wide">Loading M/S GANESH AGRO...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors antialiased">
      {/* Desktop Sidebar (visible on lg and above, matching Behance TeamHub layout) */}
      <div className="hidden lg:block sticky top-0 h-screen flex-shrink-0 z-40">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white dark:bg-slate-900 shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <Sidebar
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto">
          {currentTab === 'dashboard' && <DashboardScreen setCurrentTab={setCurrentTab} searchQuery={searchQuery} />}
          {currentTab === 'daily-entry' && <DailyEntryScreen searchQuery={searchQuery} />}
          {currentTab === 'labourers' && <LabourersScreen searchQuery={searchQuery} />}
          {currentTab === 'staff' && <StaffScreen searchQuery={searchQuery} />}
          {currentTab === 'advances' && <AdvancesScreen searchQuery={searchQuery} />}
          {currentTab === 'salary' && <MonthlySalaryScreen searchQuery={searchQuery} />}
          {currentTab === 'settings' && <SettingsScreen />}
          {currentTab === 'reports' && <ReportsScreen />}
        </main>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <MainApp />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
