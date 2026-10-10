import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import {
  LifecycleTemplate,
  LifecycleTemplateBucket,
  LifecycleTemplateTask,
  TemplateUpdatePropagation,
  TaskPriority,
} from '../../types';
import { Modal } from '../../components/common/Modal';
import { formatIndiaDateTime } from '../../utils/dateUtils';
import {
  Workflow,
  Plus,
  ArrowDown,
  Layers,
  Settings,
  Mail,
  ShieldAlert,
  Clock,
  Trash2,
  Edit2,
  Copy,
  ChevronDown,
  ChevronRight,
  Database,
  CheckCircle2,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Check,
  Building2,
} from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';
import { CompaniesView } from './companies/CompaniesView';

export const AdminView: React.FC = () => {
  const { lifecycleTemplates, stages, teams, auditLogs, aircraftList, db } = useDatabase();

  const [activeAdminTab, setActiveAdminTab] = useState<
    'bucket_library' | 'workflow_builder' | 'stages' | 'companies' | 'email_settings' | 'audit_logs'
  >('bucket_library');

  // Selected template for Visual Workflow Builder
  const [selectedBuilderTemplateId, setSelectedBuilderTemplateId] = useState<string>(
    lifecycleTemplates[0]?.id || ''
  );

  // Expanded cards in Bucket Library view
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Record<string, boolean>>({
    [lifecycleTemplates[0]?.id || '']: true,
  });
  const [expandedBucketIds, setExpandedBucketIds] = useState<Record<string, boolean>>({});

  // -------------------------------------------------------------
  // TEMPLATE EDITOR STATE (CREATE / EDIT)
  // -------------------------------------------------------------
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateAircraftType, setTemplateAircraftType] = useState('Airbus A320');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateBuckets, setTemplateBuckets] = useState<LifecycleTemplateBucket[]>([]);
  const [activeEditingBucketIndex, setActiveEditingBucketIndex] = useState<number>(0);

  // -------------------------------------------------------------
  // PROPAGATION PROMPT STATE
  // -------------------------------------------------------------
  const [isPropagationModalOpen, setIsPropagationModalOpen] = useState(false);
  const [propagationMode, setPropagationMode] = useState<TemplateUpdatePropagation>('template_only');
  const [selectedAircraftForSync, setSelectedAircraftForSync] = useState<string[]>([]);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // -------------------------------------------------------------
  // STAGES TAB STATE
  // -------------------------------------------------------------
  const [newStageName, setNewStageName] = useState('');
  const [newStageCode, setNewStageCode] = useState('');
  const [newStageColor, setNewStageColor] = useState('#38bdf8');

  // Helper: toggle template expansion
  const toggleTemplateExpand = (id: string) => {
    setExpandedTemplateIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper: toggle bucket tasks expansion
  const toggleBucketExpand = (bucketId: string) => {
    setExpandedBucketIds((prev) => ({ ...prev, [bucketId]: !prev[bucketId] }));
  };

  // Open Create Template Modal
  const handleOpenCreateTemplate = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateAircraftType('Airbus A320');
    setTemplateDescription('');
    setTemplateBuckets([
      {
        id: `tb-${Date.now()}-1`,
        bucket_number: 1,
        code: '01_BIDDING',
        name: '01 BIDDING',
        description: 'Bidding and commercial evaluation',
        display_order: 1,
        color: '#38bdf8',
        tasks: [
          {
            id: `tt-${Date.now()}-1`,
            name: 'Preliminary RFP Review',
            team_name: 'Asset',
            estimated_duration_days: 3,
            priority: 'HIGH',
            order_index: 1,
            checklist_items: ['Evaluate market demand', 'Review records'],
          },
        ],
      },
      {
        id: `tb-${Date.now()}-2`,
        bucket_number: 2,
        code: '02_ACQUISITION',
        name: '02 ACQUISITION',
        description: 'Contract sign-off and technical inspection',
        display_order: 2,
        color: '#3b82f6',
        tasks: [],
      },
    ]);
    setActiveEditingBucketIndex(0);
    setIsTemplateModalOpen(true);
  };

  // Open Edit Template Modal
  const handleOpenEditTemplate = (tmpl: LifecycleTemplate) => {
    setEditingTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateAircraftType(tmpl.aircraft_type);
    setTemplateDescription(tmpl.description || '');
    // Deep clone buckets to isolate draft edits
    setTemplateBuckets(JSON.parse(JSON.stringify(tmpl.buckets || [])));
    setActiveEditingBucketIndex(0);
    setIsTemplateModalOpen(true);
  };

  // Duplicate Master Template
  const handleDuplicateTemplate = (tmpl: LifecycleTemplate) => {
    const clonedBuckets: LifecycleTemplateBucket[] = tmpl.buckets.map((b, bIdx) => ({
      ...b,
      id: crypto.randomUUID(),
      display_order: bIdx + 1,
      tasks: b.tasks.map((t, tIdx) => ({
        ...t,
        id: crypto.randomUUID(),
        order_index: tIdx + 1,
      })),
    }));

    db.createLifecycleTemplate({
      name: `${tmpl.name} (Copy)`,
      aircraft_type: tmpl.aircraft_type,
      description: `Cloned from ${tmpl.name}`,
      is_active: true,
      buckets: clonedBuckets,
    });

    setFeedbackBanner(`Template "${tmpl.name}" duplicated successfully.`);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  // Delete Master Template
  const handleDeleteTemplate = (tmplId: string, tmplName: string) => {
    if (confirm(`Are you sure you want to delete template "${tmplName}"? This will not affect existing aircraft.`)) {
      db.deleteLifecycleTemplate(tmplId);
      setFeedbackBanner(`Template "${tmplName}" deleted.`);
      setTimeout(() => setFeedbackBanner(null), 4000);
    }
  };

  // Bucket manipulation in Editor Modal
  const handleAddBucket = () => {
    const nextNum = templateBuckets.length + 1;
    const padded = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    const newBucket: LifecycleTemplateBucket = {
      id: `tb-${Date.now()}`,
      bucket_number: nextNum,
      code: `${padded}_NEW_STAGE`,
      name: `${padded} NEW STAGE`,
      description: 'Stage description',
      display_order: nextNum,
      color: '#0ea5e9',
      tasks: [],
    };
    const updated = [...templateBuckets, newBucket];
    setTemplateBuckets(updated);
    setActiveEditingBucketIndex(updated.length - 1);
  };

  const handleRemoveBucket = (index: number) => {
    if (templateBuckets.length <= 1) {
      alert('A lifecycle template must have at least one bucket.');
      return;
    }
    const updated = templateBuckets.filter((_, idx) => idx !== index);
    // Reindex display_order and bucket_number
    const reindexed = updated.map((b, idx) => ({
      ...b,
      bucket_number: idx + 1,
      display_order: idx + 1,
    }));
    setTemplateBuckets(reindexed);
    setActiveEditingBucketIndex(Math.max(0, index - 1));
  };

  const handleMoveBucket = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= templateBuckets.length) return;

    const list = [...templateBuckets];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reindexed = list.map((b, idx) => ({
      ...b,
      bucket_number: idx + 1,
      display_order: idx + 1,
    }));

    setTemplateBuckets(reindexed);
    setActiveEditingBucketIndex(targetIndex);
  };

  // Task manipulation inside current editing bucket
  const handleAddTaskToCurrentBucket = () => {
    const currentBucket = templateBuckets[activeEditingBucketIndex];
    if (!currentBucket) return;

    const newTask: LifecycleTemplateTask = {
      id: `tt-${Date.now()}`,
      name: 'New Default Task',
      team_name: teams[0]?.name || 'Asset',
      estimated_duration_days: 5,
      priority: 'MEDIUM',
      order_index: (currentBucket.tasks?.length || 0) + 1,
      checklist_items: [],
    };

    const updatedBuckets = [...templateBuckets];
    updatedBuckets[activeEditingBucketIndex] = {
      ...currentBucket,
      tasks: [...(currentBucket.tasks || []), newTask],
    };
    setTemplateBuckets(updatedBuckets);
  };

  const handleRemoveTaskFromCurrentBucket = (taskIndex: number) => {
    const currentBucket = templateBuckets[activeEditingBucketIndex];
    if (!currentBucket) return;

    const updatedTasks = currentBucket.tasks.filter((_, idx) => idx !== taskIndex);
    const updatedBuckets = [...templateBuckets];
    updatedBuckets[activeEditingBucketIndex] = {
      ...currentBucket,
      tasks: updatedTasks,
    };
    setTemplateBuckets(updatedBuckets);
  };

  // Save template submit handler
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    if (!editingTemplateId) {
      // Creating NEW template: no propagation prompt needed
      db.createLifecycleTemplate({
        name: templateName.trim(),
        aircraft_type: templateAircraftType.trim(),
        description: templateDescription.trim(),
        is_active: true,
        buckets: templateBuckets,
      });
      setIsTemplateModalOpen(false);
      setFeedbackBanner(`Master template "${templateName}" created successfully!`);
      setTimeout(() => setFeedbackBanner(null), 4000);
    } else {
      // Editing EXISTING template: open Propagation Confirmation Prompt
      setPropagationMode('template_only');
      setSelectedAircraftForSync([]);
      setIsPropagationModalOpen(true);
    }
  };

  // Execute Propagation Confirmation
  const handleConfirmPropagation = () => {
    if (!editingTemplateId) return;

    db.updateLifecycleTemplate(
      editingTemplateId,
      {
        name: templateName.trim(),
        aircraft_type: templateAircraftType.trim(),
        description: templateDescription.trim(),
        buckets: templateBuckets,
      },
      propagationMode,
      selectedAircraftForSync
    );

    setIsPropagationModalOpen(false);
    setIsTemplateModalOpen(false);

    let msg = `Template "${templateName}" updated successfully.`;
    if (propagationMode === 'select_aircraft' && selectedAircraftForSync.length > 0) {
      msg += ` Missing buckets synced to ${selectedAircraftForSync.length} selected aircraft without overwriting existing tasks.`;
    }
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  // Create Stage in stages tab
  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim() || !newStageCode.trim()) return;

    db.createStage({
      stage_number: stages.length + 1,
      code: newStageCode.trim().toUpperCase(),
      name: newStageName.trim(),
      description: 'Operational stage',
      color: newStageColor,
      order_index: stages.length + 1,
      is_active: true,
    });

    setNewStageName('');
    setNewStageCode('');
  };

  // Visual workflow builder helper
  const currentBuilderTemplate =
    lifecycleTemplates.find((t) => t.id === selectedBuilderTemplateId) ||
    lifecycleTemplates[0];

  const builderSteps = (currentBuilderTemplate?.buckets || []).flatMap((b) =>
    (b.tasks || []).map((t) => ({
      ...t,
      bucket_name: b.name,
      bucket_color: b.color,
    }))
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-navy-950 space-y-6">
      {/* Toast Feedback Banner */}
      {feedbackBanner && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2.5 shadow-lg shadow-emerald-950/50 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* Header & Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Workflow className="w-6 h-6 text-sky-400" />
            Super Admin & Lifecycle Stage Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build reusable lifecycle templates, maintain the Master Bucket Library, and manage workflow dependency rules.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-navy-900 border border-navy-700 rounded-xl p-1">
          <button
            onClick={() => setActiveAdminTab('bucket_library')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAdminTab === 'bucket_library'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bucket Library & Templates</span>
          </button>
          <button
            onClick={() => setActiveAdminTab('workflow_builder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAdminTab === 'workflow_builder'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Dependency Flow</span>
          </button>
          <button
            onClick={() => setActiveAdminTab('stages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAdminTab === 'stages'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Lifecycle Stages</span>
          </button>
          <button
            onClick={() => setActiveAdminTab('companies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAdminTab === 'companies'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Companies & Whitelist</span>
          </button>
          <button
            onClick={() => setActiveAdminTab('email_settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAdminTab === 'email_settings'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email & Cloud</span>
          </button>
          <button
            onClick={() => setActiveAdminTab('audit_logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeAdminTab === 'audit_logs'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB: BUCKET LIBRARY & LIFECYCLE TEMPLATES */}
      {/* ========================================================= */}
      {activeAdminTab === 'bucket_library' && (
        <div className="space-y-6">
          {/* Top Bar with Description & Create Action */}
          <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Master Lifecycle Templates Library
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard templates define default buckets and tasks for new aircraft. Modifying a template will prompt you before touching existing aircraft.
              </p>
            </div>

            <button
              onClick={handleOpenCreateTemplate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Lifecycle Template</span>
            </button>
          </div>

          {/* Master Templates List */}
          <div className="space-y-4">
            {lifecycleTemplates.map((tmpl) => {
              const isExpanded = !!expandedTemplateIds[tmpl.id];
              const totalTasks = tmpl.buckets.reduce(
                (acc, b) => acc + (b.tasks?.length || 0),
                0
              );

              return (
                <div
                  key={tmpl.id}
                  className="bg-navy-900/80 border border-navy-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-all shadow-lg"
                >
                  {/* Template Card Header */}
                  <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-navy-800/80 bg-slate-900/40">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTemplateExpand(tmpl.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-white tracking-wide">
                            {tmpl.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                            {tmpl.aircraft_type}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            ACTIVE
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {tmpl.description || 'Aircraft lifecycle sequence template'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono pr-2">
                        <span className="px-2 py-1 bg-slate-800/80 rounded-lg text-slate-300 font-semibold">
                          {tmpl.buckets.length} Buckets
                        </span>
                        <span className="px-2 py-1 bg-slate-800/80 rounded-lg text-slate-300 font-semibold">
                          {totalTasks} Default Tasks
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenEditTemplate(tmpl)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDuplicateTemplate(tmpl)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                        title="Duplicate Template"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Duplicate</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-transparent hover:border-rose-900/50 transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Buckets & Tasks Preview */}
                  {isExpanded && (
                    <div className="p-5 space-y-4 bg-navy-950/40">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Configured Lifecycle Sequence ({tmpl.buckets.length} Stages)
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tmpl.buckets.map((bucket, bIdx) => {
                          const isBucketExpanded = !!expandedBucketIds[bucket.id];
                          const bucketTasks = bucket.tasks || [];

                          return (
                            <div
                              key={bucket.id || bIdx}
                              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2 transition-all shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: bucket.color }}
                                  />
                                  <span className="text-xs font-bold text-white tracking-wide">
                                    {bucket.name}
                                  </span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                  #{bucket.bucket_number || bIdx + 1}
                                </span>
                              </div>

                              {bucket.description && (
                                <p className="text-[11px] text-slate-400 truncate">
                                  {bucket.description}
                                </p>
                              )}

                              {/* Task toggle & preview */}
                              <div className="pt-2 border-t border-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() => toggleBucketExpand(bucket.id)}
                                  className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-sky-300 transition-colors"
                                >
                                  <span>{bucketTasks.length} Default Tasks</span>
                                  {isBucketExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {isBucketExpanded && (
                                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {bucketTasks.length === 0 ? (
                                      <p className="text-[10px] text-slate-500 italic py-1">
                                        No default tasks in this bucket.
                                      </p>
                                    ) : (
                                      bucketTasks.map((t, tIdx) => {
                                        const team = teams.find(
                                          (tm) =>
                                            tm.name.toLowerCase() === t.team_name.toLowerCase()
                                        );

                                        return (
                                          <div
                                            key={t.id || tIdx}
                                            className="p-2 bg-slate-950/80 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]"
                                          >
                                            <div className="truncate mr-2">
                                              <div className="font-semibold text-slate-200 truncate">
                                                {t.name}
                                              </div>
                                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                <span
                                                  style={{ color: team?.color || '#38bdf8' }}
                                                  className="font-medium"
                                                >
                                                  {t.team_name}
                                                </span>
                                                <span>&bull;</span>
                                                <span>{t.estimated_duration_days}d</span>
                                              </div>
                                            </div>

                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase shrink-0 font-bold">
                                              {t.priority}
                                            </span>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: VISUAL WORKFLOW BUILDER & DEPENDENCY FLOW */}
      {/* ========================================================= */}
      {activeAdminTab === 'workflow_builder' && (
        <div className="space-y-6">
          {/* Template Selector bar */}
          <div className="p-4 bg-navy-900/70 border border-navy-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Lifecycle Template:
              </span>
              <select
                value={selectedBuilderTemplateId}
                onChange={(e) => setSelectedBuilderTemplateId(e.target.value)}
                className="bg-navy-950 border border-navy-700 rounded-lg text-xs text-sky-300 font-semibold px-3 py-1.5 focus:outline-none focus:border-sky-500"
              >
                {lifecycleTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.aircraft_type})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleOpenEditTemplate(currentBuilderTemplate)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-600/30 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Template Structure</span>
            </button>
          </div>

          {/* Visual Directed Graph Node Visualization */}
          <div className="p-6 bg-navy-900/40 border border-navy-800 rounded-2xl shadow-inner min-h-[440px] flex flex-col items-center justify-center">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">
              Step-by-Step Flow: {currentBuilderTemplate?.name} ({builderSteps.length} Steps Across{' '}
              {currentBuilderTemplate?.buckets.length} Buckets)
            </div>

            {builderSteps.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-xs">
                No default task steps configured in this template yet.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 w-full max-w-xl">
                {builderSteps.map((step, idx) => {
                  const stepTeam = teams.find(
                    (t) => t.name.toLowerCase() === step.team_name.toLowerCase()
                  );
                  const hasDeps =
                    step.predecessor_names && step.predecessor_names.length > 0;

                  return (
                    <React.Fragment key={step.id || idx}>
                      {idx > 0 && (
                        <div className="flex flex-col items-center text-slate-500 my-0.5">
                          <ArrowDown className="w-5 h-5 text-sky-400 animate-bounce" />
                          {hasDeps && (
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Unlocks when &ldquo;{step.predecessor_names?.join(', ')}&rdquo; completes
                            </span>
                          )}
                        </div>
                      )}

                      <div className="w-full p-4 bg-slate-900 border border-slate-700/80 rounded-xl shadow-lg flex items-center justify-between hover:border-sky-500 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                              {step.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span
                                style={{ color: stepTeam?.color || '#38bdf8' }}
                                className="font-semibold"
                              >
                                {step.team_name} Team
                              </span>
                              <span>&bull;</span>
                              <span style={{ color: step.bucket_color }}>
                                {step.bucket_name}
                              </span>
                              <span>&bull;</span>
                              <span>Est: {step.estimated_duration_days} days</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {step.checklist_items && step.checklist_items.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {step.checklist_items.length} checks
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-semibold border border-sky-800">
                            {step.priority}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: LIFECYCLE STAGES */}
      {/* ========================================================= */}
      {activeAdminTab === 'stages' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-navy-900/70 border border-navy-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-navy-800 text-xs font-bold text-slate-300 uppercase tracking-wider">
                Configured Global Lifecycle Stages (01 to {stages.length})
              </div>
              <div className="divide-y divide-slate-800/60 p-2">
                {stages.map((stg) => (
                  <div
                    key={stg.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-800/40 rounded-lg text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: stg.color }}
                      />
                      <div>
                        <div className="font-bold text-white">{stg.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Code: {stg.code} &bull; Order Index: {stg.order_index}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 p-5 bg-navy-900/70 border border-navy-800 rounded-2xl shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Add New Lifecycle Stage
              </h3>
              <form onSubmit={handleCreateStage} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Stage Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10 ARCHIVAL"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Stage Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10_ARCHIVAL"
                    value={newStageCode}
                    onChange={(e) => setNewStageCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 uppercase font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Stage Badge Color
                  </label>
                  <input
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg p-1 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-md transition-all mt-2"
                >
                  Create Stage
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: EMAIL & CLOUD SETTINGS */}
      {/* ========================================================= */}
      {activeAdminTab === 'email_settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-navy-900/70 border border-navy-800 rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Resend Email Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Transactional email delivery for task notifications
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Driver Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                  DEVELOPMENT INSPECTOR ACTIVE
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">From Address:</span>
                <span className="font-mono text-slate-200">ops@alarisaerospace.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Outbox Inspector:</span>
                <span className="text-sky-400 font-semibold">Enabled (Header Bar)</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              When a task with dependencies completes, the system drafts professional transactional HTML emails, logs them to the Dev Email Outbox, and triggers in-app alerts.
            </p>
          </div>

          <div className="p-6 bg-navy-900/70 border border-navy-800 rounded-2xl shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Database & Storage Provider
                </h3>
                <p className="text-xs text-slate-400">
                  PostgreSQL Supabase & High-Performance Local Engine
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Supabase Cloud:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  {isSupabaseConfigured() ? 'CONNECTED' : 'LOCAL DURABLE MODE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Migration Files:</span>
                <span className="font-mono text-slate-200">supabase/migrations/ (Ready)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Offline Fallback:</span>
                <span className="text-emerald-400 font-semibold">100% Persistent</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Full SQL DDL migrations with tables, RLS policies, and seed data are generated in <code>supabase/migrations/</code> ready to run in any Supabase project.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: COMPANIES & DOMAIN WHITELIST */}
      {/* ========================================================= */}
      {activeAdminTab === 'companies' && <CompaniesView />}

      {/* ========================================================= */}
      {/* TAB: AUDIT LOGS */}
      {/* ========================================================= */}
      {activeAdminTab === 'audit_logs' && (
        <div className="bg-navy-900/70 border border-navy-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-navy-800 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>System Audit Trail</span>
            <span className="text-slate-400 font-normal">{auditLogs.length} events logged</span>
          </div>

          <div className="divide-y divide-slate-800/60 p-2 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400">{log.action}</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      Table: {log.table_name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Actor: {log.user?.full_name || 'System Engine'} &bull; Record:{' '}
                    <span className="font-mono">{log.record_id}</span>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-500 font-mono">
                  {formatIndiaDateTime(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT LIFECYCLE TEMPLATE */}
      {/* ========================================================= */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        maxWidth="2xl"
        title={
          <div className="flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-sky-400" />
            <span>
              {editingTemplateId
                ? `Edit Template: ${templateName}`
                : 'Create Master Lifecycle Template'}
            </span>
          </div>
        }
      >
        <form onSubmit={handleSaveTemplate} className="space-y-5 text-xs">
          {/* Basic metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Template Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. A320 Standard Lifecycle"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Aircraft Model / Family *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Airbus A320, Boeing 737, General"
                value={templateAircraftType}
                onChange={(e) => setTemplateAircraftType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Operational description or fleet guidelines..."
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Buckets Builder & Reordering */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Lifecycle Buckets & Stages ({templateBuckets.length})
              </label>
              <button
                type="button"
                onClick={handleAddBucket}
                className="flex items-center gap-1 px-2.5 py-1 bg-sky-600/80 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bucket</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Buckets List */}
              <div className="md:col-span-5 space-y-2 max-h-72 overflow-y-auto pr-1">
                {templateBuckets.map((bucket, bIdx) => {
                  const isSelected = bIdx === activeEditingBucketIndex;

                  return (
                    <div
                      key={bucket.id || bIdx}
                      onClick={() => setActiveEditingBucketIndex(bIdx)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-sky-950/40 border-sky-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: bucket.color }}
                        />
                        <span className="font-semibold text-xs truncate">
                          {bucket.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          disabled={bIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveBucket(bIdx, 'up');
                          }}
                          className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                          title="Move Up"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={bIdx === templateBuckets.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveBucket(bIdx, 'down');
                          }}
                          className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                          title="Move Down"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveBucket(bIdx);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Delete Bucket"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Active Bucket Properties & Tasks */}
              <div className="md:col-span-7 p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                {templateBuckets[activeEditingBucketIndex] ? (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="font-bold text-white text-xs">
                        Edit Bucket #{templateBuckets[activeEditingBucketIndex].bucket_number}
                      </div>
                      <input
                        type="color"
                        value={templateBuckets[activeEditingBucketIndex].color}
                        onChange={(e) => {
                          const updated = [...templateBuckets];
                          updated[activeEditingBucketIndex].color = e.target.value;
                          setTemplateBuckets(updated);
                        }}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        title="Bucket Color"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                          Bucket Name
                        </label>
                        <input
                          type="text"
                          value={templateBuckets[activeEditingBucketIndex].name}
                          onChange={(e) => {
                            const updated = [...templateBuckets];
                            updated[activeEditingBucketIndex].name = e.target.value;
                            setTemplateBuckets(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                          Stage Code
                        </label>
                        <input
                          type="text"
                          value={templateBuckets[activeEditingBucketIndex].code}
                          onChange={(e) => {
                            const updated = [...templateBuckets];
                            updated[activeEditingBucketIndex].code = e.target.value.toUpperCase();
                            setTemplateBuckets(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Default Tasks within this bucket */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-300">
                          Default Tasks ({templateBuckets[activeEditingBucketIndex].tasks?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={handleAddTaskToCurrentBucket}
                          className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Task</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {(templateBuckets[activeEditingBucketIndex].tasks || []).map((tsk, tIdx) => (
                          <div
                            key={tsk.id || tIdx}
                            className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={tsk.name}
                                placeholder="Task Name"
                                onChange={(e) => {
                                  const updated = [...templateBuckets];
                                  updated[activeEditingBucketIndex].tasks[tIdx].name = e.target.value;
                                  setTemplateBuckets(updated);
                                }}
                                className="bg-transparent border-0 text-white font-semibold text-xs focus:outline-none flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveTaskFromCurrentBucket(tIdx)}
                                className="text-slate-500 hover:text-rose-400 p-0.5"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase">Team</label>
                                <select
                                  value={tsk.team_name}
                                  onChange={(e) => {
                                    const updated = [...templateBuckets];
                                    updated[activeEditingBucketIndex].tasks[tIdx].team_name = e.target.value;
                                    setTemplateBuckets(updated);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-slate-200"
                                >
                                  {teams.map((tm) => (
                                    <option key={tm.id} value={tm.name}>
                                      {tm.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase">Duration (d)</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={90}
                                  value={tsk.estimated_duration_days}
                                  onChange={(e) => {
                                    const updated = [...templateBuckets];
                                    updated[activeEditingBucketIndex].tasks[tIdx].estimated_duration_days = Number(e.target.value);
                                    setTemplateBuckets(updated);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-slate-200"
                                />
                              </div>

                              <div>
                                <label className="block text-[9px] text-slate-500 uppercase">Priority</label>
                                <select
                                  value={tsk.priority}
                                  onChange={(e) => {
                                    const updated = [...templateBuckets];
                                    updated[activeEditingBucketIndex].tasks[tIdx].priority = e.target.value as TaskPriority;
                                    setTemplateBuckets(updated);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-slate-200"
                                >
                                  <option value="LOW">LOW</option>
                                  <option value="MEDIUM">MEDIUM</option>
                                  <option value="HIGH">HIGH</option>
                                  <option value="URGENT">URGENT</option>
                                  <option value="CRITICAL">CRITICAL</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-slate-500">
                    Select or add a bucket to edit its properties.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md shadow-sky-600/30"
            >
              {editingTemplateId ? 'Save & Review Propagation...' : 'Create Template'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL: TEMPLATE UPDATE PROPAGATION PROMPT */}
      {/* ========================================================= */}
      <Modal
        isOpen={isPropagationModalOpen}
        onClose={() => setIsPropagationModalOpen(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Apply These Changes to Existing Aircraft?</span>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            You are saving updates to master template <strong className="text-white">&ldquo;{templateName}&rdquo;</strong>.
            Choose how you would like these changes applied across your fleet:
          </p>

          <div className="space-y-2.5">
            {/* Option 1 */}
            <label
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                propagationMode === 'template_only'
                  ? 'bg-sky-950/40 border-sky-500 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="propagation"
                checked={propagationMode === 'template_only'}
                onChange={() => setPropagationMode('template_only')}
                className="mt-0.5 text-sky-500"
              />
              <div>
                <div className="font-bold text-slate-100">
                  1. Template only (future aircraft only)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Update the master template definition in the library. Existing aircraft projects will remain completely untouched.
                </div>
              </div>
            </label>

            {/* Option 2 */}
            <label
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                propagationMode === 'template_and_future'
                  ? 'bg-sky-950/40 border-sky-500 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="propagation"
                checked={propagationMode === 'template_and_future'}
                onChange={() => setPropagationMode('template_and_future')}
                className="mt-0.5 text-sky-500"
              />
              <div>
                <div className="font-bold text-slate-100">
                  2. Template + future aircraft
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Designate this template as the standard default for all upcoming aircraft additions.
                </div>
              </div>
            </label>

            {/* Option 3 */}
            <label
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                propagationMode === 'select_aircraft'
                  ? 'bg-sky-950/40 border-sky-500 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="propagation"
                checked={propagationMode === 'select_aircraft'}
                onChange={() => setPropagationMode('select_aircraft')}
                className="mt-0.5 text-sky-500"
              />
              <div className="w-full">
                <div className="font-bold text-slate-100">
                  3. Select existing aircraft to update
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Synchronize any missing template buckets to chosen active aircraft.
                </div>

                {/* Sub-selector for option 3 */}
                {propagationMode === 'select_aircraft' && (
                  <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-b border-slate-800/80 pb-1.5">
                      <span>Choose Aircraft MSNs:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedAircraftForSync.length === aircraftList.length) {
                            setSelectedAircraftForSync([]);
                          } else {
                            setSelectedAircraftForSync(aircraftList.map((a) => a.id));
                          }
                        }}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        {selectedAircraftForSync.length === aircraftList.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {aircraftList.map((ac) => {
                        const isChecked = selectedAircraftForSync.includes(ac.id);

                        return (
                          <label
                            key={ac.id}
                            className="flex items-center gap-2 p-1.5 hover:bg-slate-900 rounded cursor-pointer text-slate-200"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedAircraftForSync(
                                    selectedAircraftForSync.filter((id) => id !== ac.id)
                                  );
                                } else {
                                  setSelectedAircraftForSync([
                                    ...selectedAircraftForSync,
                                    ac.id,
                                  ]);
                                }
                              }}
                              className="rounded border-slate-700 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="font-semibold text-xs">MSN {ac.msn}</span>
                            <span className="text-slate-400 text-[11px]">
                              ({ac.aircraft_type})
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="p-2 bg-amber-950/30 border border-amber-800/50 rounded text-[10px] text-amber-300">
                      <strong>Safety Guarantee:</strong> Adds missing buckets only. Existing custom buckets and active task progress will NOT be deleted or overwritten.
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPropagationModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmPropagation}
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md shadow-sky-600/30"
            >
              Confirm & Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
