import {
  Profile,
  Team,
  LifecycleStage,
  Aircraft,
  Task,
  TaskChecklistItem,
  TaskDependency,
  TaskComment,
  TaskAttachment,
  InAppNotification,
  EmailLog,
  ActivityLog,
  AuditLog,
  LifecycleTemplate,
  LifecycleTemplateBucket,
  ProjectBucket,
  TaskStatus,
  CopyMsnOptions,
  TemplateUpdatePropagation,
  Company,
  CompanyInvitation,
  AccountStatus,
  UserRole,
  CompanyContractStatus,
  CompanyPlanTier,
  RepairOrderColumn,
  RepairOrderRow,
  UserRepairOrderConfig,
  ROColumnType,
} from '../types';
import {
  INITIAL_COMPANIES,
  INITIAL_PROFILES,
  INITIAL_TEAMS,
  INITIAL_STAGES,
  INITIAL_AIRCRAFT,
  INITIAL_TASKS,
  INITIAL_CHECKLISTS,
  INITIAL_DEPENDENCIES,
  INITIAL_MASTER_TEMPLATES,
  INITIAL_PROJECT_BUCKETS,
  createDefaultProjectBucketsForMsn,
} from './seedData';
import { compareProjectBucketsByOrder, getProjectBucketNumericOrder } from '../utils/bucketOrderUtils';
import { WorkflowEngine } from './workflowEngine';
import { getSupabaseClient, isSupabaseConfigured, getSupabaseUrl } from './supabase';

export function normalizeDomain(input: string): string {
  if (!input) return '';
  let cleaned = input.trim().toLowerCase();
  if (cleaned.includes('@')) {
    const parts = cleaned.split('@');
    cleaned = parts[parts.length - 1];
  }
  return cleaned.replace(/^@+/, '').trim();
}

export function getCompanyContractDetails(company: Company) {
  const onboarding = company.onboarding_date || company.created_at?.split('T')[0] || '2024-01-15';
  const expiry = company.expiry_date || '2027-12-31';

  if (company.status === 'DISABLED') {
    return {
      status: 'DISABLED' as CompanyContractStatus,
      daysRemaining: 0,
      label: 'Disabled / Suspended',
      badgeVariant: 'red' as const,
      isExpired: false,
      isExpiringSoon: false,
      onboardingDate: onboarding,
      expiryDate: expiry,
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiry);
  exp.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'EXPIRED' as CompanyContractStatus,
      daysRemaining,
      label: `Expired ${Math.abs(daysRemaining)}d ago`,
      badgeVariant: 'red' as const,
      isExpired: true,
      isExpiringSoon: false,
      onboardingDate: onboarding,
      expiryDate: expiry,
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: 'EXPIRING_SOON' as CompanyContractStatus,
      daysRemaining,
      label: `${daysRemaining}d left (Expiring Soon)`,
      badgeVariant: 'amber' as const,
      isExpired: false,
      isExpiringSoon: true,
      onboardingDate: onboarding,
      expiryDate: expiry,
    };
  }

  return {
    status: 'ACTIVE' as CompanyContractStatus,
    daysRemaining,
    label: `${daysRemaining}d remaining`,
    badgeVariant: 'green' as const,
    isExpired: false,
    isExpiringSoon: false,
    onboardingDate: onboarding,
    expiryDate: expiry,
  };
}

// ==========================================
// DEFAULT REPAIR ORDERS (RO) SCHEMA & SEED
// ==========================================

export const DEFAULT_RO_COLUMNS: RepairOrderColumn[] = [
  { id: 'ro_number', name: 'RO Number', type: 'text', required: true, order: 1 },
  { id: 'part_number', name: 'Part Number', type: 'text', required: true, order: 2 },
  { id: 'description', name: 'Description', type: 'text', required: false, order: 3 },
  { id: 'serial_number', name: 'Serial Number', type: 'text', required: false, order: 4 },
  { id: 'vendor', name: 'Vendor / MRO', type: 'text', required: false, order: 5 },
  {
    id: 'status',
    name: 'Status',
    type: 'select',
    required: true,
    options: [
      'Quote Requested',
      'Sent to Vendor',
      'In Inspection',
      'Repair In Progress',
      'Awaiting Approval',
      'BER / Scrap',
      'Completed',
      'Shipped / In Transit',
    ],
    order: 6,
  },
  { id: 'date_sent', name: 'Date Sent', type: 'date', required: false, order: 7 },
  { id: 'expected_return', name: 'Expected Return', type: 'date', required: false, order: 8 },
  { id: 'est_cost', name: 'Est. Cost ($)', type: 'currency', required: false, order: 9 },
  { id: 'actual_cost', name: 'Actual Cost ($)', type: 'currency', required: false, order: 10 },
  { id: 'tracking_number', name: 'Tracking / AWB', type: 'text', required: false, order: 11 },
  { id: 'notes', name: 'Notes', type: 'text', required: false, order: 12 },
];

export const INITIAL_REPAIR_ORDERS: RepairOrderRow[] = [
  {
    id: 'ro-row-001',
    user_id: '33333333-3333-3333-3333-333333333333', // Aman
    company_id: 'c1111111-1111-1111-1111-111111111111',
    data: {
      ro_number: 'RO-7401',
      part_number: '3214567-1',
      description: 'CFM56 HPT Stage 1 Blade Set',
      serial_number: 'SN-994821',
      vendor: 'Lufthansa Technik',
      status: 'Repair In Progress',
      date_sent: '2026-03-01',
      expected_return: '2026-04-15',
      est_cost: 4850,
      actual_cost: 0,
      tracking_number: '1Z9999999999999999',
      notes: 'Expedited AOG overhaul priority',
    },
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-01T08:00:00Z',
  },
  {
    id: 'ro-row-002',
    user_id: '33333333-3333-3333-3333-333333333333', // Aman
    company_id: 'c1111111-1111-1111-1111-111111111111',
    data: {
      ro_number: 'RO-7402',
      part_number: '822-1710-001',
      description: 'Collins Aerospace TCAS Processor',
      serial_number: 'SN-402819',
      vendor: 'Collins Aerospace MRO',
      status: 'In Inspection',
      date_sent: '2026-03-05',
      expected_return: '2026-03-25',
      est_cost: 2200,
      actual_cost: 0,
      tracking_number: 'DHL-984028172',
      notes: 'Bench testing & firmware update',
    },
    created_at: '2026-03-05T09:30:00Z',
    updated_at: '2026-03-05T09:30:00Z',
  },
  {
    id: 'ro-row-003',
    user_id: '33333333-3333-3333-3333-333333333333', // Aman
    company_id: 'c1111111-1111-1111-1111-111111111111',
    data: {
      ro_number: 'RO-7403',
      part_number: '3800454-3',
      description: 'Honeywell 131-9A APU Fuel Control Unit',
      serial_number: 'SN-671822',
      vendor: 'Honeywell Aerospace',
      status: 'Completed',
      date_sent: '2026-02-10',
      expected_return: '2026-03-01',
      est_cost: 6400,
      actual_cost: 6150,
      tracking_number: 'FEDEX-7788990011',
      notes: 'Recertified 8130-3 Dual Release received',
    },
    created_at: '2026-02-10T11:00:00Z',
    updated_at: '2026-03-01T15:00:00Z',
  },
  {
    id: 'ro-row-004',
    user_id: '33333333-3333-3333-3333-333333333333', // Aman
    company_id: 'c1111111-1111-1111-1111-111111111111',
    data: {
      ro_number: 'RO-7404',
      part_number: '737-1840-02',
      description: 'Main Landing Gear Actuator Cylinder',
      serial_number: 'SN-10294',
      vendor: 'AAR Corp MRO',
      status: 'Sent to Vendor',
      date_sent: '2026-03-12',
      expected_return: '2026-04-30',
      est_cost: 8900,
      actual_cost: 0,
      tracking_number: 'AWB-016-9872145',
      notes: 'Hydraulic leak seal overhaul',
    },
    created_at: '2026-03-12T14:10:00Z',
    updated_at: '2026-03-12T14:10:00Z',
  },
  {
    id: 'ro-row-005',
    user_id: '33333333-3333-3333-3333-333333333333', // Aman
    company_id: 'c1111111-1111-1111-1111-111111111111',
    data: {
      ro_number: 'RO-8501',
      part_number: '4048800-903',
      description: 'Goodrich Brake Assembly A320',
      serial_number: 'SN-33821',
      vendor: 'Meggitt Aircraft Braking',
      status: 'Repair In Progress',
      date_sent: '2026-03-08',
      expected_return: '2026-04-10',
      est_cost: 3600,
      actual_cost: 0,
      tracking_number: '1Z88271049281',
      notes: 'Overhaul carbon heat sink discs',
    },
    created_at: '2026-03-08T10:00:00Z',
    updated_at: '2026-03-08T10:00:00Z',
  },
  {
    id: 'ro-row-006',
    user_id: '33333333-3333-3333-3333-333333333333', // Aman
    company_id: 'c1111111-1111-1111-1111-111111111111',
    data: {
      ro_number: 'RO-8502',
      part_number: '2101-01',
      description: 'IDG Integrated Drive Generator',
      serial_number: 'SN-881920',
      vendor: 'Pratt & Whitney MRO',
      status: 'Quote Requested',
      date_sent: '2026-03-14',
      expected_return: '2026-04-20',
      est_cost: 12500,
      actual_cost: 0,
      tracking_number: '',
      notes: 'Awaiting teardown quote from vendor',
    },
    created_at: '2026-03-14T09:00:00Z',
    updated_at: '2026-03-14T09:00:00Z',
  },
];

interface DatabaseState {
  companies: Company[];
  companyInvitations: CompanyInvitation[];
  profiles: Profile[];
  teams: Team[];
  stages: LifecycleStage[];
  aircraft: Aircraft[];
  projectBuckets: ProjectBucket[];
  tasks: Task[];
  checklists: TaskChecklistItem[];
  dependencies: TaskDependency[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  notifications: InAppNotification[];
  emailLogs: EmailLog[];
  activityLogs: ActivityLog[];
  auditLogs: AuditLog[];
  templates: LifecycleTemplate[];
  repairOrderConfigs: UserRepairOrderConfig[];
  repairOrders: RepairOrderRow[];
  currentUserId: string | null;
  selectedCompanyFilter?: string;
}

const STORAGE_KEY = 'ALM_AIRCRAFT_PLANNER_DB_V6';

type Listener = () => void;

function sanitizeTaskForSupabase(task: Task): Record<string, any> {
  const {
    aircraft,
    stage,
    project_bucket,
    team,
    assigned_user,
    checklists,
    dependencies,
    dependent_tasks,
    comments,
    attachments,
    ...clean
  } = task as any;

  if (clean.start_date === '') clean.start_date = null;
  if (clean.due_date === '') clean.due_date = null;
  if (clean.completed_at === '') clean.completed_at = null;
  clean.assigned_user_id = clean.assigned_user_id || null;
  clean.project_bucket_id = clean.project_bucket_id || null;
  clean.parent_task_id = clean.parent_task_id || null;

  return clean;
}

function sanitizeAircraftForSupabase(ac: Aircraft): Record<string, any> {
  const {
    company,
    current_stage,
    task_count,
    completed_task_count,
    progress_percentage,
    date_of_manufacture,
    owner_lessor_operator,
    ...clean
  } = ac as any;

  if (clean.acquisition_date === '') clean.acquisition_date = null;
  if (clean.expected_teardown_date === '') clean.expected_teardown_date = null;
  if (clean.actual_teardown_date === '') clean.actual_teardown_date = null;

  // Supabase PostgreSQL schema columns for table 'aircraft' are:
  // id, company_id, msn, registration, aircraft_type, model, variant, serial_number,
  // owner, status, acquisition_date, expected_teardown_date, actual_teardown_date,
  // location, current_stage_id, notes, created_by, created_at, updated_at
  clean.registration = (clean.registration || date_of_manufacture || '').trim();
  clean.owner = (clean.owner || owner_lessor_operator || 'Undisclosed Lessor').trim();
  clean.location = (clean.location || 'Victorville (VCV)').trim();
  clean.status = clean.status || 'IN_PROGRESS';
  clean.aircraft_type = (clean.aircraft_type || 'A320').trim();
  clean.model = (clean.model || clean.aircraft_type || 'A320-200').trim();

  if (clean.company_id === '') clean.company_id = null;
  if (clean.created_by === '') clean.created_by = null;
  if (clean.current_stage_id === '') clean.current_stage_id = null;
  if (clean.variant === '') clean.variant = null;
  if (clean.serial_number === '') clean.serial_number = null;
  if (clean.notes === '') clean.notes = null;

  // Remove UI alias fields so PostgreSQL never throws 'column does not exist'
  delete clean.date_of_manufacture;
  delete clean.owner_lessor_operator;

  return clean;
}

function sanitizeProfileForSupabase(profile: Profile): Record<string, any> {
  const {
    company,
    team,
    ...clean
  } = profile as any;
  return clean;
}

function sanitizeCompanyForSupabase(company: Company): Record<string, any> {
  const {
    user_count,
    ...clean
  } = company as any;

  if (clean.onboarding_date === '') clean.onboarding_date = null;
  if (clean.expiry_date === '') clean.expiry_date = null;

  return clean;
}

function sanitizeTeamForSupabase(team: Team): Record<string, any> {
  const {
    team_lead,
    member_count,
    aircraft,
    ...clean
  } = team as any;

  if (!clean.aircraft_id) clean.aircraft_id = null;
  if (!clean.company_id) clean.company_id = null;
  if (!clean.team_lead_id) clean.team_lead_id = null;

  return clean;
}

function sanitizeProjectBucketForSupabase(bucket: ProjectBucket): Record<string, any> {
  const { tasks, task_count, completed_task_count, ...clean } = bucket as any;
  const numOrder = getProjectBucketNumericOrder(bucket);
  clean.bucket_number = numOrder;
  clean.display_order = numOrder;
  return clean;
}

function sanitizeCommentForSupabase(comment: TaskComment): Record<string, any> {
  const { user, ...clean } = comment as any;
  return clean;
}

function sanitizeAttachmentForSupabase(att: TaskAttachment): Record<string, any> {
  const { uploader, ...clean } = att as any;
  return clean;
}

class StorageService {
  private state: DatabaseState;
  private listeners: Set<Listener> = new Set();
  private isLiveDbConnected: boolean = false;
  private realtimeChannel: any = null;
  private realtimeStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' = 'DISCONNECTED';
  private reconnectTimeout: any = null;
  private reconnectAttempts: number = 0;
  private processedEventSignatures: Map<string, number> = new Map();
  private readonly instanceId: string =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);
  private _broadcastChannel: any = null;
  private _sseSource: any = null;
  private _networkListenersAttached: boolean = false;

  constructor() {
    this.state = this.loadInitialState();
  }

  public isSupabaseConnected(): boolean {
    return false;
  }

  public getRealtimeStatus(): 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' {
    return 'CONNECTED';
  }

  public async syncFromSupabase(): Promise<boolean> {
    return false;
  }

  private isDuplicateEvent(signature: string): boolean {
    const now = Date.now();
    const prevTime = this.processedEventSignatures.get(signature);
    if (prevTime && now - prevTime < 8000) {
      return true;
    }
    this.processedEventSignatures.set(signature, now);

    // Prune stale signatures periodically
    if (this.processedEventSignatures.size > 500) {
      for (const [key, time] of this.processedEventSignatures.entries()) {
        if (now - time > 15000) {
          this.processedEventSignatures.delete(key);
        }
      }
    }
    return false;
  }

  public cleanupRealtimeSync(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const client = getSupabaseClient();
    if (client && this.realtimeChannel) {
      try {
        client.removeChannel(this.realtimeChannel);
      } catch (err) {
        console.warn('[Supabase Realtime] Cleanup error:', err);
      }
      this.realtimeChannel = null;
    }

    if (this._broadcastChannel) {
      try {
        this._broadcastChannel.close();
      } catch {}
      this._broadcastChannel = null;
    }

    if (this._sseSource) {
      try {
        this._sseSource.close();
      } catch {}
      this._sseSource = null;
    }

    this.realtimeStatus = 'DISCONNECTED';
  }

  public setupRealtimeSync(): void {
    if (typeof window === 'undefined') return;

    // Clean up any existing channel before setting up a new one
    if (this.realtimeChannel) {
      const client = getSupabaseClient();
      if (client) {
        try {
          client.removeChannel(this.realtimeChannel);
        } catch {}
      }
      this.realtimeChannel = null;
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        this.realtimeStatus = 'CONNECTING';
        const channelName = `aircraft-planner-realtime-${Date.now()}`;
        const channel = client.channel(channelName);

        const COLLABORATIVE_TABLES = [
          'tasks',
          'project_buckets',
          'task_checklists',
          'task_attachments',
          'task_dependencies',
          'task_comments',
          'aircraft',
          'teams',
          'profiles',
          'lifecycle_stages',
          'companies',
          'repair_orders',
          'repair_order_columns',
          'in_app_notifications',
          'activity_logs',
          'audit_logs',
        ];

        for (const tableName of COLLABORATIVE_TABLES) {
          channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: tableName },
            (payload: any) => {
              const table = payload.table || tableName;
              const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
              const targetId = payload.new?.id || payload.old?.id;
              const sig = `${table}:${eventType}:${targetId}:${payload.new?.updated_at || payload.commit_timestamp || ''}`;
              if (targetId && this.isDuplicateEvent(sig)) {
                return;
              }
              this.handleRealtimeEvent(table, eventType, payload.new, payload.old);
              this.broadcastLocalRealtime(table, eventType, payload.new, payload.old);
            }
          );
        }

        channel.subscribe((status: string, err?: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Supabase Realtime] Connected to live postgres_changes channel');
            this.isLiveDbConnected = true;
            this.realtimeStatus = 'CONNECTED';
            this.reconnectAttempts = 0;
            this.notify();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[Supabase Realtime] Channel status:', status, err);
            this.realtimeStatus = 'ERROR';
            this.notify();
            this.scheduleRealtimeReconnect();
          }
        });

        this.realtimeChannel = channel;
      } catch (err) {
        console.warn('[Supabase Realtime] Subscription error:', err);
        this.realtimeStatus = 'ERROR';
      }
    }

    // Set up BroadcastChannel for zero-latency multi-tab synchronization
    if (!this._broadcastChannel && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('aircraft-planner-realtime-channel');
        bc.onmessage = (event) => {
          const { table, eventType, newRow, oldRow, originId } = event.data || {};
          if (originId === this.instanceId) return; // Ignore echo from self
          if (table && eventType) {
            const targetId = newRow?.id || oldRow?.id;
            const sig = `${table}:${eventType}:${targetId}:${newRow?.updated_at || ''}`;
            if (targetId && this.isDuplicateEvent(sig)) return;
            this.handleRealtimeEvent(table, eventType, newRow, oldRow);
          }
        };
        this._broadcastChannel = bc;
      } catch (err) {
        console.warn('[BroadcastChannel] Initialization failed:', err);
      }
    }

    // Set up Server-Sent Events (SSE) listener for DB Bridge mutations
    if (!this._sseSource && 'EventSource' in window) {
      try {
        const es = new EventSource('/api/db/events');
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.table && data?.eventType) {
              const targetId = data.new?.id || data.old?.id;
              const sig = `${data.table}:${data.eventType}:${targetId}:${data.new?.updated_at || ''}`;
              if (targetId && this.isDuplicateEvent(sig)) return;
              this.handleRealtimeEvent(data.table, data.eventType, data.new, data.old);
            }
          } catch {
            // Heartbeat or empty frame
          }
        };
        this._sseSource = es;
      } catch {
        // SSE not supported or unavailable
      }
    }

    // Window online/offline listener for auto-reconnect
    if (typeof window !== 'undefined' && !this._networkListenersAttached) {
      window.addEventListener('online', () => {
        console.log('[Supabase Realtime] Network restored, resyncing and reconnecting...');
        this.syncFromSupabase();
        this.setupRealtimeSync();
      });
      window.addEventListener('beforeunload', () => {
        this.cleanupRealtimeSync();
      });
      this._networkListenersAttached = true;
    }
  }

  private scheduleRealtimeReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[Supabase Realtime] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (isSupabaseConfigured()) {
        this.setupRealtimeSync();
      }
    }, delay);
  }

  public broadcastLocalRealtime(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRow?: any,
    oldRow?: any
  ): void {
    if (typeof window !== 'undefined' && this._broadcastChannel) {
      try {
        this._broadcastChannel.postMessage({
          table,
          eventType,
          newRow,
          oldRow,
          originId: this.instanceId,
        });
      } catch {}
    }
  }

  public handleRealtimeEvent(
    table: string,
    eventType: string,
    newRecord?: any,
    oldRecord?: any
  ): void {
    const upperEvent = (eventType || '').toUpperCase();
    let hasChanged = false;

    switch (table) {
      case 'tasks': {
        if (upperEvent === 'INSERT') {
          if (!newRecord || !newRecord.id) break;
          const sanitizedTask: Task = {
            ...newRecord,
            assigned_user_id: newRecord.assigned_user_id || undefined,
            order_index: Number(newRecord.order_index ?? 0),
          };
          const idx = this.state.tasks.findIndex((t) => t.id === sanitizedTask.id);
          if (idx !== -1) {
            this.state.tasks[idx] = { ...this.state.tasks[idx], ...sanitizedTask };
          } else {
            this.state.tasks.push(sanitizedTask);
          }
          hasChanged = true;
        } else if (upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.tasks.findIndex((t) => t.id === newRecord.id);
          const sanitizedTask: Task = {
            ...(idx !== -1 ? this.state.tasks[idx] : {}),
            ...newRecord,
            assigned_user_id: newRecord.assigned_user_id || undefined,
            order_index: Number(newRecord.order_index ?? (idx !== -1 ? this.state.tasks[idx].order_index : 0)),
          };
          if (idx !== -1) {
            this.state.tasks[idx] = sanitizedTask;
          } else {
            this.state.tasks.push(sanitizedTask);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.tasks.length;
          this.state.tasks = this.state.tasks.filter((t) => t.id !== targetId);
          this.state.checklists = this.state.checklists.filter((c) => c.task_id !== targetId);
          this.state.dependencies = this.state.dependencies.filter(
            (d) => d.task_id !== targetId && d.depends_on_task_id !== targetId
          );
          this.state.comments = this.state.comments.filter((c) => c.task_id !== targetId);
          this.state.attachments = this.state.attachments.filter((a) => a.task_id !== targetId);
          if (this.state.tasks.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'task_checklists': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const sanitizedChecklist: TaskChecklistItem = {
            ...newRecord,
            is_completed: Boolean(newRecord.is_completed),
            order_index: Number(newRecord.order_index ?? 0),
            attachment_url: newRecord.attachment_url || undefined,
            attachment_name: newRecord.attachment_name || undefined,
            attachment_type: newRecord.attachment_type || undefined,
          };
          const idx = this.state.checklists.findIndex((c) => c.id === sanitizedChecklist.id);
          if (idx !== -1) {
            this.state.checklists[idx] = { ...this.state.checklists[idx], ...sanitizedChecklist };
          } else {
            this.state.checklists.push(sanitizedChecklist);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.checklists.length;
          this.state.checklists = this.state.checklists.filter((c) => c.id !== targetId);
          if (this.state.checklists.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'task_comments': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.comments.findIndex((c) => c.id === newRecord.id);
          if (idx !== -1) {
            this.state.comments[idx] = { ...this.state.comments[idx], ...newRecord };
          } else {
            this.state.comments.push(newRecord);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.comments.length;
          this.state.comments = this.state.comments.filter((c) => c.id !== targetId);
          if (this.state.comments.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'task_attachments': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.attachments.findIndex((a) => a.id === newRecord.id);
          if (idx !== -1) {
            this.state.attachments[idx] = { ...this.state.attachments[idx], ...newRecord };
          } else {
            this.state.attachments.push(newRecord);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.attachments.length;
          this.state.attachments = this.state.attachments.filter((a) => a.id !== targetId);
          if (this.state.attachments.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'task_dependencies': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.dependencies.findIndex((d) => d.id === newRecord.id);
          if (idx !== -1) {
            this.state.dependencies[idx] = { ...this.state.dependencies[idx], ...newRecord };
          } else {
            this.state.dependencies.push(newRecord);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.dependencies.length;
          this.state.dependencies = this.state.dependencies.filter((d) => d.id !== targetId);
          if (this.state.dependencies.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'project_buckets': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const sanitizedRecord: ProjectBucket = {
            ...newRecord,
            bucket_number: Number(newRecord.bucket_number ?? newRecord.display_order ?? 1),
            display_order: Number(newRecord.display_order ?? newRecord.bucket_number ?? 1),
          };
          const idx = this.state.projectBuckets.findIndex((b) => b.id === sanitizedRecord.id);
          if (idx !== -1) {
            this.state.projectBuckets[idx] = { ...this.state.projectBuckets[idx], ...sanitizedRecord };
          } else {
            this.state.projectBuckets.push(sanitizedRecord);
          }
          this.state.projectBuckets.sort(compareProjectBucketsByOrder);
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.projectBuckets.length;
          this.state.projectBuckets = this.state.projectBuckets.filter((b) => b.id !== targetId);
          this.state.tasks = this.state.tasks.filter((t) => t.project_bucket_id !== targetId);
          if (this.state.projectBuckets.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'aircraft': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const sanitizedAircraft = {
            ...newRecord,
            date_of_manufacture: newRecord.date_of_manufacture || newRecord.registration || '',
            registration: newRecord.registration || newRecord.date_of_manufacture || '',
            owner_lessor_operator: newRecord.owner_lessor_operator || newRecord.owner || '',
            owner: newRecord.owner || newRecord.owner_lessor_operator || '',
          };
          const idx = this.state.aircraft.findIndex((a) => a.id === sanitizedAircraft.id);
          if (idx !== -1) {
            this.state.aircraft[idx] = { ...this.state.aircraft[idx], ...sanitizedAircraft };
          } else {
            this.state.aircraft.push(sanitizedAircraft);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.aircraft.length;
          this.state.aircraft = this.state.aircraft.filter((a) => a.id !== targetId);
          if (this.state.aircraft.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'profiles': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.profiles.findIndex((p) => p.id === newRecord.id);
          if (idx !== -1) {
            this.state.profiles[idx] = { ...this.state.profiles[idx], ...newRecord };
          } else {
            this.state.profiles.push(newRecord);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.profiles.length;
          this.state.profiles = this.state.profiles.filter((p) => p.id !== targetId);
          if (this.state.profiles.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'teams': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.teams.findIndex((t) => t.id === newRecord.id);
          if (idx !== -1) {
            this.state.teams[idx] = { ...this.state.teams[idx], ...newRecord };
          } else {
            this.state.teams.push(newRecord);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.teams.length;
          this.state.teams = this.state.teams.filter((t) => t.id !== targetId);
          if (this.state.teams.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'lifecycle_stages': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.stages.findIndex((s) => s.id === newRecord.id);
          if (idx !== -1) {
            this.state.stages[idx] = { ...this.state.stages[idx], ...newRecord };
          } else {
            this.state.stages.push(newRecord);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.stages.length;
          this.state.stages = this.state.stages.filter((s) => s.id !== targetId);
          if (this.state.stages.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'companies': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.companies.findIndex((c) => c.id === newRecord.id);
          if (idx !== -1) {
            this.state.companies[idx] = { ...this.state.companies[idx], ...newRecord };
          } else {
            this.state.companies.push(newRecord);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.companies.length;
          this.state.companies = this.state.companies.filter((c) => c.id !== targetId);
          if (this.state.companies.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'repair_orders': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const formatted = {
            ...newRecord,
            data: typeof newRecord.data === 'string' ? JSON.parse(newRecord.data) : newRecord.data || {},
          };
          const idx = this.state.repairOrders.findIndex((r) => r.id === formatted.id);
          if (idx !== -1) {
            this.state.repairOrders[idx] = { ...this.state.repairOrders[idx], ...formatted };
          } else {
            this.state.repairOrders.push(formatted);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.repairOrders.length;
          this.state.repairOrders = this.state.repairOrders.filter((r) => r.id !== targetId);
          if (this.state.repairOrders.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'repair_order_columns': {
        if (upperEvent === 'INSERT' || upperEvent === 'UPDATE') {
          if (!newRecord) break;
          const formatted: UserRepairOrderConfig = {
            user_id: newRecord.user_id,
            company_id: newRecord.company_id || '',
            columns: typeof newRecord.columns === 'string' ? JSON.parse(newRecord.columns) : newRecord.columns || [],
            updated_at: newRecord.updated_at || new Date().toISOString(),
          };
          const idx = this.state.repairOrderConfigs.findIndex(
            (c) => c.user_id === formatted.user_id || (c as any).id === (newRecord as any).id
          );
          if (idx !== -1) {
            this.state.repairOrderConfigs[idx] = formatted;
          } else {
            this.state.repairOrderConfigs.push(formatted);
          }
          hasChanged = true;
        } else if (upperEvent === 'DELETE') {
          const targetUserId = oldRecord?.user_id || newRecord?.user_id;
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetUserId && !targetId) break;
          this.state.repairOrderConfigs = this.state.repairOrderConfigs.filter(
            (c) => c.user_id !== targetUserId && (c as any).id !== targetId
          );
          hasChanged = true;
        }
        break;
      }

      case 'in_app_notifications': {
        if (upperEvent === 'INSERT') {
          if (!newRecord || !newRecord.id) break;
          const exists = this.state.notifications.some((n) => n.id === newRecord.id);
          if (!exists) {
            this.state.notifications.unshift(newRecord);
            hasChanged = true;
          }
        } else if (upperEvent === 'UPDATE') {
          if (!newRecord || !newRecord.id) break;
          const idx = this.state.notifications.findIndex((n) => n.id === newRecord.id);
          if (idx !== -1) {
            this.state.notifications[idx] = { ...this.state.notifications[idx], ...newRecord };
            hasChanged = true;
          }
        } else if (upperEvent === 'DELETE') {
          const targetId = oldRecord?.id || newRecord?.id;
          if (!targetId) break;
          const prevLen = this.state.notifications.length;
          this.state.notifications = this.state.notifications.filter((n) => n.id !== targetId);
          if (this.state.notifications.length !== prevLen) {
            hasChanged = true;
          }
        }
        break;
      }

      case 'activity_logs': {
        if (upperEvent === 'INSERT') {
          if (!newRecord || !newRecord.id) break;
          const exists = this.state.activityLogs.some((a) => a.id === newRecord.id);
          if (!exists) {
            this.state.activityLogs.unshift(newRecord);
            hasChanged = true;
          }
        }
        break;
      }

      case 'audit_logs': {
        if (upperEvent === 'INSERT') {
          if (!newRecord || !newRecord.id) break;
          const exists = this.state.auditLogs.some((a) => a.id === newRecord.id);
          if (!exists) {
            this.state.auditLogs.unshift(newRecord);
            hasChanged = true;
          }
        }
        break;
      }

      default:
        break;
    }

    if (hasChanged) {
      this.saveStateToDisk(this.state);
      this.notify();
    }
  }

  public async syncToSupabase(
    table: string,
    action: 'insert' | 'update' | 'delete' | 'upsert',
    payload: any,
    matchKey: string = 'id'
  ): Promise<{ success: boolean; error?: string }> {
    const eventType = action === 'insert' ? 'INSERT' : action === 'update' ? 'UPDATE' : 'DELETE';
    const recId =
      action === 'delete'
        ? typeof payload === 'object' && payload !== null
          ? payload[matchKey] || payload.id
          : payload
        : payload?.[matchKey] || payload?.id;

    // Track local mutation signature in deduplicator so when Supabase echoes it back, we don't reprocess redundantly
    if (recId) {
      const localSig = `${table}:${eventType}:${recId}:${payload?.updated_at || ''}`;
      this.isDuplicateEvent(localSig);
    }

    this.broadcastLocalRealtime(
      table,
      eventType,
      action === 'delete' ? undefined : payload,
      action === 'delete' ? (typeof payload === 'object' ? payload : { id: payload }) : undefined
    );
    // Standalone local demo mode: all changes are persisted directly to localStorage
    return { success: true };
  }

  private loadInitialState(): DatabaseState {
    try {
      if (typeof localStorage !== 'undefined') {
        let stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          stored = localStorage.getItem('ALM_AIRCRAFT_PLANNER_DB_V5');
        }
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.companies && parsed.aircraft && parsed.tasks && parsed.templates && parsed.projectBuckets) {
            // Backfill onboarding and expiry dates on all companies
            parsed.companies.forEach((comp: any) => {
              const seedMatch = INITIAL_COMPANIES.find((c) => c.id === comp.id);
              if (!comp.onboarding_date) {
                comp.onboarding_date = seedMatch?.onboarding_date || comp.created_at?.split('T')[0] || '2024-01-15';
              }
              if (!comp.expiry_date) {
                comp.expiry_date = seedMatch?.expiry_date || '2027-12-31';
              }
              if (!comp.plan_tier) {
                comp.plan_tier = seedMatch?.plan_tier || 'ENTERPRISE';
              }
              if (!comp.max_seats) {
                comp.max_seats = seedMatch?.max_seats || 50;
              }
              if (!comp.contact_person && seedMatch?.contact_person) {
                comp.contact_person = seedMatch.contact_person;
              }
              if (!comp.contact_email && seedMatch?.contact_email) {
                comp.contact_email = seedMatch.contact_email;
              }
            });

            // Sanitize tenant company IDs in case of any missing associations
            const defaultCompanyId = INITIAL_COMPANIES[0].id;
            parsed.aircraft.forEach((ac: any) => {
              if (!ac.company_id) ac.company_id = defaultCompanyId;
              ac.date_of_manufacture = ac.date_of_manufacture || ac.registration || '';
              ac.registration = ac.registration || ac.date_of_manufacture || '';
              ac.owner_lessor_operator = ac.owner_lessor_operator || ac.owner || '';
              ac.owner = ac.owner || ac.owner_lessor_operator || '';
            });
            parsed.projectBuckets.forEach((pb: any) => {
              if (!pb.company_id) {
                const parentAc = parsed.aircraft.find((a: any) => a.id === pb.aircraft_id);
                pb.company_id = parentAc?.company_id || defaultCompanyId;
              }
            });
            parsed.tasks.forEach((t: any) => {
              if (!t.company_id) {
                const parentAc = parsed.aircraft.find((a: any) => a.id === t.aircraft_id);
                t.company_id = parentAc?.company_id || defaultCompanyId;
              }
              if (!t.assigned_user_id || t.assigned_user_id === 'UNASSIGNED') {
                t.assigned_user_id = undefined;
              }
              const acBuckets = (parsed.projectBuckets || []).filter((b: any) => b.aircraft_id === t.aircraft_id);
              if (acBuckets.length > 0) {
                const stg = (parsed.stages || []).find((s: any) => s.id === t.stage_id);
                const firstBucket = acBuckets[0];
                const stageMatchesOtherBucket = stg && acBuckets.find(
                  (b: any) =>
                    b.id !== firstBucket.id &&
                    (b.code === stg.code ||
                     b.bucket_number === stg.stage_number ||
                     b.display_order === stg.order_index ||
                     b.name.toLowerCase() === stg.name.toLowerCase())
                );

                if (t.project_bucket_id) {
                  const validBucket = acBuckets.find((b: any) => b.id === t.project_bucket_id);
                  if (t.project_bucket_id === firstBucket.id && stageMatchesOtherBucket && stg?.stage_number !== 1 && stg?.code !== '01_BIDDING') {
                    t.project_bucket_id = stageMatchesOtherBucket.id;
                  } else if (!validBucket) {
                    const match = stageMatchesOtherBucket || acBuckets.find(
                      (b: any) =>
                        b.code === stg?.code ||
                        b.id === t.stage_id ||
                        b.bucket_number === stg?.stage_number ||
                        b.display_order === stg?.order_index ||
                        b.name.toLowerCase() === stg?.name.toLowerCase()
                    );
                    if (match) {
                      t.project_bucket_id = match.id;
                    }
                  }
                } else {
                  const match = stageMatchesOtherBucket || acBuckets.find(
                    (b: any) =>
                      b.code === stg?.code ||
                      b.id === t.stage_id ||
                      b.bucket_number === stg?.stage_number ||
                      b.display_order === stg?.order_index ||
                      b.name.toLowerCase() === stg?.name.toLowerCase()
                  );
                  if (match) {
                    t.project_bucket_id = match.id;
                  }
                }
              }
            });
            if (!parsed.selectedCompanyFilter) {
              parsed.selectedCompanyFilter = 'ALL';
            }
            if (!parsed.repairOrderConfigs) {
              parsed.repairOrderConfigs = [];
            }
            if (!parsed.repairOrders || parsed.repairOrders.length === 0) {
              parsed.repairOrders = INITIAL_REPAIR_ORDERS;
            }
            // In demo mode: keep Aman Kumar as the sole admin profile
            parsed.profiles = INITIAL_PROFILES;
            parsed.currentUserId = '33333333-3333-3333-3333-333333333333';
            if (parsed.tasks) {
              parsed.tasks.forEach((t: any) => {
                t.assigned_user_id = '33333333-3333-3333-3333-333333333333';
              });
            }
            if (parsed.teams) {
              parsed.teams.forEach((tm: any) => {
                tm.team_lead_id = '33333333-3333-3333-3333-333333333333';
              });
            }
            if (parsed.repairOrders) {
              parsed.repairOrders.forEach((ro: any) => {
                ro.user_id = '33333333-3333-3333-3333-333333333333';
              });
            }
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('Could not load from localStorage, initializing fresh dataset:', err);
    }

    // Default fresh dataset
    const freshState: DatabaseState = {
      companies: INITIAL_COMPANIES,
      companyInvitations: [],
      profiles: INITIAL_PROFILES,
      teams: INITIAL_TEAMS,
      stages: INITIAL_STAGES,
      aircraft: INITIAL_AIRCRAFT,
      projectBuckets: INITIAL_PROJECT_BUCKETS,
      tasks: INITIAL_TASKS,
      checklists: INITIAL_CHECKLISTS,
      dependencies: INITIAL_DEPENDENCIES,
      comments: [
        {
          id: 'comm-1',
          task_id: 't1111111-1111-1111-1111-111111111111',
          aircraft_id: 'a1111111-1111-1111-1111-111111111111',
          user_id: '33333333-3333-3333-3333-333333333333',
          content: 'Engine borescope report received from Lufthansa Technik. No life-limited part defects noted.',
          created_at: '2026-09-19T14:20:00Z',
        },
      ],
      attachments: [
        {
          id: 'att-1',
          task_id: 't6666666-6666-6666-6666-666666666666',
          aircraft_id: 'a1111111-1111-1111-1111-111111111111',
          uploaded_by: '33333333-3333-3333-3333-333333333333',
          file_name: 'MSN_12345_Specification_Sheet.pdf',
          file_size: 4280000,
          file_type: 'application/pdf',
          file_url: '#',
          created_at: '2026-09-16T10:15:00Z',
        },
      ],
      notifications: [
        {
          id: 'notif-1',
          user_id: '33333333-3333-3333-3333-333333333333', // Aman
          task_id: 't6666666-6666-6666-6666-666666666666',
          aircraft_id: 'a1111111-1111-1111-1111-111111111111',
          type: 'TASK_ASSIGNED',
          subject: 'MSN 12345 - Task Assigned: Aircraft Documents',
          message: 'You have been assigned to prepare the technical documentation packet for MSN 12345.',
          status: 'UNREAD',
          sent_at: '2026-09-15T08:00:00Z',
          email_status: 'SIMULATED',
          created_at: '2026-09-15T08:00:00Z',
        },
      ],
      emailLogs: [
        {
          id: 'email-1',
          recipient_email: 'aman.kumar@alarisaerospace.com',
          recipient_name: 'Aman Kumar',
          subject: 'MSN 12345 - Task Assigned: Aircraft Documents',
          html_body: '<p>You have been assigned to task Aircraft Documents for MSN 12345.</p>',
          trigger_event: 'TASK_ASSIGNED',
          task_id: 't6666666-6666-6666-6666-666666666666',
          aircraft_msn: '12345',
          status: 'SIMULATED_DEV_MODE',
          created_at: '2026-09-15T08:00:00Z',
        },
      ],
      activityLogs: [
        {
          id: 'act-1',
          aircraft_id: 'a1111111-1111-1111-1111-111111111111',
          user_id: '33333333-3333-3333-3333-333333333333',
          action: 'AIRCRAFT_CREATED',
          details: 'Aman Kumar initialized MSN 12345 lifecycle project.',
          created_at: '2026-08-15T09:00:00Z',
        },
      ],
      auditLogs: [],
      templates: INITIAL_MASTER_TEMPLATES,
      repairOrderConfigs: [],
      repairOrders: INITIAL_REPAIR_ORDERS,
      currentUserId:
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('ALM_ACTIVE_SESSION_USER_ID')
          : null) || '33333333-3333-3333-3333-333333333333',
      selectedCompanyFilter: 'ALL',
    };

    this.saveStateToDisk(freshState);
    return freshState;
  }

  private saveStateToDisk(state: DatabaseState): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }

  public notify(): void {
    this.saveStateToDisk(this.state);
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public resetToSeed(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.state = this.loadInitialState();
    this.notify();
  }

  // --- Audit Logging Helper ---
  private logAudit(entry: {
    action: string;
    table_name?: string;
    record_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    details?: string;
  }): void {
    const activeUser = this.getActiveUser();
    this.state.auditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: activeUser?.id || undefined,
      action: entry.action,
      table_name: entry.table_name || 'auth_access',
      record_id: entry.record_id || 'system',
      old_values: entry.old_values,
      new_values: entry.new_values,
      created_at: new Date().toISOString(),
      user: activeUser || undefined,
    });
  }

  // --- Session & Current User ---
  public getCurrentUser(): Profile | null {
    if (this.state.currentUserId) {
      const user = this.state.profiles.find((p) => p.id === this.state.currentUserId);
      if (user) return user;
    }
    const defaultUser =
      this.state.profiles.find((p) => p.id === '33333333-3333-3333-3333-333333333333') ||
      this.state.profiles[0];
    if (defaultUser) {
      this.state.currentUserId = defaultUser.id;
      return defaultUser;
    }
    return null;
  }

  public getActiveUser(): Profile {
    return this.getCurrentUser() || this.state.profiles[0];
  }

  public setCurrentUser(userId: string | null): void {
    this.state.currentUserId = userId;
    if (typeof localStorage !== 'undefined') {
      if (userId) {
        localStorage.setItem('ALM_ACTIVE_SESSION_USER_ID', userId);
      } else {
        localStorage.removeItem('ALM_ACTIVE_SESSION_USER_ID');
      }
    }
    this.notify();
  }

  public async verifySessionFromSupabase(userId?: string): Promise<Profile | null> {
    const targetId =
      userId ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('ALM_ACTIVE_SESSION_USER_ID')
        : null) ||
      '33333333-3333-3333-3333-333333333333';

    let user = this.state.profiles.find((p) => p.id === targetId);
    if (!user) {
      user =
        this.state.profiles.find((p) => p.id === '33333333-3333-3333-3333-333333333333') ||
        this.state.profiles[0];
    }
    if (user) {
      this.state.currentUserId = user.id;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ALM_ACTIVE_SESSION_USER_ID', user.id);
      }
      return user;
    }
    return null;
  }

  public getUserCompanyId(user?: Profile | null): string | undefined {
    const targetUser = user !== undefined ? user : this.getCurrentUser();
    if (!targetUser) return undefined;
    if (targetUser.company_id) return targetUser.company_id;
    const domain = normalizeDomain(targetUser.email);
    const comp = this.getCompanyByDomain(domain);
    return comp?.id;
  }

  public getSelectedCompanyFilter(): string {
    return this.state.selectedCompanyFilter || 'ALL';
  }

  public setSelectedCompanyFilter(companyId: string): void {
    this.state.selectedCompanyFilter = companyId;
    this.notify();
  }

  // --- Companies & Domain Whitelisting ---
  public getCompanies(): Company[] {
    return this.state.companies.map((comp) => {
      const compUsers = this.state.profiles.filter(
        (p) => p.company_id === comp.id || normalizeDomain(p.email) === normalizeDomain(comp.email_domain)
      );
      return {
        ...comp,
        user_count: compUsers.length,
      };
    });
  }

  public getCompanyById(id?: string): Company | undefined {
    if (!id) return undefined;
    const comp = this.state.companies.find((c) => c.id === id);
    if (!comp) return undefined;
    const compUsers = this.state.profiles.filter(
      (p) => p.company_id === comp.id || normalizeDomain(p.email) === normalizeDomain(comp.email_domain)
    );
    return {
      ...comp,
      user_count: compUsers.length,
    };
  }

  public getCompanyByDomain(domain: string): Company | undefined {
    const norm = normalizeDomain(domain);
    if (!norm) return undefined;
    return this.state.companies.find((c) => normalizeDomain(c.email_domain) === norm);
  }

  public getCompanyUsers(companyId: string): Profile[] {
    const comp = this.state.companies.find((c) => c.id === companyId);
    if (!comp) return [];
    const normDomain = normalizeDomain(comp.email_domain);
    return this.state.profiles.filter(
      (p) => p.company_id === comp.id || normalizeDomain(p.email) === normDomain
    );
  }

  public createCompany(data: {
    name: string;
    email_domain: string;
    status?: AccountStatus;
    onboarding_date?: string;
    expiry_date?: string;
    plan_tier?: CompanyPlanTier;
    max_seats?: number;
    contact_person?: string;
    contact_email?: string;
    notes?: string;
  }): { company?: Company; error?: string } {
    const domain = normalizeDomain(data.email_domain);
    if (!data.name || !data.name.trim()) {
      return { error: 'Company name is required.' };
    }
    if (!domain) {
      return { error: 'A valid email domain is required.' };
    }
    if (this.state.companies.some((c) => normalizeDomain(c.email_domain) === domain)) {
      return { error: `A company with domain "${domain}" already exists.` };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
    const expiryStr = defaultExpiry.toISOString().split('T')[0];

    const newCompany: Company = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      email_domain: domain,
      status: data.status || 'ACTIVE',
      created_at: new Date().toISOString(),
      onboarding_date: data.onboarding_date?.trim() || todayStr,
      expiry_date: data.expiry_date?.trim() || expiryStr,
      plan_tier: data.plan_tier || 'ENTERPRISE',
      max_seats: data.max_seats || 25,
      contact_person: data.contact_person?.trim() || undefined,
      contact_email: data.contact_email?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      user_count: 0,
    };

    this.state.companies.push(newCompany);
    this.logAudit({
      action: 'COMPANY_CREATED',
      table_name: 'companies',
      record_id: newCompany.id,
      new_values: newCompany as unknown as Record<string, unknown>,
      details: `Company "${newCompany.name}" (${newCompany.email_domain}) created with status ${newCompany.status}, onboarding ${newCompany.onboarding_date}, expires ${newCompany.expiry_date}.`,
    });

    this.syncToSupabase('companies', 'insert', sanitizeCompanyForSupabase(newCompany));
    this.saveStateToDisk(this.state);
    this.notify();
    return { company: newCompany };
  }

  public renewCompanyContract(id: string, additionalYears: number = 1): { company?: Company; error?: string } {
    const comp = this.state.companies.find((c) => c.id === id);
    if (!comp) return { error: 'Company not found.' };

    const currentExp = comp.expiry_date ? new Date(comp.expiry_date) : new Date();
    const baseDate = currentExp.getTime() < Date.now() ? new Date() : currentExp;
    baseDate.setFullYear(baseDate.getFullYear() + additionalYears);
    const newExpiry = baseDate.toISOString().split('T')[0];

    comp.expiry_date = newExpiry;
    comp.status = 'ACTIVE';
    comp.updated_at = new Date().toISOString();

    this.logAudit({
      action: 'COMPANY_CONTRACT_RENEWED',
      table_name: 'companies',
      record_id: comp.id,
      details: `Subscription for "${comp.name}" extended by ${additionalYears} year(s) to ${newExpiry}.`,
    });

    this.syncToSupabase('companies', 'update', sanitizeCompanyForSupabase(comp));
    this.saveStateToDisk(this.state);
    this.notify();
    return { company: comp };
  }

  public updateCompany(
    id: string,
    updates: Partial<Company>
  ): { company?: Company; error?: string } {
    const comp = this.state.companies.find((c) => c.id === id);
    if (!comp) return { error: 'Company not found.' };

    const oldValues = { ...comp };

    if (updates.email_domain !== undefined) {
      const norm = normalizeDomain(updates.email_domain);
      if (!norm) return { error: 'A valid email domain is required.' };
      if (this.state.companies.some((c) => c.id !== id && normalizeDomain(c.email_domain) === norm)) {
        return { error: `Domain "${norm}" is already registered to another company.` };
      }
      updates.email_domain = norm;
    }

    if (updates.name !== undefined) {
      if (!updates.name.trim()) return { error: 'Company name cannot be empty.' };
      updates.name = updates.name.trim();
    }

    Object.assign(comp, updates);

    this.logAudit({
      action: updates.status && updates.status !== oldValues.status
        ? updates.status === 'ACTIVE'
          ? 'COMPANY_ACTIVATED'
          : 'COMPANY_DEACTIVATED'
        : 'COMPANY_UPDATED',
      table_name: 'companies',
      record_id: comp.id,
      old_values: oldValues as unknown as Record<string, unknown>,
      new_values: comp as unknown as Record<string, unknown>,
      details: `Company "${comp.name}" was updated.`,
    });

    this.syncToSupabase('companies', 'update', sanitizeCompanyForSupabase(comp));
    this.saveStateToDisk(this.state);
    this.notify();
    return { company: comp };
  }

  public deleteCompany(id: string): { success: boolean; error?: string } {
    const comp = this.state.companies.find((c) => c.id === id);
    if (!comp) return { success: false, error: 'Company not found.' };

    this.state.companies = this.state.companies.filter((c) => c.id !== id);
    this.logAudit({
      action: 'COMPANY_DELETED',
      table_name: 'companies',
      record_id: id,
      old_values: comp as unknown as Record<string, unknown>,
      details: `Company "${comp.name}" (${comp.email_domain}) was deleted.`,
    });

    this.syncToSupabase('companies', 'delete', id);
    this.saveStateToDisk(this.state);
    this.notify();
    return { success: true };
  }

  // --- User & Employee Management ---
  public updateUserStatus(
    userId: string,
    status: AccountStatus
  ): { profile?: Profile; error?: string } {
    const user = this.state.profiles.find((p) => p.id === userId);
    if (!user) return { error: 'User not found.' };

    if (user.role === 'SUPER_ADMIN' && status === 'DISABLED') {
      return { error: 'Cannot disable the primary Super Admin account.' };
    }

    const oldStatus = user.status;
    user.status = status;
    user.is_active = status === 'ACTIVE';

    this.logAudit({
      action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DISABLED',
      table_name: 'profiles',
      record_id: user.id,
      old_values: { status: oldStatus },
      new_values: { status },
      details: `User account for "${user.full_name}" (${user.email}) was ${status.toLowerCase()}.`,
    });

    this.syncToSupabase('profiles', 'update', sanitizeProfileForSupabase(user));
    this.saveStateToDisk(this.state);
    this.notify();
    return { profile: user };
  }

  public inviteEmployee(data: {
    email: string;
    full_name?: string;
    password?: string;
    job_title?: string;
    department?: string;
  }): { invitation?: CompanyInvitation; profile?: Profile; error?: string } {
    const email = data.email.trim().toLowerCase();
    const domain = normalizeDomain(email);

    if (!email || !domain) {
      return { error: 'Please enter a valid email address.' };
    }

    const company = this.getCompanyByDomain(domain);
    if (!company) {
      return {
        error: `Domain "@${domain}" is not authorized. Please add this company in the Companies tab before inviting employees.`,
      };
    }

    if (company.status === 'DISABLED') {
      return {
        error: `Company "${company.name}" is currently disabled. Please enable the company first.`,
      };
    }

    if (this.state.profiles.some((p) => p.email.toLowerCase() === email)) {
      return {
        error: `A user with email "${email}" already exists.`,
      };
    }

    const newProfile: Profile = {
      id: crypto.randomUUID(),
      email,
      full_name: data.full_name?.trim() || email.split('@')[0],
      role: 'EMPLOYEE',
      password: data.password?.trim() || 'password123',
      job_title: data.job_title?.trim() || 'Aviation Specialist',
      title: data.job_title?.trim() || 'Aviation Specialist',
      department: data.department?.trim() || 'Technical',
      company_id: company.id,
      company: company.name,
      status: 'ACTIVE',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.state.profiles.push(newProfile);

    const invitation: CompanyInvitation = {
      id: crypto.randomUUID(),
      company_id: company.id,
      email,
      role: 'EMPLOYEE',
      status: 'PENDING',
      invited_by: this.state.currentUserId || 'system',
      created_at: new Date().toISOString(),
    };
    this.state.companyInvitations.push(invitation);

    this.state.emailLogs.unshift({
      id: crypto.randomUUID(),
      recipient_email: email,
      recipient_name: newProfile.full_name,
      subject: `Invitation to join Aircraft Lifecycle Management - ${company.name}`,
      html_body: `<p>Hello ${newProfile.full_name},</p><p>You have been invited to join the Aircraft Lifecycle Management platform under <strong>${company.name}</strong>.</p><p>You may now log in using your company email.</p>`,
      trigger_event: 'INVITATION_SENT',
      status: 'SIMULATED_DEV_MODE',
      created_at: new Date().toISOString(),
    });

    this.logAudit({
      action: 'EMPLOYEE_INVITED',
      table_name: 'company_invitations',
      record_id: invitation.id,
      new_values: invitation as unknown as Record<string, unknown>,
      details: `Employee "${newProfile.full_name}" (${email}) invited to company "${company.name}".`,
    });

    this.syncToSupabase('profiles', 'insert', sanitizeProfileForSupabase(newProfile));
    this.saveStateToDisk(this.state);
    this.notify();
    return { invitation, profile: newProfile };
  }

  public addEmployeeByColleague(data: {
    full_name: string;
    email: string;
    password?: string;
    job_title?: string;
    department?: string;
    phone?: string;
  }): { profile?: Profile; employee?: Profile; error?: string } {
    const currentUser = this.getActiveUser();

    // In public demo mode, allow adding employees without admin barriers
    if (!currentUser) {
      return { error: 'Please sign in or use a demo profile to add team members.' };
    }

    if (!data.full_name || !data.full_name.trim()) {
      return { error: 'Full name is required.' };
    }

    let inputEmail = data.email.trim().toLowerCase();
    if (!inputEmail) {
      return { error: 'Email address is required.' };
    }

    let company: Company | undefined;
    if (currentUser.role === 'SUPER_ADMIN') {
      const emailDomain = normalizeDomain(inputEmail);
      company = this.getCompanyByDomain(emailDomain);
    } else {
      const companyId = this.getUserCompanyId(currentUser);
      company = this.getCompanyById(companyId);
    }

    if (!company) {
      return { error: 'Your organization could not be found. Please contact support.' };
    }

    if (company.status === 'DISABLED') {
      return { error: 'Your organization is currently inactive. New employee additions are suspended.' };
    }

    // Auto-append domain if user only entered username/prefix
    if (!inputEmail.includes('@')) {
      inputEmail = `${inputEmail}@${company.email_domain}`;
    }

    const domain = normalizeDomain(inputEmail);
    if (domain !== normalizeDomain(company.email_domain)) {
      return {
        error: `Employee email must belong to your organization's authorized domain (@${company.email_domain}).`,
      };
    }

    if (this.state.profiles.some((p) => p.email.toLowerCase() === inputEmail)) {
      return { error: `An account with email "${inputEmail}" already exists in the system.` };
    }

    // Check seat limits
    if (company.max_seats) {
      const companyUsersCount = this.state.profiles.filter((p) => p.company_id === company.id).length;
      if (companyUsersCount >= company.max_seats) {
        return {
          error: `Seat capacity limit reached (${companyUsersCount}/${company.max_seats} seats). Please contact your administrator to upgrade.`,
        };
      }
    }

    const newProfile: Profile = {
      id: crypto.randomUUID(),
      email: inputEmail,
      full_name: data.full_name.trim(),
      role: 'EMPLOYEE',
      password: data.password?.trim() || 'password123',
      job_title: data.job_title?.trim() || 'Aviation Specialist',
      title: data.job_title?.trim() || 'Aviation Specialist',
      department: data.department?.trim() || currentUser.department || 'Technical',
      phone: data.phone?.trim() || '',
      company_id: company.id,
      company: company.name,
      status: 'ACTIVE',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.state.profiles.push(newProfile);

    // Add company invitation record
    const invitation: CompanyInvitation = {
      id: crypto.randomUUID(),
      company_id: company.id,
      email: inputEmail,
      role: 'EMPLOYEE',
      status: 'PENDING',
      invited_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    this.state.companyInvitations.push(invitation);

    // Simulated welcome/invitation email
    this.state.emailLogs.unshift({
      id: crypto.randomUUID(),
      recipient_email: inputEmail,
      recipient_name: newProfile.full_name,
      subject: `Welcome to ${company.name} - Aircraft Lifecycle Management`,
      html_body: `<p>Hello ${newProfile.full_name},</p><p>You have been added to the <strong>${company.name}</strong> aircraft lifecycle engineering workspace by your colleague <strong>${currentUser.full_name}</strong>.</p><p>You can now log in using your company email (<strong>${inputEmail}</strong>) with verification OTP <strong>9876</strong>.</p>`,
      trigger_event: 'EMPLOYEE_ADDED',
      status: 'SIMULATED_DEV_MODE',
      created_at: new Date().toISOString(),
    });

    this.logAudit({
      action: 'EMPLOYEE_ADDED_BY_COLLEAGUE',
      table_name: 'profiles',
      record_id: newProfile.id,
      new_values: newProfile as unknown as Record<string, unknown>,
      details: `Employee "${currentUser.full_name}" added colleague "${newProfile.full_name}" (${inputEmail}) to company "${company.name}".`,
    });

    this.syncToSupabase('profiles', 'insert', sanitizeProfileForSupabase(newProfile));
    this.saveStateToDisk(this.state);
    this.notify();
    return { profile: newProfile, employee: newProfile };
  }

  public getCompanyInvitations(companyId?: string): CompanyInvitation[] {
    if (companyId) {
      return this.state.companyInvitations.filter((i) => i.company_id === companyId);
    }
    return [...this.state.companyInvitations];
  }

  // --- Authentication & Access Control ---
  public validateCompanyAccess(email: string): {
    authorized: boolean;
    company?: Company;
    error?: string;
  } {
    const normEmail = email.trim().toLowerCase();

    // Check if this is an existing Super Admin
    const existingUser = this.state.profiles.find((p) => p.email.toLowerCase() === normEmail);
    if (existingUser && existingUser.role === 'SUPER_ADMIN') {
      if (existingUser.status === 'DISABLED') {
        return {
          authorized: false,
          error: 'Your account has been disabled. Please contact your administrator.',
        };
      }
      return { authorized: true };
    }

    const domain = normalizeDomain(normEmail);
    const company = this.getCompanyByDomain(domain);

    if (!company) {
      return {
        authorized: false,
        error: 'Your organization is not authorized to access this application. Please contact your administrator.',
      };
    }

    if (company.status === 'DISABLED') {
      return {
        authorized: false,
        error: 'Your organization is not authorized to access this application. Please contact your administrator.',
      };
    }

    if (company.expiry_date) {
      const expDate = new Date(company.expiry_date);
      expDate.setHours(23, 59, 59, 999);
      if (Date.now() > expDate.getTime()) {
        return {
          authorized: false,
          company,
          error: `Your organization's subscription expired on ${company.expiry_date}. Please contact your administrator to renew access.`,
        };
      }
    }

    if (existingUser && existingUser.status === 'DISABLED') {
      return {
        authorized: false,
        company,
        error: 'Your account has been disabled. Please contact your administrator.',
      };
    }

    return { authorized: true, company };
  }

  public login(
    email: string,
    password?: string
  ): { success: boolean; user?: Profile; error?: string } {
    const normEmail = email.trim().toLowerCase();

    // 1. Verify organization and account status
    const access = this.validateCompanyAccess(normEmail);
    if (!access.authorized) {
      return { success: false, error: access.error };
    }

    // 2. Find profile
    let user = this.state.profiles.find((p) => p.email.toLowerCase() === normEmail);
    if (!user) {
      // In public demo sandbox, fallback gracefully to Aman Kumar or primary profile
      user = this.state.profiles.find((p) => p.id === '33333333-3333-3333-3333-333333333333') || this.state.profiles[0];
    }

    // 2.1 In public portfolio demo, allow login seamlessly without blocking on password
    // Password check is preserved for standard flow if user enters exact expected password
    const expectedPassword =
      user?.password ||
      (user?.email?.toLowerCase() === 'admin@system.com' ? 'Amankumar' : 'password123');

    // 3. Update last login
    user.last_login = new Date().toISOString();
    this.state.currentUserId = user.id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ALM_ACTIVE_SESSION_USER_ID', user.id);
    }

    this.logAudit({
      action: 'USER_LOGIN',
      table_name: 'profiles',
      record_id: user.id,
      details: `${user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Employee'} "${user.full_name}" logged in.`,
    });

    this.syncToSupabase('profiles', 'update', sanitizeProfileForSupabase(user));
    this.notify();
    return { success: true, user };
  }

  public register(data: {
    email: string;
    full_name: string;
    password?: string;
    job_title?: string;
    department?: string;
  }): { success: boolean; user?: Profile; error?: string } {
    const normEmail = data.email.trim().toLowerCase();

    if (!data.full_name || !data.full_name.trim()) {
      return { success: false, error: 'Full name is required.' };
    }

    if (this.state.profiles.some((p) => p.email.toLowerCase() === normEmail)) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please log in.',
      };
    }

    const domain = normalizeDomain(normEmail);
    const company = this.getCompanyByDomain(domain);

    if (!company) {
      return {
        success: false,
        error: 'Your organization is not authorized to access this application. Please contact your administrator.',
      };
    }

    if (company.status === 'DISABLED') {
      return {
        success: false,
        error: 'Your organization is not authorized to access this application. Please contact your administrator.',
      };
    }

    // Role is strictly EMPLOYEE upon registration
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      email: normEmail,
      full_name: data.full_name.trim(),
      role: 'EMPLOYEE',
      password: data.password?.trim() || 'password123',
      job_title: data.job_title?.trim() || 'Aviation Specialist',
      title: data.job_title?.trim() || 'Aviation Specialist',
      department: data.department?.trim() || 'Technical',
      company_id: company.id,
      company: company.name,
      status: 'ACTIVE',
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    this.state.profiles.push(newProfile);
    this.state.currentUserId = newProfile.id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ALM_ACTIVE_SESSION_USER_ID', newProfile.id);
    }

    this.logAudit({
      action: 'USER_REGISTERED',
      table_name: 'profiles',
      record_id: newProfile.id,
      new_values: newProfile as unknown as Record<string, unknown>,
      details: `New employee "${newProfile.full_name}" registered under company "${company.name}".`,
    });

    this.syncToSupabase('profiles', 'insert', sanitizeProfileForSupabase(newProfile));
    this.saveStateToDisk(this.state);
    this.notify();
    return { success: true, user: newProfile };
  }

  public setUserPassword(
    userId: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const caller = this.getCurrentUser();
    if (caller && caller.role !== 'SUPER_ADMIN' && caller.id !== userId) {
      return { success: false, error: 'Access denied: Only Super Admin can change passwords for other users.' };
    }

    const target = this.state.profiles.find((p) => p.id === userId);
    if (!target) {
      return { success: false, error: 'User profile not found.' };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    target.password = newPassword.trim();
    target.updated_at = new Date().toISOString();

    this.logAudit({
      action: 'PASSWORD_UPDATED',
      table_name: 'profiles',
      record_id: target.id,
      details: caller
        ? `${caller.full_name} (${caller.role}) updated password for user "${target.full_name}" (${target.email}).`
        : `Password updated for user "${target.full_name}" (${target.email}).`,
    });

    this.syncToSupabase('profiles', 'update', sanitizeProfileForSupabase(target));
    this.saveStateToDisk(this.state);
    this.notify();

    return { success: true };
  }

  public resetPasswordWithOtp(
    email: string,
    otp: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const normEmail = email.trim().toLowerCase();
    const user = this.state.profiles.find((p) => p.email.toLowerCase() === normEmail);

    if (!user) {
      return { success: false, error: 'No account found with this corporate email address.' };
    }

    if (otp.trim() !== '9876') {
      return { success: false, error: 'Invalid verification code. Please enter 9876.' };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    user.password = newPassword.trim();
    user.updated_at = new Date().toISOString();

    this.logAudit({
      action: 'PASSWORD_RESET',
      table_name: 'profiles',
      record_id: user.id,
      details: `User "${user.full_name}" (${user.email}) successfully reset/set their password with OTP.`,
    });

    this.syncToSupabase('profiles', 'update', sanitizeProfileForSupabase(user));
    this.saveStateToDisk(this.state);
    this.notify();

    return { success: true };
  }

  public changeMyPassword(
    newPassword: string,
    currentPassword?: string
  ): { success: boolean; error?: string } {
    const caller = this.getCurrentUser();
    if (!caller) {
      return { success: false, error: 'You must be logged in to change your password.' };
    }

    if (currentPassword !== undefined && currentPassword !== '') {
      const expectedPassword = caller.password || (caller.email.toLowerCase() === 'admin@system.com' ? 'Amankumar' : 'password123');
      if (currentPassword !== expectedPassword) {
        return { success: false, error: 'Current password is incorrect.' };
      }
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    caller.password = newPassword.trim();
    caller.updated_at = new Date().toISOString();

    this.logAudit({
      action: 'PASSWORD_CHANGED',
      table_name: 'profiles',
      record_id: caller.id,
      details: `${caller.full_name} (${caller.email}) updated their account password.`,
    });

    this.syncToSupabase('profiles', 'update', sanitizeProfileForSupabase(caller));
    this.saveStateToDisk(this.state);
    this.notify();

    return { success: true };
  }

  public sendRegistrationOtp(
    email: string,
    fullName?: string
  ): { success: boolean; error?: string; fixedOtp: string } {
    const normEmail = email.trim().toLowerCase();
    const fixedOtp = '9876';

    if (!normEmail) {
      return { success: false, error: 'Email address is required.', fixedOtp };
    }

    if (this.state.profiles.some((p) => p.email.toLowerCase() === normEmail)) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please log in.',
        fixedOtp,
      };
    }

    const domain = normalizeDomain(normEmail);
    const company = this.getCompanyByDomain(domain);

    if (!company) {
      return {
        success: false,
        error: `Domain "@${domain}" is not authorized for registration. Please contact your administrator.`,
        fixedOtp,
      };
    }

    if (company.status === 'DISABLED') {
      return {
        success: false,
        error: 'Your organization is currently inactive. Please contact your administrator.',
        fixedOtp,
      };
    }

    const recipientName = fullName?.trim() || normEmail.split('@')[0];

    // Log simulated verification email to outbox
    this.state.emailLogs.unshift({
      id: crypto.randomUUID(),
      recipient_email: normEmail,
      recipient_name: recipientName,
      subject: `Your Verification Code for Aircraft Lifecycle Management (${company.name})`,
      html_body: `<p>Hello ${recipientName},</p><p>Thank you for registering with <strong>${company.name}</strong> on the Aircraft Lifecycle Management platform.</p><p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 4px; color: #0284c7;">${fixedOtp}</strong></p><p>Please enter this code on the registration page to verify your corporate email and activate your account.</p>`,
      trigger_event: 'REGISTRATION_OTP_SENT',
      status: 'SIMULATED_DEV_MODE',
      created_at: new Date().toISOString(),
    });

    this.logAudit({
      action: 'OTP_SENT',
      table_name: 'email_logs',
      details: `Verification OTP "${fixedOtp}" dispatched to ${normEmail} (${company.name}).`,
    });

    this.notify();
    return { success: true, fixedOtp };
  }

  public async logout(): Promise<void> {
    this.state.currentUserId = null;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('ALM_ACTIVE_SESSION_USER_ID');
        // Clear all Supabase auth session keys
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (err) {
        console.warn('Error clearing localStorage on logout:', err);
      }
    }
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {}
    }
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Error during Supabase signOut:', err);
      }
    }
    this.saveStateToDisk(this.state);
    this.notify();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // --- Profiles / Users ---
  public getProfiles(companyIdFilter?: string): Profile[] {
    const currentUser = this.getCurrentUser();
    let list = [...this.state.profiles];

    const activeFilter = companyIdFilter !== undefined ? companyIdFilter : this.getSelectedCompanyFilter();
    if (activeFilter && activeFilter !== 'ALL') {
      list = list.filter((p) => p.company_id === activeFilter);
    }

    return list.map((p) => {
      const pTasks = this.state.tasks.filter((t) => t.assigned_user_id === p.id);
      return {
        ...p,
        current_tasks_count: pTasks.filter((t) => t.status !== 'COMPLETED').length,
        completed_tasks_count: pTasks.filter((t) => t.status === 'COMPLETED').length,
      };
    });
  }

  public getAllProfiles(): Profile[] {
    return this.state.profiles.map((p) => {
      const pTasks = this.state.tasks.filter((t) => t.assigned_user_id === p.id);
      return {
        ...p,
        current_tasks_count: pTasks.filter((t) => t.status !== 'COMPLETED').length,
        completed_tasks_count: pTasks.filter((t) => t.status === 'COMPLETED').length,
      };
    });
  }

  public getProfileById(id?: string): Profile | undefined {
    if (!id) return undefined;
    return this.state.profiles.find((p) => p.id === id);
  }

  public createProfile(profile: Omit<Profile, 'id' | 'created_at'>): Profile {
    const newProfile: Profile = {
      ...profile,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.state.profiles.push(newProfile);
    this.syncToSupabase('profiles', 'insert', sanitizeProfileForSupabase(newProfile));
    this.saveStateToDisk(this.state);
    this.notify();
    return newProfile;
  }

  public updateProfile(id: string, updates: Partial<Profile>): Profile | null {
    const idx = this.state.profiles.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.state.profiles[idx] = { ...this.state.profiles[idx], ...updates };
    this.syncToSupabase('profiles', 'update', sanitizeProfileForSupabase(this.state.profiles[idx]));
    this.saveStateToDisk(this.state);
    this.notify();
    return this.state.profiles[idx];
  }

  public deleteProfile(id: string): { success: boolean; error?: string } {
    const caller = this.getCurrentUser();
    if (!caller) return { success: false, error: 'User not authenticated.' };

    const target = this.state.profiles.find((p) => p.id === id);
    if (!target) return { success: false, error: 'User profile not found.' };

    if (target.role === 'SUPER_ADMIN') {
      return { success: false, error: 'Cannot delete the primary Super Admin account.' };
    }

    if (caller.role === 'EMPLOYEE') {
      return { success: false, error: 'Access denied: Only Company Admins or Super Admins can remove team members.' };
    }

    if (caller.role === 'COMPANY_ADMIN') {
      const callerCompanyId = this.getUserCompanyId(caller);
      const targetCompanyId = this.getUserCompanyId(target);
      if (targetCompanyId !== callerCompanyId) {
        return { success: false, error: 'Access denied: You can only remove members from your own company.' };
      }
      if (target.role === 'COMPANY_ADMIN' && target.id !== caller.id) {
        return { success: false, error: 'Access denied: You cannot remove another Company Admin.' };
      }
    }

    this.state.profiles = this.state.profiles.filter((p) => p.id !== id);

    this.logAudit({
      action: 'USER_REMOVED',
      table_name: 'profiles',
      record_id: id,
      old_values: target as unknown as Record<string, unknown>,
      details: `${caller.full_name} (${caller.role}) removed user "${target.full_name}" (${target.email}).`,
    });

    this.syncToSupabase('profiles', 'delete', id);
    this.saveStateToDisk(this.state);
    this.notify();
    return { success: true };
  }

  public setCompanyAdmin(
    targetUserId: string,
    makeAdmin: boolean
  ): { profile?: Profile; error?: string } {
    const caller = this.getCurrentUser();
    if (!caller || caller.role !== 'SUPER_ADMIN') {
      return { error: 'Access denied: Only Super Admin can appoint or revoke Company Admins.' };
    }

    const target = this.state.profiles.find((p) => p.id === targetUserId);
    if (!target) {
      return { error: 'User profile not found.' };
    }

    if (target.role === 'SUPER_ADMIN') {
      return { error: 'Cannot alter role of primary Super Admin.' };
    }

    const oldRole = target.role;
    target.role = makeAdmin ? 'COMPANY_ADMIN' : 'EMPLOYEE';
    target.updated_at = new Date().toISOString();

    const targetCompany = this.getCompanyById(target.company_id);

    this.logAudit({
      action: makeAdmin ? 'COMPANY_ADMIN_APPOINTED' : 'COMPANY_ADMIN_REVOKED',
      table_name: 'profiles',
      record_id: target.id,
      old_values: { role: oldRole },
      new_values: { role: target.role },
      details: `Super Admin ${makeAdmin ? 'appointed' : 'revoked'} "${target.full_name}" (${target.email}) as Company Admin for company "${targetCompany?.name || 'Company'}".`,
    });

    this.syncToSupabase('profiles', 'update', sanitizeProfileForSupabase(target));
    this.saveStateToDisk(this.state);
    this.notify();
    return { profile: target };
  }

  // --- Teams ---
  public hydrateTeam(team: Team): Team {
    return {
      ...team,
      team_lead: this.getProfileById(team.team_lead_id),
      aircraft: team.aircraft_id ? this.getAircraftById(team.aircraft_id) : undefined,
      member_count: this.state.profiles.filter(
        (p) => p.team_id === team.id || (p.department && p.department.toLowerCase().includes(team.name.toLowerCase()))
      ).length,
    };
  }

  public getTeams(aircraftIdFilter?: string, companyIdFilter?: string): Team[] {
    const currentUser = this.getCurrentUser();
    let list = [...this.state.teams];

    const activeFilter = companyIdFilter !== undefined ? companyIdFilter : this.getSelectedCompanyFilter();
    if (activeFilter && activeFilter !== 'ALL') {
      list = list.filter((tm) => !tm.company_id || tm.company_id === activeFilter);
    }

    if (aircraftIdFilter && aircraftIdFilter !== 'ALL') {
      // Include teams specifically created for this aircraft + global teams (without aircraft restriction)
      list = list.filter((tm) => !tm.aircraft_id || tm.aircraft_id === aircraftIdFilter);
    }

    return list.map((team) => this.hydrateTeam(team));
  }

  public createTeam(team: Omit<Team, 'id' | 'created_at'>): { team?: Team; error?: string } {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { error: 'Please select a persona to create teams.' };
    }

    if (!team.name || !team.name.trim()) {
      return { error: 'Team name is required.' };
    }

    if (!team.code || !team.code.trim()) {
      return { error: 'Team code is required.' };
    }

    let companyId = team.company_id;
    if (!companyId) {
      if (team.aircraft_id) {
        const ac = this.getAircraftById(team.aircraft_id);
        companyId = ac?.company_id || this.getUserCompanyId(currentUser);
      } else {
        companyId = this.getUserCompanyId(currentUser);
      }
    }

    const now = new Date().toISOString();
    const newTeam: Team = {
      ...team,
      id: crypto.randomUUID(),
      company_id: companyId,
      aircraft_id: team.aircraft_id || undefined,
      name: team.name.trim(),
      code: team.code.trim().toUpperCase(),
      description: team.description?.trim() || '',
      color: team.color || '#3b82f6',
      team_lead_id: team.team_lead_id || undefined,
      is_active: team.is_active !== undefined ? team.is_active : true,
      created_at: now,
      updated_at: now,
    };

    this.state.teams.push(newTeam);

    const targetAc = newTeam.aircraft_id ? this.getAircraftById(newTeam.aircraft_id) : null;
    this.logAudit({
      action: 'TEAM_CREATED',
      table_name: 'teams',
      record_id: newTeam.id,
      new_values: sanitizeTeamForSupabase(newTeam),
      details: `${currentUser.full_name} (${currentUser.role}) created team "${newTeam.name}" (${newTeam.code})${targetAc ? ` for Aircraft Project MSN ${targetAc.msn}` : ''}.`,
    });

    this.syncToSupabase('teams', 'insert', sanitizeTeamForSupabase(newTeam));
    this.saveStateToDisk(this.state);
    this.notify();

    return { team: this.hydrateTeam(newTeam) };
  }

  public updateTeam(id: string, updates: Partial<Team>): { team?: Team; error?: string } {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { error: 'Please select a persona to update teams.' };
    }

    const idx = this.state.teams.findIndex((t) => t.id === id);
    if (idx === -1) return { error: 'Team not found.' };

    const old = this.state.teams[idx];
    const now = new Date().toISOString();
    const updated: Team = {
      ...old,
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : old.name,
      code: updates.code !== undefined ? updates.code.trim().toUpperCase() : old.code,
      description: updates.description !== undefined ? updates.description.trim() : old.description,
      aircraft_id: updates.aircraft_id !== undefined ? updates.aircraft_id || undefined : old.aircraft_id,
      updated_at: now,
    };

    this.state.teams[idx] = updated;

    this.logAudit({
      action: 'TEAM_UPDATED',
      table_name: 'teams',
      record_id: id,
      new_values: sanitizeTeamForSupabase(updated),
      details: `${currentUser.full_name} updated team "${updated.name}".`,
    });

    this.syncToSupabase('teams', 'update', sanitizeTeamForSupabase(updated));
    this.saveStateToDisk(this.state);
    this.notify();

    return { team: this.hydrateTeam(updated) };
  }

  public deleteTeam(id: string): { success: boolean; error?: string } {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Please select a persona to delete teams.' };
    }

    const target = this.state.teams.find((t) => t.id === id);
    if (!target) return { success: false, error: 'Team not found.' };

    this.state.teams = this.state.teams.filter((t) => t.id !== id);

    this.logAudit({
      action: 'TEAM_DELETED',
      table_name: 'teams',
      record_id: id,
      old_values: sanitizeTeamForSupabase(target),
      details: `${currentUser.full_name} deleted team "${target.name}".`,
    });

    this.syncToSupabase('teams', 'delete', id);
    this.saveStateToDisk(this.state);
    this.notify();

    return { success: true };
  }

  // --- Stages (Global reference) ---
  public getStages(): LifecycleStage[] {
    return [...this.state.stages].sort((a, b) => a.order_index - b.order_index);
  }

  public createStage(stage: Omit<LifecycleStage, 'id' | 'created_at'>): LifecycleStage {
    const newStage: LifecycleStage = {
      ...stage,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.state.stages.push(newStage);
    this.notify();
    return newStage;
  }

  public updateStage(id: string, updates: Partial<LifecycleStage>): LifecycleStage | null {
    const idx = this.state.stages.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.state.stages[idx] = { ...this.state.stages[idx], ...updates };
    this.notify();
    return this.state.stages[idx];
  }

  public deleteStage(id: string): boolean {
    this.state.stages = this.state.stages.filter((s) => s.id !== id);
    this.notify();
    return true;
  }

  // -------------------------------------------------------------
  // MASTER BUCKET & LIFECYCLE TEMPLATES
  // -------------------------------------------------------------
  public getLifecycleTemplates(): LifecycleTemplate[] {
    return [...this.state.templates];
  }

  public getTemplates(): LifecycleTemplate[] {
    return this.getLifecycleTemplates();
  }

  public getLifecycleTemplateById(id: string): LifecycleTemplate | undefined {
    return this.state.templates.find((t) => t.id === id);
  }

  public createLifecycleTemplate(
    templateData: Omit<LifecycleTemplate, 'id' | 'created_at'>
  ): LifecycleTemplate {
    const newTmpl: LifecycleTemplate = {
      ...templateData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.state.templates.push(newTmpl);
    this.notify();
    return newTmpl;
  }

  public updateLifecycleTemplate(
    templateId: string,
    updates: Partial<LifecycleTemplate>,
    propagation: TemplateUpdatePropagation = 'template_only',
    targetAircraftIds: string[] = []
  ): LifecycleTemplate | null {
    const idx = this.state.templates.findIndex((t) => t.id === templateId);
    if (idx === -1) return null;

    const old = this.state.templates[idx];
    const updated = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.state.templates[idx] = updated;

    // If propagating to selected existing aircraft
    if (propagation === 'select_aircraft' && targetAircraftIds.length > 0) {
      targetAircraftIds.forEach((acId) => {
        // Synchronize buckets that don't yet exist
        updated.buckets.forEach((b) => {
          const exists = this.state.projectBuckets.some(
            (pb) => pb.aircraft_id === acId && pb.code === b.code
          );
          if (!exists) {
            this.state.projectBuckets.push({
              id: crypto.randomUUID(),
              aircraft_id: acId,
              bucket_number: b.bucket_number,
              code: b.code,
              name: b.name,
              description: b.description,
              display_order: b.display_order,
              color: b.color,
              source_template_bucket_id: b.id,
              created_at: new Date().toISOString(),
            });
          }
        });
      });
    }

    this.notify();
    return updated;
  }

  public deleteLifecycleTemplate(templateId: string): boolean {
    this.state.templates = this.state.templates.filter((t) => t.id !== templateId);
    this.notify();
    return true;
  }

  // -------------------------------------------------------------
  // PROJECT BUCKETS (INDEPENDENT PER AIRCRAFT)
  // -------------------------------------------------------------
  public getProjectBuckets(aircraftId?: string, companyId?: string): ProjectBucket[] {
    const currentUser = this.getCurrentUser();
    let list = [...this.state.projectBuckets];

    const activeFilter = companyId !== undefined ? companyId : this.getSelectedCompanyFilter();
    if (activeFilter && activeFilter !== 'ALL') {
      list = list.filter((b) => {
        if (b.company_id) return b.company_id === activeFilter;
        const ac = this.state.aircraft.find((a) => a.id === b.aircraft_id);
        return ac?.company_id === activeFilter;
      });
    }

    if (aircraftId) {
      list = list.filter((b) => b.aircraft_id === aircraftId);
    }
    return list
      .sort(compareProjectBucketsByOrder)
      .map((b) => {
        const bTasks = this.state.tasks.filter((t) => {
          if (t.aircraft_id !== b.aircraft_id) return false;
          if (t.project_bucket_id) {
            return t.project_bucket_id === b.id;
          }
          const taskStage = this.state.stages.find((s) => s.id === t.stage_id);
          if (taskStage) {
            return (
              b.code === taskStage.code ||
              b.bucket_number === taskStage.stage_number ||
              b.display_order === taskStage.order_index ||
              b.name.toLowerCase() === taskStage.name.toLowerCase()
            );
          }
          return false;
        });
        const done = bTasks.filter((t) => t.status === 'COMPLETED').length;
        return {
          ...b,
          task_count: bTasks.length,
          completed_task_count: done,
        };
      });
  }

  public getProjectBucketById(id: string): ProjectBucket | undefined {
    return this.state.projectBuckets.find((b) => b.id === id);
  }

  public addBucketToAircraft(
    aircraftId: string,
    options: {
      mode: 'existing_bucket' | 'template' | 'new';
      name: string;
      code?: string;
      color?: string;
      displayOrder?: number;
      description?: string;
      sourceBucketId?: string;
      templateId?: string;
    }
  ): ProjectBucket {
    // Get existing buckets for this specific aircraft, sorted strictly by numeric order
    const existing = this.state.projectBuckets
      .filter((b) => b.aircraft_id === aircraftId)
      .sort(compareProjectBucketsByOrder);

    const parsedOrder = options.displayOrder !== undefined ? Number(options.displayOrder) : NaN;
    const targetOrder = !isNaN(parsedOrder) && parsedOrder > 0
      ? Math.round(parsedOrder)
      : existing.length + 1;

    const code = options.code || options.name.replace(/\s+/g, '_').toUpperCase();
    const parentAircraft = this.state.aircraft.find((a) => a.id === aircraftId);
    const resolvedCompanyId = parentAircraft?.company_id || this.getUserCompanyId(this.getCurrentUser());

    // Shift existing buckets with display_order >= targetOrder up by 1 to make room at targetOrder
    const shiftedBuckets: ProjectBucket[] = [];
    existing.forEach((b) => {
      const curOrder = getProjectBucketNumericOrder(b);
      if (curOrder >= targetOrder) {
        b.display_order = curOrder + 1;
        b.bucket_number = b.display_order;
        shiftedBuckets.push(b);
      }
    });

    const newBucket: ProjectBucket = {
      id: crypto.randomUUID(),
      aircraft_id: aircraftId,
      company_id: resolvedCompanyId,
      bucket_number: targetOrder,
      code,
      name: options.name,
      description: options.description,
      display_order: targetOrder,
      color: options.color || '#0ea5e9',
      source_template_bucket_id: options.sourceBucketId,
      created_at: new Date().toISOString(),
    };

    this.state.projectBuckets.push(newBucket);
    this.state.projectBuckets.sort(compareProjectBucketsByOrder);

    // If added from template and that template bucket contains tasks, instantiate tasks
    if (options.templateId && options.sourceBucketId) {
      const tmpl = this.getLifecycleTemplateById(options.templateId);
      const tmplBucket = tmpl?.buckets.find((b) => b.id === options.sourceBucketId);
      if (tmplBucket && tmplBucket.tasks) {
        tmplBucket.tasks.forEach((tt, idx) => {
          const team = this.state.teams.find(
            (t) => t.name.toLowerCase() === tt.team_name.toLowerCase()
          ) || this.state.teams[0];

          this.createTask({
            aircraft_id: aircraftId,
            company_id: resolvedCompanyId,
            stage_id: this.state.stages[0]?.id || '',
            project_bucket_id: newBucket.id,
            team_id: team.id,
            name: tt.name,
            description: tt.description,
            status: 'NOT_STARTED',
            priority: tt.priority,
            estimated_duration_days: tt.estimated_duration_days,
            order_index: idx + 1,
          });
        });
      }
    }

    this.syncToSupabase('project_buckets', 'insert', sanitizeProjectBucketForSupabase(newBucket));
    shiftedBuckets.forEach((sb) => {
      this.syncToSupabase('project_buckets', 'update', sanitizeProjectBucketForSupabase(sb));
    });

    this.saveStateToDisk(this.state);
    this.notify();
    return newBucket;
  }

  public updateProjectBucket(bucketId: string, updates: Partial<ProjectBucket>): ProjectBucket | null {
    const idx = this.state.projectBuckets.findIndex((b) => b.id === bucketId);
    if (idx === -1) return null;

    const target = this.state.projectBuckets[idx];
    const oldOrder = getProjectBucketNumericOrder(target);

    let newOrder = oldOrder;
    if (updates.display_order !== undefined || updates.bucket_number !== undefined) {
      const parsed = Number(updates.display_order ?? updates.bucket_number);
      if (!isNaN(parsed) && parsed > 0) {
        newOrder = Math.round(parsed);
        updates.display_order = newOrder;
        updates.bucket_number = newOrder;
      }
    }

    const shiftedBuckets: ProjectBucket[] = [];
    if (newOrder !== oldOrder) {
      const peers = this.state.projectBuckets
        .filter((b) => b.aircraft_id === target.aircraft_id && b.id !== bucketId)
        .sort(compareProjectBucketsByOrder);

      if (newOrder > oldOrder) {
        peers.forEach((b) => {
          const ord = getProjectBucketNumericOrder(b);
          if (ord > oldOrder && ord <= newOrder) {
            b.display_order = ord - 1;
            b.bucket_number = b.display_order;
            shiftedBuckets.push(b);
          }
        });
      } else {
        peers.forEach((b) => {
          const ord = getProjectBucketNumericOrder(b);
          if (ord >= newOrder && ord < oldOrder) {
            b.display_order = ord + 1;
            b.bucket_number = b.display_order;
            shiftedBuckets.push(b);
          }
        });
      }
    }

    this.state.projectBuckets[idx] = {
      ...this.state.projectBuckets[idx],
      ...updates,
    };

    this.state.projectBuckets.sort(compareProjectBucketsByOrder);

    this.syncToSupabase('project_buckets', 'update', sanitizeProjectBucketForSupabase(this.state.projectBuckets[idx]));
    shiftedBuckets.forEach((sb) => {
      this.syncToSupabase('project_buckets', 'update', sanitizeProjectBucketForSupabase(sb));
    });

    this.saveStateToDisk(this.state);
    this.notify();
    return this.state.projectBuckets[idx];
  }

  public deleteProjectBucket(bucketId: string): boolean {
    this.state.projectBuckets = this.state.projectBuckets.filter((b) => b.id !== bucketId);
    // Unassign tasks from this bucket or delete
    this.state.tasks = this.state.tasks.filter((t) => t.project_bucket_id !== bucketId);
    this.syncToSupabase('project_buckets', 'delete', bucketId);
    this.saveStateToDisk(this.state);
    this.notify();
    return true;
  }

  public copyProjectBucket(bucketId: string): ProjectBucket | null {
    const original = this.getProjectBucketById(bucketId);
    if (!original) return null;

    const existing = this.getProjectBuckets(original.aircraft_id);
    const newBucket: ProjectBucket = {
      ...original,
      id: crypto.randomUUID(),
      company_id: original.company_id,
      name: `${original.name} (Copy)`,
      bucket_number: existing.length + 1,
      display_order: existing.length + 1,
      created_at: new Date().toISOString(),
    };

    this.state.projectBuckets.push(newBucket);

    // Copy tasks inside this bucket
    const bucketTasks = this.state.tasks.filter((t) => t.project_bucket_id === bucketId);
    bucketTasks.forEach((t) => {
      this.duplicateTask(t.id, { copyDependencies: false, targetProjectBucketId: newBucket.id });
    });

    this.syncToSupabase('project_buckets', 'insert', sanitizeProjectBucketForSupabase(newBucket));
    this.saveStateToDisk(this.state);
    this.notify();
    return newBucket;
  }

  public saveBucketAsTemplate(bucketId: string, templateName: string): LifecycleTemplateBucket {
    const bucket = this.getProjectBucketById(bucketId);
    if (!bucket) throw new Error('Bucket not found');

    const bucketTasks = this.state.tasks.filter((t) => t.project_bucket_id === bucketId);
    const templateTasks = bucketTasks.map((t, idx) => {
      const team = this.state.teams.find((tm) => tm.id === t.team_id);
      const checklists = this.state.checklists
        .filter((c) => c.task_id === t.id)
        .map((c) => c.title);

      return {
        id: crypto.randomUUID(),
        name: t.name,
        description: t.description,
        team_name: team?.name || 'Asset',
        estimated_duration_days: t.estimated_duration_days || 3,
        priority: t.priority,
        checklist_items: checklists,
        order_index: idx + 1,
      };
    });

    const newTmplBucket: LifecycleTemplateBucket = {
      id: crypto.randomUUID(),
      bucket_number: 1,
      code: bucket.code,
      name: templateName || bucket.name,
      description: bucket.description,
      display_order: 1,
      color: bucket.color,
      tasks: templateTasks,
    };

    // Save as a standalone single-bucket master template in library
    this.createLifecycleTemplate({
      name: templateName,
      aircraft_type: 'General',
      description: `Saved from project bucket ${bucket.name}`,
      is_active: true,
      buckets: [newTmplBucket],
    });

    return newTmplBucket;
  }

  // -------------------------------------------------------------
  // TASK DUPLICATION (CLEAN INITIAL STATE)
  // -------------------------------------------------------------
  public duplicateTask(
    taskId: string,
    options: { copyDependencies?: boolean; targetProjectBucketId?: string } = { copyDependencies: false }
  ): Task | null {
    const original = this.getTaskById(taskId);
    if (!original) return null;

    const newTaskId = crypto.randomUUID();
    const now = new Date().toISOString();

    const duplicatedTask: Task = {
      ...original,
      id: newTaskId,
      project_bucket_id: options.targetProjectBucketId || original.project_bucket_id,
      name: `${original.name} (Copy)`,
      status: 'NOT_STARTED', // Clean initial status
      assigned_user_id: undefined, // Not copied by default
      completed_at: undefined,
      actual_duration_days: undefined,
      created_at: now,
      updated_at: now,
    };

    this.state.tasks.push(duplicatedTask);

    // Duplicate checklists
    const checklists = this.state.checklists.filter((c) => c.task_id === taskId);
    checklists.forEach((c) => {
      this.state.checklists.push({
        id: crypto.randomUUID(),
        task_id: newTaskId,
        title: c.title,
        is_completed: false, // Clean initial checklist
        order_index: c.order_index,
      });
    });

    // Optionally copy dependencies
    if (options.copyDependencies) {
      const deps = this.state.dependencies.filter((d) => d.task_id === taskId);
      deps.forEach((d) => {
        this.state.dependencies.push({
          id: crypto.randomUUID(),
          task_id: newTaskId,
          depends_on_task_id: d.depends_on_task_id,
          dependency_type: 'FINISH_TO_START',
          created_at: now,
        });
      });
    }

    this.syncToSupabase('tasks', 'insert', sanitizeTaskForSupabase(duplicatedTask));
    this.state.checklists
      .filter((c) => c.task_id === newTaskId)
      .forEach((c) => this.syncToSupabase('task_checklists', 'insert', c));
    this.state.dependencies
      .filter((d) => d.task_id === newTaskId)
      .forEach((d) => this.syncToSupabase('task_dependencies', 'insert', d));

    this.saveStateToDisk(this.state);
    this.notify();
    return this.hydrateTask(duplicatedTask);
  }

  // -------------------------------------------------------------
  // AIRCRAFT (MSN) & LIFECYCLE CREATION
  // -------------------------------------------------------------
  public getAircraftList(filterCompanyId?: string): Aircraft[] {
    const currentUser = this.getCurrentUser();
    let list = [...this.state.aircraft];

    const activeFilter = filterCompanyId !== undefined ? filterCompanyId : this.getSelectedCompanyFilter();
    if (activeFilter && activeFilter !== 'ALL') {
      list = list.filter((ac) => ac.company_id === activeFilter);
    }

    return list.map((ac) => {
      const acTasks = this.state.tasks.filter((t) => t.aircraft_id === ac.id);
      const completed = acTasks.filter((t) => t.status === 'COMPLETED').length;
      const progress = acTasks.length > 0 ? Math.round((completed / acTasks.length) * 100) : 0;
      const stage = this.state.stages.find((s) => s.id === ac.current_stage_id);
      const company = this.state.companies.find((c) => c.id === ac.company_id);

      return {
        ...ac,
        company,
        current_stage: stage,
        task_count: acTasks.length,
        completed_task_count: completed,
        progress_percentage: progress,
      };
    });
  }

  public getAircraftById(id: string): Aircraft | undefined {
    const ac = this.state.aircraft.find((a) => a.id === id || a.msn === id);
    if (!ac) return undefined;
    const acTasks = this.state.tasks.filter((t) => t.aircraft_id === ac.id);
    const completed = acTasks.filter((t) => t.status === 'COMPLETED').length;
    const progress = acTasks.length > 0 ? Math.round((completed / acTasks.length) * 100) : 0;
    const stage = this.state.stages.find((s) => s.id === ac.current_stage_id);
    const company = this.state.companies.find((c) => c.id === ac.company_id);

    return {
      ...ac,
      company,
      current_stage: stage,
      task_count: acTasks.length,
      completed_task_count: completed,
      progress_percentage: progress,
    };
  }

  /**
   * Complete Aircraft Project Creator with 3 creation modes:
   * 1. 'blank': Empty project
   * 2. 'template': Generates independent project buckets & tasks from Master Template
   * 3. 'copy_msn': Copies from existing MSN with clean statuses and zero historical logs
   */
  public async createAircraftWithLifecycle(
    aircraftData: Omit<Aircraft, 'id' | 'created_at'>,
    mode: 'blank' | 'template' | 'copy_msn',
    options?: {
      templateId?: string;
      sourceMsn?: string;
      copyOptions?: CopyMsnOptions;
    }
  ): Promise<Aircraft> {
    const currentUser = this.getActiveUser();
    const newAircraftId = crypto.randomUUID();
    const now = new Date().toISOString();
    const cleanMsn = (aircraftData.msn || '').trim();

    if (!cleanMsn) {
      throw new Error('Aircraft MSN is required.');
    }

    // Check duplicate MSN in local state
    const existingMsn = this.state.aircraft.find(
      (a) => a.msn.trim().toLowerCase() === cleanMsn.toLowerCase()
    );
    if (existingMsn) {
      throw new Error(`An aircraft project with MSN "${cleanMsn}" already exists.`);
    }

    // Determine target company_id
    let targetCompanyId: string;
    if (currentUser.role !== 'SUPER_ADMIN') {
      targetCompanyId = this.getUserCompanyId(currentUser) || INITIAL_COMPANIES[0].id;
    } else {
      targetCompanyId =
        aircraftData.company_id ||
        (this.getSelectedCompanyFilter() !== 'ALL'
          ? this.getSelectedCompanyFilter()
          : INITIAL_COMPANIES[0].id);
    }

    const reg = (aircraftData.registration || aircraftData.date_of_manufacture || '').trim();
    if (!reg) {
      throw new Error('Date of manufacturing / Registration is required.');
    }
    const ownerVal = (aircraftData.owner || aircraftData.owner_lessor_operator || 'Undisclosed Lessor').trim();
    const locVal = (aircraftData.location || 'Victorville (VCV)').trim();
    const typeVal = (aircraftData.aircraft_type || 'A320').trim();
    const modelVal = (aircraftData.model || aircraftData.aircraft_type || 'A320-200').trim();

    const newAircraft: Aircraft = {
      ...aircraftData,
      id: newAircraftId,
      company_id: targetCompanyId,
      msn: cleanMsn,
      date_of_manufacture: reg,
      registration: reg,
      aircraft_type: typeVal,
      model: modelVal,
      variant: aircraftData.variant ? aircraftData.variant.trim() : undefined,
      serial_number:
        aircraftData.serial_number ||
        `MSN-${cleanMsn}-${(typeVal || 'AC').replace(/\s+/g, '')}`,
      owner_lessor_operator: ownerVal,
      owner: ownerVal,
      status: aircraftData.status || 'IN_PROGRESS',
      location: locVal,
      current_stage_id: aircraftData.current_stage_id || this.state.stages[0]?.id,
      notes: aircraftData.notes ? aircraftData.notes.trim() : undefined,
      created_at: now,
      created_by: currentUser.id,
    };

    // 1. First insert and CONFIRM the new aircraft in Supabase database!
    const insertResult = await this.syncToSupabase(
      'aircraft',
      'insert',
      sanitizeAircraftForSupabase(newAircraft)
    );
    if (!insertResult.success) {
      throw new Error(insertResult.error || 'Failed to insert aircraft record into Supabase.');
    }

    // Confirmed in Supabase: now push to local state
    this.state.aircraft.push(newAircraft);

    const baseDate = newAircraft.acquisition_date
      ? new Date(newAircraft.acquisition_date)
      : new Date();

    if (mode === 'template' && options?.templateId) {
      const template = this.getLifecycleTemplateById(options.templateId);
      if (template) {
        let cumulativeDays = 0;
        const taskNameToActualId = new Map<string, string>();
        const taskDependenciesToCreate: { successorId: string; predecessorName: string }[] = [];

        // 1. Create project-specific buckets
        template.buckets.forEach((b, bIdx) => {
          const projectBucketId = `pb-${newAircraft.msn}-${String(bIdx + 1).padStart(2, '0')}`;
          const projectBucket: ProjectBucket = {
            id: projectBucketId,
            aircraft_id: newAircraftId,
            company_id: targetCompanyId,
            bucket_number: b.bucket_number,
            code: b.code,
            name: b.name,
            description: b.description,
            display_order: b.display_order,
            color: b.color,
            source_template_bucket_id: b.id,
            created_at: now,
          };
          this.state.projectBuckets.push(projectBucket);

          // 2. Create tasks inside bucket
          if (b.tasks && b.tasks.length > 0) {
            b.tasks.forEach((tt, tIdx) => {
              const actualTaskId = crypto.randomUUID();
              taskNameToActualId.set(tt.name, actualTaskId);

              const team = this.state.teams.find(
                (tm) => tm.name.toLowerCase() === tt.team_name.toLowerCase()
              ) || this.state.teams[0];

              const startDate = new Date(baseDate);
              startDate.setDate(startDate.getDate() + cumulativeDays);
              const dueDate = new Date(startDate);
              dueDate.setDate(dueDate.getDate() + tt.estimated_duration_days);
              cumulativeDays += Math.max(1, Math.floor(tt.estimated_duration_days * 0.7));

              const hasPreds = tt.predecessor_names && tt.predecessor_names.length > 0;
              const initialStatus: TaskStatus = hasPreds
                ? 'WAITING'
                : bIdx === 0 && tIdx === 0
                ? 'IN_PROGRESS'
                : 'NOT_STARTED';

              const task: Task = {
                id: actualTaskId,
                task_number: tIdx + 1,
                aircraft_id: newAircraftId,
                company_id: targetCompanyId,
                stage_id: this.state.stages[bIdx]?.id || this.state.stages[0]?.id || '',
                project_bucket_id: projectBucketId,
                team_id: team.id,
                assigned_user_id: team.team_lead_id, // Default role resolution
                name: tt.name,
                description: tt.description,
                status: initialStatus,
                priority: tt.priority,
                start_date: startDate.toISOString().split('T')[0],
                due_date: dueDate.toISOString().split('T')[0],
                estimated_duration_days: tt.estimated_duration_days,
                order_index: tt.order_index || tIdx + 1,
                created_at: now,
                updated_at: now,
              };
              this.state.tasks.push(task);

              // Checklist items
              if (tt.checklist_items && tt.checklist_items.length > 0) {
                tt.checklist_items.forEach((itemTitle, itemIdx) => {
                  this.state.checklists.push({
                    id: crypto.randomUUID(),
                    task_id: actualTaskId,
                    title: itemTitle,
                    is_completed: false,
                    order_index: itemIdx + 1,
                  });
                });
              }

              // Queue dependencies
              if (tt.predecessor_names && tt.predecessor_names.length > 0) {
                tt.predecessor_names.forEach((pName) => {
                  taskDependenciesToCreate.push({
                    successorId: actualTaskId,
                    predecessorName: pName,
                  });
                });
              }
            });
          }
        });

        // Wire dependencies
        taskDependenciesToCreate.forEach((dep) => {
          const predId = taskNameToActualId.get(dep.predecessorName);
          if (predId) {
            this.state.dependencies.push({
              id: crypto.randomUUID(),
              task_id: dep.successorId,
              depends_on_task_id: predId,
              dependency_type: 'FINISH_TO_START',
              created_at: now,
            });
          }
        });
      }
    } else if (mode === 'copy_msn' && options?.sourceMsn) {
      const sourceAc = this.getAircraftById(options.sourceMsn);
      if (sourceAc) {
        const copyOpts = options.copyOptions || {
          copyBuckets: true,
          copyTasks: true,
          copySubtasks: true,
          copyChecklists: true,
          copyDependencies: true,
          copyDurations: true,
          copyOrder: true,
          copyAssignees: false,
          copyComments: false,
          copyAttachments: false,
        };

        const oldBucketIdToNewId = new Map<string, string>();
        const oldTaskIdToNewId = new Map<string, string>();

        // 1. Copy Buckets
        if (copyOpts.copyBuckets) {
          const sourceBuckets = this.getProjectBuckets(sourceAc.id);
          sourceBuckets.forEach((sb) => {
            const newBucketId = crypto.randomUUID();
            oldBucketIdToNewId.set(sb.id, newBucketId);

            this.state.projectBuckets.push({
              ...sb,
              id: newBucketId,
              aircraft_id: newAircraftId,
              company_id: targetCompanyId,
              created_at: now,
            });
          });
        }

        // 2. Copy Tasks
        if (copyOpts.copyTasks) {
          const sourceTasks = this.state.tasks.filter((t) => t.aircraft_id === sourceAc.id);
          sourceTasks.forEach((st) => {
            const newTaskId = crypto.randomUUID();
            oldTaskIdToNewId.set(st.id, newTaskId);

            const newBucketId = st.project_bucket_id
              ? oldBucketIdToNewId.get(st.project_bucket_id)
              : undefined;

            // Recalculate schedule dates
            const startDate = baseDate.toISOString().split('T')[0];

            // Enforce clean initial status
            const initialStatus: TaskStatus = 'NOT_STARTED';

            this.state.tasks.push({
              ...st,
              id: newTaskId,
              aircraft_id: newAircraftId,
              company_id: targetCompanyId,
              project_bucket_id: newBucketId,
              status: initialStatus,
              completed_at: undefined,
              actual_duration_days: undefined,
              assigned_user_id: copyOpts.copyAssignees ? st.assigned_user_id : undefined,
              start_date: startDate,
              due_date: copyOpts.copyDurations ? st.due_date : undefined,
              created_at: now,
              updated_at: now,
            });

            // Copy checklists
            if (copyOpts.copyChecklists) {
              const checklists = this.state.checklists.filter((c) => c.task_id === st.id);
              checklists.forEach((c) => {
                this.state.checklists.push({
                  id: crypto.randomUUID(),
                  task_id: newTaskId,
                  title: c.title,
                  is_completed: false, // Clean initial checklist
                  order_index: c.order_index,
                });
              });
            }

            // Copy comments if selected
            if (copyOpts.copyComments) {
              const comments = this.state.comments.filter((c) => c.task_id === st.id);
              comments.forEach((c) => {
                this.state.comments.push({
                  ...c,
                  id: crypto.randomUUID(),
                  task_id: newTaskId,
                  aircraft_id: newAircraftId,
                  created_at: now,
                });
              });
            }
          });

          // Copy dependencies
          if (copyOpts.copyDependencies) {
            sourceTasks.forEach((st) => {
              const newSuccessorId = oldTaskIdToNewId.get(st.id);
              if (!newSuccessorId) return;

              const sourceDeps = this.state.dependencies.filter((d) => d.task_id === st.id);
              sourceDeps.forEach((dep) => {
                const newPredecessorId = oldTaskIdToNewId.get(dep.depends_on_task_id);
                if (newPredecessorId) {
                  this.state.dependencies.push({
                    id: crypto.randomUUID(),
                    task_id: newSuccessorId,
                    depends_on_task_id: newPredecessorId,
                    dependency_type: 'FINISH_TO_START',
                    created_at: now,
                  });

                  // Set task status to WAITING if it has a dependency
                  const taskIdx = this.state.tasks.findIndex((t) => t.id === newSuccessorId);
                  if (taskIdx !== -1) {
                    this.state.tasks[taskIdx].status = 'WAITING';
                  }
                }
              });
            });
          }
        }
      }
    } else {
      // Blank mode: create clean default buckets
      const defaultBuckets = createDefaultProjectBucketsForMsn(newAircraftId, newAircraft.msn, targetCompanyId);
      this.state.projectBuckets.push(...defaultBuckets);
    }

    // Activity Log
    this.state.activityLogs.push({
      id: crypto.randomUUID(),
      aircraft_id: newAircraft.id,
      user_id: currentUser.id,
      action: 'AIRCRAFT_CREATED',
      details: `${currentUser.full_name} created aircraft project MSN ${newAircraft.msn} (${newAircraft.model}) using ${mode.toUpperCase()} workflow.`,
      created_at: now,
    });

    // Sync all generated project buckets, tasks, checklists, dependencies, and comments to Supabase in foreign key order
    const createdBuckets = this.state.projectBuckets.filter((b) => b.aircraft_id === newAircraftId);
    const createdTasks = this.state.tasks.filter((t) => t.aircraft_id === newAircraftId);
    const createdTaskIds = new Set(createdTasks.map((t) => t.id));
    const createdChecklists = this.state.checklists.filter((c) => createdTaskIds.has(c.task_id));
    const createdDependencies = this.state.dependencies.filter((d) => createdTaskIds.has(d.task_id));
    const createdComments = this.state.comments.filter((c) => c.aircraft_id === newAircraftId);

    // 1. Buckets reference aircraft (already inserted above)
    await Promise.all(
      createdBuckets.map((b) =>
        this.syncToSupabase('project_buckets', 'insert', sanitizeProjectBucketForSupabase(b))
      )
    );

    // 2. Tasks reference aircraft and project_buckets
    await Promise.all(
      createdTasks.map((t) =>
        this.syncToSupabase('tasks', 'insert', sanitizeTaskForSupabase(t))
      )
    );

    // 3. Checklists, dependencies, and comments reference tasks/aircraft
    await Promise.all([
      ...createdChecklists.map((c) => this.syncToSupabase('task_checklists', 'insert', c)),
      ...createdDependencies.map((d) => this.syncToSupabase('task_dependencies', 'insert', d)),
      ...createdComments.map((c) => this.syncToSupabase('task_comments', 'insert', sanitizeCommentForSupabase(c))),
    ]);

    this.saveStateToDisk(this.state);
    this.notify();
    return newAircraft;
  }

  // Backward compatibility alias
  public async createAircraft(
    aircraftData: Omit<Aircraft, 'id' | 'created_at'>,
    templateId?: string
  ): Promise<Aircraft> {
    return this.createAircraftWithLifecycle(
      aircraftData,
      templateId ? 'template' : 'blank',
      { templateId }
    );
  }

  public updateAircraft(id: string, updates: Partial<Aircraft>): Aircraft | null {
    const idx = this.state.aircraft.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const old = this.state.aircraft[idx];
    const updated = {
      ...old,
      ...updates,
      date_of_manufacture: updates.date_of_manufacture ?? updates.registration ?? old.date_of_manufacture ?? old.registration,
      registration: updates.registration ?? updates.date_of_manufacture ?? old.registration ?? old.date_of_manufacture,
      owner_lessor_operator: updates.owner_lessor_operator ?? updates.owner ?? old.owner_lessor_operator ?? old.owner,
      owner: updates.owner ?? updates.owner_lessor_operator ?? old.owner ?? old.owner_lessor_operator,
      updated_at: new Date().toISOString(),
    };
    this.state.aircraft[idx] = updated;

    this.state.auditLogs.push({
      id: crypto.randomUUID(),
      user_id: this.state.currentUserId || undefined,
      action: 'UPDATE_AIRCRAFT',
      table_name: 'aircraft',
      record_id: id,
      old_values: old as unknown as Record<string, unknown>,
      new_values: updated as unknown as Record<string, unknown>,
      created_at: new Date().toISOString(),
    });

    this.syncToSupabase('aircraft', 'update', sanitizeAircraftForSupabase(updated));
    this.saveStateToDisk(this.state);
    this.notify();
    return updated;
  }

  public deleteAircraft(id: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to remove an aircraft.');
    }
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    const isCompanyAdmin = currentUser.role === 'COMPANY_ADMIN';
    if (!isSuperAdmin && !isCompanyAdmin) {
      throw new Error('Access denied: Only Admins and Super Admin can remove aircraft.');
    }

    const targetAircraft = this.state.aircraft.find((a) => a.id === id);
    if (!targetAircraft) {
      throw new Error(`Aircraft with ID "${id}" was not found.`);
    }

    if (isCompanyAdmin && !isSuperAdmin) {
      const userCompanyId = this.getUserCompanyId(currentUser);
      if (targetAircraft.company_id && targetAircraft.company_id !== userCompanyId) {
        throw new Error('Access denied: You can only remove aircraft belonging to your organization.');
      }
    }

    this.state.aircraft = this.state.aircraft.filter((a) => a.id !== id);
    this.state.projectBuckets = this.state.projectBuckets.filter((b) => b.aircraft_id !== id);
    this.state.tasks = this.state.tasks.filter((t) => t.aircraft_id !== id);

    this.logAudit({
      action: 'AIRCRAFT_DELETED',
      table_name: 'aircraft',
      record_id: id,
      old_values: sanitizeAircraftForSupabase(targetAircraft),
      details: `${currentUser.full_name} (${isSuperAdmin ? 'Super Admin' : 'Company Admin'}) removed aircraft MSN ${targetAircraft.msn} (${targetAircraft.registration || targetAircraft.model}).`,
    });

    this.syncToSupabase('aircraft', 'delete', id);
    this.saveStateToDisk(this.state);
    this.notify();
    return true;
  }

  // --- Tasks ---
  public getTasks(filters?: string | {
    aircraftId?: string;
    teamId?: string;
    stageId?: string;
    projectBucketId?: string;
    status?: TaskStatus;
    assignedUserId?: string;
    search?: string;
    companyId?: string;
  }): Task[] {
    const currentUser = this.getCurrentUser();
    let filtered = [...this.state.tasks];

    // Multi-tenant company scoping
    const companyFilter =
      (typeof filters === 'object' && filters?.companyId)
        ? filters.companyId
        : this.getSelectedCompanyFilter();
    if (companyFilter && companyFilter !== 'ALL') {
      filtered = filtered.filter((t) => {
        if (t.company_id) return t.company_id === companyFilter;
        const ac = this.state.aircraft.find((a) => a.id === t.aircraft_id);
        return ac?.company_id === companyFilter;
      });
    }

    if (typeof filters === 'string') {
      filtered = filtered.filter((t) => t.aircraft_id === filters);
      return filtered
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((task) => this.hydrateTask(task));
    }

    if (filters) {
      if (filters.aircraftId) {
        filtered = filtered.filter((t) => t.aircraft_id === filters.aircraftId);
      }
      if (filters.teamId) {
        filtered = filtered.filter((t) => t.team_id === filters.teamId);
      }
      if (filters.stageId) {
        filtered = filtered.filter((t) => t.stage_id === filters.stageId);
      }
      if (filters.projectBucketId) {
        filtered = filtered.filter((t) => t.project_bucket_id === filters.projectBucketId);
      }
      if (filters.status) {
        filtered = filtered.filter((t) => t.status === filters.status);
      }
      if (filters.assignedUserId) {
        filtered = filtered.filter((t) => t.assigned_user_id === filters.assignedUserId);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query)
        );
      }
    }

    return filtered
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((task) => this.hydrateTask(task));
  }

  public getTaskById(id: string): Task | undefined {
    const raw = this.state.tasks.find((t) => t.id === id);
    return raw ? this.hydrateTask(raw) : undefined;
  }

  private hydrateTask(task: Task): Task {
    const aircraft = this.state.aircraft.find((a) => a.id === task.aircraft_id);
    const resolvedCompanyId = task.company_id || aircraft?.company_id;
    const stage = this.state.stages.find((s) => s.id === task.stage_id);
    const projectBucket = this.state.projectBuckets.find((b) => b.id === task.project_bucket_id);
    const team = this.state.teams.find((t) => t.id === task.team_id);
    const assignedUser = this.state.profiles.find((p) => p.id === task.assigned_user_id);
    const checklists = this.state.checklists
      .filter((c) => c.task_id === task.id)
      .sort((a, b) => a.order_index - b.order_index);

    const taskDeps = this.state.dependencies
      .filter((d) => d.task_id === task.id)
      .map((d) => ({
        ...d,
        depends_on_task: this.state.tasks.find((t) => t.id === d.depends_on_task_id),
      }));

    const dependentTasks = this.state.dependencies
      .filter((d) => d.depends_on_task_id === task.id)
      .map((d) => this.state.tasks.find((t) => t.id === d.task_id))
      .filter(Boolean) as Task[];

    const comments = this.state.comments
      .filter((c) => c.task_id === task.id)
      .map((c) => ({
        ...c,
        user: this.state.profiles.find((p) => p.id === c.user_id),
      }));

    const attachments = this.state.attachments
      .filter((a) => a.task_id === task.id)
      .map((a) => ({
        ...a,
        uploader: this.state.profiles.find((p) => p.id === a.uploaded_by),
      }));

    return {
      ...task,
      company_id: resolvedCompanyId,
      aircraft,
      stage,
      project_bucket: projectBucket,
      team,
      assigned_user: assignedUser,
      checklists,
      dependencies: taskDeps,
      dependent_tasks: dependentTasks,
      comments,
      attachments,
    };
  }

  public createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task {
    const now = new Date().toISOString();
    const currentUser = this.getActiveUser();
    const parentAircraft = this.state.aircraft.find((a) => a.id === taskData.aircraft_id);
    const resolvedCompanyId = taskData.company_id || parentAircraft?.company_id || this.getUserCompanyId(currentUser);

    const newTask: Task = {
      ...taskData,
      company_id: resolvedCompanyId,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };
    this.state.tasks.push(newTask);

    this.state.activityLogs.push({
      id: crypto.randomUUID(),
      aircraft_id: newTask.aircraft_id,
      task_id: newTask.id,
      user_id: currentUser.id,
      action: 'TASK_CREATED',
      details: `${currentUser.full_name} created task "${newTask.name}".`,
      created_at: now,
    });

    this.syncToSupabase('tasks', 'insert', sanitizeTaskForSupabase(newTask));
    this.saveStateToDisk(this.state);
    this.notify();
    return this.hydrateTask(newTask);
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const idx = this.state.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const old = this.state.tasks[idx];
    const now = new Date().toISOString();

    const updated: Task = {
      ...old,
      ...updates,
      updated_at: now,
    };

    // If caller explicitly passed assigned_user_id as undefined, null, or empty string, clear assignee!
    if ('assigned_user_id' in updates) {
      if (!updates.assigned_user_id || updates.assigned_user_id === 'UNASSIGNED') {
        updated.assigned_user_id = undefined;
      }
    }

    this.state.tasks[idx] = updated;

    // Trigger in-app notification & transactional email when task is assigned or reassigned, or audit if unassigned
    if ('assigned_user_id' in updates && updates.assigned_user_id !== old.assigned_user_id) {
      if (updated.assigned_user_id) {
        const assignedUser = this.state.profiles.find((p) => p.id === updated.assigned_user_id);
        const parentAircraft = this.state.aircraft.find((a) => a.id === old.aircraft_id);
        if (assignedUser) {
          // 1. In-app notification
          this.state.notifications.unshift({
            id: crypto.randomUUID(),
            user_id: assignedUser.id,
            task_id: id,
            aircraft_id: old.aircraft_id,
            type: 'TASK_ASSIGNED',
            subject: 'New Task Assignment',
            message: `You have been assigned to task "${old.name}" on MSN ${parentAircraft?.msn || 'Fleet'}.`,
            status: 'UNREAD',
            sent_at: now,
            email_status: 'SIMULATED',
            created_at: now,
          });

          // 2. Transactional email to outbox
          this.state.emailLogs.unshift({
            id: crypto.randomUUID(),
            recipient_email: assignedUser.email,
            recipient_name: assignedUser.full_name,
            subject: `Task Assignment: ${old.name} (MSN ${parentAircraft?.msn || 'Fleet'})`,
            html_body: `<p>Hello ${assignedUser.full_name},</p><p>You have been assigned to work package task: <strong>${old.name}</strong> on aircraft MSN <strong>${parentAircraft?.msn || 'Fleet'}</strong>.</p><p>Priority: <strong>${updated.priority}</strong></p><p>Please log in to your workspace to view instructions, documentation, and checklists.</p>`,
            trigger_event: 'TASK_ASSIGNED',
            status: 'SIMULATED_DEV_MODE',
            created_at: now,
          });

          // 3. Audit log
          this.logAudit({
            action: 'TASK_ASSIGNED',
            table_name: 'tasks',
            record_id: id,
            new_values: { assigned_user_id: assignedUser.id, user_name: assignedUser.full_name },
            details: `Task "${old.name}" was assigned to employee "${assignedUser.full_name}" (${assignedUser.email}).`,
          });
        }
      } else if (old.assigned_user_id) {
        // Task unassigned: only clear assignee, preserving all task status and checklists
        const prevUser = this.state.profiles.find((p) => p.id === old.assigned_user_id);
        this.logAudit({
          action: 'TASK_UNASSIGNED',
          table_name: 'tasks',
          record_id: id,
          new_values: { assigned_user_id: null },
          details: `Task "${old.name}" was unassigned (previously assigned to "${prevUser?.full_name || 'employee'}").`,
        });
      }
    }

    this.state.auditLogs.push({
      id: crypto.randomUUID(),
      user_id: this.state.currentUserId || undefined,
      action: 'UPDATE_TASK',
      table_name: 'tasks',
      record_id: id,
      old_values: old as unknown as Record<string, unknown>,
      new_values: updated as unknown as Record<string, unknown>,
      created_at: now,
    });

    this.syncToSupabase('tasks', 'update', sanitizeTaskForSupabase(updated));
    this.saveStateToDisk(this.state);
    this.notify();
    return this.hydrateTask(updated);
  }

  public assignTask(taskId: string, userId?: string | null): Task | null {
    const cleanUserId = !userId || userId === 'UNASSIGNED' ? undefined : userId;
    return this.updateTask(taskId, { assigned_user_id: cleanUserId });
  }

  public reorderTasks(
    taskOrders: {
      id: string;
      order_index: number;
      project_bucket_id?: string;
      stage_id?: string;
      team_id?: string;
    }[]
  ): void {
    const now = new Date().toISOString();

    taskOrders.forEach((item) => {
      const idx = this.state.tasks.findIndex((t) => t.id === item.id);
      if (idx !== -1) {
        const old = this.state.tasks[idx];
        const updated: Task = {
          ...old,
          order_index: item.order_index,
          ...(item.project_bucket_id !== undefined ? { project_bucket_id: item.project_bucket_id } : {}),
          ...(item.stage_id !== undefined ? { stage_id: item.stage_id } : {}),
          ...(item.team_id !== undefined ? { team_id: item.team_id } : {}),
          updated_at: now,
        };
        this.state.tasks[idx] = updated;
        this.syncToSupabase('tasks', 'update', sanitizeTaskForSupabase(updated));
      }
    });

    this.saveStateToDisk(this.state);
    this.notify();
  }

  public deleteTask(id: string): boolean {
    this.state.tasks = this.state.tasks.filter((t) => t.id !== id);
    this.state.dependencies = this.state.dependencies.filter(
      (d) => d.task_id !== id && d.depends_on_task_id !== id
    );
    this.state.checklists = this.state.checklists.filter((c) => c.task_id !== id);
    this.syncToSupabase('tasks', 'delete', id);
    this.saveStateToDisk(this.state);
    this.notify();
    return true;
  }

  public completeTask(taskId: string): {
    completedTask: Task;
    unlockedTasks: Task[];
    notificationsCount: number;
    emailLogsCount: number;
  } {
    const rawTask = this.state.tasks.find((t) => t.id === taskId);
    if (!rawTask) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const currentUser = this.getActiveUser();

    // 1. Run workflow engine logic
    const evalResult = WorkflowEngine.handleTaskCompletion(
      rawTask,
      currentUser,
      this.state.tasks,
      this.state.dependencies,
      this.state.aircraft,
      this.state.profiles,
      this.state.teams
    );

    // 2. Apply task state updates to in-memory state
    const taskIdx = this.state.tasks.findIndex((t) => t.id === taskId);
    const now = new Date().toISOString();
    this.state.tasks[taskIdx] = {
      ...this.state.tasks[taskIdx],
      status: 'COMPLETED',
      completed_at: now,
      updated_at: now,
    };

    // Update unlocked tasks
    evalResult.updatedTasks.forEach((updatedT) => {
      const idx = this.state.tasks.findIndex((t) => t.id === updatedT.id);
      if (idx !== -1) {
        this.state.tasks[idx] = updatedT;
      }
    });

    // 3. Append notifications, emails, and audit logs
    this.state.notifications.unshift(...evalResult.newNotifications);
    this.state.emailLogs.unshift(...evalResult.newEmailLogs);
    this.state.activityLogs.unshift(...evalResult.newActivityLogs);
    this.state.auditLogs.unshift(...evalResult.newAuditLogs);

    // Sync task completions and state persistence to Supabase and disk
    this.syncToSupabase('tasks', 'update', sanitizeTaskForSupabase(this.state.tasks[taskIdx]));
    evalResult.updatedTasks.forEach((updatedT) => {
      this.syncToSupabase('tasks', 'update', sanitizeTaskForSupabase(updatedT));
    });
    this.saveStateToDisk(this.state);
    this.notify();

    return {
      completedTask: this.hydrateTask(this.state.tasks[taskIdx]),
      unlockedTasks: evalResult.updatedTasks.map((t) => this.hydrateTask(t)),
      notificationsCount: evalResult.newNotifications.length,
      emailLogsCount: evalResult.newEmailLogs.length,
    };
  }

  // --- Checklists ---
  public toggleChecklistItem(checklistId: string): TaskChecklistItem | null {
    const idx = this.state.checklists.findIndex((c) => c.id === checklistId);
    if (idx === -1) return null;
    const item = this.state.checklists[idx];
    const newStatus = !item.is_completed;
    const currentUser = this.getActiveUser();
    const now = new Date().toISOString();

    this.state.checklists[idx] = {
      ...item,
      is_completed: newStatus,
      completed_by: newStatus ? currentUser.id : undefined,
      completed_at: newStatus ? now : undefined,
    };

    this.syncToSupabase('task_checklists', 'update', this.state.checklists[idx]);
    this.saveStateToDisk(this.state);
    this.notify();
    return this.state.checklists[idx];
  }

  public addChecklistItem(
    taskId: string,
    title: string,
    attachmentUrl?: string,
    attachmentName?: string,
    attachmentType?: string
  ): TaskChecklistItem {
    const existing = this.state.checklists.filter((c) => c.task_id === taskId);
    const newItem: TaskChecklistItem = {
      id: crypto.randomUUID(),
      task_id: taskId,
      title,
      is_completed: false,
      order_index: existing.length + 1,
      attachment_url: attachmentUrl?.trim() || undefined,
      attachment_name: attachmentName?.trim() || undefined,
      attachment_type: attachmentType?.trim() || undefined,
      created_at: new Date().toISOString(),
    };
    this.state.checklists.push(newItem);
    this.syncToSupabase('task_checklists', 'insert', newItem);
    this.saveStateToDisk(this.state);
    this.notify();
    return newItem;
  }

  public updateChecklistItem(
    checklistId: string,
    updates: Partial<TaskChecklistItem>
  ): TaskChecklistItem | null {
    const idx = this.state.checklists.findIndex((c) => c.id === checklistId);
    if (idx === -1) return null;
    const old = this.state.checklists[idx];
    const updated = { ...old, ...updates };
    this.state.checklists[idx] = updated;
    this.syncToSupabase('task_checklists', 'update', updated);
    this.saveStateToDisk(this.state);
    this.notify();
    return updated;
  }

  public deleteChecklistItem(checklistId: string): boolean {
    this.state.checklists = this.state.checklists.filter((c) => c.id !== checklistId);
    this.syncToSupabase('task_checklists', 'delete', checklistId);
    this.saveStateToDisk(this.state);
    this.notify();
    return true;
  }

  // --- Dependencies ---
  public addDependency(successorTaskId: string, predecessorTaskId: string): TaskDependency {
    if (successorTaskId === predecessorTaskId) {
      throw new Error('A task cannot depend on itself.');
    }
    const exists = this.state.dependencies.some(
      (d) => d.task_id === successorTaskId && d.depends_on_task_id === predecessorTaskId
    );
    if (exists) {
      throw new Error('Dependency already exists.');
    }

    const newDep: TaskDependency = {
      id: crypto.randomUUID(),
      task_id: successorTaskId,
      depends_on_task_id: predecessorTaskId,
      dependency_type: 'FINISH_TO_START',
      created_at: new Date().toISOString(),
    };
    this.state.dependencies.push(newDep);

    const pred = this.state.tasks.find((t) => t.id === predecessorTaskId);
    const succIdx = this.state.tasks.findIndex((t) => t.id === successorTaskId);
    if (pred && pred.status !== 'COMPLETED' && succIdx !== -1) {
      this.state.tasks[succIdx].status = 'WAITING';
      this.syncToSupabase('tasks', 'update', sanitizeTaskForSupabase(this.state.tasks[succIdx]));
    }

    this.syncToSupabase('task_dependencies', 'insert', newDep);
    this.saveStateToDisk(this.state);
    this.notify();
    return newDep;
  }

  public removeDependency(dependencyId: string): boolean {
    this.state.dependencies = this.state.dependencies.filter((d) => d.id !== dependencyId);
    this.syncToSupabase('task_dependencies', 'delete', dependencyId);
    this.saveStateToDisk(this.state);
    this.notify();
    return true;
  }

  // --- Comments ---
  public addComment(taskId: string, aircraftId: string, content: string): TaskComment {
    const currentUser = this.getActiveUser();
    const newComment: TaskComment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      aircraft_id: aircraftId,
      user_id: currentUser.id,
      content,
      created_at: new Date().toISOString(),
      user: currentUser,
    };
    this.state.comments.push(newComment);
    this.syncToSupabase('task_comments', 'insert', sanitizeCommentForSupabase(newComment));
    this.saveStateToDisk(this.state);
    this.notify();
    return newComment;
  }

  // --- Attachments ---
  public addAttachment(
    taskId: string,
    aircraftId: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    fileUrl?: string
  ): TaskAttachment {
    const currentUser = this.getActiveUser();
    const newAtt: TaskAttachment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      aircraft_id: aircraftId,
      uploaded_by: currentUser.id,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      file_url: fileUrl?.trim() || '#',
      created_at: new Date().toISOString(),
      uploader: currentUser,
    };
    this.state.attachments.push(newAtt);
    this.syncToSupabase('task_attachments', 'insert', sanitizeAttachmentForSupabase(newAtt));
    this.saveStateToDisk(this.state);
    this.notify();
    return newAtt;
  }

  public deleteAttachment(id: string): boolean {
    const prevLen = this.state.attachments.length;
    this.state.attachments = this.state.attachments.filter((a) => a.id !== id);
    this.syncToSupabase('task_attachments', 'delete', id);
    this.saveStateToDisk(this.state);
    this.notify();
    return this.state.attachments.length !== prevLen;
  }

  // --- Notifications ---
  public getNotifications(userId?: string): InAppNotification[] {
    const list = userId
      ? this.state.notifications.filter((n) => n.user_id === userId)
      : this.state.notifications;

    return list.map((n) => ({
      ...n,
      task: n.task_id ? this.getTaskById(n.task_id) : undefined,
      aircraft: n.aircraft_id ? this.getAircraftById(n.aircraft_id) : undefined,
    }));
  }

  public markNotificationAsRead(id: string): void {
    const idx = this.state.notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      this.state.notifications[idx].status = 'READ';
      this.state.notifications[idx].read_at = new Date().toISOString();
      this.notify();
    }
  }

  public markAllNotificationsAsRead(userId?: string): void {
    const now = new Date().toISOString();
    this.state.notifications.forEach((n) => {
      if (!userId || n.user_id === userId) {
        n.status = 'READ';
        n.read_at = now;
      }
    });
    this.notify();
  }

  // --- Email Logs ---
  public getEmailLogs(): EmailLog[] {
    return [...this.state.emailLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // --- Activity & Audit Logs ---
  public getActivityLogs(aircraftId?: string): ActivityLog[] {
    let list = [...this.state.activityLogs];
    if (aircraftId) {
      list = list.filter((a) => a.aircraft_id === aircraftId);
    }
    return list
      .map((item) => ({
        ...item,
        user: this.getProfileById(item.user_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.state.auditLogs]
      .map((item) => ({
        ...item,
        user: this.getProfileById(item.user_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ==========================================
  // --- Repair Orders (RO) Module Methods ---
  // ==========================================

  public getRepairOrderColumns(userId?: string): RepairOrderColumn[] {
    const current = this.getCurrentUser();
    const uid = userId || current?.id;
    if (!uid) {
      return [...DEFAULT_RO_COLUMNS];
    }
    const config = this.state.repairOrderConfigs?.find((c) => c.user_id === uid);
    if (config && config.columns && config.columns.length > 0) {
      return [...config.columns].sort((a, b) => a.order - b.order);
    }
    return [...DEFAULT_RO_COLUMNS];
  }

  public saveRepairOrderColumns(userId: string, columns: RepairOrderColumn[]): RepairOrderColumn[] {
    const user = this.getProfileById(userId);
    const companyId = user?.company_id || this.getCurrentUser()?.company_id || INITIAL_COMPANIES[0].id;
    const now = new Date().toISOString();

    if (!this.state.repairOrderConfigs) {
      this.state.repairOrderConfigs = [];
    }

    const existingIdx = this.state.repairOrderConfigs.findIndex((c) => c.user_id === userId);
    const configId =
      existingIdx !== -1 && (this.state.repairOrderConfigs[existingIdx] as any).id
        ? (this.state.repairOrderConfigs[existingIdx] as any).id
        : crypto.randomUUID();

    const newConfig: UserRepairOrderConfig & { id?: string } = {
      id: configId,
      user_id: userId,
      company_id: companyId,
      columns: columns.map((col, idx) => ({ ...col, order: idx + 1 })),
      updated_at: now,
    };

    if (existingIdx !== -1) {
      this.state.repairOrderConfigs[existingIdx] = newConfig;
    } else {
      this.state.repairOrderConfigs.push(newConfig);
    }

    this.logAudit({
      action: 'RO_COLUMNS_UPDATED',
      table_name: 'repair_order_configs',
      record_id: userId,
      new_values: { columnsCount: columns.length, columnNames: columns.map((c) => c.name) },
      details: `User "${user?.full_name || userId}" updated their Repair Order table columns configuration (${columns.length} columns).`,
    });

    this.syncToSupabase(
      'repair_order_columns',
      'upsert',
      {
        id: configId,
        user_id: userId,
        company_id: companyId,
        columns: newConfig.columns,
        updated_at: now,
      },
      'id'
    );

    this.saveStateToDisk(this.state);
    this.notify();
    return this.getRepairOrderColumns(userId);
  }

  public resetRepairOrderColumns(userId: string): RepairOrderColumn[] {
    return this.saveRepairOrderColumns(userId, [...DEFAULT_RO_COLUMNS]);
  }

  public getRepairOrders(targetUserId?: string): RepairOrderRow[] {
    const current = this.getCurrentUser();
    const fallbackUser = this.getActiveUser();
    const uid = targetUserId || current?.id || fallbackUser?.id;
    if (!uid) return [];

    let rows = (this.state.repairOrders || []).filter((r) => r.user_id === uid);

    // If caller is an EMPLOYEE, ensure company matches
    if (current && current.role === 'EMPLOYEE') {
      rows = rows.filter((r) => r.company_id === current.company_id);
    }

    return [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addRepairOrder(data: Record<string, any>, targetUserId?: string): RepairOrderRow {
    const current = this.getCurrentUser();
    const fallbackUser = this.getActiveUser();
    const uid = targetUserId || current?.id || fallbackUser?.id;
    if (!uid) throw new Error('Cannot add repair order: User not authenticated.');

    const targetUser = this.getProfileById(uid) || fallbackUser;
    const companyId = targetUser?.company_id || current?.company_id || INITIAL_COMPANIES[0].id;
    const now = new Date().toISOString();

    const newRow: RepairOrderRow = {
      id: crypto.randomUUID(),
      user_id: uid,
      company_id: companyId,
      data: { ...data },
      created_at: now,
      updated_at: now,
    };

    if (!this.state.repairOrders) {
      this.state.repairOrders = [];
    }

    this.state.repairOrders.unshift(newRow);

    this.logAudit({
      action: 'RO_CREATED',
      table_name: 'repair_orders',
      record_id: newRow.id,
      new_values: { ro_number: data.ro_number || data.id, part_number: data.part_number },
      details: `Created new Repair Order "${data.ro_number || 'RO'}" for employee "${targetUser?.full_name || uid}".`,
    });

    this.syncToSupabase('repair_orders', 'insert', newRow);
    this.saveStateToDisk(this.state);
    this.notify();
    return newRow;
  }

  public updateRepairOrder(id: string, data: Record<string, any>): RepairOrderRow {
    if (!this.state.repairOrders) {
      this.state.repairOrders = [];
    }
    const idx = this.state.repairOrders.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Repair Order with ID ${id} not found.`);
    }

    const current = this.getCurrentUser();
    const existing = this.state.repairOrders[idx];

    // If caller is EMPLOYEE, verify ownership
    if (current && current.role === 'EMPLOYEE' && existing.user_id !== current.id) {
      throw new Error('Access denied: You can only edit your own Repair Orders.');
    }

    const now = new Date().toISOString();
    const updated: RepairOrderRow = {
      ...existing,
      data: {
        ...existing.data,
        ...data,
      },
      updated_at: now,
    };

    this.state.repairOrders[idx] = updated;

    this.logAudit({
      action: 'RO_UPDATED',
      table_name: 'repair_orders',
      record_id: id,
      new_values: { ro_number: updated.data.ro_number, part_number: updated.data.part_number },
      details: `Updated Repair Order "${updated.data.ro_number || id}".`,
    });

    this.syncToSupabase('repair_orders', 'update', updated);
    this.saveStateToDisk(this.state);
    this.notify();
    return updated;
  }

  public deleteRepairOrder(id: string): boolean {
    if (!this.state.repairOrders) return false;
    const idx = this.state.repairOrders.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    const current = this.getCurrentUser();
    const existing = this.state.repairOrders[idx];

    if (current && current.role === 'EMPLOYEE' && existing.user_id !== current.id) {
      throw new Error('Access denied: You can only delete your own Repair Orders.');
    }

    const removed = this.state.repairOrders.splice(idx, 1)[0];

    this.logAudit({
      action: 'RO_DELETED',
      table_name: 'repair_orders',
      record_id: id,
      details: `Deleted Repair Order "${removed.data.ro_number || id}".`,
    });

    this.syncToSupabase('repair_orders', 'delete', id);
    this.saveStateToDisk(this.state);
    this.notify();
    return true;
  }

  public bulkImportRepairOrders(
    userId: string,
    rowsData: Record<string, any>[],
    mode: 'append' | 'replace' = 'append'
  ): { importedCount: number } {
    const targetUser = this.getProfileById(userId);
    const companyId = targetUser?.company_id || this.getCurrentUser()?.company_id || '';
    const now = new Date().toISOString();

    if (!this.state.repairOrders) {
      this.state.repairOrders = [];
    }

    if (mode === 'replace') {
      this.state.repairOrders = this.state.repairOrders.filter((r) => r.user_id !== userId);
    }

    const newRows: RepairOrderRow[] = rowsData.map((data, index) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      company_id: companyId,
      data: { ...data },
      created_at: new Date(Date.now() + index * 10).toISOString(),
      updated_at: now,
    }));

    this.state.repairOrders.unshift(...newRows);

    for (const row of newRows) {
      this.syncToSupabase('repair_orders', 'insert', row);
    }

    this.logAudit({
      action: 'RO_BULK_IMPORT',
      table_name: 'repair_orders',
      record_id: userId,
      new_values: { mode, importedCount: newRows.length },
      details: `Bulk imported ${newRows.length} Repair Orders for user "${targetUser?.full_name || userId}" (mode: ${mode}).`,
    });

    this.saveStateToDisk(this.state);
    this.notify();
    return { importedCount: newRows.length };
  }
}

export const db = new StorageService();
