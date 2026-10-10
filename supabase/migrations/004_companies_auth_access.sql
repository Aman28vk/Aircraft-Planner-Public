-- ====================================================================
-- AIRCRAFT LIFECYCLE MANAGEMENT & TASK PLANNER
-- Migration: 004_companies_auth_access.sql
-- Description: Companies, Email Domain Whitelisting, Roles (SUPER_ADMIN / EMPLOYEE),
--              and Multi-Company Access Control & RLS Policies
-- ====================================================================

-- 1. COMPANIES TABLE (ORGANIZATION WHITELIST)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email_domain TEXT NOT NULL UNIQUE, -- Normalized lowercase domain, e.g. 'alarisaero.com'
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on email_domain for rapid authorization lookups
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(email_domain);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- 2. COMPANY INVITATIONS
CREATE TABLE IF NOT EXISTS company_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED')),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON company_invitations(email);

-- 3. ENHANCE PROFILES FOR COMPANY RELATION & ROLES
DO $$
BEGIN
    -- Add company_id reference if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
        ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
    END IF;

    -- Add job_title if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'job_title') THEN
        ALTER TABLE profiles ADD COLUMN job_title TEXT;
    END IF;

    -- Add status (ACTIVE / DISABLED) if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED'));
    END IF;

    -- Add last_login if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_login') THEN
        ALTER TABLE profiles ADD COLUMN last_login TIMESTAMPTZ;
    END IF;

    -- Drop legacy role check constraint if present and enforce SUPER_ADMIN / EMPLOYEE
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('SUPER_ADMIN', 'EMPLOYEE'));
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- 4. EMAIL DOMAIN NORMALIZATION FUNCTION
CREATE OR REPLACE FUNCTION normalize_email_domain(p_input TEXT)
RETURNS TEXT AS $$
DECLARE
    v_domain TEXT;
BEGIN
    v_domain := TRIM(LOWER(p_input));
    -- If user supplied email 'name@domain.com', extract substring after '@'
    IF POSITION('@' IN v_domain) > 0 THEN
        v_domain := SUBSTRING(v_domain FROM POSITION('@' IN v_domain) + 1);
    END IF;
    -- Strip any remaining leading '@'
    v_domain := LTRIM(v_domain, '@');
    RETURN v_domain;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. DATABASE DOMAIN WHITELIST VERIFICATION TRIGGER FUNCTION
-- Enforces domain authorization at the database level before any user is registered or updated
CREATE OR REPLACE FUNCTION verify_user_company_access()
RETURNS TRIGGER AS $$
DECLARE
    v_domain TEXT;
    v_company_id UUID;
    v_company_status TEXT;
BEGIN
    -- Super Admins are exempt from company domain whitelist checks
    IF NEW.role = 'SUPER_ADMIN' THEN
        RETURN NEW;
    END IF;

    -- Extract & normalize domain from user's email
    v_domain := normalize_email_domain(NEW.email);

    -- Find matching company
    SELECT id, status INTO v_company_id, v_company_status
    FROM companies
    WHERE email_domain = v_domain;

    -- If domain not found or company is DISABLED, reject with exact specified message
    IF v_company_id IS NULL OR v_company_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Your organization is not authorized to access this application. Please contact your administrator.';
    END IF;

    -- Auto-link user to company if not explicitly specified
    IF NEW.company_id IS NULL THEN
        NEW.company_id := v_company_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_user_company_access ON profiles;
CREATE TRIGGER trg_verify_user_company_access
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION verify_user_company_access();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- Super Admin can do everything on companies
CREATE POLICY super_admin_all_companies ON companies
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'SUPER_ADMIN' AND profiles.status = 'ACTIVE'
        )
    );

-- Employees can only view active companies (read-only)
CREATE POLICY employee_read_active_companies ON companies
    FOR SELECT
    USING (status = 'ACTIVE');

-- Super Admin can manage invitations
CREATE POLICY super_admin_all_invitations ON company_invitations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'SUPER_ADMIN' AND profiles.status = 'ACTIVE'
        )
    );

-- 7. INITIAL SEED COMPANIES
INSERT INTO companies (id, name, email_domain, status)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Alaris Aerospace Systems', 'alarisaero.com', 'ACTIVE'),
    ('c2222222-2222-2222-2222-222222222222', 'Company B Aviation', 'companyb.com', 'ACTIVE'),
    ('c3333333-3333-3333-3333-333333333333', 'Company C Teardowns', 'companyc.com', 'DISABLED')
ON CONFLICT (email_domain) DO UPDATE
SET status = EXCLUDED.status, name = EXCLUDED.name;

