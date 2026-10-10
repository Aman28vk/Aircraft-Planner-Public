if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
const { Client } = pg;

async function check() {
  const connectionString = 'process.env.DATABASE_URL || ""';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    // Check all tables in auth schema
    const authTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'auth'
    `);
    console.log('--- AUTH SCHEMA TABLES ---');
    console.table(authTables.rows);

    // Check all settings containing jwt or secret
    const settings = await client.query(`
      SELECT name, setting 
      FROM pg_settings 
      WHERE name ILIKE '%jwt%' OR name ILIKE '%secret%' OR name ILIKE '%supabase%'
    `);
    console.log('--- PG SETTINGS ---');
    console.table(settings.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

check();

