import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { TaskDetailDrawer } from './features/tasks/TaskDetailDrawer';
import { useDatabase } from './hooks/useDatabase';
import { Profile } from './types';

// Feature Views
import { DashboardView } from './features/dashboard/DashboardView';
import { BoardView } from './features/board/BoardView';
import { GridView } from './features/grid/GridView';
import { TimelineView } from './features/timeline/TimelineView';
import { CalendarView } from './features/calendar/CalendarView';
import { AircraftView } from './features/aircraft/AircraftView';
import { TeamsView } from './features/teams/TeamsView';
import { UsersView } from './features/users/UsersView';
import { ReportsView } from './features/reports/ReportsView';
import { AdminView } from './features/admin/AdminView';
import { CompaniesView } from './features/admin/companies/CompaniesView';
import { EmployeePortal } from './features/employee/EmployeePortal';
import { ROView } from './features/ro/ROView';
import { LoginView } from './features/auth/LoginView';

const PATH_TO_TAB: Record<string, NavTab> = {
  '/dashboard': 'dashboard',
  '/employee': 'employee_portal',
  '/aircraft': 'aircraft',
  '/board': 'board',
  '/grid': 'grid',
  '/timeline': 'timeline',
  '/calendar': 'calendar',
  '/charts': 'dashboard',
  '/teams': 'teams',
  '/companies': 'companies',
  '/users': 'users',
  '/reports': 'reports',
  '/ro': 'ro',
  '/admin': 'settings',
  '/settings': 'settings',
};

const TAB_TO_PATH: Record<NavTab, string> = {
  dashboard: '/dashboard',
  employee_portal: '/employee',
  aircraft: '/aircraft',
  board: '/board',
  grid: '/grid',
  timeline: '/timeline',
  calendar: '/calendar',
  teams: '/teams',
  companies: '/companies',
  users: '/users',
  reports: '/reports',
  ro: '/ro',
  settings: '/admin',
};

export function App() {
  const { currentUser, aircraftList, logout, verifySessionFromSupabase } = useDatabase();

  // Tab State initialized from URL if possible, defaulting to 'dashboard'
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      if (PATH_TO_TAB[path]) return PATH_TO_TAB[path];
    }
    return 'dashboard';
  });

  const [selectedMsn, setSelectedMsn] = useState<string>('ALL');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Synchronize Tab Navigation with Browser URL History
  const handleNavigateTab = useCallback((tab: NavTab) => {
    const targetPath = TAB_TO_PATH[tab] || '/dashboard';
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    setCurrentTab(tab);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleLoginSuccess = useCallback((_user?: Profile) => {
    const targetTab: NavTab = 'dashboard';
    const targetPath = TAB_TO_PATH[targetTab];
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetPath);
    }
    setCurrentTab(targetTab);
  }, []);

  // Initial Auth Verification & Routing (Instant, no blocking screen)
  useEffect(() => {
    let isMounted = true;

    const initAuthAndRouting = async () => {
      try {
        await verifySessionFromSupabase();
        if (!isMounted) return;

        const currentPath = (typeof window !== 'undefined'
          ? window.location.pathname.toLowerCase().replace(/\/+$/, '')
          : '/') || '/';

        if (currentPath === '/' || currentPath === '/login') {
          const defaultTab: NavTab = 'dashboard';
          const defaultPath = TAB_TO_PATH[defaultTab];
          if (typeof window !== 'undefined' && currentPath !== defaultPath) {
            window.history.replaceState(null, '', defaultPath);
          }
          setCurrentTab(defaultTab);
        } else if (PATH_TO_TAB[currentPath]) {
          setCurrentTab(PATH_TO_TAB[currentPath]);
        }
      } catch (err) {
        console.error('Session init error:', err);
      }
    };

    initAuthAndRouting();

    return () => {
      isMounted = false;
    };
  }, [verifySessionFromSupabase]);

  // Handle browser back and forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
      if (path === '/' || path === '/login') {
        window.history.replaceState(null, '', TAB_TO_PATH['dashboard']);
        setCurrentTab('dashboard');
        return;
      }

      if (PATH_TO_TAB[path]) {
        setCurrentTab(PATH_TO_TAB[path]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync selectedMsn when user/company changes if selected MSN is not in fleet
  useEffect(() => {
    if (selectedMsn !== 'ALL' && !aircraftList.some((a) => a.msn === selectedMsn)) {
      setSelectedMsn('ALL');
    }
  }, [selectedMsn, aircraftList]);

  const handleSelectAircraft = (_aircraftId: string) => {
    handleNavigateTab('aircraft');
  };

  // If visitor is logged out, render the Login/Demo landing portal
  if (!currentUser) {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Enterprise Top Navigation Bar */}
      <Navbar
        selectedMsn={selectedMsn}
        onSelectMsn={setSelectedMsn}
        onOpenTaskModal={setActiveTaskId}
        onSelectAircraft={handleSelectAircraft}
        currentTab={currentTab}
        onNavigateTab={handleNavigateTab}
        onLogout={handleLogout}
      />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={handleNavigateTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          userRole={currentUser.role}
          onLogout={handleLogout}
        />

        {/* Dynamic View Canvas - Open Access to All Features for Demonstration */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentTab === 'dashboard' && (
            <DashboardView
              onSelectAircraft={handleSelectAircraft}
              onOpenTaskModal={setActiveTaskId}
              onNavigateTab={handleNavigateTab}
            />
          )}

          {currentTab === 'employee_portal' && (
            <EmployeePortal
              onOpenTaskModal={setActiveTaskId}
              onSelectAircraft={handleSelectAircraft}
            />
          )}

          {currentTab === 'aircraft' && (
            <AircraftView
              selectedMsn={selectedMsn}
              onSelectMsn={setSelectedMsn}
              onOpenTaskModal={setActiveTaskId}
              onNavigateTab={handleNavigateTab}
            />
          )}

          {currentTab === 'board' && (
            <BoardView
              selectedMsn={selectedMsn}
              onSelectMsn={setSelectedMsn}
              onOpenTaskModal={setActiveTaskId}
            />
          )}

          {currentTab === 'grid' && (
            <GridView
              selectedMsn={selectedMsn}
              onOpenTaskModal={setActiveTaskId}
            />
          )}

          {currentTab === 'timeline' && (
            <TimelineView
              selectedMsn={selectedMsn}
              onOpenTaskModal={setActiveTaskId}
            />
          )}

          {currentTab === 'calendar' && (
            <CalendarView
              selectedMsn={selectedMsn}
              onOpenTaskModal={setActiveTaskId}
            />
          )}

          {currentTab === 'teams' && <TeamsView />}

          {currentTab === 'companies' && <CompaniesView />}

          {currentTab === 'users' && <UsersView onOpenTaskModal={setActiveTaskId} />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'ro' && <ROView />}

          {currentTab === 'settings' && <AdminView />}
        </main>
      </div>

      {/* Slide-out Task Detail Drawer */}
      <TaskDetailDrawer
        taskId={activeTaskId}
        onClose={() => setActiveTaskId(null)}
      />
    </div>
  );
}

export default App;
