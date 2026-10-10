export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'EMPLOYEE';
export type AccountStatus = 'ACTIVE' | 'DISABLED';

export type CompanyContractStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DISABLED';
export type CompanyPlanTier = 'ENTERPRISE' | 'PROFESSIONAL' | 'STARTER' | 'PILOT';

export interface Company {
  id: string;
  name: string;
  email_domain: string; // normalized lowercase domain e.g. alarisaero.com
  status: 'ACTIVE' | 'DISABLED';
  created_by?: string;
  created_at: string;
  updated_at?: string;
  user_count?: number;
  onboarding_date?: string; // e.g. YYYY-MM-DD
  expiry_date?: string; // e.g. YYYY-MM-DD
  plan_tier?: CompanyPlanTier;
  max_seats?: number;
  contact_person?: string;
  contact_email?: string;
  notes?: string;
}

export interface Profile {
  id: string;
  auth_user_id?: string;
  company_id?: string;
  company?: string | Company;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  department?: string;
  job_title?: string;
  title?: string; // compatibility alias for job_title
  phone?: string;
  password?: string;
  team_id?: string;
  team?: Team;
  status: AccountStatus;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at?: string;
  current_tasks_count?: number;
  completed_tasks_count?: number;
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  company?: Company;
  email: string;
  role?: UserRole;
  invited_by: string;
  token?: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  team_id?: string;
  expires_at?: string;
  created_at: string;
}

export interface Team {
  id: string;
  company_id?: string;
  aircraft_id?: string;
  aircraft?: Aircraft;
  name: string;
  code: string;
  description?: string;
  color: string;
  team_lead_id?: string;
  team_lead?: Profile;
  member_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: string;
  joined_at: string;
  user?: Profile;
}

export interface LifecycleStage {
  id: string;
  stage_number: number;
  code: string;
  name: string;
  description?: string;
  color: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export type AircraftStatus = 'ACTIVE' | 'IN_PROGRESS' | 'TEARDOWN' | 'COMPLETED' | 'ARCHIVED';

export interface Aircraft {
  id: string;
  company_id?: string;
  company?: Company;
  msn: string; // Unique Manufacturer Serial Number
  date_of_manufacture?: string; // Date of Manufacturing
  registration: string; // Synced alias for Date of Manufacturing
  aircraft_type: string; // Aircraft type / manufacturer
  model: string; // A320-200, B737-800
  variant?: string;
  serial_number?: string;
  owner_lessor_operator?: string; // Owner / Lessor / Operator
  owner: string; // Synced alias for Owner / Lessor / Operator
  status: AircraftStatus;
  acquisition_date?: string;
  expected_teardown_date?: string;
  actual_teardown_date?: string;
  location: string;
  current_stage_id?: string;
  current_stage?: LifecycleStage;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  // Computed helpers
  task_count?: number;
  completed_task_count?: number;
  progress_percentage?: number;
}

export type TaskStatus =
  | 'WAITING'
  | 'WAITING_FOR_DEPENDENCY'
  | 'READY'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
  completed_by?: string;
  completed_at?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: 'pdf' | 'excel' | 'link' | 'image' | 'other' | string;
  created_at?: string;
}

export interface TaskDependency {
  id: string;
  task_id: string; // Successor
  depends_on_task_id: string; // Predecessor
  dependency_type: 'FINISH_TO_START';
  created_at: string;
  // Hydrated joins
  depends_on_task?: Task;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  aircraft_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  created_at: string;
  uploader?: Profile;
}

export interface TaskComment {
  id: string;
  task_id: string;
  aircraft_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
}

/**
 * Project-specific bucket instance belonging to one specific aircraft MSN.
 * Independent of master templates.
 */
export interface ProjectBucket {
  id: string;
  aircraft_id: string;
  company_id?: string;
  bucket_number: number;
  code: string;
  name: string;
  description?: string;
  display_order: number;
  color: string;
  source_template_bucket_id?: string;
  created_at: string;
  // Hydrated helpers
  task_count?: number;
  completed_task_count?: number;
}

export interface Task {
  id: string;
  aircraft_id: string;
  company_id?: string;
  task_number?: number;
  stage_id: string; // Compatibility alias
  project_bucket_id?: string; // Specific project bucket instance
  team_id: string;
  assigned_user_id?: string;
  created_by?: string;
  parent_task_id?: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  estimated_duration_days?: number;
  actual_duration_days?: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  
  // Hydrated associations
  aircraft?: Aircraft;
  stage?: LifecycleStage;
  project_bucket?: ProjectBucket;
  team?: Team;
  assigned_user?: Profile;
  checklists?: TaskChecklistItem[];
  dependencies?: TaskDependency[]; // Predecessors that this task waits on
  dependent_tasks?: Task[]; // Successors waiting for this task
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'TASK_COMPLETED'
  | 'DEPENDENCY_UNLOCKED'
  | 'TASK_OVERDUE'
  | 'TASK_DUE_SOON'
  | 'TASK_BLOCKED'
  | 'COMMENT_ADDED'
  | 'MENTION'
  | 'STAGE_CHANGED';

export interface InAppNotification {
  id: string;
  user_id: string;
  task_id?: string;
  aircraft_id?: string;
  type: NotificationType;
  subject: string;
  message: string;
  status: 'UNREAD' | 'READ';
  sent_at: string;
  read_at?: string;
  email_status: 'SENT' | 'SIMULATED' | 'FAILED';
  created_at: string;
  task?: Task;
  aircraft?: Aircraft;
}

export interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  html_body: string;
  trigger_event: string;
  task_id?: string;
  aircraft_msn?: string;
  status: 'SENT' | 'SIMULATED_DEV_MODE' | 'FAILED';
  error_message?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  aircraft_id?: string;
  task_id?: string;
  user_id?: string;
  action: string;
  details: string;
  created_at: string;
  user?: Profile;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  details?: string;
  created_at: string;
  user?: Profile;
}

// -------------------------------------------------------------
// MASTER BUCKET & LIFECYCLE TEMPLATE SYSTEM
// -------------------------------------------------------------

export interface LifecycleTemplateTask {
  id: string;
  name: string;
  description?: string;
  team_name: string; // Team to resolve (e.g. Asset, Sales, Teardown)
  default_role?: string; // Default role or Team Lead
  estimated_duration_days: number;
  priority: TaskPriority;
  checklist_items?: string[];
  predecessor_names?: string[]; // Names of prerequisite tasks inside template
  order_index: number;
}

export interface LifecycleTemplateBucket {
  id: string;
  template_id?: string;
  bucket_number: number;
  code: string;
  name: string;
  description?: string;
  display_order: number;
  color: string;
  tasks: LifecycleTemplateTask[];
}

export interface LifecycleTemplate {
  id: string;
  name: string;
  description?: string;
  aircraft_type: string; // e.g. A320, A321, B737
  is_active: boolean;
  buckets: LifecycleTemplateBucket[];
  created_at: string;
  updated_at?: string;
}

// Backward compatibility alias
export type TaskTemplate = LifecycleTemplate;
export type TemplateTask = LifecycleTemplateTask;

export interface CopyMsnOptions {
  copyBuckets: boolean;
  copyTasks: boolean;
  copySubtasks: boolean;
  copyChecklists: boolean;
  copyDependencies: boolean;
  copyDurations: boolean;
  copyOrder: boolean;
  copyAssignees: boolean;
  copyComments: boolean;
  copyAttachments: boolean;
}

export type TemplateUpdatePropagation =
  | 'template_only'
  | 'template_and_future'
  | 'select_aircraft';

// ==========================================
// REPAIR ORDERS (RO) MODULE TYPES
// ==========================================

export type ROColumnType = 'text' | 'number' | 'date' | 'select' | 'currency';

export interface RepairOrderColumn {
  id: string; // unique field key, e.g. "ro_number", "part_number", "col_12345"
  name: string; // display name, e.g. "RO Number", "Part Number"
  type: ROColumnType;
  options?: string[]; // dropdown options for select type
  required?: boolean;
  order: number;
}

export interface RepairOrderRow {
  id: string;
  user_id: string;
  company_id: string;
  data: Record<string, any>; // maps column.id -> value
  created_at: string;
  updated_at: string;
}

export interface UserRepairOrderConfig {
  user_id: string;
  company_id: string;
  columns: RepairOrderColumn[];
  updated_at: string;
}

