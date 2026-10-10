import React, { useRef, useEffect } from 'react';
import { InAppNotification } from '../../types';
import { Bell, CheckCheck, Clock, ArrowRight, Plane } from 'lucide-react';
import { formatIndiaTime } from '../../utils/dateUtils';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onSelectTask: (taskId: string) => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectTask,
  onMarkAllAsRead,
  onMarkAsRead,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px] animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-slate-100">Notifications</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
            {notifications.filter((n) => n.status === 'UNREAD').length} new
          </span>
        </div>
        <button
          onClick={onMarkAllAsRead}
          className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
        >
          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No notifications right now.
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = notif.status === 'UNREAD';
            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (isUnread) onMarkAsRead(notif.id);
                  if (notif.task_id) {
                    onSelectTask(notif.task_id);
                    onClose();
                  }
                }}
                className={`p-3.5 text-left transition-colors cursor-pointer hover:bg-slate-800/60 ${
                  isUnread ? 'bg-sky-950/20' : 'bg-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {notif.subject}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {formatIndiaTime(notif.sent_at)}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 pl-4">
                  {notif.message}
                </p>

                {notif.task_id && (
                  <div className="mt-2 pl-4 flex items-center gap-1 text-[11px] text-sky-400 font-medium">
                    <span>Open Task</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

