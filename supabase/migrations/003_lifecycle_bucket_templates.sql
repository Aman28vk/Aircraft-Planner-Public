-- ====================================================================
-- AIRCRAFT LIFECYCLE MANAGEMENT & TASK PLANNER
-- Migration: 003_lifecycle_bucket_templates.sql
-- Description: Master Lifecycle & Bucket Templates vs Project-Specific Buckets
-- ====================================================================

-- 1. MASTER LIFECYCLE TEMPLATES
CREATE TABLE IF NOT EXISTS lifecycle_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    aircraft_type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MASTER TEMPLATE BUCKETS
CREATE TABLE IF NOT EXISTS lifecycle_template_buckets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES lifecycle_templates(id) ON DELETE CASCADE,
    bucket_number INT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#38bdf8',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MASTER TEMPLATE TASKS INSIDE BUCKETS
CREATE TABLE IF NOT EXISTS lifecycle_template_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_bucket_id UUID NOT NULL REFERENCES lifecycle_template_buckets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    team_name TEXT NOT NULL,
    default_role TEXT DEFAULT 'TEAM_LEAD',
    estimated_duration_days INT NOT NULL DEFAULT 3,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    checklist_items JSONB DEFAULT '[]'::jsonb,
    predecessor_names TEXT[] DEFAULT '{}',
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PROJECT BUCKETS (INDEPENDENT COPIES PER AIRCRAFT/MSN)
CREATE TABLE IF NOT EXISTS project_buckets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aircraft_id UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
    bucket_number INT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#38bdf8',
    source_template_bucket_id UUID REFERENCES lifecycle_template_buckets(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. LINK TASKS TO PROJECT BUCKETS
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_bucket_id UUID REFERENCES project_buckets(id) ON DELETE CASCADE;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_template_buckets_tmpl ON lifecycle_template_buckets(template_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_bucket ON lifecycle_template_tasks(template_bucket_id);
CREATE INDEX IF NOT EXISTS idx_project_buckets_aircraft ON project_buckets(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_bucket ON tasks(project_bucket_id);

