-- ==============================================================================
-- 005_tenant_company_scoping.sql
-- MULTI-TENANT DATA ISOLATION: AIRCRAFT, TASKS, AND PROJECT BUCKETS
-- ==============================================================================

-- 1. Add company_id to aircraft
ALTER TABLE aircraft
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_aircraft_company_id ON aircraft(company_id);

-- 2. Add company_id to project_buckets
ALTER TABLE project_buckets
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_buckets_company_id ON project_buckets(company_id);

-- 3. Add company_id to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);

-- 4. Backfill existing sample aircraft and tasks
UPDATE aircraft
SET company_id = 'c1111111-1111-1111-1111-111111111111'
WHERE company_id IS NULL AND msn IN ('12345', '12346');

UPDATE aircraft
SET company_id = 'c2222222-2222-2222-2222-222222222222'
WHERE company_id IS NULL AND msn = '12347';

-- Sync company_id onto project_buckets from aircraft
UPDATE project_buckets pb
SET company_id = a.company_id
FROM aircraft a
WHERE pb.aircraft_id = a.id AND pb.company_id IS NULL;

-- Sync company_id onto tasks from aircraft
UPDATE tasks t
SET company_id = a.company_id
FROM aircraft a
WHERE t.aircraft_id = a.id AND t.company_id IS NULL;

-- 5. Helper function to check if current user is Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

-- Helper function to get current user's authorized company_id
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 6. Row Level Security Policies for Multi-Tenant Isolation

-- Aircraft RLS
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Aircraft" ON aircraft;
CREATE POLICY "Tenant Isolation for Aircraft" ON aircraft
  FOR ALL
  USING (
    is_super_admin() OR company_id = get_current_user_company_id()
  )
  WITH CHECK (
    is_super_admin() OR company_id = get_current_user_company_id()
  );

-- Project Buckets RLS
ALTER TABLE project_buckets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Project Buckets" ON project_buckets;
CREATE POLICY "Tenant Isolation for Project Buckets" ON project_buckets
  FOR ALL
  USING (
    is_super_admin() OR company_id = get_current_user_company_id()
  )
  WITH CHECK (
    is_super_admin() OR company_id = get_current_user_company_id()
  );

-- Tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Tasks" ON tasks;
CREATE POLICY "Tenant Isolation for Tasks" ON tasks
  FOR ALL
  USING (
    is_super_admin() OR company_id = get_current_user_company_id()
  )
  WITH CHECK (
    is_super_admin() OR company_id = get_current_user_company_id()
  );

