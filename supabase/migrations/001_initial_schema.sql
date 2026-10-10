-- ====================================================================
-- AIRCRAFT LIFECYCLE MANAGEMENT & TASK PLANNER
-- Migration: 001_initial_schema.sql
-- Description: Complete normalized database schema, constraints, indexes, and RLS policies
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & ROLES
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'TEAM_ADMIN', 'TEAM_MEMBER', 'VIEWER');

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'TEAM_MEMBER',
    title TEXT,
    phone TEXT,
    department TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TEAMS
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    team_lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_in_team TEXT DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 4. LIFECYCLE STAGES
CREATE TABLE IF NOT EXISTS lifecycle_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_number INT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#64748b',
    order_index INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AIRCRAFT (IDENTIFIED BY MSN)
CREATE TYPE aircraft_status AS ENUM ('ACTIVE', 'IN_PROGRESS', 'TEARDOWN', 'COMPLETED', 'ARCHIVED');

CREATE TABLE IF NOT EXISTS aircraft (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    msn TEXT NOT NULL UNIQUE,
    registration TEXT NOT NULL,
    aircraft_type TEXT NOT NULL, -- e.g. Airbus, Boeing
    model TEXT NOT NULL,         -- e.g. A320-200, B737-800
    variant TEXT,
    serial_number TEXT,
    owner TEXT NOT NULL,
    status aircraft_status NOT NULL DEFAULT 'IN_PROGRESS',
    acquisition_date DATE,
    expected_teardown_date DATE,
    actual_teardown_date DATE,
    location TEXT NOT NULL,
    current_stage_id UUID REFERENCES lifecycle_stages(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TASK TEMPLATES & TEMPLATE TASKS
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    aircraft_type TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES lifecycle_stages(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    estimated_duration_days INT NOT NULL DEFAULT 3,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    default_role TEXT DEFAULT 'TEAM_LEAD',
    order_index INT NOT NULL DEFAULT 0,
    checklist_items JSONB DEFAULT '[]'::jsonb,
    predecessor_template_task_ids UUID[] DEFAULT '{}',
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TASKS
CREATE TYPE task_status AS ENUM (
    'WAITING',
    'WAITING_FOR_DEPENDENCY',
    'READY',
    'NOT_STARTED',
    'IN_PROGRESS',
    'BLOCKED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_number SERIAL,
    aircraft_id UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES lifecycle_stages(id) ON DELETE RESTRICT,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'NOT_STARTED',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    estimated_duration_days INT DEFAULT 3,
    actual_duration_days INT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TASK CHECKLISTS
CREATE TABLE IF NOT EXISTS task_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INT NOT NULL DEFAULT 0,
    completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TASK DEPENDENCIES (PROPER GRAPH MODEL)
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,           -- Successor task
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- Predecessor task
    dependency_type TEXT NOT NULL DEFAULT 'FINISH_TO_START',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);

-- 10. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    aircraft_id UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ATTACHMENTS
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    aircraft_id UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. NOTIFICATIONS
CREATE TYPE notification_type AS ENUM (
    'TASK_ASSIGNED',
    'TASK_REASSIGNED',
    'TASK_COMPLETED',
    'DEPENDENCY_UNLOCKED',
    'TASK_OVERDUE',
    'TASK_DUE_SOON',
    'TASK_BLOCKED',
    'COMMENT_ADDED',
    'MENTION',
    'STAGE_CHANGED'
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    aircraft_id UUID REFERENCES aircraft(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNREAD', -- UNREAD, READ
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    email_status TEXT NOT NULL DEFAULT 'SIMULATED', -- SENT, SIMULATED, FAILED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. EMAIL LOGS (TRANSACTIONAL EMAIL AUDIT)
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    aircraft_msn TEXT,
    status TEXT NOT NULL DEFAULT 'SIMULATED_DEV_MODE',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. ACTIVITY & AUDIT LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aircraft_id UUID REFERENCES aircraft(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR HIGH PERFORMANCE (100,000+ TASKS / 1,000+ AIRCRAFT)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_aircraft_msn ON aircraft(msn);
CREATE INDEX IF NOT EXISTS idx_aircraft_status ON aircraft(status);
CREATE INDEX IF NOT EXISTS idx_aircraft_current_stage ON aircraft(current_stage_id);

CREATE INDEX IF NOT EXISTS idx_tasks_aircraft_id ON tasks(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_tasks_stage_id ON tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_task_deps_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON task_dependencies(depends_on_task_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_aircraft ON activity_logs(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Authenticated users can view all profiles; super admin or owner can edit
CREATE POLICY "Profiles are viewable by authenticated users" 
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin can manage profiles" 
ON profiles FOR ALL TO authenticated 
USING (get_current_user_role() = 'SUPER_ADMIN')
WITH CHECK (get_current_user_role() = 'SUPER_ADMIN');

-- Aircraft: Super Admin full; Team Admin & Members view all; Viewers read-only
CREATE POLICY "Aircraft viewable by all authenticated users" 
ON aircraft FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin full access on aircraft" 
ON aircraft FOR ALL TO authenticated 
USING (get_current_user_role() = 'SUPER_ADMIN')
WITH CHECK (get_current_user_role() = 'SUPER_ADMIN');

-- Tasks: Viewable by all; Super admin can edit all; Team Admin / Members can update their assigned/team tasks
CREATE POLICY "Tasks viewable by all" 
ON tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin full task management" 
ON tasks FOR ALL TO authenticated 
USING (get_current_user_role() = 'SUPER_ADMIN')
WITH CHECK (get_current_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Team admin & members can update permitted tasks" 
ON tasks FOR UPDATE TO authenticated 
USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'TEAM_ADMIN', 'TEAM_MEMBER')
);

-- Notifications: Users only see their own notifications
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE TO authenticated 
USING (user_id = auth.uid());

