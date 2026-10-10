import React from 'react';
import { Modal } from '../common/Modal';
import { HelpCircle, CheckCircle, ArrowRight, Shield, Mail, Workflow, FileText } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-400" />
          <span>System Architecture & Verification Guide</span>
        </div>
      }
    >
      <div className="space-y-6 text-sm text-slate-300">
        <div>
          <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
            <Workflow className="w-4 h-4 text-sky-400" />
            Aircraft Lifecycle & Task Dependency Model
          </h4>
          <p className="text-slate-400 leading-relaxed">
            Every aircraft is uniquely tracked by its <strong>MSN (Manufacturer Serial Number)</strong>. 
            Within each MSN lifecycle, multiple functional teams (Asset, Sales, Teardown, Warehouse, Technical, Finance, Management) 
            collaborate across stages (01 BIDDING through 09 CLOSED).
          </p>
        </div>

        <div className="p-4 bg-sky-950/30 border border-sky-800/50 rounded-xl space-y-3">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
            Mandatory Verification Test Scenario
          </div>
          <p className="text-xs text-slate-300">
            Follow these steps to verify the automated workflow and dependency engine:
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <strong>Navigate to MSN 12345</strong> from the top navigation or Board view.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                Observe <strong>Task 1: Technical Acceptance</strong> (Asset, John Smith) is <span className="text-sky-400 font-medium">IN PROGRESS</span>.
                Notice <strong>Task 2: Harvest List Preparation</strong> (Asset, Aman Kumar) is <span className="text-slate-400 font-medium">WAITING</span>.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">3</span>
              <div>
                Open Task 1 and click <strong>"Mark Complete"</strong>.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0">4</span>
              <div>
                Observe the system instantly:
                <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-300">
                  <li>Marks Task 1 as <span className="text-emerald-400 font-medium">COMPLETED</span>.</li>
                  <li>Automatically unlocks Task 2 to <span className="text-amber-400 font-medium">READY TO START</span>.</li>
                  <li>Creates an in-app notification for Aman Kumar.</li>
                  <li>Dispatches a transactional email to Aman Kumar.</li>
                  <li>Records an audit log and activity entry.</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center shrink-0">5</span>
              <div>
                Click the <strong>Outbox (✉️)</strong> button in the top bar to inspect the rendered transactional HTML email dispatched to Aman.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center shrink-0">6</span>
              <div>
                Complete Task 2 as Aman &bull; Observe Task 3 (Teardown Coordination, Sarah Connor) automatically unlocks and sends Sarah an email notification!
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-1">
              <Shield className="w-4 h-4 text-emerald-400" /> Role-Based Access
            </div>
            <p className="text-xs text-slate-400">
              Use the top-right user switcher to test <strong>Super Admin</strong>, <strong>Team Admin</strong>, <strong>Team Member</strong>, and <strong>Viewer</strong> access rules.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-1">
              <FileText className="w-4 h-4 text-sky-400" /> Task Templates
            </div>
            <p className="text-xs text-slate-400">
              Create an aircraft and apply the <strong>A320 Standard Harvest</strong> template to generate 7+ tasks with auto-wired dependencies in one click.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 font-semibold text-slate-200 mb-1">
              <Mail className="w-4 h-4 text-amber-400" /> Email Engine
            </div>
            <p className="text-xs text-slate-400">
              Connect <code>RESEND_API_KEY</code> in <code>.env</code> for live cloud emails, or use the built-in outbox inspector simulator during local development.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

