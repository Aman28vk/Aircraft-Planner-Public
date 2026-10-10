import React from 'react';
import {
  LayoutDashboard,
  Plane,
  Kanban,
  Table,
  GitCommit,
  Calendar,
  Users2,
  UserCheck,
  FileSpreadsheet,
  Workflow,
  ChevronLeft,
  ChevronRight,
  Building2,
  Wrench,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'aircraft'
  | 'board'
  | 'grid'
  | 'timeline'
  | 'calendar'
  | 'teams'
  | 'users'
  | 'companies'
  | 'reports'
  | 'settings'
  | 'employee_portal'
  | 'ro';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userRole?: UserRole;
  onLogout?: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  onLogout,
}) => {
  // In Public Demonstration Mode, all features and sections are fully accessible to visitors
  const navSections: NavSection[] = [
    {
      title: 'OPERATIONS & FLEET',
      items: [
        { id: 'dashboard', label: 'Company Dashboard', icon: LayoutDashboard },
        { id: 'aircraft', label: 'Aircraft Fleet (MSN)', icon: Plane },
        { id: 'board', label: 'Kanban Board', icon: Kanban, badge: 'Planner' },
        { id: 'grid', label: 'Grid Table', icon: Table },
        { id: 'timeline', label: 'Timeline', icon: GitCommit, badge: 'Gantt' },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'ro', label: 'Repair Orders', icon: Wrench, badge: 'RO' },
      ],
    },
    {
      title: 'WORKSPACE & TEAMS',
      items: [
        { id: 'employee_portal', label: 'My Workspace', icon: UserCheck, badge: 'Personal' },
        { id: 'teams', label: 'Teams', icon: Users2 },
        { id: 'users', label: 'Users & Personnel', icon: UserCheck },
      ],
    },
    {
      title: 'MANAGEMENT & CONFIG',
      items: [
        { id: 'reports', label: 'Reports & Analytics', icon: FileSpreadsheet },
        { id: 'companies', label: 'Companies Directory', icon: Building2, badge: 'Access' },
        { id: 'settings', label: 'Admin & Workflows', icon: Workflow, badge: 'Config' },
      ],
    },
  ];

  return (
    <aside
      className={`relative z-30 flex flex-col bg-navy-950 border-r border-navy-800/80 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Navigation Sections */}
      <div className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {section.title}
              </div>
            ) : sIdx > 0 ? (
              <div className="my-2 border-t border-navy-800/80 mx-2" />
            ) : null}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-700/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between text-left truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            isActive
                              ? 'bg-sky-700 text-sky-100'
                              : 'bg-navy-800 text-slate-400 border border-navy-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sign Out Action in Sidebar */}
      {onLogout && (
        <div className="p-2 border-t border-navy-800/80">
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-all cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Sign Out / Switch Persona"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      )}

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-navy-800/80 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-[10px] text-sky-400 font-semibold tracking-wide">
              Portfolio Demo Mode
            </span>
            <span className="text-[9px] text-slate-500 font-mono">
              Local Sandbox
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 transition-colors ml-auto cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
