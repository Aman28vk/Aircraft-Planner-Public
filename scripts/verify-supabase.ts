if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
const { Client } = pg;

async function verify() {
  console.log('=== STARTING SUPABASE LIVE DATABASE VERIFICATION ===\n');

  const connectionString = 'process.env.DATABASE_URL || ""';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✓ Connected to Supabase PostgreSQL cloud database.');

  // 1. Verify all 18 tables
  const tables = [
    'companies',
    'profiles',
    'teams',
    'team_members',
    'lifecycle_stages',
    'aircraft',
    'project_buckets',
    'tasks',
    'task_checklists',
    'task_dependencies',
    'task_comments',
    'task_attachments',
    'in_app_notifications',
    'email_logs',
    'activity_logs',
    'audit_logs',
    'lifecycle_templates',
    'repair_order_columns',
    'repair_orders',
  ];

  console.log('\n1. Checking Tables in PostgreSQL "public" Schema:');
  const schemaTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  const existingTableNames = new Set(schemaTables.rows.map(r => r.table_name));
  for (const t of tables) {
    if (existingTableNames.has(t)) {
      console.log(`  ✓ Table "${t}" exists`);
    } else {
      throw new Error(`Table "${t}" is missing from Supabase database!`);
    }
  }

  // 2. Query Companies
  console.log('\n2. Verifying Companies & Contract Lifecycles:');
  const companiesRes = await client.query('SELECT name, email_domain, plan_tier, onboarding_date, expiry_date, status FROM companies ORDER BY name;');
  for (const c of companiesRes.rows) {
    console.log(`  - ${c.name} (@${c.email_domain}) | Tier: ${c.plan_tier} | Onboarded: ${c.onboarding_date?.toISOString().split('T')[0]} | Expiry: ${c.expiry_date?.toISOString().split('T')[0]} | Status: ${c.status}`);
  }

  // 3. Query Profiles & Roles
  console.log('\n3. Verifying User Profiles & Company Admin Roles:');
  const profilesRes = await client.query('SELECT full_name, email, role, status FROM profiles ORDER BY full_name;');
  for (const p of profilesRes.rows) {
    console.log(`  - ${p.full_name.padEnd(20)} (${p.email}) -> Role: [${p.role}] [${p.status}]`);
  }

  // 4. Query Aircraft Fleet
  console.log('\n4. Verifying Managed Aircraft Fleet:');
  const aircraftRes = await client.query('SELECT msn, registration, model, status, location FROM aircraft ORDER BY msn;');
  for (const a of aircraftRes.rows) {
    console.log(`  - MSN ${a.msn} (${a.registration}) | Model: ${a.model} | Status: ${a.status} | Location: ${a.location}`);
  }

  // 5. Query Repair Orders
  console.log('\n5. Verifying Personal Repair Orders (RO):');
  const roRes = await client.query('SELECT id, user_id, data FROM repair_orders;');
  console.log(`  Total seeded Repair Orders: ${roRes.rows.length}`);
  for (const r of roRes.rows) {
    const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
    console.log(`  - RO: ${d.ro_number} | Part: ${d.part_number} | Status: ${d.status} | Cost: $${d.est_cost || 0}`);
  }

  // 6. Test Live Write & Read Operation
  console.log('\n6. Testing Live Write / Read / Delete on Supabase Cloud:');
  const testTaskId = 'test-supabase-live-' + Date.now();
  await client.query(`
    INSERT INTO tasks (id, aircraft_id, company_id, name, description, status, priority)
    VALUES ($1, 'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', $2, $3, 'NOT_STARTED', 'HIGH');
  `, [testTaskId, 'Cloud Connection Verification Task', 'Created by test suite to verify live write operations']);
  console.log('  ✓ Inserted test task successfully.');

  const readRes = await client.query('SELECT id, name FROM tasks WHERE id = $1;', [testTaskId]);
  if (readRes.rows.length === 0 || readRes.rows[0].id !== testTaskId) {
    throw new Error('Could not read back test task from Supabase!');
  }
  console.log(`  ✓ Successfully read back test task: "${readRes.rows[0].name}"`);

  await client.query('DELETE FROM tasks WHERE id = $1;', [testTaskId]);
  console.log('  ✓ Cleaned up test task.');

  await client.end();
  console.log('\n=== ALL SUPABASE LIVE DATABASE CHECKS PASSED WITH 100% SUCCESS! 🚀 ===');
}

verify().catch((err) => {
  console.error('\n✗ Verification failed:', err);
  process.exit(1);
});

