if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
const { Client } = pg;

async function run() {
  const connectionString = 'process.env.DATABASE_URL || ""';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const testAircraft = {
    id: 'a-test-verification-' + Date.now(),
    company_id: 'c1111111-1111-1111-1111-111111111111',
    msn: '88990',
    registration: 'N889AL',
    aircraft_type: 'A320',
    model: 'A320-214',
    variant: 'CFM56-5B4',
    serial_number: 'SN-88990',
    owner: 'Alaris Fleet Operations',
    status: 'ACTIVE',
    acquisition_date: null,
    expected_teardown_date: null,
    actual_teardown_date: null,
    location: 'Miami (MIA)',
    current_stage_id: 's1111111-1111-1111-1111-111111111111',
    notes: 'Live verification test aircraft inserted via direct script',
    created_by: '11111111-1111-1111-1111-111111111111',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const keys = Object.keys(testAircraft);
  const values = Object.values(testAircraft);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const updateClause = keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');

  const sql = `
    INSERT INTO "aircraft" (${keys.map(k => `"${k}"`).join(', ')})
    VALUES (${placeholders})
    ON CONFLICT ("id") DO UPDATE SET ${updateClause}
    RETURNING *;
  `;

  console.log('Inserting test aircraft...');
  const res = await client.query(sql, values);
  console.log('Inserted aircraft successfully! Result row:');
  console.table(res.rows);

  // Now query all aircraft
  const all = await client.query('SELECT msn, model, registration, status FROM aircraft');
  console.log('\nAll aircraft now in Supabase database:');
  console.table(all.rows);

  // Cleanup test aircraft
  await client.query('DELETE FROM aircraft WHERE id = $1', [testAircraft.id]);
  console.log('\nCleaned up test aircraft successfully.');

  await client.end();
}

run();

