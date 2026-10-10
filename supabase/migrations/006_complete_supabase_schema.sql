-- ====================================================================
-- AIRCRAFT LIFECYCLE MANAGEMENT & TASK PLANNER
-- Migration: 006_complete_supabase_schema.sql
-- Description: Complete Unified Database Schema (Text ID Compatible),
--              Constraints, Indexes, Row-Level Security, and Seeding
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure clean schema creation
DROP TABLE IF EXISTS repair_orders CASCADE;
DROP TABLE IF EXISTS repair_order_columns CASCADE;
DROP TABLE IF EXISTS lifecycle_templates CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS in_app_notifications CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS task_checklists CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_buckets CASCADE;
DROP TABLE IF EXISTS aircraft CASCADE;
DROP TABLE IF EXISTS lifecycle_stages CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 1. COMPANIES (TENANTS & CONTRACTS)
CREATE TABLE companies (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    email_domain TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    onboarding_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
    plan_tier TEXT NOT NULL DEFAULT 'ENTERPRISE' CHECK (plan_tier IN ('ENTERPRISE', 'PROFESSIONAL', 'STARTER', 'PILOT')),
    max_seats INT NOT NULL DEFAULT 50,
    contact_person TEXT,
    contact_email TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_domain ON companies(email_domain);
CREATE INDEX idx_companies_status ON companies(status);

-- 2. TEAMS
CREATE TABLE teams (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    team_lead_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROFILES & USERS
CREATE TABLE profiles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    auth_user_id TEXT,
    company_id TEXT REFERENCES companies(id) ON DELETE RESTRICT,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'EMPLOYEE')),
    job_title TEXT,
    title TEXT,
    phone TEXT,
    department TEXT,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    password TEXT DEFAULT 'password123',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update foreign key on teams.team_lead_id
ALTER TABLE teams 
    DROP CONSTRAINT IF EXISTS fk_teams_team_lead,
    ADD CONSTRAINT fk_teams_team_lead FOREIGN KEY (team_lead_id) REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- 4. TEAM MEMBERS
CREATE TABLE team_members (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_in_team TEXT DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- 5. LIFECYCLE STAGES
CREATE TABLE lifecycle_stages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    stage_number INT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#64748b',
    order_index INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AIRCRAFT (IDENTIFIED BY MSN)
CREATE TABLE aircraft (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    msn TEXT NOT NULL UNIQUE,
    registration TEXT NOT NULL,
    aircraft_type TEXT NOT NULL,
    model TEXT NOT NULL,
    variant TEXT,
    serial_number TEXT,
    owner TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('ACTIVE', 'IN_PROGRESS', 'TEARDOWN', 'COMPLETED', 'ARCHIVED')),
    acquisition_date DATE,
    expected_teardown_date DATE,
    actual_teardown_date DATE,
    location TEXT NOT NULL,
    current_stage_id TEXT REFERENCES lifecycle_stages(id) ON DELETE SET NULL,
    notes TEXT,
    created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aircraft_company ON aircraft(company_id);
CREATE INDEX idx_aircraft_msn ON aircraft(msn);

-- 7. PROJECT BUCKETS (PER AIRCRAFT INSTANCE)
CREATE TABLE project_buckets (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    bucket_number INT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    display_order INT NOT NULL,
    color TEXT DEFAULT '#38bdf8',
    source_template_bucket_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_buckets_aircraft ON project_buckets(aircraft_id);
CREATE INDEX idx_project_buckets_company ON project_buckets(company_id);

-- 8. TASKS
CREATE TABLE tasks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    stage_id TEXT REFERENCES lifecycle_stages(id) ON DELETE SET NULL,
    project_bucket_id TEXT REFERENCES project_buckets(id) ON DELETE SET NULL,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    assigned_user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    task_number INT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('WAITING', 'WAITING_FOR_DEPENDENCY', 'READY', 'NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    estimated_duration_days INT DEFAULT 5,
    actual_duration_days INT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_aircraft ON tasks(aircraft_id);
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_assigned_user ON tasks(assigned_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- 9. TASK CHECKLIST ITEMS
CREATE TABLE task_checklists (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INT NOT NULL DEFAULT 0,
    completed_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_task ON task_checklists(task_id);

-- 10. TASK DEPENDENCIES
CREATE TABLE task_dependencies (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'FINISH_TO_START',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);

-- 11. TASK COMMENTS
CREATE TABLE task_comments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. TASK ATTACHMENTS
CREATE TABLE task_attachments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    aircraft_id TEXT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    uploaded_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    file_type TEXT,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. IN-APP NOTIFICATIONS
CREATE TABLE in_app_notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    aircraft_id TEXT REFERENCES aircraft(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    email_status TEXT NOT NULL DEFAULT 'SIMULATED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON in_app_notifications(user_id);

-- 14. EMAIL LOGS (TRANSACTIONAL OUTBOX)
CREATE TABLE email_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    task_id TEXT,
    aircraft_msn TEXT,
    status TEXT NOT NULL DEFAULT 'SIMULATED_DEV_MODE',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. ACTIVITY & AUDIT LOGS
CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    aircraft_id TEXT REFERENCES aircraft(id) ON DELETE SET NULL,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. LIFECYCLE TEMPLATES
CREATE TABLE lifecycle_templates (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    description TEXT,
    aircraft_type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    buckets JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. REPAIR ORDERS (RO) USER CONFIGURATIONS
CREATE TABLE repair_order_columns (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_ro_columns_user ON repair_order_columns(user_id);

-- 18. REPAIR ORDERS (RO) ITEMS
CREATE TABLE repair_orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_repair_orders_user ON repair_orders(user_id);
CREATE INDEX idx_repair_orders_company ON repair_orders(company_id);

-- ENABLE ROW LEVEL SECURITY (RLS) BUT PROVIDE PERMISSIVE FULL POLICIES FOR APP ACCESS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_order_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for companies" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for aircraft" ON aircraft FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for project_buckets" ON project_buckets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for repair_orders" ON repair_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for repair_order_columns" ON repair_order_columns FOR ALL USING (true) WITH CHECK (true);

