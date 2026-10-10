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
    
    // Check columns
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'aircraft'
    `);
    console.log('--- AIRCRAFT TABLE COLUMNS IN SUPABASE ---');
    console.table(cols.rows);

    const res = await client.query('SELECT * FROM aircraft');
    console.log('--- AIRCRAFT ROWS IN SUPABASE ---');
    console.table(res.rows);
  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await client.end();
  }
}

check();

