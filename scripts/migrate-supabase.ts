if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_COMPANIES,
  INITIAL_PROFILES,
  INITIAL_TEAMS,
  INITIAL_STAGES,
  INITIAL_AIRCRAFT,
  INITIAL_PROJECT_BUCKETS,
  INITIAL_TASKS,
  INITIAL_CHECKLISTS,
  INITIAL_DEPENDENCIES,
  INITIAL_MASTER_TEMPLATES,
} from '../src/services/seedData.js';
import {
  DEFAULT_RO_COLUMNS,
  INITIAL_REPAIR_ORDERS,
} from '../src/services/storage.js';

const { Client } = pg;

async function migrate() {
  console.log('=== STARTING SUPABASE DATABASE MIGRATION & SEEDING ===');

  const connectionString = process.env.DATABASE_URL || '';
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✓ Connected to Supabase PostgreSQL database successfully.');

  // 1. Execute Migration SQL
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/006_complete_supabase_schema.sql');
  console.log(`\n1. Executing Schema DDL: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await client.query(sql);
  console.log('✓ All 18 tables, indexes, constraints, and RLS policies created!');

  // 2. Seed Companies
  console.log(`\n2. Seeding ${INITIAL_COMPANIES.length} Companies...`);
  for (const c of INITIAL_COMPANIES) {
    await client.query(`
      INSERT INTO companies (id, name, email_domain, status, onboarding_date, expiry_date, plan_tier, max_seats, contact_person, contact_email, notes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email_domain = EXCLUDED.email_domain,
        status = EXCLUDED.status,
        onboarding_date = EXCLUDED.onboarding_date,
        expiry_date = EXCLUDED.expiry_date,
        plan_tier = EXCLUDED.plan_tier,
        max_seats = EXCLUDED.max_seats,
        contact_person = EXCLUDED.contact_person,
        contact_email = EXCLUDED.contact_email,
        notes = EXCLUDED.notes;
    `, [
      c.id,
      c.name,
      c.email_domain,
      c.status,
      c.onboarding_date || '2024-01-15',
      c.expiry_date || '2027-12-31',
      c.plan_tier || 'ENTERPRISE',
      c.max_seats || 50,
      c.contact_person || null,
      c.contact_email || null,
      c.notes || null,
      c.created_at || new Date().toISOString(),
    ]);
  }
  console.log('✓ Companies seeded successfully.');

  // 3. Seed Lifecycle Stages
  console.log(`\n3. Seeding ${INITIAL_STAGES.length} Lifecycle Stages...`);
  for (const s of INITIAL_STAGES) {
    await client.query(`
      INSERT INTO lifecycle_stages (id, stage_number, code, name, description, color, order_index, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        color = EXCLUDED.color,
        order_index = EXCLUDED.order_index;
    `, [s.id, s.stage_number, s.code, s.name, s.description || null, s.color, s.order_index, s.is_active, s.created_at]);
  }
  console.log('✓ Lifecycle stages seeded.');

  // 4. Seed Teams
  console.log(`\n4. Seeding ${INITIAL_TEAMS.length} Operational Teams...`);
  for (const t of INITIAL_TEAMS) {
    await client.query(`
      INSERT INTO teams (id, company_id, name, code, description, color, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        color = EXCLUDED.color;
    `, [t.id, t.company_id || 'c1111111-1111-1111-1111-111111111111', t.name, t.code, t.description || null, t.color, t.is_active, t.created_at]);
  }
  console.log('✓ Teams seeded.');

  // 5. Seed Profiles (Users)
  console.log(`\n5. Seeding ${INITIAL_PROFILES.length} Profiles & Users...`);
  for (const p of INITIAL_PROFILES) {
    await client.query(`
      INSERT INTO profiles (id, company_id, email, full_name, role, job_title, title, phone, department, team_id, status, is_active, last_login, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        job_title = EXCLUDED.job_title,
        title = EXCLUDED.title,
        phone = EXCLUDED.phone,
        department = EXCLUDED.department,
        team_id = EXCLUDED.team_id,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        last_login = EXCLUDED.last_login;
    `, [
      p.id,
      p.company_id || null,
      p.email,
      p.full_name,
      p.role,
      p.job_title || p.title || null,
      p.title || p.job_title || null,
      p.phone || null,
      p.department || null,
      p.team_id || null,
      p.status || 'ACTIVE',
      p.is_active,
      p.last_login || null,
      p.created_at,
    ]);
  }
  console.log('✓ Profiles seeded.');

  // 6. Seed Aircraft
  console.log(`\n6. Seeding ${INITIAL_AIRCRAFT.length} Aircraft...`);
  for (const a of INITIAL_AIRCRAFT) {
    await client.query(`
      INSERT INTO aircraft (id, company_id, msn, registration, aircraft_type, model, variant, serial_number, owner, status, location, current_stage_id, notes, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        msn = EXCLUDED.msn,
        registration = EXCLUDED.registration,
        aircraft_type = EXCLUDED.aircraft_type,
        model = EXCLUDED.model,
        owner = EXCLUDED.owner,
        status = EXCLUDED.status,
        location = EXCLUDED.location,
        current_stage_id = EXCLUDED.current_stage_id,
        notes = EXCLUDED.notes;
    `, [
      a.id,
      a.company_id || 'c1111111-1111-1111-1111-111111111111',
      a.msn,
      a.registration,
      a.aircraft_type,
      a.model,
      a.variant || null,
      a.serial_number || null,
      a.owner,
      a.status,
      a.location,
      a.current_stage_id || null,
      a.notes || null,
      a.created_by || null,
      a.created_at,
    ]);
  }
  console.log('✓ Aircraft seeded.');

  // 7. Seed Project Buckets
  console.log(`\n7. Seeding ${INITIAL_PROJECT_BUCKETS.length} Project Buckets...`);
  for (const b of INITIAL_PROJECT_BUCKETS) {
    await client.query(`
      INSERT INTO project_buckets (id, aircraft_id, company_id, bucket_number, code, name, description, display_order, color, source_template_bucket_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        display_order = EXCLUDED.display_order,
        color = EXCLUDED.color;
    `, [
      b.id,
      b.aircraft_id,
      b.company_id || 'c1111111-1111-1111-1111-111111111111',
      b.bucket_number,
      b.code,
      b.name,
      b.description || null,
      b.display_order,
      b.color,
      b.source_template_bucket_id || null,
      b.created_at,
    ]);
  }
  console.log('✓ Project buckets seeded.');

  // 8. Seed Tasks
  console.log(`\n8. Seeding ${INITIAL_TASKS.length} Tasks...`);
  for (const t of INITIAL_TASKS) {
    await client.query(`
      INSERT INTO tasks (id, aircraft_id, company_id, stage_id, project_bucket_id, team_id, assigned_user_id, task_number, name, description, status, priority, start_date, due_date, estimated_duration_days, order_index, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        assigned_user_id = EXCLUDED.assigned_user_id,
        project_bucket_id = EXCLUDED.project_bucket_id,
        team_id = EXCLUDED.team_id;
    `, [
      t.id,
      t.aircraft_id,
      t.company_id || 'c1111111-1111-1111-1111-111111111111',
      t.stage_id || null,
      t.project_bucket_id || null,
      t.team_id || null,
      t.assigned_user_id || null,
      t.task_number || null,
      t.name,
      t.description || null,
      t.status,
      t.priority,
      t.start_date || null,
      t.due_date || null,
      t.estimated_duration_days || 5,
      t.order_index,
      t.created_at,
      t.updated_at,
    ]);
  }
  console.log('✓ Tasks seeded.');

  // 9. Seed Task Checklists
  console.log(`\n9. Seeding ${INITIAL_CHECKLISTS.length} Task Checklist Items...`);
  for (const c of INITIAL_CHECKLISTS) {
    await client.query(`
      INSERT INTO task_checklists (id, task_id, title, is_completed, order_index, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING;
    `, [c.id, c.task_id, c.title, c.is_completed, c.order_index, new Date().toISOString()]);
  }
  console.log('✓ Checklists seeded.');

  // 10. Seed Task Dependencies
  console.log(`\n10. Seeding ${INITIAL_DEPENDENCIES.length} Task Dependencies...`);
  for (const d of INITIAL_DEPENDENCIES) {
    await client.query(`
      INSERT INTO task_dependencies (id, task_id, depends_on_task_id, dependency_type, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (task_id, depends_on_task_id) DO NOTHING;
    `, [d.id, d.task_id, d.depends_on_task_id, d.dependency_type || 'FINISH_TO_START', d.created_at]);
  }
  console.log('✓ Task dependencies seeded.');

  // 11. Seed Lifecycle Templates
  console.log(`\n11. Seeding ${INITIAL_MASTER_TEMPLATES.length} Lifecycle Master Templates...`);
  for (const lt of INITIAL_MASTER_TEMPLATES) {
    await client.query(`
      INSERT INTO lifecycle_templates (id, name, description, aircraft_type, is_active, buckets, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        buckets = EXCLUDED.buckets;
    `, [lt.id, lt.name, lt.description || null, lt.aircraft_type, lt.is_active, JSON.stringify(lt.buckets), lt.created_at]);
  }
  console.log('✓ Lifecycle templates seeded.');

  // 12. Seed Repair Orders Configurations & Items
  console.log('\n12. Seeding Repair Orders Module (Columns & Items)...');
  const demoUsers = ['33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222'];
  for (const userId of demoUsers) {
    const user = INITIAL_PROFILES.find(p => p.id === userId);
    const companyId = user?.company_id || 'c1111111-1111-1111-1111-111111111111';
    await client.query(`
      INSERT INTO repair_order_columns (user_id, company_id, columns, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        columns = EXCLUDED.columns;
    `, [userId, companyId, JSON.stringify(DEFAULT_RO_COLUMNS), new Date().toISOString()]);
  }

  for (const ro of INITIAL_REPAIR_ORDERS) {
    await client.query(`
      INSERT INTO repair_orders (id, user_id, company_id, data, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING;
    `, [ro.id, ro.user_id, ro.company_id, JSON.stringify(ro.data), ro.created_at, ro.updated_at]);
  }
  console.log('✓ Repair orders seeded.');

  // 13. Enable Supabase Realtime & Set Replica Identity FULL
  console.log('\n13. Enabling Supabase Realtime Publication & Replica Identity FULL...');
  const realtimeMigrationPath = path.resolve(process.cwd(), 'supabase/migrations/009_enable_supabase_realtime.sql');
  const realtimeSql = fs.readFileSync(realtimeMigrationPath, 'utf8');
  await client.query(realtimeSql);
  console.log('✓ All 16 collaborative tables added to supabase_realtime publication with REPLICA IDENTITY FULL!');

  // 14. Verify Table Counts
  console.log('\n=== VERIFYING SUPABASE DATABASE TABLE COUNTS ===');
  const tables = [
    'companies',
    'profiles',
    'teams',
    'lifecycle_stages',
    'aircraft',
    'project_buckets',
    'tasks',
    'task_checklists',
    'task_dependencies',
    'lifecycle_templates',
    'repair_orders',
    'repair_order_columns',
  ];

  for (const table of tables) {
    const countRes = await client.query(`SELECT COUNT(*) FROM ${table};`);
    console.log(`- ${table.padEnd(25)}: ${countRes.rows[0].count} records`);
  }

  await client.end();
  console.log('\n✓ SUPABASE DATABASE MIGRATION & SEEDING COMPLETED SUCCESSFULLY! 🎉');
}

migrate().catch((err) => {
  console.error('\n✗ Migration failed:', err);
  process.exit(1);
});
