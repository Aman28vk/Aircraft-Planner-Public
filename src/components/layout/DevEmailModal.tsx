import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { EmailLog } from '../../types';
import { Mail, CheckCircle2, Laptop, Smartphone, Calendar, User, Plane } from 'lucide-react';
import { formatIndiaDateTime, formatIndiaTime } from '../../utils/dateUtils';

interface DevEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailLogs: EmailLog[];
}

export const DevEmailModal: React.FC<DevEmailModalProps> = ({
  isOpen,
  onClose,
  emailLogs,
}) => {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(
    emailLogs.length > 0 ? emailLogs[0].id : null
  );
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const selectedEmail =
    emailLogs.find((e) => e.id === selectedEmailId) || (emailLogs.length > 0 ? emailLogs[0] : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="5xl"
      title={
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Transactional Email Outbox & Inspector
            </h3>
            <p className="text-xs text-slate-400 font-normal">
              Dev Mode Simulator &bull; Inspect outgoing workflow emails dispatched to assignees
            </p>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[520px]">
        {/* Email list sidebar */}
        <div className="md:col-span-4 border-r border-slate-800 pr-4 flex flex-col gap-2 max-h-[520px] overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1">
            <span>Sent Messages ({emailLogs.length})</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Resend Engine Active
            </span>
          </div>

          {emailLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No emails sent yet. Complete a task with dependencies to trigger automatic workflow emails.
            </div>
          ) : (
            emailLogs.map((log) => {
              const isSelected = selectedEmail?.id === log.id;
              return (
                <button
                  key={log.id}
                  onClick={() => setSelectedEmailId(log.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500/50 text-white shadow-xs'
                      : 'bg-slate-800/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-sky-400 flex items-center gap-1 truncate">
                      <User className="w-3 h-3" /> {log.recipient_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatIndiaTime(log.created_at)}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-200 line-clamp-1">
                    {log.subject}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Plane className="w-3 h-3 text-slate-500" /> MSN {log.aircraft_msn || 'Fleet'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] uppercase border border-slate-700">
                      {log.trigger_event}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Email preview pane */}
        <div className="md:col-span-8 flex flex-col">
          {selectedEmail ? (
            <div className="flex flex-col h-full">
              {/* Header preview meta */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg mb-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">
                    {selectedEmail.subject}
                  </span>
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('desktop')}
                      className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                        viewMode === 'desktop'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Desktop View"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('mobile')}
                      className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                        viewMode === 'mobile'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Mobile View"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500">To:</span> {selectedEmail.recipient_name} &lt;{selectedEmail.recipient_email}&gt;
                  </div>
                  <div>
                    <span className="text-slate-500">From:</span> Aircraft Lifecycle System &lt;ops@alarisaerospace.com&gt;
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {formatIndiaDateTime(selectedEmail.created_at)}
                  </div>
                  <div>
                    <span className="text-slate-500">Status:</span>{' '}
                    <span className="text-emerald-400 font-medium">Dispatched (Simulator)</span>
                  </div>
                </div>
              </div>

              {/* Rendered HTML email body */}
              <div
                className={`flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 flex justify-center transition-all ${
                  viewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                }`}
              >
                <div
                  className="w-full text-slate-200"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Select an email on the left to inspect its contents.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

