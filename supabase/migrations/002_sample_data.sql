-- ====================================================================
-- AIRCRAFT LIFECYCLE MANAGEMENT & TASK PLANNER
-- Migration: 002_sample_data.sql
-- Description: Seed data with Users, Teams, Stages, Aircraft (MSN 12345, 12346, 12347),
--              Tasks with Dependencies, Checklists, and Templates
-- ====================================================================

-- 1. USERS / PROFILES
INSERT INTO profiles (id, email, full_name, role, title, phone, department) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@alarisaerospace.com', 'Super Admin', 'SUPER_ADMIN', 'Head of Aircraft Programs', '+1 (555) 019-2831', 'Executive'),
('22222222-2222-2222-2222-222222222222', 'john.smith@alarisaerospace.com', 'John Smith', 'TEAM_ADMIN', 'Asset Technical Lead', '+1 (555) 019-4822', 'Asset'),
('33333333-3333-3333-3333-333333333333', 'aman.kumar@alarisaerospace.com', 'Aman Kumar', 'TEAM_MEMBER', 'Senior Project Specialist', '+1 (555) 019-9182', 'Asset & Operations'),
('44444444-4444-4444-4444-444444444444', 'sarah.connor@alarisaerospace.com', 'Sarah Connor', 'TEAM_ADMIN', 'Teardown Operations Director', '+1 (555) 019-7721', 'Teardown'),
('55555555-5555-5555-5555-555555555555', 'michael.chang@alarisaerospace.com', 'Michael Chang', 'TEAM_ADMIN', 'Commercial Sales Director', '+1 (555) 019-3382', 'Sales'),
('66666666-6666-6666-6666-666666666666', 'david.miller@alarisaerospace.com', 'David Miller', 'TEAM_ADMIN', 'Warehouse & Logistics Manager', '+1 (555) 019-1199', 'Warehouse'),
('77777777-7777-7777-7777-777777777777', 'emily.watson@alarisaerospace.com', 'Emily Watson', 'VIEWER', 'Financial Auditor', '+1 (555) 019-4455', 'Finance')
ON CONFLICT (id) DO NOTHING;

-- 2. TEAMS
INSERT INTO teams (id, name, code, description, color, team_lead_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Asset', 'ASSET', 'Manages aircraft records, technical evaluations, specification sheets, and asset audits', '#0284c7', '22222222-2222-2222-2222-222222222222'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sales', 'SALES', 'Handles customer demands, harvest list pricing, quotations, and parts sales', '#10b981', '55555555-5555-5555-5555-555555555555'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Teardown', 'TEARDOWN', 'Manages teardown vendor selection, on-site disassembly, cutting, and component harvesting', '#f59e0b', '44444444-4444-4444-4444-444444444444'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Warehouse', 'WAREHOUSE', 'Receives harvested parts, visual inspection, EASA/FAA tag verification, and inventory storage', '#8b5cf6', '66666666-6666-6666-6666-666666666666'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Technical', 'TECH', 'Airworthiness direct verification, engineering orders, and non-incident verification', '#06b6d4', '22222222-2222-2222-2222-222222222222'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finance', 'FINANCE', 'BAFO calculation, financial disbursement, escrow management, and cost reconciliation', '#ec4899', '77777777-7777-7777-7777-777777777777'),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'Management', 'MGMT', 'Executive oversight, deal approval, partner coordination, and milestone sign-offs', '#64748b', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- 3. LIFECYCLE STAGES
INSERT INTO lifecycle_stages (id, stage_number, code, name, description, color, order_index) VALUES
('s1111111-1111-1111-1111-111111111111', 1, '01_BIDDING', '01 BIDDING', 'RFP, Preliminary Evaluation, LOI, BAFO', '#38bdf8', 1),
('s2222222-2222-2222-2222-222222222222', 2, '02_ACQUISITION', '02 ACQUISITION', 'Technical Acceptance, Escrow, Contract Execution', '#3b82f6', 2),
('s3333333-3333-3333-3333-333333333333', 3, '03_TEARDOWN_PREP', '03 TEARDOWN PREPARATION', 'Teardown facility RFQ, Harvest List prep, Tooling', '#f59e0b', 3),
('s4444444-4444-4444-4444-444444444444', 4, '04_FLIP_TEARDOWN', '04 FLIP / TEARDOWN', 'Disassembly mobilization, Ferry flight or location handover', '#f97316', 4),
('s5555555-5555-5555-5555-555555555555', 5, '05_TEARDOWN_IN_PROCESS', '05 TEARDOWN IN PROCESS', 'Shop execution, part removal, daily teardown reports', '#ef4444', 5),
('s6666666-6666-6666-6666-666666666666', 6, '06_WAREHOUSE', '06 WAREHOUSE', 'Receiving, tagging, physical inspection, storage', '#8b5cf6', 6),
('s7777777-7777-7777-7777-777777777777', 7, '07_SALES', '07 SALES', 'Customer demand matching, quote issuance, parts release', '#10b981', 7),
('s8888888-8888-8888-8888-888888888888', 8, '08_INVENTORY', '08 INVENTORY', 'ERP cataloging, traceability certification, lot reconciliation', '#14b8a6', 8),
('s9999999-9999-9999-9999-999999999999', 9, '09_CLOSED', '09 CLOSED', 'Final financial reconciliation and project close-out', '#64748b', 9)
ON CONFLICT (id) DO NOTHING;

-- 4. AIRCRAFT (MSN 12345, 12346, 12347)
INSERT INTO aircraft (id, msn, registration, aircraft_type, model, variant, serial_number, owner, status, acquisition_date, expected_teardown_date, location, current_stage_id, notes) VALUES
('a1111111-1111-1111-1111-111111111111', '12345', 'N123AA', 'Airbus', 'A320-200', 'CFM56-5B4', 'MSN-12345-AIR', 'Alaris Asset Partners', 'IN_PROGRESS', '2026-08-15', '2026-11-30', 'Phoenix Goodyear (GYR)', 's2222222-2222-2222-2222-222222222222', 'Flagship teardown project. High-value harvest package with dual engines and dual avionics suites.'),
('a2222222-2222-2222-2222-222222222222', '12346', 'N737AL', 'Boeing', 'B737-800', 'CFM56-7B26', 'MSN-12346-BOE', 'SkyLine Aircraft Leasing', 'IN_PROGRESS', '2026-07-10', '2026-10-15', 'Pinal Airpark (MZJ)', 's3333333-3333-3333-3333-333333333333', 'Teardown partner confirmed. Pending final engine cut protocol.'),
('a3333333-3333-3333-3333-333333333333', '12347', 'N321AL', 'Airbus', 'A321-200', 'V2533-A5', 'MSN-12347-AIR', 'Global Aviation Capital', 'ACTIVE', '2026-09-01', '2027-01-20', 'Victorville (VCV)', 's1111111-1111-1111-1111-111111111111', 'Under BAFO evaluation. High engine cycle remaining.')
ON CONFLICT (id) DO NOTHING;

-- 5. TASKS FOR MSN 12345 (Matching required test case & specifications)
INSERT INTO tasks (id, aircraft_id, stage_id, team_id, assigned_user_id, name, description, status, priority, start_date, due_date, estimated_duration_days, order_index) VALUES
-- Task 1: Technical Acceptance (Asset, John Smith)
('t1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Technical Acceptance', 'Complete full on-site physical and technical records acceptance before release to teardown.', 'IN_PROGRESS', 'URGENT', '2026-09-18', '2026-09-23', 5, 1),

-- Task 2: Harvest List Preparation (Asset, Aman Kumar) - Depends on Task 1
('t2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 's3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Harvest List Preparation', 'Prepare comprehensive component harvest list including part numbers, serial numbers, and tag requirements.', 'WAITING', 'HIGH', '2026-09-24', '2026-10-02', 8, 2),

-- Task 3: Teardown Coordination (Teardown, Sarah Connor) - Depends on Task 2
('t3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 's3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'Teardown Coordination', 'Finalize agreement with teardown MRO shop, shipping crates, and tooling delivery.', 'WAITING', 'HIGH', '2026-10-03', '2026-10-10', 7, 3),

-- Task 4: Teardown Execution & Part Removal (Teardown, Sarah Connor) - Depends on Task 3
('t4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 's5555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', 'Teardown Execution & Part Removal', 'Perform physical airframe dismantling, engine drop, landing gear removal, and avionics extraction.', 'WAITING', 'URGENT', '2026-10-11', '2026-10-25', 14, 4),

-- Task 5: Receiving & Inspection (Warehouse, David Miller) - Depends on Task 4
('t5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', 's6666666-6666-6666-6666-666666666666', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 'Receiving & Inspection', 'Receive shipped parts at warehouse, complete receiving inspection, verify NIS certificates.', 'WAITING', 'MEDIUM', '2026-10-26', '2026-11-05', 10, 5),

-- Task 6: Aircraft Documents (Asset, Aman Kumar) - Parallel track (Prompt screenshot reference)
('t6666666-6666-6666-6666-666666666666', 'a1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Aircraft Documents', 'Gather and digitize all foundational aircraft technical airworthiness packets.', 'IN_PROGRESS', 'HIGH', '2026-09-15', '2026-09-25', 10, 6),

-- Task 7: Customer Requirement & Part Demand (Sales, Michael Chang) - Depends on Task 6
('t7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111', 's7777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Customer Requirement & Part Demand Analysis', 'Review market demand against MSN 12345 harvest list and generate pre-sale commitments.', 'NOT_STARTED', 'MEDIUM', '2026-09-26', '2026-10-08', 12, 7)
ON CONFLICT (id) DO NOTHING;

-- 6. TASK DEPENDENCIES (Sequential & Parallel Graph)
INSERT INTO task_dependencies (id, task_id, depends_on_task_id, dependency_type) VALUES
-- Task 2 (Harvest List) depends on Task 1 (Technical Acceptance)
('d1111111-1111-1111-1111-111111111111', 't2222222-2222-2222-2222-222222222222', 't1111111-1111-1111-1111-111111111111', 'FINISH_TO_START'),

-- Task 3 (Teardown Coord) depends on Task 2 (Harvest List)
('d2222222-2222-2222-2222-222222222222', 't3333333-3333-3333-3333-333333333333', 't2222222-2222-2222-2222-222222222222', 'FINISH_TO_START'),

-- Task 4 (Teardown Execution) depends on Task 3 (Teardown Coord)
('d3333333-3333-3333-3333-333333333333', 't4444444-4444-4444-4444-444444444444', 't3333333-3333-3333-3333-333333333333', 'FINISH_TO_START'),

-- Task 5 (Receiving & Inspection) depends on Task 4 (Teardown Execution)
('d4444444-4444-4444-4444-444444444444', 't5555555-5555-5555-5555-555555555555', 't4444444-4444-4444-4444-444444444444', 'FINISH_TO_START'),

-- Task 7 (Demand Analysis) depends on Task 6 (Aircraft Documents)
('d5555555-5555-5555-5555-555555555555', 't7777777-7777-7777-7777-777777777777', 't6666666-6666-6666-6666-666666666666', 'FINISH_TO_START')
ON CONFLICT (id) DO NOTHING;

-- 7. CHECKLISTS (Matching Prompt: Aircraft Documents 2/4 completed)
INSERT INTO task_checklists (id, task_id, title, is_completed, order_index) VALUES
-- For Task 6: Aircraft Documents
('c1111111-1111-1111-1111-111111111111', 't6666666-6666-6666-6666-666666666666', 'OCCM', TRUE, 1),
('c2222222-2222-2222-2222-222222222222', 't6666666-6666-6666-6666-666666666666', 'HT', TRUE, 2),
('c3333333-3333-3333-3333-333333333333', 't6666666-6666-6666-6666-666666666666', 'AIR', FALSE, 3),
('c4444444-4444-4444-4444-444444444444', 't6666666-6666-6666-6666-666666666666', 'Specification Sheet', FALSE, 4),

-- For Task 1: Technical Acceptance
('c5555555-5555-5555-5555-555555555555', 't1111111-1111-1111-1111-111111111111', 'Logbook verification & physical survey', TRUE, 1),
('c6666666-6666-6666-6666-666666666666', 't1111111-1111-1111-1111-111111111111', 'Airworthiness Directive (AD) compliance check', FALSE, 2),
('c7777777-7777-7777-7777-777777777777', 't1111111-1111-1111-1111-111111111111', 'Technical Acceptance Certificate sign-off', FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- 8. TASK TEMPLATES
INSERT INTO task_templates (id, name, aircraft_type, description) VALUES
('tmpl-1111-1111-1111-111111111111', 'A320 Standard Harvest Lifecycle', 'Airbus', 'Complete turnkey lifecycle for narrowbody Airbus teardown, harvest, and inventory certification.'),
('tmpl-2222-2222-2222-222222222222', 'B737-800 Quick Turn Teardown', 'Boeing', 'Standard accelerated dismantling protocol for B737 Next Gen aircraft.')
ON CONFLICT (id) DO NOTHING;

