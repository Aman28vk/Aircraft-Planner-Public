if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
const { Client } = pg;

async function migrateTeamsAircraft() {
  console.log('=== CHECKING AND MIGRATING TEAMS TABLE IN SUPABASE ===');

  const connectionString =
    'process.env.DATABASE_URL || ""';

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✓ Connected to Supabase PostgreSQL database.');

  // 1. Inspect columns of teams
  const colRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'teams'
    ORDER BY ordinal_position;
  `);
  console.log('Current teams table columns:');
  console.table(colRes.rows);

  // 2. Add aircraft_id column to teams if it does not exist
  await client.query(`
    ALTER TABLE teams 
    ADD COLUMN IF NOT EXISTS aircraft_id TEXT REFERENCES aircraft(id) ON DELETE CASCADE;
  `);
  console.log('✓ Added aircraft_id column to teams table.');

  // 3. Create index on aircraft_id if not exists
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_teams_aircraft ON teams(aircraft_id);
  `);
  console.log('✓ Created index on teams(aircraft_id).');

  // 4. Verify columns again
  const finalCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'teams'
    ORDER BY ordinal_position;
  `);
  console.log('Updated teams table columns:');
  console.table(finalCols.rows);

  await client.end();
  console.log('✓ Migration finished successfully.');
}

migrateTeamsAircraft().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

